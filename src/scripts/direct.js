// Direct mode: type Romanized letters straight into the text box; the word turns into Devanagari when it ends.
// Pure functions on (text, caret) so they run without a page. Each returns an edit {from,to,text}: replace text[from,to) with `text`.
import {roman} from "./nepali.js";

// the letters and sign keys (~ \) that spell Romanized Nepali; ' (ends a syllable) only counts inside a word
const KEY="A-Za-z~\\\\";
const RUN=new RegExp("["+KEY+"]["+KEY+"']*$"),KEYCH=new RegExp("["+KEY+"']");
const DIGIT=c=>c>="0"&&c<="9"?String.fromCharCode(0x966+ +c):c;

// the Romanized word that ends at the caret ("" when the caret is not at the end of one)
export const runAt=(v,c)=>(v.slice(0,c).match(RUN)||[""])[0];

// The character just typed (before the caret) ends the word: convert the word in front of it.
// A typed . becomes the danda । (and a second . turns it into a full stop), 0-9 become Devanagari digits.
export function commit(v,c,n=1){
 if(n>1)return span(v,c,n);
 const ch=v[c-1];if(!ch||KEYCH.test(ch))return null;
 const before=v.slice(0,c-1),run=runAt(before,before.length);
 if(ch==="."&&!run&&before.endsWith("।"))return{from:c-2,to:c,text:".",latin:"",uni:""};
 const tail=ch==="."?"।":DIGIT(ch);
 if(!run&&tail===ch)return null;
 const uni=run?roman(run).u:"";
 return{from:c-1-run.length,to:c,text:uni+tail,latin:run,uni};
}

// Text that arrived in one go (voice typing, a phone keyboard committing a word): convert every finished word in it.
// The last word stays as typed unless something ends it.
function span(v,c,n){
 const from=c-n-runAt(v,c-n).length,seg=v.slice(from,c),toks=seg.match(new RegExp("["+KEY+"]["+KEY+"']*|[^]","g"));
 let out="";
 toks.forEach((t,i)=>{
  if(new RegExp("["+KEY+"]").test(t[0]))out+=i<toks.length-1?roman(t).u:t;
  else if(t==="."&&out.endsWith("।"))out=out.slice(0,-1)+".";
  else out+=t==="."?"।":DIGIT(t)});
 return out===seg?null:{from,to:c,text:out,latin:"",uni:""}}

// a dictionary word (or the literal reading) chosen for the word at the caret
export function pick(v,c,word){const run=runAt(v,c);return{from:c-run.length,to:c,text:word+" ",latin:run,uni:word}}

// Backspace right after a conversion gives the typed letters back, so a slip is fixed by editing them
// (like undoing an autocorrect). `last` is the conversion just made: {end, latin, uni}.
export function revert(v,c,last){
 if(!last||!last.uni||c!==last.end||!v.slice(0,c).endsWith(last.uni))return null;
 return{from:c-last.uni.length,to:c,text:last.latin}}

// every Romanized word in the text, for a paste that arrived as English letters
export const convertAll=v=>v.replace(new RegExp("["+KEY+"]["+KEY+"']*","g"),r=>roman(r).u);
export const hasLatin=v=>new RegExp("["+KEY+"]["+KEY+"']{2,}").test(v);
