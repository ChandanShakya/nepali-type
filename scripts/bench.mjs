// How often does a typed spelling give the intended word? usage: node scripts/bench.mjs
// Three ways: the literal reading of the letters, plus the dictionary's automatic correction with the curated words only,
// and with the 45,000 extra words (the same rule the Direct mode uses: a literal reading that is not a word is replaced).
import {readFileSync} from "node:fs";
import {roman,makeDict} from "../src/scripts/nepali.js";
const PAIRS=`ghar घर|nepal नेपाल|kathmandu काठमाडौं|pokhara पोखरा|namaste नमस्ते|dhanyabad धन्यवाद|tapai तपाईं|timi तिमी|ma म|mero मेरो|hamro हाम्रो|tapaiko तपाईंको|kasto कस्तो|kina किन|kaha कहाँ|kahile कहिले|ramro राम्रो|sundar सुन्दर|school स्कूल|college कलेज|sarkar सरकार|pradhanmantri प्रधानमन्त्री|rastrapati राष्ट्रपति|sansad संसद|kanun कानुन|shiksha शिक्षा|swasthya स्वास्थ्य|kitab किताब|kalam कलम|pani पानी|khana खाना|bhat भात|dal दाल|tarkari तरकारी|doodh दूध|chiya चिया|paisa पैसा|bazar बजार|dokan दोकान|gaun गाउँ|sahar सहर|desh देश|bhasha भाषा|kaam काम|samay समय|din दिन|raat रात|bihana बिहान|sanjh साँझ|hajur हजुर|didi दिदी|dai दाइ|bahini बहिनी|buwa बुवा|aama आमा|chora छोरा|chori छोरी|manche मान्छे|sathi साथी|pyaar प्यार|khushi खुसी|dukha दुःख|samasya समस्या|bikas विकास|sagarmatha सगरमाथा|himal हिमाल|pahad पहाड|nadi नदी|jungle जङ्गल|mandir मन्दिर|dashain दशैं|tihar तिहार|bhanna भन्न|garnu गर्नु|jaanu जानु|aaunu आउनु|dekhnu देख्नु|sunnu सुन्नु|hunchha हुन्छ|chha छ|chhaina छैन|bhayo भयो|garyo गर्‍यो|gareko गरेको|vaneko भनेको|huncha हुन्छ|kasari कसरी|kina किन|jhapa झापा|biratnagar विराटनगर|janakpur जनकपुर|lalitpur ललितपुर|bhaktapur भक्तपुर|chitwan चितवन|butwal बुटवल`.split("|").map(p=>p.split(" "));
const cur=readFileSync(new URL("../src/data/words.txt",import.meta.url),"utf8"),ext=readFileSync(new URL("../src/data/words-ext.txt",import.meta.url),"utf8");
const A=makeDict(cur),B=makeDict(cur);B.add(ext,1);
const fix=D=>r=>{const lit=roman(r).u;if(r.length<3||D.core(lit))return lit;const w=D.best(r);return w&&w.u!==lit?w.u:lit};
const tests={"literal":r=>roman(r).u,"curated + fix":fix(A),"curated + 45,000 + fix":fix(B)};
const seen=new Set(),pairs=PAIRS.filter(([r])=>!seen.has(r)&&seen.add(r));
for(const[name,f] of Object.entries(tests)){
 const ok=pairs.filter(([r,u])=>f(r)===u);
 console.log(name.padEnd(26),ok.length+"/"+pairs.length,"("+Math.round(100*ok.length/pairs.length)+"%)");
 if(process.argv[2]==="-v"&&name.startsWith("curated + 45"))for(const[r,u] of pairs)if(f(r)!==u)console.log("   miss",r,u,"got",f(r))}
// chips: is the intended word among the first 6 suggestions?
const inChips=D=>pairs.filter(([r,u])=>D.roman(r).some(w=>w.u===u)).length;
console.log("in the 6 chips".padEnd(26),"curated",inChips(A)+"/"+pairs.length,"| with 45,000",inChips(B)+"/"+pairs.length);
