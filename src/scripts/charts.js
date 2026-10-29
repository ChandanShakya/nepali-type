// The one alphabet the in-app chart and the /chart/ cheatsheet both show.
// Spellings are derived from the converters, so every entry types back exactly in both modes (see test.mjs).
import {conv,clean,toPreeti,toRoman,roman,ROMAN} from "./nepali.js";

export const VOWELS="अ आ इ ई उ ऊ ऋ ए ऐ ओ औ अं अँ अः".split(" ");
// consonants in their traditional rows (वर्ग), then the three conjunct letters
export const CONSONANT_ROWS=["क ख ग घ ङ","च छ ज झ ञ","ट ठ ड ढ ण","त थ द ध न","प फ ब भ म","य र ल व","श ष स ह","क्ष त्र ज्ञ"].map(r=>r.split(" "));
export const CONSONANTS=CONSONANT_ROWS.flat();
// vowel signs in बाह्रखरी order; "" is the bare letter
export const MATRAS=["","ा","ि","ी","ु","ू","ृ","े","ै","ो","ौ","ं","ँ","ः"];
export const CONJUNCTS="क्त क्र क्य क्ल ग्न ग्र च्छ ज्य ट्ट ड्ड त्त त्य त्व द्द द्ध द्य द्र द्व न्त न्द न्ध न्न प्र प्त ब्र भ्र म्प म्ब र्क र्ग र्थ र्म र्य श्च श्र श्व ष्ट ष्ठ स्त स्थ स्न स्म स्व ह्म ह्र ङ्क ङ्ग".split(" ");
export const PUNCT="। . , ? ( ) ० १ २ ३ ४ ५ ६ ७ ८ ९".split(" ");

// other Romanized spellings that give the same letter: फ also f, आ also A
const ALT={};
for(const[k,v] of Object.entries(ROMAN.C))if(k!=="q"&&k!=="z")(ALT[v]??=[]).push(k);
for(const[k,[v]] of Object.entries(ROMAN.V))(ALT[v]??=[]).push(k);

// u: Unicode text → {u, r: Romanized keys, p: font (Preeti) keys, alt: other Romanized spellings}
// p is null when the Preeti font has no keys for it (टृ: "6[" draws ट्ट in that font)
export function entry(u){const r=toRoman(u),p=toPreeti(u);return{u,r,p:clean(conv(p))===u?p:null,alt:(ALT[u]||[]).filter(k=>k!==r)}}

// Extra glyphs of the Preeti font, typed with Alt codes in Windows apps (hold Alt, type the 4-digit code on the number pad).
// Every one converts to the letter, conjunct or punctuation shown; r is its Romanized spelling when it has an exact one.
const ascii=s=>s&&/^[ -~]+$/.test(s)?s:null;
export const SPECIALS=[["„","0132"],["…","0133"],["ˆ","0136"],["‰","0137"],["‹","0139"],["‘","0145"],["•","0149"],["˜","0152"],["›","0155"],["¡","0161"],["¢","0162"],["£","0163"],["¤","0164"],["¥","0165"],["§","0167"],["©","0169"],["ª","0170"],["«","0171"],["°","0176"],["±","0177"],["´","0180"],["¶","0182"],["¿","0191"],["Å","0197"],["Æ","0198"],["Ë","0203"],["Ì","0204"],["Í","0205"],["Î","0206"],["Ò","0210"],["Ö","0214"],["×","0215"],["Ø","0216"],["Ù","0217"],["Ú","0218"],["Û","0219"],["Ü","0220"],["Ý","0221"],["ß","0223"],["å","0229"],["æ","0230"],["ç","0231"],["÷","0247"]]
 // r only when typing that spelling gives back exactly this text (the half-ra र्‍ has a hidden joiner no spelling can carry)
 .map(([g,code])=>{const u=clean(conv(g)),r=ascii(toRoman(u));return{u,r:r&&roman(r).u===u?r:null,p:g,alt:[],code}});

// every entry the chart shows, for Find; built on first search
let index;
export function findEntries(q,max=60){
 index??=[...VOWELS,...CONSONANTS,...CONSONANTS.map(c=>c+"्"),...CONJUNCTS,...PUNCT,...CONSONANTS.flatMap(c=>MATRAS.slice(1).map(m=>c+m))].map(entry).concat(SPECIALS);
 const deva=/[\u0900-\u097f]/.test(q),lq=q.toLowerCase();
 // exact matches first: the letter itself, what the query types in Romanized (kha, ksh), or its font key
 const u=deva?q:roman(q).u;
 const exact=index.filter(e=>e.u===u||(!deva&&e.p===q));
 const starts=index.filter(e=>!exact.includes(e)&&(deva?e.u.startsWith(q):(e.r||"").toLowerCase().startsWith(lq)));
 return exact.concat(starts).slice(0,max);
}
