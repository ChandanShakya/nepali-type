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
 assert.equal(toPreeti("नेपाल-",true),"g]kfn\u0003-\u0004");assert.equal(toPreeti("नेपाल-"),"g]kfn-");
 // punctuation the font reaches with Alt-code glyphs has a key: ! is Û, ; is Ù, / is ÷, % is Ü
 assert.equal(toPreeti("!;/%=+"),"ÛÙ÷ÜÖ±");assert.equal(clean(conv("ÛÙ÷ÜÖ±")),"!;/%=+");assert.equal(toPreeti("(ठीक?)",true),"-7Ls<_","brackets and ? have font keys");
 console.log("characters without a font key are flagged")}
// र in the middle of a conjunct chain is not a reph (ट्र्ब); one that starts a syllable is
for(const w of ["ट्र्ब","क्र्य","अर्थ","उर्दू","अन्तर्राष्ट्रिय"])assert.equal(clean(conv(toPreeti(w))),w,w);
console.log("reph vs conjunct chain ok");

// ---------- reports: forms, server checks, issue list ----------
import {REPORTS} from "./src/data/reports.js";
import {buildIssue,parseReporter,handleReport,handleIssues,LIMITS} from "./src/server/reports.js";
import {readdirSync} from "node:fs";
// the app's fields and the GitHub issue forms use the same ids, in both directions, so nothing opens blank or goes missing
const tplDir=".github/ISSUE_TEMPLATE/";
for(const[tpl,R] of Object.entries(REPORTS)){
 const yml=readFileSync(tplDir+tpl+".yml","utf8"),ids=[...yml.matchAll(/^\s+id: (\S+)$/gm)].map(m=>m[1]);
 assert.deepEqual([...ids].sort(),R.fields.map(f=>f.id).sort(),tpl+": issue form and app fields differ");
 for(const l of R.labels)assert.ok(yml.includes(l),tpl+" form lacks label "+l)}
assert.deepEqual(readdirSync(tplDir).filter(f=>f.endsWith(".yml")&&f!=="config.yml").map(f=>f.slice(0,-4)).sort(),Object.keys(REPORTS).sort(),"every report type has a form");
console.log("report forms match the app fields");

// building an issue: validation, sanitising, anonymous or named
{const ok=buildIssue({type:"missing-word",fields:{typed:"kunai",expected:"कुनै"}});
 assert.equal(ok.title,"Missing word: kunai");assert.deepEqual(ok.labels,["missing word"]);
 assert.ok(ok.body.includes("### What you typed\n\nkunai")&&ok.body.endsWith("Reported anonymously from the website."));
 assert.equal(parseReporter(ok.body),"");
 const named=buildIssue({type:"idea",name:"  Sita *[x](y) @bob ",fields:{idea:"dark mode @alice #12"}});
 assert.ok(!/@[a-z]|#\d/.test(named.body.replace(/@\u200b|#\u200b/g,"")),"mentions and issue links are broken");
 assert.equal(parseReporter(named.body),"Sita xy bob");
 assert.equal(buildIssue({type:"missing-word",fields:{typed:"x"}}).error?.includes("expected"),true,"required field");
 assert.ok(buildIssue({type:"nope",fields:{}}).error);
 assert.ok(buildIssue({type:"idea",fields:{idea:"x".repeat(5000)}}).body.length<LIMITS.field+200,"long text is cut")}

// the report endpoint, with a pretend GitHub and a pretend cache
{const calls=[],real=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify({number:42,html_url:"https://github.com/o/r/issues/42"}),{status:201})};
 const store=new Map(),cache={match:async k=>store.get(k.url)?.clone(),put:async(k,v)=>void store.set(k.url,v)};
 const env={GITHUB_TOKEN:"t0k3n",GITHUB_REPO:"o/r"};
 const post=(body,h={})=>new Request("https://site.test/api/report",{method:"POST",headers:{origin:"https://site.test","content-type":"application/json","cf-connecting-ip":"1.2.3.4",...h},body:typeof body==="string"?body:JSON.stringify(body)});
 const good={type:"missing-word",name:"Sita",fields:{typed:"kunai",expected:"कुनै"}};
 let r=await handleReport(post(good),env,{cache});let j=await r.json();
 assert.equal(r.status,200);assert.deepEqual([j.ok,j.number,j.url],[true,42,"https://github.com/o/r/issues/42"]);
 assert.equal(calls[0].url,"https://api.github.com/repos/o/r/issues");
 assert.equal(calls[0].init.headers.authorization,"Bearer t0k3n");
 assert.equal(JSON.parse(calls[0].init.body).title,"Missing word: kunai");
 assert.equal(calls.length,1);
 for(const[name,req,status] of [
  ["other website",post(good,{origin:"https://evil.test"}),403],["no origin",post(good,{origin:""}),403],
  ["not json",post(good,{"content-type":"text/plain"}),415],["too big",post("x".repeat(LIMITS.body+1)),413],["bad json",post("{nope"),400],
  ["unknown type",post({type:"x",fields:{}}),400],["missing field",post({type:"missing-word",fields:{typed:"a"}}),400]]){
  const x=await handleReport(req,env,{cache:null});assert.equal(x.status,status,name)}
 assert.equal(calls.length,1,"rejected requests never reach GitHub");
 // hidden field: a pretend success, nothing created
 r=await handleReport(post({...good,website:"http://spam"}),env,{cache:null});assert.equal((await r.json()).ok,true);assert.equal(calls.length,1);
 // no token: a clear message, nothing created
 r=await handleReport(post(good),{},{cache:null});assert.equal(r.status,503);
 // rate limit: 5 an hour per address, then 429; another address is fine
 const lim={match:async k=>store.get(k.url)?.clone(),put:async(k,v)=>void store.set(k.url,v)};store.clear();
 for(let i=0;i<LIMITS.perHour;i++)assert.equal((await handleReport(post(good),env,{cache:lim})).status,200);
 assert.equal((await handleReport(post(good),env,{cache:lim})).status,429);
 assert.equal((await handleReport(post(good,{"cf-connecting-ip":"9.9.9.9"}),env,{cache:lim})).status,200);
 // GitHub down or refusing
 globalThis.fetch=async()=>new Response("{}",{status:500});assert.equal((await handleReport(post(good),env,{cache:null})).status,502);
 globalThis.fetch=async()=>{throw new Error("offline")};assert.equal((await handleReport(post(good),env,{cache:null})).status,502);

 // the issue list: pull requests and spam are left out, the reporter name is read, the answer is cached
 const apiIssues=[{number:3,title:"Missing word: a",html_url:"u3",state:"open",labels:[{name:"missing word",color:"0e8a16"}],comments:2,created_at:"2026-01-01",body:"x\n\n---\nReported by **Sita** from the website."},
  {number:4,title:"a pull request",pull_request:{},state:"open",labels:[]},{number:5,title:"buy pills",state:"open",labels:[{name:"spam"}]},
  {number:6,title:"Bug: b",html_url:"u6",state:"closed",state_reason:"not_planned",labels:[],comments:0,created_at:"2026-01-02",closed_at:"2026-01-03",body:""}];
 let n=0;globalThis.fetch=async u=>{n++;return new Response(JSON.stringify(apiIssues),{status:200})};store.clear();
 const get=s=>new Request("https://site.test/api/issues"+s);
 j=await (await handleIssues(get("?state=open"),env,{cache})).json();
 assert.deepEqual(j.issues.map(i=>i.number),[3,6]);assert.equal(j.issues[0].by,"Sita");assert.equal(j.issues[0].solved,false);assert.equal(j.issues[1].solved,false,"closed as not planned is not solved");
 await handleIssues(get("?state=open"),env,{cache});assert.equal(n,1,"second request comes from the cache");
 assert.equal((await (await handleIssues(get("?state=bogus"),env,{cache})).json()).state,"open");
 globalThis.fetch=real}
console.log("report endpoint and issue list checked");

// ---------- a word is always found by its own spelling, and a Romanized spelling is only Roman letters ----------
{const text=readFileSync("src/data/words.txt","utf8"),D=makeDict(text),dev=/[ऀ-ॿ]/;
 const words=text.split("\n").filter(l=>l&&l[0]!=="#").map(l=>l.split(/\s+/)[0]);
 // every dictionary word: it has a Romanized spelling made of Roman letters only, and that spelling finds it again
 const bad=words.filter(w=>{const r=toRoman(w);return !r||dev.test(r)||!D.has(w)||!D.roman(r,300).some(x=>x.u===w)||!D.known(r)});
 assert.deepEqual(bad.slice(0,20),[],"dictionary words not found by their own Romanized spelling ("+bad.length+")");
 // क्ष and ज्ञ with every vowel sign, with a halant, and inside longer words
 const letters=["क्ष","ज्ञ","त्र","श्र","क्त"],extra=["","्न","्य","्म","्र"],out=[];
 for(const c of letters)for(const m of MATRAS)for(const e of extra)for(const pre of ["","श","दि"]){const w=pre+c+e+m;const r=toRoman(w);if(r&&dev.test(r))out.push(w+"→"+r)}
 assert.deepEqual(out.slice(0,10),[],"Romanized spellings that still contain Devanagari ("+out.length+")");
 for(const[w,r] of [["शैक्षिक","shaikshik"],["शिक्षिका","shikshikaa"],["दक्षिण","dakshiN"],["ज्ञानी","gyaanii"]])assert.equal(toRoman(w),r,w);
 // what the report chip decides: a word picked from the suggestions is known; gibberish is not
 assert.equal(D.known("kaaThamaaDauM"),true,"canonical spelling of काठमाडौं");
 assert.equal(D.known("kathmandu"),true);assert.equal(D.known("tapaaiiM"),true);assert.equal(D.known("saMsaar"),true);
 assert.equal(D.known("kunaibhaakhatrenaam"),false);
 assert.equal(D.roman("Hari",1).length>0,true,"a capitalised name still finds the word");
 console.log("dictionary words are found by their own spelling:",words.length)}

// ---------- Preeti mode: typed or pasted Preeti text becomes Unicode and Romanized ----------
{const pasted="d]/f] gfd rGbg xf]. g]kfn sf7df08f}+ df lgjf; h:tf] ;/sf/ cGt/f{li6«o x'G5 .";
 assert.equal(clean(conv(pasted)),"मेरो नाम चन्दन हो। नेपाल काठमाण्डौं मा निवास जस्तो सरकार अन्तर्राष्ट्रिय हुन्छ ।");
 // the same text round-trips: Unicode -> Preeti keys -> Unicode, and its Romanized spelling types back to the same Unicode
 const uni=clean(conv(pasted));assert.equal(clean(conv(toPreeti(uni))),uni);
 assert.equal(roman(toRoman(uni)).u,uni);
 // a paste is just text: tabs, line breaks and doubled spaces come through unchanged
 assert.equal(clean(conv("g]kfn\n\td]/f]  gfd")),"नेपाल\n\tमेरो  नाम");
 console.log("pasted Preeti text converts")}

// Lekh-inspired: texting spellings, assumed reading, paste detection
{const {toReading,looksLikeUnicode,looksLikePreeti,looksLikeRomanized}=await import("./src/scripts/nepali.js");
 const D=makeDict(readFileSync("src/data/words.txt","utf8")),first=s=>D.roman(s)[0]?.u;
 for(const[k,u] of [["vayo","भयो"],["tapaailai","तपाईंलाई"],["kosto","कस्तो"],["paila","पहिला"],["bua","बुवा"],["vako","भएको"]])
  assert.equal(first(k),u,k);
 assert.equal(D.reading("काठमाडौं"),"kathmandu");
 for(const[u,r] of [["कसरी","kasari"],["ललितपुर","lalitpur"],["कृपया","kripaya"],["सहयोग","sahayog"],["सरकार","sarkar"],["गर्छ","garchha"],["धन्यवाद","dhanyabad"],["स्वागत","swagat"]])
  assert.equal(toReading(u),r,u);
 assert.ok(looksLikePreeti("g]kfn d]/f] gfd")&&!looksLikePreeti("namaste hajur"));
 assert.ok(looksLikeUnicode("नेपाल")&&!looksLikeUnicode("nepal"));
 assert.ok(looksLikeRomanized("namaste hajur")&&!looksLikeRomanized("g]kfn"));
 console.log("texting, reading and paste detection")}

// ---------- Direct mode: Romanized words convert in place ----------
{const {runAt,commit,pick,revert,convertAll,hasLatin}=await import("./src/scripts/direct.js");
 // type a text one character at a time, the way the box does: convert after every boundary key
 const typeIn=(s)=>{let v="",c=0;for(const ch of s){v=v.slice(0,c)+ch+v.slice(c);c++;const r=commit(v,c);if(r){v=v.slice(0,r.from)+r.text+v.slice(r.to);c=r.from+r.text.length}}return v};
 assert.equal(typeIn("namaste "),"नमस्ते ");
 assert.equal(typeIn("kaaThamaaDauM ma ghar jaanchhu."),"काठमाडौं म घर जान्छु।");
 assert.equal(typeIn("123 "),"१२३ ");
 assert.equal(typeIn("namaste.."),"नमस्ते.");            // a second . is a full stop
 assert.equal(typeIn("ra'aa "),"रआ ");
 assert.equal(typeIn("namaste\n"),"नमस्ते\n");
 assert.equal(typeIn("namaste, hajur?"),"नमस्ते, हजुर?");
 assert.equal(runAt("नमस्ते kaa",10),"kaa");assert.equal(runAt("नमस्ते ",7),"");assert.equal(runAt("a'",2),"a'");assert.equal(runAt("'",1),"");
 // nothing to do for a space after Devanagari
 assert.equal(commit("नमस्ते ",7),null);
 // Backspace right after a conversion gives the letters back
 {const v="नमस्ते",r=revert(v,6,{end:6,latin:"namaste",uni:"नमस्ते"});assert.deepEqual([r.from,r.to,r.text],[0,6,"namaste"]);
  assert.equal(revert(v,5,{end:6,latin:"namaste",uni:"नमस्ते"}),null);assert.equal(revert(v,6,null),null)}
 // a dictionary word replaces the word at the caret and adds a space
 assert.deepEqual(pick("hajur nep",9,"नेपाल"),{from:6,to:9,text:"नेपाल ",latin:"nep",uni:"नेपाल"});
 assert.equal(convertAll("namaste hajur, ठीक chha"),"नमस्ते हजुर, ठीक छ");
 assert.ok(hasLatin("ठीक chha")&&!hasLatin("ठीक छ a"));
 // a conversion typed letter by letter equals converting the word at once
 for(const w of ["nepaal","dhanyabaad","kRiShi","chhan\\","saMsaar","chaa~d"])assert.equal(typeIn(w+" "),roman(w).u+" ",w);
 // text that arrives in one go converts its finished words, and keeps the last one pending
 {const v="namaste ma ghar.",r=commit(v,v.length,v.length);assert.equal(r.text,"नमस्ते म घर।");
  const w="hajur ghar",q=commit(w,w.length,w.length);assert.equal(q.text,"हजुर ghar");
  const x="ma ghar",y=commit(x,x.length,3);assert.equal(y,null);   // only "ar" typed: still part of the word
  assert.equal(commit("'a ",3,3).text,"'अ ")}   // a quote mark stays
 // the dictionary spelling wins when the literal reading is not a word (kathmandu is काठमाडौं, not कथ्मन्दु)
 {const D=makeDict(readFileSync("src/data/words.txt","utf8")),smart=(run,lit)=>{if(run.length<3||D.core(lit))return null;const w=D.best(run);return w&&w.u!==lit?w.u:null};
  const typeS=s=>{let v="",c=0;for(const ch of s){v+=ch;c++;const r=commit(v,c,1,smart);if(r){v=v.slice(0,r.from)+r.text;c=v.length}}return v};
  assert.equal(typeS("kathmandu "),"काठमाडौं ");assert.equal(typeS("vayo "),"भयो ");assert.equal(typeS("tapaailai "),"तपाईंलाई ");
  assert.equal(typeS("ma "),"म ");assert.equal(typeS("namaste "),"नमस्ते ");
  assert.equal(typeS("pradhanmantri "),"प्रधानमन्त्री ");assert.equal(typeS("sarkar "),"सरकार ");assert.equal(typeS("ghar "),"घर ");
  assert.equal(commit("kathmandu hajur ",16,16,smart).text,"काठमाडौं हजुर ")}
 console.log("direct mode converts words in place")}

// ---------- Preeti output: reported by testers ----------
{// a comma is a comma, not ,m
 assert.equal(toPreeti("तिमी, म"),"ltdL, d");assert.equal(clean(conv(toPreeti("तिमी, म"))),"तिमी, म");
 // ट्र and the other round letters take « for the rakar (| draws a broken ढ), so राष्ट्रिय is /fli6«o
 assert.equal(toPreeti("राष्ट्रिय"),"/fli6«o");
 for(const w of ["राष्ट्रिय","ट्रक","ड्रम","छ्र","ठ्र","ढ्र","ङ्र","क्रम","त्रि","श्री"])assert.equal(clean(conv(toPreeti(w))),w,w);
 // Preeti to Unicode never adds a joiner after a final halant
 assert.equal(conv(";G"),"सन्");assert.ok(!/\u200d/.test(clean(conv("g]kfn ;G"))));
 console.log("commas, round-letter rakar, no joiner")}

// ---------- Preeti .docx -> Unicode .docx ----------
{const {convertDocx,makeZip,readFiles,readZip}=await import("./src/scripts/docx.js");
 const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
 const styles=`<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Nep"><w:rPr><w:rFonts w:ascii="Preeti" w:hAnsi="Preeti"/></w:rPr></w:style></w:styles>`;
 // "l" + ";" is सि: the ि key and its letter sit in different runs; the middle run is English; the last paragraph takes Preeti from its style
 const doc=`<?xml version="1.0"?><w:document ${W}><w:body>`+
  `<w:p><w:r><w:rPr><w:rFonts w:ascii="Preeti" w:hAnsi="Preeti"/><w:sz w:val="28"/></w:rPr><w:t>g]kfn l</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Preeti" w:hAnsi="Preeti"/></w:rPr><w:t>;</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr><w:t xml:space="preserve"> Hello &amp; bye</w:t></w:r></w:p>`+
  `<w:p><w:pPr><w:pStyle w:val="Nep"/></w:pPr><w:r><w:t>d]/f] gfd</w:t></w:r></w:p>`+
  `</w:body></w:document>`;
 const buf=await makeZip({"[Content_Types].xml":"<Types/>","word/document.xml":doc,"word/styles.xml":styles,"word/media/a.bin":"keep me"});
 const r=await convertDocx(buf),files=await readFiles(r.data);
 const texts=[...files["word/document.xml"].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m=>m[1]);
 assert.equal(r.runs,3);
 assert.ok(texts.includes("नेपाल सि"),texts.join("|"));                 // joined across the run edge, ि in the right place
 assert.ok(texts.includes(" Hello & bye".replace("&","&amp;")));         // English run untouched
 assert.ok(texts.includes("मेरो नाम"));                                  // font from the paragraph style
 assert.ok(/<w:rFonts w:ascii="Mangal"/.test(files["word/document.xml"])&&!/Preeti/.test(files["word/document.xml"]));
 assert.ok(/<w:sz w:val="28"\/><w:szCs w:val="28"\/>/.test(files["word/document.xml"]));
 assert.equal(files["word/media/a.bin"],"keep me");assert.equal(readZip(r.data).length,4);
 // a file with no Preeti text reports zero runs and is returned unchanged
 assert.equal((await convertDocx(await makeZip({"word/document.xml":`<w:document ${W}><w:body><w:p><w:r><w:t>hi</w:t></w:r></w:p></w:body></w:document>`}))).runs,0);
 console.log("docx converts")}

// the practice passages type back exactly from their Preeti keys
{const {PASSAGES}=await import("./src/data/passages.js");
 for(const t of PASSAGES)assert.equal(clean(conv(toPreeti(t))),t,t);
 // and every key they need is on the practice page's on-screen keyboard
 {const {R}=await import("./src/scripts/nepali.js"),on=new Set(R.flatMap(([a,b])=>[...a,...b," "]));for(const t of PASSAGES)for(const k of toPreeti(t))assert.ok(on.has(k),t+" needs "+k)}
 console.log(PASSAGES.length,"practice passages round-trip")}

// ---------- every dictionary word, both lists, types back exactly from its Preeti keys ----------
{const words=[...readFileSync("src/data/words.txt","utf8").split("\n").map(l=>l.trim().split(/\s+/)[0]),...readFileSync("src/data/words-ext.txt","utf8").split("\n")].filter(w=>w&&w[0]!=="#");
 const bad=words.filter(w=>clean(conv(toPreeti(w)))!==w);assert.deepEqual(bad,[]);
 // त् then त्र (keys T q) is not त्त then ्र before the hook: उत्क्रोशी
 assert.equal(clean(conv("pTqmf]zL")),"उत्क्रोशी");assert.equal(clean(conv("Qm")),"क्त");assert.equal(clean(conv("Km")),"फ्");
 console.log(words.length,"dictionary words round-trip through Preeti")}

// ---------- next-word suggestions ----------
{const {makePairs}=await import("./src/scripts/nepali.js"),P=makePairs(readFileSync("src/data/pairs.txt","utf8"));
 assert.equal(P.next("मेरो")[0],"नाम");assert.ok(P.next("के").includes("छ"));assert.deepEqual(P.next("zzz"),[]);
 // every line: a word and one to four followers, all clean Devanagari
 for(const l of readFileSync("src/data/pairs.txt","utf8").split("\n").filter(Boolean)){const w=l.split(" ");assert.ok(w.length>=2&&w.length<=5,l);assert.ok(w.every(x=>/^[ऀ-ॿ]+$/.test(x)),l)}
 console.log("next-word pairs load")}
