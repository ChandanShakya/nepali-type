import {R,SH,SH2,KEYS,P,conv,clean,toPreeti,toRoman,toReading,roman,ROMAN,makeDict,looksLikeUnicode,looksLikePreeti,looksLikeRomanized} from "./nepali.js";
import {runAt,commit,pick as dpick,revert,convertAll,hasLatin} from "./direct.js";
import {REPO} from "../data/site.js";
import {REPORTS} from "../data/reports.js";
import {VOWELS,CONSONANT_ROWS,CONSONANTS,MATRAS,CONJUNCTS,PUNCT,SPECIALS,entry,findEntries} from "./charts.js";

// the dictionary is its own file, fetched and built once the page is idle: it never slows the first paint.
// Until it arrives (or if it cannot load) there are simply no word suggestions.
let D={roman:()=>[],prefix:()=>[],known:()=>true,reading:()=>undefined,has:()=>false,size:0};
const dict=()=>D;
(window.requestIdleCallback||setTimeout)(()=>import("../data/words.txt?raw").then(m=>{D=makeDict(m.default);draw()}).catch(()=>{}));

const $=s=>document.querySelector(s);
// localStorage can throw (private mode, blocked storage): the app must still work without it
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

// display only: a trailing halant becomes a true half letter (halant + ZWJ)
const dsp=u=>u.replace(/्(?=\s|$)/g,"्\u200d");
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const ks=s=>[...s].map(c=>c===" "?"<kbd>␣</kbd>":c==="\n"?"<kbd>↵</kbd>":SH[c]?"<kbd>⇧"+esc(SH[c])+"</kbd>":"<kbd>"+esc(c)+"</kbd>").join("");
const sign=v=>/^[ािीुूृेैोौंँः्]/.test(v)?"◌"+v:dsp(v);
function lab(c){if(c==="m")return"mod";const v=P[c];if(v===undefined)return c;return sign(v.replace("\u0001","ि").replace("\u0002","र्"))}
const isHalf=c=>/^.{1,4}्$/.test(P[c]||"");
// a short tick on touch screens only; desktops have no vibration motor
const buzz=matchMedia("(pointer:coarse)").matches&&navigator.vibrate?()=>{try{navigator.vibrate(6)}catch(e){}}:()=>{};

// ?m=roman, ?m=direct or ?m=preeti (the installed app's shortcuts) picks the mode; otherwise the one used last, and a first visit starts in DEFAULT_MODE
const DEFAULT_MODE="roman",MODES={direct:"Direct",roman:"Romanized",preeti:"Preeti"};
const qm=new URLSearchParams(location.search).get("m"),sm=Object.hasOwn(MODES,qm)?qm:store.get("nw-mode");
let mode=Object.hasOwn(MODES,sm)?sm:DEFAULT_MODE;
const fine=matchMedia("(pointer:fine)").matches;
let held=false,shift=0;
const out=$("#out"),rin=$("#rin"),pin=$("#pin"),din=$("#din"),info=$("#info"),sg=$("#sug");
rin.value=store.get("nw-rom")||"";din.value=store.get("nw-dir")||"";
// Preeti mode: the keystrokes live in a real text box, so typing, pasting, selecting and undo all work as usual.
// On a touch screen the on-screen Preeti keyboard types, so the system keyboard stays closed (pasting still works).
pin.value=store.get("nw-buf")||"";pin.setSelectionRange(pin.value.length,pin.value.length);
if(!fine)pin.setAttribute("inputmode","none");

// current text as Unicode (copy-ready) and as Preeti keystrokes
// Direct mode: the text with the Romanized word at the caret shown as Devanagari too (only up to the caret when `upto`)
const vtext=upto=>{const v=din.value,c=din.selectionStart,run=runAt(v,c);return v.slice(0,c-run.length)+roman(run).u+(upto?"":v.slice(c))};
const uni=()=>mode==="roman"?roman(rin.value).u:mode==="direct"?vtext():clean(conv(pin.value));
const preeti=()=>mode==="preeti"?pin.value:toPreeti(uni());
const box=()=>mode==="roman"?rin:mode==="direct"?din:pin;

function chip(cls,main,small,fn){const b=document.createElement("button");b.className="sg "+cls;b.innerHTML="<span class=d>"+main+"</span><small>"+small+"</small>";
 b.onpointerdown=e=>e.preventDefault();// keep the text box focused so the phone keyboard stays open
 b.onclick=()=>{buzz();fn()};return b}

// ---------- saved words (client side only) ----------
let favs=[];try{favs=JSON.parse(store.get("nw-favs"))||[]}catch(e){}
const saveFavs=()=>{store.set("nw-favs",JSON.stringify(favs));drawFavs();const n=$("#favn");n.classList.remove("bump");void n.offsetWidth;n.classList.add("bump")};
// the word the Save button acts on: the last Unicode word typed
const curWord=()=>((mode==="preeti"?clean(conv(before())):mode==="direct"?vtext(true):uni()).trim().split(/\s+/).pop()||"").replace(/[।.,?!()]+$/,"");
// a saved word goes back in as keystrokes for the current mode
function putWord(f){
 if(mode==="roman"&&f.r){insert((/\S$/.test(rin.value.slice(0,rin.selectionStart))?" ":"")+f.r)}
 else if(mode==="preeti"){add((/\S$/.test(before())?" ":"")+toPreeti(f.u))}
 else if(mode==="direct")dtype((/\S$/.test(din.value.slice(0,din.selectionStart))?" ":"")+f.u+" ")
 else cp(f.u);
}
function favChips(){favs.slice(0,12).forEach(f=>sg.appendChild(chip("f",esc(f.u),"★ saved",()=>putWord(f))))}

// a character with no key in the Preeti font is shown marked, like a stray m
const keysHTML=x=>esc(x).replace(/\u0003([^\u0004]*)\u0004|[\u0900-\u097f\u200c\u200d]+/g,(m,a)=>"<span class=sm title='No key for this in the Preeti font'>"+(a??m)+"</span>");
function render(u){
 // a stray Preeti m has no Unicode letter: show it marked instead of silently dropping it
 const h=dsp(u).split("m").map(esc).join(mode==="preeti"?"<span class=sm title='m only joins प उ भ त्र त्त (k p e q Q)'>m</span>":"m");
 out.innerHTML=u?h:(mode==="roman"?"Type English sounds above. <b>namaste</b> → नमस्ते":"Type or paste Preeti text above, or tap the keys below. <b>g]kfn</b> → नेपाल");
 out.classList.toggle("e",!u);
 const cu=mode==="direct"?u:clean(u),c=cu.trim(),w=c?c.split(/\s+/).length:0;
 $("#cnt").textContent=c?w+(w>1?" words · ":" word · ")+[...c].length+" chars":"";
 // Romanized spelling of each word (Preeti mode); a word with no exact spelling is shown as is
 if(mode!=="roman")$("#rom").textContent=cu.split(/(\s+)/).map(w=>/\S/.test(w)?toRoman(w)??w:w).join("");
 // the read-only Preeti copy, with characters that have no key marked (shown in Romanized mode)
 if(mode!=="preeti")$("#pre").innerHTML=keysHTML(toPreeti(uni(),true));
 // the assumed reading: the dictionary's familiar spelling when it has one (काठमाडौं: kathmandu), else the rules.
 // Hidden when it is the same as the exact spelling, because then it says nothing more.
 const asm=cu.split(/(\s+)/).map(w=>/^\s*$/.test(w)?w:dict().reading(w)??toReading(w)).join(""),exact=mode==="roman"?rin.value:$("#rom").textContent;
 $("#asm").textContent=asm;$("#ac").hidden=!asm.trim()||asm.trim().toLowerCase()===exact.trim().toLowerCase();
 $("#echo").textContent=[...cu].length>26?"…"+[...cu].slice(-26).join(""):cu;
 const cw=curWord(),on=!!cw&&favs.some(f=>f.u===cw);
 $("#fav").classList.toggle("on",on);$("#fav").setAttribute("aria-pressed",on);
}

// ---------- Preeti layout mode ----------
const before=()=>pin.value.slice(0,pin.selectionStart);
const lastWord=()=>before().split(/\s/).pop();
// replace `del` keystrokes before the caret (and any selection) with `ins`
function edit(del,ins){pin.setRangeText(ins,pin.selectionStart-del,pin.selectionEnd,"end")}
function add(s){edit(0,s);draw(s)}
const moveTo=k=>{const n=Math.max(0,Math.min(pin.value.length,k));pin.setSelectionRange(n,n);draw()};
// backspace: deletes the selection, or the key before the caret
function back(){if(pin.selectionStart!==pin.selectionEnd)pin.setRangeText("",pin.selectionStart,pin.selectionEnd,"end");else if(pin.selectionStart>0)edit(1,"");draw()}
function tail(){const b=before();let n=1;if(/[|«]$/.test(b))n++;if(/[0iI]f$/.test(b))n=2;return n}
// where the ि key "l" must go: before the whole last conjunct, not just before its last letter
function lpos(w){let st=w.length-Math.min(tail(),w.length);while(st>0&&isHalf(w[st-1]))st--;return st}
function combos(){
 const w=lastWord();if(!w||w.endsWith("l"))return[];
 const base=conv(w),res=[];
 for(const n of KEYS){const r=conv(w+n);if(r!==base+conv(n))res.push({n,r:clean(r)})}
 return res.slice(0,10)}
const SUG=[["ा","f"],["ि","*"],["ी","L"],["ु","'"],["ू",'"'],["े","]"],["ै","}"],["ो","f]"],["ौ","f}"],["ं","+"],["ँ","F"],["ः","M"],["्र","|"],["र्","{"],["ृ","["]];
function drawPreeti(last){
 const raw=conv(pin.value),w=lastWord();
 render(raw);
 let msg="";
 if(last){
  if(last==="m"){const ok=!/m$/.test(raw);msg=ks("m")+(ok?" → <b>hook joined</b>":" → <b>hook only.</b> Joins after <kbd>k</kbd>प <kbd>p</kbd>उ <kbd>e</kbd>भ <kbd>q</kbd>त्र <kbd>Q</kbd>त्त. For म type <kbd>d</kbd>")}
  else msg=ks(last)+" → <b class=d>"+(last.length>1?sign(clean(conv(last))):lab(last))+"</b>";
  if(w){const wu=clean(conv(w)),r=toRoman(wu);msg+=" &nbsp;word <b class=d>"+dsp(wu)+"</b>"+(r?" = <kbd>"+esc(r)+"</kbd>":"")}
 }
 if(!msg)msg=pasteHint();
 info.innerHTML=msg;// empty until a key is typed, so the dock stays small
 sg.innerHTML="";
 // dictionary: finish the word being typed
 const wu=w?clean(conv(w)):"";
 if(/^[\u0900-\u097f]+$/.test(wu))dict().prefix(wu).forEach(x=>sg.appendChild(chip("w",x.u,ks(toPreeti(x.u).slice(0,8)),()=>{edit(w.length,toPreeti(x.u)+" ");draw()})));
 combos().forEach(c=>sg.appendChild(chip("c",dsp(c.r),ks(c.n),()=>add(c.n))));
 if(/[क-ह]$/.test(clean(conv(before())))){
  const st=lpos(w);
  SUG.forEach(([d,k])=>{
   const r=clean(k==="*"?conv(w.slice(0,st)+"l"+w.slice(st)):conv(w+k));
   sg.appendChild(chip("",dsp(r),k==="*"?"<kbd>l</kbd> first":ks(k),()=>{
    if(k==="*"){const c=pin.selectionStart,o=c-w.length+st,v=pin.value;pin.value=v.slice(0,o)+"l"+v.slice(o);pin.setSelectionRange(c+1,c+1);draw("l")}else add(k)}))})}
 if(!sg.children.length)favChips();
}

// What was pasted may belong in the other mode: say so, with a button that moves it there.
function pasteHint(){
 const go=(to,label)=>" <button class=lnk data-sw="+to+">"+label+"</button>";
 if(mode==="direct"){
  const v=din.value,c=din.selectionStart;if(v.trim().length<4)return"";
  if(looksLikePreeti(v))return"Looks like <b>Preeti</b> text."+go("fixp","Convert from Preeti");
  // Latin words elsewhere in the text (a paste, or an English word kept): the word being typed does not count
  return hasLatin(v.slice(0,c-runAt(v,c).length)+" "+v.slice(c))?"Latin letters in the text."+go("latin","Convert them to Nepali"):""}
 const t=(mode==="roman"?rin.value:pin.value).trim();if(t.length<4)return"";
 if(mode==="roman")return looksLikePreeti(t)?"Looks like <b>Preeti</b> text."+go("preeti","Switch to Preeti"):"";
 if(looksLikeUnicode(t))return "Already Unicode: Preeti has no keys for it. To get Preeti, use Romanized."+go("roman","Move it there");
 return looksLikeRomanized(t)?"Looks like <b>Romanized</b> text."+go("roman","Move it to Romanized"):""}
info.addEventListener("pointerdown",e=>{if(e.target.closest("[data-sw]"))e.preventDefault()});// the text box keeps focus, so undo still works
info.addEventListener("click",e=>{const b=e.target.closest("[data-sw]");if(!b)return;const to=b.dataset.sw;
 if(to==="fixp"||to==="latin"){dset(to==="fixp"?clean(conv(din.value)):convertAll(din.value));toast("Converted ✓");return}
 if(to==="roman"){rin.value=pin.value;pin.value=""}else{pin.value=rin.value;rin.value=""}
 setMode(to);toast("Moved to "+(to==="roman"?"Romanized":"Preeti"))});

// ---------- Romanized mode ----------
const VOW=["a","aa","i","ii","u","uu","e","ai","o","au","R"];
const ALL=Object.keys(ROMAN.C).concat(Object.keys(ROMAN.V));
function insert(s){const a=rin.selectionStart,b=rin.selectionEnd;rin.setRangeText(s,a,b,"end");rin.focus();draw()}
// replace the romanized word before the caret with a dictionary word
let firstWord=null;
function pick(r){const e=rin.selectionEnd,a=e-rin.value.slice(0,e).split(/\s/).pop().length;rin.setRangeText(r+" ",a,e,"end");rin.focus();draw()}
function drawRoman(){drawRomanMain();const h=pasteHint();if(h)info.innerHTML=h}
function drawRomanMain(){
 const v=rin.value;
 render(roman(v).u);
 const word=v.slice(0,rin.selectionEnd??v.length).split(/\s/).pop(),toks=roman(word).toks,last=toks.at(-1);
 sg.innerHTML="";
 if(!last){
  firstWord=null;
  info.innerHTML="";
  // a word was just finished and the dictionary has nothing like it: offer to report it
  const pw=v.slice(0,rin.selectionEnd??v.length).trimEnd().split(/\s+/).pop();
  if(pw&&pw.length>=3&&D.size&&!D.known(pw)&&/[\u0915-\u0939]/.test(roman(pw).u)&&!reported().includes(pw))
   sg.appendChild(chip("r","⚑ Report","<kbd>"+esc(pw)+"</kbd> is not in the dictionary",()=>reportForm("missing-word",pw)));
  favChips();["namaste","nepaal","dhanyawaad","maayaa"].forEach(w=>sg.appendChild(chip("",roman(w).u,"<kbd>"+w+"</kbd>",()=>insert(w+" "))));return}
 const wu=roman(word).u,lu=roman(last[0]).u;
 info.innerHTML="<kbd>"+esc(last[0])+"</kbd> → <b class=d>"+(last[1]==="v"?lu+" / ◌"+(ROMAN.V[last[0]][1]||"(a)"):sign(lu))+"</b> &nbsp;word <b class=d>"+dsp(wu)+"</b>";
 // dictionary words that sound like what was typed (nepal -> नेपाल), blue
 const dw=dict().roman(word).filter(x=>x.u!==wu);firstWord=dw[0]||null;
 dw.forEach(x=>sg.appendChild(chip("w",x.u,"<kbd>"+esc(x.r)+"</kbd>",()=>pick(x.r))));
 const seen=new Set([wu]),opt=(suf,cls)=>{const r=roman(word+suf).u;if(seen.has(r))return;seen.add(r);sg.appendChild(chip(cls,dsp(r),"<kbd>+"+esc(suf)+"</kbd>",()=>insert(suf)))};
 // longer tokens that start with what was just typed: k -> kh, s -> sh, a -> aa
 ALL.filter(k=>k.length>last[0].length&&k.startsWith(last[0])).forEach(k=>opt(k.slice(last[0].length),"c"));
 if(last[1]==="c"){VOW.forEach(x=>opt(x,""));opt("\\","")}
 if(last[1]==="c"||last[1]==="v"){opt("M","");opt("~","");opt("H","")}
}

// ---------- Direct mode: type Romanized letters into the text box, Devanagari replaces them when the word ends ----------
// The letters stay in the box while a word is typed (so every keyboard, including phone keyboards that compose text, behaves),
// the chips above the keyboard show what it will become, and space, punctuation or a chip converts it.
let last=null,quiet=false,raf;   // last: the conversion just made {end,latin,uni}, so Backspace can give the letters back
// replace din[from,to) with text. execCommand keeps the browser's own undo (Ctrl+Z undoes a conversion); quiet stops our own edit being converted again
function dedit(from,to,text){
 quiet=true;
 try{din.setSelectionRange(from,to);if(document.activeElement!==din||!document.execCommand("insertText",false,text))din.setRangeText(text,from,to,"end")}
 finally{quiet=false}}
const dset=t=>{dedit(0,din.value.length,t);last=null;draw()};
// type s at the caret (a chart letter, a saved word): the word being typed is converted first
function dtype(s){const v=din.value,c=din.selectionStart,run=runAt(v,c);dedit(c-run.length,din.selectionEnd,(run?roman(run).u:"")+s);last=null;draw()}
// finish the word at the caret with `word` and a space
function dtake(word){const e=dpick(din.value,din.selectionStart,word);dedit(e.from,e.to,e.text);last={end:e.from+word.length,latin:e.latin,uni:word};draw()}
// a finished word that is not a dictionary word but sounds exactly like one becomes that word (kathmandu: काठमाडौं, not कथ्मन्दु).
// Backspace gives the typed letters back, and the chips still offer the literal reading.
const smart=(run,lit)=>{if(run.length<3||!D.size||D.has(lit))return null;const w=D.exact(run);return w&&w.u!==lit?w.u:null};
function dinput(e){
 if(!quiet&&!(e&&(e.isComposing||/^(history|insertFrom)/.test(e.inputType||"")))&&din.selectionStart===din.selectionEnd){
  const r=commit(din.value,din.selectionStart,e&&/^insert(Composition)?Text$/.test(e.inputType)&&e.data?e.data.length:1,smart);
  if(r){dedit(r.from,r.to,r.text);last=r.latin?{end:r.from+r.uni.length,latin:r.latin,uni:r.uni}:null}}
 draw()}
function drawDirect(){
 const v=din.value,c=din.selectionStart,run=runAt(v,c);
 // the other boxes follow the text, one frame later, so typing never waits for them
 cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>render(vtext()));
 sg.innerHTML="";firstWord=null;
 const h=pasteHint();
 if(run){
  const lu=roman(run).u,dw=dict().roman(run).filter(x=>x.u!==lu);firstWord=dw[0]||null;
  info.innerHTML=h||"<kbd>"+esc(run)+"</kbd> → <b class=d>"+dsp(lu)+"</b> &nbsp;<kbd>␣</kbd> types it"+(firstWord?" · <kbd>Tab</kbd> takes <b class=d>"+firstWord.u+"</b>":"");
  sg.appendChild(chip("c",dsp(lu),"<kbd>␣</kbd> space",()=>dtake(lu)));
  dw.forEach(x=>sg.appendChild(chip("w",x.u,"<kbd>"+esc(x.r)+"</kbd>",()=>dtake(x.u))));
  return}
 info.innerHTML=h;
 // a word was just converted and the dictionary has nothing like it: offer to report it
 if(last&&D.size&&last.latin.length>=3&&v.slice(0,c).trimEnd().endsWith(last.uni)&&/[\u0915-\u0939]/.test(last.uni)&&!D.known(last.latin)&&!reported().includes(last.latin))
  sg.appendChild(chip("r","⚑ Report","<kbd>"+esc(last.latin)+"</kbd> is not in the dictionary",()=>reportForm("missing-word",last.latin)));
 favChips();["namaste","nepaal","dhanyawaad","maayaa"].forEach(w=>sg.appendChild(chip("",roman(w).u,"<kbd>"+w+"</kbd>",()=>dtype(roman(w).u+" "))));
}
din.addEventListener("input",dinput);
din.addEventListener("compositionend",()=>dinput());
// Backspace straight after a conversion gives the typed letters back to edit
din.addEventListener("beforeinput",e=>{
 if(e.inputType!=="deleteContentBackward"||!e.cancelable||din.selectionStart!==din.selectionEnd)return;
 const r=revert(din.value,din.selectionStart,last);if(!r)return;
 e.preventDefault();dedit(r.from,r.to,r.text);last=null;draw()});
// Tab takes the first dictionary word, like a phone keyboard's middle suggestion
din.addEventListener("keydown",e=>{if(e.key==="Tab"&&!e.shiftKey&&firstWord&&!e.ctrlKey&&!e.altKey){e.preventDefault();dtake(firstWord.u)}});
din.addEventListener("keyup",e=>{if(e.key.startsWith("Arrow")||e.key==="Home"||e.key==="End")draw()});
din.addEventListener("pointerup",()=>draw());

// ---------- shared ----------
function draw(last){
 if(mode==="roman"){drawRoman();store.set("nw-rom",rin.value)}else if(mode==="direct"){drawDirect();store.set("nw-dir",din.value)}else{drawPreeti(last);store.set("nw-buf",pin.value)}
}
// both modes hold the same text: switching converts it instead of showing an old draft
function carry(m){
 const u=uni();
 if(m==="preeti"){pin.value=toPreeti(u);pin.setSelectionRange(pin.value.length,pin.value.length)}
 else if(m==="direct"){din.value=u;din.setSelectionRange(u.length,u.length);last=null}
 // words with no exact Romanized spelling stay in Devanagari; roman() passes them through unchanged
 else rin.value=u.split(/(\s+)/).map(w=>/\S/.test(w)?toRoman(w)??w:w).join("");
}
function setMode(m){
 mode=m;store.set("nw-mode",m);const cl=document.documentElement.classList;cl.toggle("roman",m!=="preeti");cl.toggle("direct",m==="direct");
 // beside the on-screen Preeti keyboard the key is narrow, so it reads ABC (back to Latin letters)
 const mb=$("#mode");mb.innerHTML=(m==="preeti"?"ABC":MODES[m])+" ▴";
 mb.setAttribute("aria-label","Typing mode: "+MODES[m]+". Change it");mb.title=mb.getAttribute("aria-label");
 menu.querySelectorAll("[data-m]").forEach(b=>{const on=b.dataset.m===m;b.classList.toggle("on",on);b.setAttribute("aria-checked",on)});
 $("#pkl").textContent=m==="preeti"?"Preeti: type or paste":"Preeti Keymap";
 draw();if(fine)box().focus();
}
// the mode key opens a small menu of the three modes
const menu=$("#modes"),showMenu=on=>{menu.hidden=!on;$("#mode").setAttribute("aria-expanded",on)};
$("#mode").onclick=()=>{buzz();showMenu(menu.hidden)};
menu.onclick=e=>{const b=e.target.closest("[data-m]");if(!b)return;buzz();showMenu(false);const m=b.dataset.m;if(m!==mode){carry(m);setMode(m)}};
document.addEventListener("pointerdown",e=>{if(!menu.hidden&&!e.target.closest("#modes,#mode"))showMenu(false)});
rin.addEventListener("input",()=>draw());
// Tab takes the first dictionary word, like a phone keyboard's middle suggestion
rin.addEventListener("keydown",e=>{if(e.key==="Tab"&&!e.shiftKey&&firstWord){e.preventDefault();pick(firstWord.r)}});
// caret moves change which word the hints are for
rin.addEventListener("keyup",e=>{if(e.key.startsWith("Arrow")||e.key==="Home"||e.key==="End")draw()});
rin.addEventListener("click",()=>draw());
// the Preeti box: edits, caret moves and the keys pressed all update the conversion
pin.addEventListener("input",()=>draw());
pin.addEventListener("keyup",e=>{if(e.key.startsWith("Arrow")||e.key==="Home"||e.key==="End")draw()});
pin.addEventListener("pointerup",()=>draw());
pin.addEventListener("keydown",e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.length===1)flash(e.key)});
// Paste button for phones, where the clipboard needs a tap; elsewhere Ctrl+V works in the box
$("#paste").onclick=async()=>{
 try{const t=await navigator.clipboard.readText();if(!t){toast("The clipboard is empty");return}pin.setRangeText(t,pin.selectionStart,pin.selectionEnd,"end");draw();toast("Pasted ✓")}
 catch(e){pin.focus();toast("Press and hold the box, then choose Paste")}};

// on-screen Preeti keyboard
const kb=$("#kb"),keys={};let sb;
function layer(){const s=shift>0||held;Object.entries(keys).forEach(([n,b])=>{const c=s?SH2[n]:n;b.firstElementChild.textContent=c;b.lastElementChild.textContent=lab(c);b.classList.toggle("h",isHalf(c));b.classList.toggle("md",c==="m");b._c=c;b.setAttribute("aria-label",c)});
 sb.classList.toggle("on",s);sb.textContent=shift===2?"⇪":"⇧"}
function key(cls,html,lbl,fn){const b=document.createElement("button");b.className="k "+cls;b.innerHTML=html;if(lbl)b.setAttribute("aria-label",lbl);
 b.onpointerdown=e=>e.preventDefault();// keep the Preeti box focused while keys are tapped
 b.onclick=()=>{buzz();fn(b)};return b}
R.forEach(([a],ri)=>{const r=document.createElement("div");r.className="row";
 if(ri===3)r.appendChild(sb=key("w","","Shift",()=>{shift=(shift+1)%3;layer()}));
 [...a].forEach(c=>r.appendChild(keys[c]=key("d","<i></i><span></span>","",b=>{add(b._c);if(shift===1)shift=0;layer()})));
 kb.appendChild(r)});
// space, backspace and enter share the toolbar row, after the mode switch, chart and saved keys
// dragging the space bar moves the cursor, as on Android keyboards; a plain tap types a space
const sp=key("sp pk","space","Space (drag to move the cursor)",()=>{if(!sp._moved)add(" ")});
sp.onpointerdown=e=>{e.preventDefault();sp._x=e.clientX;sp._moved=false;sp.setPointerCapture(e.pointerId)};
sp.onpointermove=e=>{if(sp._x==null)return;const d=Math.trunc((e.clientX-sp._x)/14);if(d){sp._x+=d*14;sp._moved=true;moveTo(pin.selectionStart+d)}};
sp.onpointerup=sp.onpointercancel=()=>{sp._x=null};
$("#bar").append(sp,key("w pk","⌫","Backspace",back),key("w pk","↵","Enter",()=>add("\n")));
layer();
const flash=c=>{const b=keys[SH[c]||c];if(b){b.classList.add("p");setTimeout(()=>b.classList.remove("p"),120)}};
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){document.body.classList.remove("open");showMenu(false);return}
 if(e.key==="Shift"){held=true;layer();return}
 // typing with nothing focused goes into the Preeti box (on a computer)
 if(mode!=="roman"&&fine&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.length===1&&!/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)&&!document.querySelector("dialog[open]")&&!document.body.classList.contains("open"))box().focus();
});
document.addEventListener("keyup",e=>{if(e.key==="Shift"){held=false;layer()}});
// Shift can get stuck if the window loses focus while it is held
const unheld=()=>{if(held){held=false;layer()}};
window.addEventListener("blur",unheld);
document.addEventListener("visibilitychange",()=>{if(document.hidden)unheld()});

// toast with an optional action (used for Undo)
const tEl=$("#t");let tt;
function toast(m,act,fn,ms){tEl.firstChild.textContent=m;const b=tEl.lastChild;b.textContent=act||"";b.onclick=()=>{fn();tEl.classList.remove("on")};
 tEl.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>tEl.classList.remove("on"),ms||(act?4000:1200))}
// copy: report the real result, with a fallback for browsers/contexts that block the clipboard API
function cp(s){
 if(!s){toast("Nothing to copy yet");return}
 const fb=()=>{let ok=false;try{const a=document.createElement("textarea");a.value=s;a.setAttribute("readonly","");a.style.cssText="position:fixed;top:0;left:0;opacity:0";document.body.appendChild(a);a.select();a.setSelectionRange(0,s.length);ok=document.execCommand("copy");a.remove()}catch(e){}toast(ok?"Copied ✓":"Copy failed")};
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(s).then(()=>toast("Copied ✓"),fb);else fb()}
// corner copy buttons; the icon turns into a tick briefly so the box that was copied is clear
const TICK='<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
document.querySelectorAll(".cc").forEach(b=>{const icon=b.innerHTML;b.onclick=()=>{
 const k=b.dataset.copy,s=k==="uni"?uni():k==="assumed"?$("#asm").textContent:k==="font"?preeti():mode==="roman"?rin.value:$("#rom").textContent;cp(s);if(!s)return;
 b.innerHTML=TICK;b.classList.add("ok");setTimeout(()=>{b.innerHTML=icon;b.classList.remove("ok")},1200)}});
$("#cl").onclick=()=>{
 const b=box(),was=b.value;if(!was)return;
 b.value="";last=null;draw();
 toast("Cleared","Undo",()=>{b.value=was;b.setSelectionRange(was.length,was.length);draw()})};
$("#fav").onclick=()=>{
 const u=curWord();if(!u){toast("Type a word first");return}
 const i=favs.findIndex(f=>f.u===u);
 if(i>=0){const[f]=favs.splice(i,1);saveFavs();draw();toast("Removed "+u,"Undo",()=>{favs.splice(i,0,f);saveFavs();draw()});return}
 // keep the romanized spelling when there is one, so the word can be typed back in that mode
 const r=mode==="roman"?rin.value.trim().split(/\s+/).pop():"";
 favs.unshift(roman(r).u===u?{u,r}:{u});saveFavs();draw();toast("Saved ★ "+u)};

// theme: follows the system until the user picks one
const themeMeta=document.querySelector('meta[name="theme-color"]');
const isDark=()=>document.documentElement.dataset.theme?document.documentElement.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
const syncTheme=()=>{themeMeta.content=isDark()?"#121212":"#faf8f5"};
$("#theme").onclick=()=>{const t=isDark()?"light":"dark";document.documentElement.dataset.theme=t;store.set("nw-theme",t);syncTheme()};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",syncTheme);syncTheme();

// ---------- report a problem ----------
// Default: sent without an account to /api/report, which creates the GitHub issue as the project owner.
// Alternative: open a prefilled GitHub issue under the person's own account. Nothing is posted until a button is pressed.
const clip=(x,n=300)=>{x=String(x??"").trim();return x.length>n?x.slice(0,n)+"…":x};
const reported=()=>{try{return JSON.parse(store.get("nw-rep"))||[]}catch(e){return[]}};
const markReported=w=>w&&store.set("nw-rep",JSON.stringify([...reported(),w].slice(-200)));
// the word the person was working on: Romanized mode reads the box, Preeti mode reads the word at the caret
const workWord=()=>mode==="roman"?rin.value.slice(0,rin.selectionEnd??rin.value.length).trim().split(/\s+/).pop()||"":mode==="direct"?vtext(true).trim().split(/\s+/).pop()||"":before().trim().split(/\s+/).pop()||"";
// what each report starts with, filled in from what is on screen
function reportDefaults(kind,word){
 const w=word??workWord(),roman_=mode==="roman",direct=mode==="direct",shown=roman_||(direct&&word!==undefined)?roman(w).u:direct?w:clean(conv(w));
 return{
  "missing-word":{typed:w,shown},
  "wrong-conversion":{mode:roman_?"Romanized":direct?"Direct (typing in the box)":"Preeti keymap (font keys)",input:roman_?rin.value:direct?din.value:pin.value,unicode:uni(),fontkeys:preeti()},
  "wrong-suggestion":{typed:w},
  "bug":{environment:[navigator.userAgent,innerWidth+"×"+innerHeight,"mode: "+MODES[mode],"theme: "+(isDark()?"dark":"light"),matchMedia("(display-mode: standalone)").matches?"installed app":"browser tab","dictionary words loaded: "+D.size].join("\n")},
  "idea":{}}[kind]}
const rep=$("#rep"),repForm=$("#rep2");
let rkind="",rword="";
const repStep=n=>{["rep1","rep2","rep3"].forEach((id,i)=>$("#"+id).hidden=i+1!==n);$("#repT").textContent=n===3?"Report sent":"Report a problem or idea"};
// step 1 buttons come from the same definitions as the forms
$("#rtypes").innerHTML=Object.entries(REPORTS).map(([k,R])=>"<button type=button data-r="+k+"><b>"+esc(R.label)+"</b><span>"+esc(R.hint)+"</span></button>").join("");
$("#rtypes").onclick=e=>{const b=e.target.closest("[data-r]");if(b)reportForm(b.dataset.r)};
function reportForm(kind,word){
 rkind=kind;rword=word??"";const R=REPORTS[kind],def=reportDefaults(kind,word);
 $("#rep2t").textContent=R.label;$("#rerr").textContent="";
 $("#rf").innerHTML=R.fields.map(f=>"<label class=rfl>"+esc(f.label)+(f.required?" *":"")+(f.long?"<textarea name="+f.id+" rows=3 maxlength=600></textarea>":"<input name="+f.id+" maxlength=300>")+"</label>").join("");
 for(const f of R.fields){const el=repForm.elements[f.id];el.value=clip(def[f.id],f.id==="environment"?500:300);if(/[\u0900-\u097f]/.test(el.value))el.classList.add("d")}
 repForm.elements.name.value=store.get("nw-name")||"";
 repStep(2);if(!rep.open)rep.showModal();
 const first=R.fields.find(f=>f.required&&!repForm.elements[f.id].value);if(first)repForm.elements[first.id].focus()}
const reportValues=()=>Object.fromEntries(REPORTS[rkind].fields.map(f=>[f.id,repForm.elements[f.id].value.trim()]));
const missingField=()=>REPORTS[rkind].fields.find(f=>f.required&&!repForm.elements[f.id].value.trim());
repForm.addEventListener("submit",async e=>{
 e.preventDefault();
 const bad=missingField();if(bad){$("#rerr").textContent="Please fill in “"+bad.label+"”.";repForm.elements[bad.id].focus();return}
 const btn=$("#rsend");btn.disabled=true;btn.textContent="Sending…";$("#rerr").textContent="";
 const name=repForm.elements.name.value.trim();store.set("nw-name",name);
 try{
  const r=await fetch("/api/report",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:rkind,fields:reportValues(),name,website:repForm.elements.website.value})});
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.ok){markReported(rword);reportSent(j)}
  else $("#rerr").textContent=j.error||"The report could not be sent. Please try again, or use “Open on GitHub instead”.";
 }catch(err){$("#rerr").textContent="Could not reach the server. Are you offline? You can try again later, or use “Open on GitHub instead”."}
 btn.disabled=false;btn.textContent="Send report"});
function reportSent(j){
 $("#rdone").innerHTML=j.number?"It is issue <b>#"+j.number+"</b> on GitHub. Open reports are listed on the reports page, and it moves to “Solved” when it is fixed."+(j.url?" <a href=\""+esc(j.url)+"\" target=_blank rel=noopener>View it on GitHub</a>.":""):"Thanks. It will be looked at soon.";
 repStep(3)}
// the same report under the person's own GitHub account
$("#rgh").onclick=()=>{
 if(missingField()){$("#rerr").textContent="Please fill in “"+missingField().label+"”.";return}
 const R=REPORTS[rkind],v=reportValues(),u=new URL(REPO+"/issues/new");
 u.searchParams.set("template",rkind+".yml");u.searchParams.set("title",R.titlePrefix+clip(v[R.titleField],60));
 for(const[id,val] of Object.entries(v))if(val)u.searchParams.set(id,val);
 window.open(u.href,"_blank","noopener");markReported(rword)};
$("#rback").onclick=()=>repStep(1);
$("#rclose").onclick=()=>rep.close();
rep.addEventListener("close",()=>{repStep(1);if(mode!=="preeti")draw()});
const openReport=()=>{repStep(1);rep.showModal()};
$("#report").onclick=()=>{buzz();openReport()};
// a tap outside the card closes it
rep.addEventListener("click",e=>{if(e.target===rep)rep.close()});
if(new URLSearchParams(location.search).has("report"))openReport();

// welcome video: once on the first visit, then from Help
const intro=$("#intro"),iv=intro.querySelector("video");
// marked as seen when shown, so it never comes back on its own even if the tab is closed with it open
const openIntro=()=>{intro.showModal();store.set("nw-intro","1");iv.play().catch(()=>{})};
intro.addEventListener("close",()=>iv.pause());
if(!store.get("nw-intro"))openIntro();

// top bar can be hidden for more room; remembered
const setHd=on=>{document.documentElement.classList.toggle("hd-off",!on);store.set("nw-hd",on?"1":"0")};
$("#hidehd").onclick=()=>setHd(false);$("#showhd").onclick=()=>{buzz();setHd(true)};

// iOS Safari ignores interactive-widget: size the app to the visible area so the dock sits above the keyboard
if(window.visualViewport){const vv=visualViewport,fit=()=>{document.documentElement.style.setProperty("--vh",vv.height+"px");if(vv.offsetTop)scrollTo(0,0)};vv.addEventListener("resize",fit);fit()}

// A new version took over while the page was open (the service worker updates itself): say so and offer a reload.
// What was typed is saved, so reloading loses nothing. The page also asks for updates every hour it stays open.
if("serviceWorker" in navigator){
 const had=!!navigator.serviceWorker.controller;   // false on the very first visit, which is not an update
 navigator.serviceWorker.addEventListener("controllerchange",()=>{if(had)toast("A new version is ready","Reload",()=>location.reload(),15000)});
 navigator.serviceWorker.ready.then(r=>setInterval(()=>r.update().catch(()=>{}),36e5)).catch(()=>{})}

// install (PWA): Chrome/Edge/Android fire beforeinstallprompt; elsewhere the button stays hidden
let deferred;const inst=$("#inst");
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;inst.hidden=false});
addEventListener("appinstalled",()=>{inst.hidden=true;deferred=null});
inst.onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;inst.hidden=true};

// ---------- chart sheet: the same alphabet as the /chart/ cheatsheet (scripts/charts.js) ----------
const TABS=[["f","★ Saved"],["v","Vowels"],["c","Consonants"],["b","Vowel table"],["h","Half letters"],["j","Conjuncts"],["s","Signs & digits"],["x","Specials"],["i","Help"]];
const tabs=$("#tabs"),body=$("#body");
TABS.forEach(([id,t])=>{const b=document.createElement("button");b.className="tb";b.textContent=t;b.onclick=()=>show(id);b.dataset.t=id;tabs.appendChild(b);
 const p=document.createElement("div");p.className="pn";p.id="p-"+id;body.appendChild(p)});
function show(id){if(id!=="q")lastTab=id;if($("#cq").value&&id!=="q")$("#cq").value="";tabs.querySelectorAll(".tb").forEach(b=>b.classList.toggle("on",b.dataset.t===id));body.querySelectorAll(".pn").forEach(p=>p.classList.toggle("on",p.id==="p-"+id))}
function grid(id,items){const g=document.createElement("div");g.className="g";items.forEach(([html,fn,cls])=>{const b=document.createElement("button");b.className="ch "+(cls||"");b.innerHTML=html;b.onclick=fn;g.appendChild(b)});$("#p-"+id).appendChild(g);return g}
const note=(id,t)=>{const p=document.createElement("p");p.className="nt";p.innerHTML=t;$("#p-"+id).appendChild(p)};
// a chart cell: the letter, its Romanized spelling (blue) and its font keys (grey)
const cellHTML=(e,label)=>"<span class=d>"+(label??dsp(e.u))+"</span><kbd class=kr>"+(e.r?esc(e.r):"—")+"</kbd><kbd>"+(e.p?esc(e.p):"—")+"</kbd>"+(e.code?"<small>Alt+"+e.code+"</small>":"");
// tapping types the entry in the current mode. Romanized: the word is re-spelled so letters never merge (क then ख gives कख, not क्ख)
function typeEntry(e){
 // with no key in the current mode the Unicode letter goes in as is; both converters pass it through
 if(mode==="preeti"){add(e.p??e.u);if(!e.p)toast("No font key: added as Unicode");return}
 if(mode==="direct"){dtype(e.u);return}
 if(!e.r){rin.setRangeText(e.u,rin.selectionStart,rin.selectionEnd,"end");draw();return}
 const end=rin.selectionEnd,w=rin.value.slice(0,end).split(/\s/).pop(),start=end-w.length;
 const u=roman(w+(w&&!/\s$/.test(w)?"'":"")+e.r).u;
 rin.setRangeText(toRoman(u)??(w+"'"+e.r),start,end,"end");draw()}
const cells=(id,list,label)=>grid(id,list.map(u=>{const e=entry(u);return[cellHTML(e,label?.(u)),()=>typeEntry(e)]}));
function drawFavs(){
 const p=$("#p-f");p.innerHTML="";$("#favn").textContent=favs.length||"";
 if(!favs.length){note("f","No saved words yet. Type a word and press <b>★ Save</b>. Saved words stay on this device and show up in the suggestion bar.");return}
 note("f","Tap a word to type it. Saved words stay on this device only.");
 grid("f",favs.map((f,i)=>["<span class=d>"+esc(f.u)+"</span><kbd>"+esc(f.r||toPreeti(f.u))+"</kbd><span class=x role=button aria-label='Remove'>×</span>",
  e=>{if(e.target.classList.contains("x")){favs.splice(i,1);saveFavs();draw()}else{document.body.classList.remove("open");putWord(f)}}]));
}
drawFavs();
// chart contents are built the first time the sheet opens, keeping page load light
let built=false;
function buildChart(){if(built)return;built=true;
const LEGEND="Each cell: the letter, its <kbd class=kr>Romanized</kbd> spelling and its <kbd>font</kbd> keys. Tap to type it.";
note("v",LEGEND);cells("v",VOWELS);
note("v","After a consonant, vowels become signs: see the <b>Vowel table</b>.");
note("c",LEGEND);CONSONANT_ROWS.forEach(r=>cells("c",r));
note("c","Romanized: a consonant alone keeps its <b>a</b> sound; two in a row join (<kbd class=kr>kt</kbd> क्त). Capitals matter: <kbd class=kr>t</kbd> त, <kbd class=kr>T</kbd> ट. Also: <kbd class=kr>f</kbd> फ, <kbd class=kr>v</kbd> व, <kbd class=kr>x</kbd> क्ष.");
note("b","Every consonant with every vowel sign (बाह्रखरी). Tap one to type it.");
$("#p-b").insertAdjacentHTML("beforeend","<div class=jump aria-label=\"Jump to a letter\">"+CONSONANTS.map((c,i)=>"<button data-j="+i+">"+c+"</button>").join("")+"</div><div class=vt>"+CONSONANTS.map((c,i)=>"<div class=vr id=vr"+i+"><b class=d>"+c+"</b><div class=vc>"+MATRAS.map(m=>{const e=entry(c+m);return"<button data-u=\""+e.u+"\"><span class=d>"+e.u+"</span><kbd class=kr>"+esc(e.r)+"</kbd><kbd>"+(e.p?esc(e.p):"—")+"</kbd></button>"}).join("")+"</div></div>").join("")+"</div>");
$("#p-b").onclick=e=>{const j=e.target.closest("[data-j]");if(j){$("#vr"+j.dataset.j).scrollIntoView({block:"start",behavior:"smooth"});return}const b=e.target.closest("[data-u]");if(b)typeEntry(entry(b.dataset.u))};
note("h","A half letter joins the next one: <kbd class=kr>k</kbd>+<kbd class=kr>t</kbd> or <kbd>S</kbd>+<kbd>t</kbd> gives क्त.");
grid("h",CONSONANTS.map(c=>{const e=entry(c+"्");return[cellHTML(e),()=>typeEntry(e),"h"]}));
note("j","Common conjuncts.");cells("j",CONJUNCTS);
note("s","Punctuation and digits.");cells("s",PUNCT);
note("x","The Preeti font's extra glyphs: conjuncts, ॐ ऽ and punctuation (<kbd>Û</kbd> is !, <kbd>Ù</kbd> is ;, <kbd>÷</kbd> is /). In Windows apps they need the Alt code shown; here you just tap them.");
grid("x",SPECIALS.map(e=>[cellHTML(e,sign(e.u)),()=>typeEntry(e)]));
note("s","Signs: <kbd class=kr>M</kbd> <kbd>+</kbd> ं &nbsp;<kbd class=kr>~</kbd> <kbd>F</kbd> ँ &nbsp;<kbd class=kr>H</kbd> <kbd>M</kbd> ः &nbsp;<kbd class=kr>\\</kbd> <kbd>\\</kbd> halant ्. Romanized <kbd class=kr>'</kbd> keeps letters apart (<kbd class=kr>ra'aa</kbd> रआ). Font keys: <kbd>m</kbd> is a hook (<kbd>km</kbd> फ, <kbd>em</kbd> झ, <kbd>pm</kbd> ऊ).");
$("#p-i").innerHTML="<p class=nt><button class='bt p' id=watch>▶ Watch the demo</button> <a class=bt href=/chart/>Full cheatsheet</a> <button class=bt id=helprep>⚑ Report a problem or idea</button> <a class=bt href=/issues/>Open &amp; solved reports</a> <a class=bt href='"+$(".ib[href*=github]").href+"' target=_blank rel=noopener>GitHub</a></p><ul class=nt><li><b>Romanized</b>: type English sounds and get Unicode plus the matching Devanagari font keystrokes. Works with any phone keyboard. Blue suggestions are dictionary words: tap one (or press <kbd>Tab</kbd>) to use it.</li><li><b>Assumed</b>: under the Romanized box, a card shows how the text is likely said in plain letters (काठमाडौं → <i>kathmandu</i>). It has its own copy button and hides when it matches the exact spelling.</li><li>If you paste text that belongs in the other mode (Preeti keys in Romanized, or the reverse), a hint offers a one-tap switch that moves it for you. In Direct mode it converts the text in place.</li><li><b>Direct</b>: type Romanized letters straight in the Unicode box. Each word turns into Nepali when you press space, punctuation or Enter (a word that sounds exactly like a dictionary word becomes it: kathmandu → काठमाडौं). <b>Backspace right after a conversion gives your letters back</b>; <kbd>Tab</kbd> or a blue chip picks a dictionary word.</li><li>Change the mode with the key at the bottom left (<b>Direct</b>, <b>Romanized</b>, <b>Preeti</b>). <b>Chart</b> and <b>★ Saved</b> sit next to it. Hide the top bar with <b>⌃</b> for more room.</li><li><b>Preeti</b> mode (pick it in the mode menu; the key then reads <b>ABC</b>): <b>type</b> with your keyboard exactly as you would in Word with the Preeti font, or <b>paste</b> Preeti text, for example copied from a Word file. It becomes Unicode and Romanized at once. On a phone use the on-screen Preeti keyboard and the <b>Paste</b> button. It is the most widely used Preeti layout, so the text shows correctly in Preeti and fonts that share its layout.</li><li><b>Move the cursor</b> in the Preeti box by tapping or clicking in it, dragging the space bar, or with the arrow keys. Typing, ⌫ and the on-screen keys work at the cursor.</li><li><b>★ Save</b> keeps the last word on this device. Saved words appear in the suggestion bar when you start a new word.</li><li><b>⇧</b> Shift: tap once for the next key, twice to lock, three times to release. On a physical keyboard just hold Shift.</li><li>Every chart cell shows the letter, its <b class=kr>Romanized spelling</b> (blue) and its <b>font keys</b> (grey). Tap it to type it in the current mode. The <a href=/chart/>cheatsheet page</a> uses the same chart.</li><li><b>Blue keys</b> on the font keyboard are half letters. They join with the next letter to make a conjunct.</li><li><b>ि</b> is typed before the letter or conjunct (<kbd>l</kbd>, then the letter). It is placed correctly for you.</li><li><b>Reph र्</b> is typed after the letter it sits over: <kbd>c</kbd><kbd>y</kbd><kbd>⇧[</kbd> gives अर्थ.</li><li><b>m</b> is not a letter. In the font it is a hook that changes the letter before it: <kbd>k</kbd><kbd>m</kbd> फ, <kbd>p</kbd><kbd>m</kbd> ऊ, <kbd>e</kbd><kbd>m</kbd> झ, <kbd>q</kbd><kbd>m</kbd> क्र, <kbd>Q</kbd><kbd>m</kbd> क्त. Anywhere else it shows as a red <span class=sm>m</span> and is left out when you copy. For म type <kbd>d</kbd>.</li><li><b>0f</b>, <b>if</b> and <b>If</b> are single letters (ण, ष, क्ष).</li><li>A <span class=sm>red</span> character in the Devanagari font box has no key in the Preeti font, for example - : @ and letters like ऑ ॉ. (Some punctuation does have a glyph in the Specials tab, like <b>Û</b> for !.) It is kept as it is, but it will not show correctly in a Preeti document.</li><li>The font layout assumes US QWERTY.</li><li>Install it with the <b>Install</b> button (Chrome, Edge, Android) or Share → Add to Home Screen (iPhone). It works offline, updates itself, and asks you to reload when a new version is ready. Once installed, long-press the icon for shortcuts: Direct, Romanized, Preeti, Cheatsheet.</li></ul>";
$("#watch").onclick=()=>{document.body.classList.remove("open");openIntro()};
$("#helprep").onclick=()=>{document.body.classList.remove("open");openReport()};
}
// Find: shows every chart entry matching the query; empty query goes back to the open tab
let lastTab="c";
$("#cq").addEventListener("input",()=>{
 buildChart();const q=$("#cq").value.trim(),p=$("#p-q");
 if(!q){show(lastTab);return}
 p.innerHTML="";const hits=findEntries(q);
 if(!hits.length)note("q","Nothing found for <b>"+esc(q)+"</b>. Try a Romanized spelling (<kbd class=kr>kha</kbd>), a font key (<kbd>v</kbd>) or a Devanagari letter.");
 else grid("q",hits.map(e=>[cellHTML(e,e.u.endsWith("्")?dsp(e.u):undefined),()=>typeEntry(e)]));
 body.querySelectorAll(".pn").forEach(x=>x.classList.toggle("on",x.id==="p-q"));tabs.querySelectorAll(".tb").forEach(b=>b.classList.remove("on"))});
const openSheet=id=>{buildChart();document.body.classList.add("open");show(id)};
$("#chart").onclick=()=>{buzz();openSheet("c")};$("#saved").onclick=()=>{buzz();openSheet("f")};
$("#x").onclick=$("#bd").onclick=()=>document.body.classList.remove("open");
setMode(mode);
