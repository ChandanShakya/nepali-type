// Unseen words: take real words from the dictionary's ranked list, spell them the way people type quickly (long vowels
// shortened: aa→a, ii→i, uu→u), and see whether the pipeline gives the word back. usage: node scripts/bench-sim.mjs
import {readFileSync} from "node:fs";
import {roman,toRoman,makeDict} from "../src/scripts/nepali.js";
const cur=readFileSync(new URL("../src/data/words.txt",import.meta.url),"utf8"),ext=readFileSync(new URL("../src/data/words-ext.txt",import.meta.url),"utf8");
const A=makeDict(cur),B=makeDict(cur);B.add(ext,1);
const fix=D=>r=>{const lit=roman(r).u;if(r.length<3||D.core(lit))return lit;const w=D.best(r);return w&&w.u!==lit?w.u:lit};
const sample=ext.split("\n").slice(300,3300).filter(w=>w.length>=4);
const typed=w=>{const r=toRoman(w);return r&&r.replace(/aa/g,"a").replace(/ii/g,"i").replace(/uu/g,"u")};
const cases=sample.map(w=>[typed(w),w]).filter(([r])=>r&&r.length>=3);
const score=(name,f)=>{const ok=cases.filter(([r,w])=>f(r)===w).length;console.log(name.padEnd(30),ok+"/"+cases.length,"("+(100*ok/cases.length).toFixed(1)+"%)")};
score("literal",r=>roman(r).u);score("curated + fix",fix(A));score("curated + 45,000 + fix",fix(B));
const chips=D=>cases.filter(([r,w])=>D.roman(r).some(x=>x.u===w)).length;
console.log("in the 6 chips".padEnd(30),"curated",chips(A)+"/"+cases.length,"| with 45,000",chips(B)+"/"+cases.length);
