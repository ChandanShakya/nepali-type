// Builds src/data/pairs.txt: for the most common Nepali words, the four words that most often follow them in the Nepali Wikipedia.
//   usage: node scripts/build-pairs.mjs <newiki-latest-pages-articles.xml.bz2> [first words, default 8000]
// One line per word: "word next1 next2 next3 next4 next4". 9 of 10 paragraphs build the table; the 10th is held out and the table is
// scored on it (how often the real next word is the first suggestion, or among the four). Needs bzcat.
// Wikipedia text is CC BY-SA 4.0; only counts of word pairs are kept, and the credit is in the README.
import {spawn} from "node:child_process";
import {createInterface} from "node:readline";
import {writeFileSync,readFileSync} from "node:fs";

const [dump,nArg]=process.argv.slice(2),TOP=Number(nArg)||8000,MIN_PAIR=3,MIN_NEXT=20;
if(!dump){console.error("usage: node scripts/build-pairs.mjs <dump.xml.bz2> [first words]");process.exit(1)}
const BREAK=/[^ऀ-ॣ॰-ॿ‌‍\s]+|\s{2,}/;
const FURNITURE=new Set("श्रेणी ढाँचा सन्दर्भ कडीहरू बाह्य अनुप्रेषण पृष्ठ सामग्रीहरू चित्र फाइल प्रयोगकर्ता वार्ता विकिपिडिया नामस्थान पोर्टल विकिपीडिया विकि सम्पादन".split(" "));
// Wikipedia has text that was converted from Preeti badly (ाे for ो, अा for आ, ि्र for ्रि, a vowel sign after a vowel sign, a nukta):
// those are not words anyone types, so they are left out
const MALFORMED=/ा[ेैॊॉ]|अ[ाौो]|एे|ि्|ु्|ी्|ृ्|ू्|[ािीुूृेैोौॉॊ][ािीुूृेैोौॉॊ]|[ंँः][ािीुूृेैोौ]|़|्[ािीुूृेैोौंँः]|[ऀ-ऄ]/;
const GOOD=/^[ऄ-हक़-ॡ][ऀ-्ॐक़-ॡ]*$/;
// each paragraph, cleaned of markup, as lists of words that follow one another
function*segments(line){
 line=line.replace(/<ref[^>]*>.*?<\/ref>|<[^>]+>|https?:\/\/\S+|\{\{[^}]*\}\}|\[\[(?:[^\]|]*\|)?/g,"\n");
 for(const seg of line.split(BREAK)){const w=seg.replace(/[‌‍]/g,"").split(/\s+/).filter(Boolean);if(w.length>1)yield w}}
async function*lines(){let i=0;for await(const l of createInterface({input:spawn("bzcat",[dump]).stdout}))yield[i++,l]}
const test=i=>i%10===9;

// pass 1: how common is each word (in the training paragraphs)
const uni=new Map();
for await(const[i,l] of lines()){if(test(i))continue;for(const s of segments(l))for(const w of s)uni.set(w,(uni.get(w)||0)+1)}
const first=new Set([...uni].filter(([w,n])=>GOOD.test(w)&&!FURNITURE.has(w)).sort((a,b)=>b[1]-a[1]).slice(0,TOP).map(([w])=>w));
const ok=w=>GOOD.test(w)&&!MALFORMED.test(w)&&w.length<=14&&!FURNITURE.has(w)&&(uni.get(w)||0)>=MIN_NEXT;

// pass 2: what follows the common words; the held-out paragraphs are kept aside to score the table
const pairs=new Map(),held=[];
for await(const[i,l] of lines()){
 for(const s of segments(l))for(let k=0;k+1<s.length;k++){
  const a=s[k],b=s[k+1];if(!first.has(a)||!ok(b))continue;
  if(test(i)){held.push([a,b]);continue}
  let m=pairs.get(a);if(!m)pairs.set(a,m=new Map());m.set(b,(m.get(b)||0)+1)}}
const table=new Map();
for(const[a,m] of pairs){const top=[...m].filter(([,n])=>n>=MIN_PAIR).sort((x,y)=>y[1]-x[1]||(x[0]<y[0]?-1:1)).slice(0,4).map(([w])=>w);if(top.length)table.set(a,top)}
let seen=0,h1=0,h4=0;
for(const[a,b] of held){const t=table.get(a);if(!t)continue;seen++;if(t[0]===b)h1++;if(t.includes(b))h4++}
// the hand-written everyday pairs (src/data/pairs-seed.txt) go first; the table above was scored without them
for(const l of readFileSync("src/data/pairs-seed.txt","utf8").split("\n")){if(!l||l[0]==="#")continue;const[w,...n]=l.trim().split(/\s+/);table.set(w,[...new Set([...n,...(table.get(w)||[])])].slice(0,4))}
const all=held.length;
writeFileSync("src/data/pairs.txt",[...table].map(([a,t])=>a+" "+t.join(" ")).join("\n")+"\n");
console.log(table.size,"words with suggestions. Held-out paragraphs:",all,"pairs whose first word is common;",seen,"covered by the table.");
console.log("when covered: first suggestion right",(100*h1/seen).toFixed(1)+"%, among the four",(100*h4/seen).toFixed(1)+"%");
