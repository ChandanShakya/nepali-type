// Builds src/data/words-ext.txt: the most common Nepali words of the Nepali Wikipedia, ranked by how often they occur,
// minus the curated words in src/data/words.txt (those keep their place at the top of the ranking).
//   usage: node scripts/build-dict.mjs <newiki-latest-pages-articles.xml.bz2> [max words, default 45000]
// The dump comes from https://dumps.wikimedia.org/newiki/latest/ . Wikipedia text is CC BY-SA 4.0; only a list of words and
// nothing else of it is kept, and the credit is in the README. Needs bzcat.
import {spawn} from "node:child_process";
import {createInterface} from "node:readline";
import {readFileSync,writeFileSync} from "node:fs";

const [dump,maxArg]=process.argv.slice(2),MAX=Number(maxArg)||45000,MIN_COUNT=4;
if(!dump){console.error("usage: node scripts/build-dict.mjs <dump.xml.bz2> [max words]");process.exit(1)}
const curated=new Set(readFileSync("src/data/words.txt","utf8").split("\n").map(l=>l.trim().split(/\s+/)[0]).filter(Boolean));

const count=new Map();
const rl=createInterface({input:spawn("bzcat",[dump]).stdout});
// a word is Devanagari letters with their signs; joiners are dropped; numbers, dandas and Latin are not words
const TOKEN=/[ऀ-ॣॱ-ॿ‌‍]+/g;
for await(let line of rl){
 // the markup that carries no Nepali prose: templates, links' targets, tags, urls, reference names
 line=line.replace(/<ref[^>]*>.*?<\/ref>|<[^>]+>|https?:\/\/\S+|\{\{[^}]*\}\}|\[\[(?:[^\]|]*\|)?/g," ");
 for(let w of line.match(TOKEN)||[]){
  w=w.replace(/[‌‍]/g,"");
  count.set(w,(count.get(w)||0)+1)}}

// letters that start a word, signs that cannot; keep clean, typeable words only
// words that are Wikipedia page furniture, not language
const FURNITURE=new Set("श्रेणी ढाँचा सन्दर्भ कडीहरू बाह्य अनुप्रेषण पृष्ठ सामग्रीहरू सन्दर्भसामग्रीहरू चित्र फाइल".split(" "));
const START=/^[ऄ-हक़-ॡ]/,GOOD=/^[ऀ-ःऄ-्ॐक़-ॡ]+$/;
const words=[...count].filter(([w,n])=>n>=MIN_COUNT&&w.length>=3&&!/[ः\u0902]$/.test(w)&&!FURNITURE.has(w)&&w.length<=14&&START.test(w)&&GOOD.test(w)&&!curated.has(w)&&!/्$/.test(w.slice(0,-1)+"x"))
 .sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1)).slice(0,MAX).map(([w])=>w);
writeFileSync("src/data/words-ext.txt",words.join("\n")+"\n");
console.log(count.size,"distinct tokens,",words.length,"words written; least frequent kept:",count.get(words.at(-1)));
