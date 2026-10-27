// Self-check for the converters: node test.mjs
import assert from "node:assert/strict";
import {conv,clean,toPreeti,roman} from "./src/scripts/nepali.js";

// Preeti keys -> Unicode
for(const[k,u] of [["g]kfn","नेपाल"],["wd{","धर्म"],["km","फ"],["em","झ"],["pm","ऊ"],["qm","क्र"],["Qm","क्त"],["Km","फ्"],["k'm","फु"],["cy{","अर्थ"],["ldq","मित्र"],["lk|m","फ्रि"]])
 assert.equal(clean(conv(k)),u,k);
// a stray m is kept (not silently lost) so the page can show it, and never reaches copied text
assert.equal(conv("m"),"m");assert.equal(conv("sm"),"कm");assert.equal(clean(conv("sm")),"क");

// Unicode -> Preeti keys must round-trip through conv
const words="नेपाल धर्म अर्थ कार्य आर्थिक विद्यालय क्षेत्र ज्ञान श्री प्रधानमन्त्री स्कूल फूल झरना ऊन ओखर औषधि ऐना ई ऋषि कृषि संसार चाँद दुःख शिक्षा स्त्री राष्ट्र पृथ्वी त्यो क्रम भक्त सिद्धान्त उद्धार बुद्ध गङ्गा अङ्क छ ट्याक्सी ठूलो डाँडा ढोका कर्मचारी पर्यटन मिठो दिदी फ्रिज पर्नि गर् १२३ काठमाडौं".split(" ");
for(const w of words){const p=toPreeti(w);assert.equal(clean(conv(p)),w,w+" via "+p)}
assert.equal(toPreeti("नेपाल"),"g]kfn");assert.equal(toPreeti("धर्म"),"wd{");assert.equal(toPreeti("कृषि"),"s[lif");

// Romanized typing
for(const[r,u] of [["ka","क"],["k","क"],["kaa","का"],["kt","क्त"],["nepaal","नेपाल"],["kamal","कमल"],["dharma","धर्म"],["namaste","नमस्ते"],["ghar","घर"],["chhan\\","छन्"],["kShetra","क्षेत्र"],["xetra","क्षेत्र"],["gyaan","ज्ञान"],["shrI","श्री"],["kRiShi","कृषि"],["chaa~d","चाँद"],["saMsaar","संसार"],["dukH","दुकः"],["ma","म"],["m","म"],["Ram","ऋअम"],["123.","१२३।"],["gangaa","गङ्गा"],["hunchha","हुन्छ"],["maanchhe","मान्छे"],["Nga","ङ"],["Kamal","कमल"]])
 assert.equal(roman(r).u,u,r);
console.log("ok",words.length,"round-trips");

// Unicode -> roman round trip and the dictionary
import {toRoman,makeDict,looseRoman} from "./src/scripts/nepali.js";
import {readFileSync} from "node:fs";
for(const w of ["नेपाल","नमस्ते","धन्यवाद","क्षेत्र","ज्ञान","गाउँ","छन्","मान्छे","गङ्गा","संसार","दुःख","आउनुहोस्","कृषि","विद्यालय","गएको","थिइन्","भई","हजुरआमा"])
 assert.equal(roman(toRoman(w)??"").u,w,"toRoman "+w);
const dict=makeDict(readFileSync("src/data/words.txt","utf8"));
const top=r=>dict.roman(r)[0]?.u;
for(const[r,u] of [["nepal","नेपाल"],["Nepal","नेपाल"],["namaste","नमस्ते"],["dhanyabad","धन्यवाद"],["kathmandu","काठमाडौं"],["bikas","विकास"],["chha","छ"],["sansar","संसार"],["gaun","गाउँ"],["manchhe","मान्छे"],["school","स्कुल"],["sagarmatha","सगरमाथा"],["kamal","कमल"]])
 assert.equal(top(r),u,"dict "+r);
assert.ok(dict.size>700);
// exact: the word shown as a suggestion must be what Romanized and the font keys give back (no hidden joiners). Lines with extra spellings are checked too.
const bad=readFileSync("src/data/words.txt","utf8").split("\n").filter(l=>l&&l[0]!=="#").map(l=>l.split(/\s+/)[0]).filter(w=>roman(toRoman(w)??"").u!==w||clean(conv(toPreeti(w)))!==w);
console.log("dictionary",dict.size,"words; not romanizable:",bad.join(" ")||"none");

// every chart entry must type back exactly in both modes, so the app chart and the cheatsheet can never disagree
import {VOWELS,CONSONANTS,MATRAS,CONJUNCTS,PUNCT,SPECIALS,entry} from "./src/scripts/charts.js";
const all=[...VOWELS,...CONSONANTS,...CONSONANTS.map(c=>c+"्"),...CONJUNCTS,...PUNCT,...CONSONANTS.flatMap(c=>MATRAS.map(m=>c+m))];
const es=all.map(entry);
assert.deepEqual(es.filter(e=>!e.r||roman(e.r).u!==e.u).map(e=>e.u),[],"chart entries without an exact Romanized spelling");
assert.deepEqual(es.filter(e=>e.p===null).map(e=>e.u),["टृ"],"only टृ lacks font keys");
// font keys are keystrokes, never Devanagari passed through unconverted (ई once came out as ई instead of O{)
assert.deepEqual(es.filter(e=>e.p&&/[\u0900-\u097f]/.test(e.p)).map(e=>e.u),[],"entries whose font keys contain Devanagari");
assert.equal(toPreeti("ई"),"O{");
console.log("chart",all.length,"entries round-trip in Romanized and font keys");
// specials: each glyph decodes to its letter, and any Romanized spelling types it back
for(const e of SPECIALS){if(e.p)assert.equal(clean(conv(e.p)),e.u,e.p);if(e.r)assert.equal(roman(e.r).u,e.u,e.r)}
console.log("specials",SPECIALS.length,"checked");

// reph, ि, conjuncts and vowel signs in every order a word can have them (अन्तर्राष्ट्रिय once came back as अन्तरािर्ष्ट्रय)
{const Cs="कतरषयसन".split(""),M1=["","ा","ी","ु"],M2=["ि","ा","ु","े"],bad=[];
 for(const a of Cs)for(const b of Cs)for(const m1 of M1)for(const c of Cs)for(const d of ["",...Cs])for(const m2 of M2){
  const w=a+"र्"+b+m1+c+(d?"्"+d:"")+m2;if(clean(conv(toPreeti(w)))!==w)bad.push(w)}
 assert.deepEqual(bad.slice(0,10),[],"reph/ि/conjunct combos that do not round-trip ("+bad.length+")")}
for(const w of ["अन्तर्राष्ट्रिय","सर्किट","कर्मचारी","पर्यटन"])assert.equal(clean(conv(toPreeti(w))),w,w);
// the half-ra (र्‍) keeps its joiner as ¥; other joiners are dropped
assert.equal(toPreeti("गर्‍यो"),"u¥of]");assert.equal(conv("u¥of]"),"गर्‍यो");
console.log("reph/ि/conjunct combos round-trip");

// a character the font has no key for is flagged, never passed through looking like a key that means something else
{const miss=[];
 for(let i=0x21;i<0x7f;i++){const c=String.fromCharCode(i);if(clean(conv(toPreeti(c)))!==c&&!toPreeti(c,true).includes("\u0003"))miss.push(c)}
 for(let c=0x900;c<=0x97f;c++){const ch=String.fromCodePoint(c);if(/[\u0900-\u097f]/.test(toPreeti(ch))&&!toPreeti(ch,true).includes("\u0003"))miss.push(ch)}
 assert.deepEqual(miss,[],"characters passed through unflagged");
 assert.equal(toPreeti("नेपाल!",true),"g]kfn\u0003!\u0004");assert.equal(toPreeti("नेपाल!"),"g]kfn!");assert.equal(toPreeti("(ठीक?)",true),"-7Ls<_","brackets and ? have font keys");
 console.log("characters without a font key are flagged")}
// र in the middle of a conjunct chain is not a reph (ट्र्ब); one that starts a syllable is
for(const w of ["ट्र्ब","क्र्य","अर्थ","उर्दू","अन्तर्राष्ट्रिय"])assert.equal(clean(conv(toPreeti(w))),w,w);
console.log("reph vs conjunct chain ok");
