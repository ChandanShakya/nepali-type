import {R,SH,SH2,KEYS,P,conv,clean,toPreeti,roman,ROMAN,makeDict} from "./nepali.js";
import words from "../data/words.txt?raw";

const dict=makeDict(words);

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

let mode=store.get("nw-mode")==="preeti"?"preeti":"roman";
const fine=matchMedia("(pointer:fine)").matches;
let buf=store.get("nw-buf")||"",held=false,shift=0;
const out=$("#out"),rin=$("#rin"),info=$("#info"),sg=$("#sug");
rin.value=store.get("nw-rom")||"";

// current text as Unicode (copy-ready) and as Preeti keystrokes
const uni=()=>mode==="roman"?roman(rin.value).u:clean(conv(buf));
const preeti=()=>mode==="roman"?toPreeti(uni()):buf;

function chip(cls,main,small,fn){const b=document.createElement("button");b.className="sg "+cls;b.innerHTML="<span class=d>"+main+"</span><small>"+small+"</small>";
 b.onpointerdown=e=>e.preventDefault();// keep the text box focused so the phone keyboard stays open
 b.onclick=()=>{buzz();fn()};return b}
function empty(t){const s=document.createElement("span");s.className="hint0";s.innerHTML=t;sg.appendChild(s)}

// ---------- saved words (client side only) ----------
let favs=[];try{favs=JSON.parse(store.get("nw-favs"))||[]}catch(e){}
const saveFavs=()=>{store.set("nw-favs",JSON.stringify(favs));drawFavs();const n=$("#favn");n.classList.remove("bump");void n.offsetWidth;n.classList.add("bump")};
// the word the Save button acts on: the last Unicode word typed
const curWord=()=>(uni().trim().split(/\s+/).pop()||"").replace(/[।.,?!()]+$/,"");
// a saved word goes back in as keystrokes for the current mode
function putWord(f){
 if(mode==="roman"&&f.r){insert((/\S$/.test(rin.value.slice(0,rin.selectionStart))?" ":"")+f.r)}
 else if(mode==="preeti"){add((/\S$/.test(buf)?" ":"")+toPreeti(f.u))}
 else cp(f.u);
}
function favChips(){favs.slice(0,12).forEach(f=>sg.appendChild(chip("f",esc(f.u),"★ saved",()=>putWord(f))))}

function render(u){
 // a stray Preeti m has no Unicode letter: show it marked instead of silently dropping it
 const h=dsp(u).split("m").map(esc).join(mode==="preeti"?"<span class=sm title='m only joins प उ भ त्र त्त (k p e q Q)'>m</span>":"m");
 out.innerHTML=h||(mode==="roman"?"Type English sounds above. <b>namaste</b> → नमस्ते":"Tap the keys below, or type on your keyboard as you would with the Preeti font.");
 out.classList.toggle("e",!u);
 const c=clean(u).trim(),w=c?c.split(/\s+/).length:0;
 $("#cnt").textContent=c?w+(w>1?" words · ":" word · ")+[...c].length+" chars":"";
 $("#pre").textContent=preeti();
 const cw=curWord(),on=!!cw&&favs.some(f=>f.u===cw);
 $("#fav").classList.toggle("on",on);$("#fav").setAttribute("aria-pressed",on);
}

// ---------- Preeti layout mode ----------
const lastWord=()=>buf.split(/\s/).pop();
function add(s){buf+=s;draw(s)}
function tail(){let n=1;if(/[|«]$/.test(buf))n++;if(/[0iI]f$/.test(buf))n=2;return n}
// where the ि key "l" must go: before the whole last conjunct, not just before its last letter
function lpos(w){let st=w.length-Math.min(tail(),w.length);while(st>0&&isHalf(w[st-1]))st--;return st}
function combos(){
 const w=lastWord();if(!w||w.endsWith("l"))return[];
 const base=conv(w),res=[];
 for(const n of KEYS){const r=conv(w+n);if(r!==base+conv(n))res.push({n,r:clean(r)})}
 return res.slice(0,10)}
const SUG=[["ा","f"],["ि","*"],["ी","L"],["ु","'"],["ू",'"'],["े","]"],["ै","}"],["ो","f]"],["ौ","f}"],["ं","+"],["ँ","F"],["ः","M"],["्र","|"],["र्","{"],["ृ","["]];
function drawPreeti(last){
 const raw=conv(buf),w=lastWord();
 render(raw);
 let msg="";
 if(last){
  if(last==="m"){const ok=!/m$/.test(raw);msg=ks("m")+(ok?" → <b>hook joined</b>":" → <b>hook only.</b> Joins after <kbd>k</kbd>प <kbd>p</kbd>उ <kbd>e</kbd>भ <kbd>q</kbd>त्र <kbd>Q</kbd>त्त. For म type <kbd>d</kbd>")}
  else msg=ks(last)+" → <b class=d>"+(last.length>1?sign(clean(conv(last))):lab(last))+"</b>";
  if(w)msg+=" &nbsp;word <b class=d>"+dsp(clean(conv(w)))+"</b>";
 }
 info.innerHTML=msg||"Each key is one Preeti glyph, just like in Word or LibreOffice";
 sg.innerHTML="";
 // dictionary: finish the word being typed
 const wu=w?clean(conv(w)):"";
 if(/^[\u0900-\u097f]+$/.test(wu))dict.prefix(wu).forEach(x=>sg.appendChild(chip("w",x.u,ks(toPreeti(x.u).slice(0,8)),()=>{buf=buf.slice(0,buf.length-w.length)+toPreeti(x.u)+" ";draw()})));
 combos().forEach(c=>sg.appendChild(chip("c",dsp(c.r),ks(c.n),()=>add(c.n))));
 if(/[क-ह]$/.test(clean(raw))){
  const st=lpos(w);
  SUG.forEach(([d,k])=>{
   const r=clean(k==="*"?conv(w.slice(0,st)+"l"+w.slice(st)):conv(w+k));
   sg.appendChild(chip("",dsp(r),k==="*"?"<kbd>l</kbd> first":ks(k),()=>{
    if(k==="*"){const o=buf.length-w.length+st;buf=buf.slice(0,o)+"l"+buf.slice(o);draw("l")}else add(k)}))})}
 if(!sg.children.length){favChips();if(!sg.children.length)empty("Suggestions appear here after a letter")}
}

// ---------- Romanized mode ----------
const VOW=["a","aa","i","ii","u","uu","e","ai","o","au","R"];
const ALL=Object.keys(ROMAN.C).concat(Object.keys(ROMAN.V));
function insert(s){const a=rin.selectionStart,b=rin.selectionEnd;rin.setRangeText(s,a,b,"end");rin.focus();draw()}
// replace the romanized word before the caret with a dictionary word
let firstWord=null;
function pick(r){const e=rin.selectionEnd,a=e-rin.value.slice(0,e).split(/\s/).pop().length;rin.setRangeText(r+" ",a,e,"end");rin.focus();draw()}
function drawRoman(){
 const v=rin.value;
 render(roman(v).u);
 const word=v.slice(0,rin.selectionEnd??v.length).split(/\s/).pop(),toks=roman(word).toks,last=toks.at(-1);
 sg.innerHTML="";
 if(!last){
  firstWord=null;
  info.innerHTML="<kbd>ka</kbd> क <kbd>kaa</kbd> का <kbd>ki</kbd> कि <kbd>kh</kbd> ख <kbd>T</kbd> ट <kbd>sh</kbd> श"+(fine?" · <kbd>Tab</kbd> picks the blue word":"");
  favChips();["namaste","nepaal","dhanyabaad","maayaa"].forEach(w=>sg.appendChild(chip("",roman(w).u,"<kbd>"+w+"</kbd>",()=>insert(w+" "))));return}
 const wu=roman(word).u,lu=roman(last[0]).u;
 info.innerHTML="<kbd>"+esc(last[0])+"</kbd> → <b class=d>"+(last[1]==="v"?lu+" / ◌"+(ROMAN.V[last[0]][1]||"(a)"):sign(lu))+"</b> &nbsp;word <b class=d>"+dsp(wu)+"</b>";
 // dictionary words that sound like what was typed (nepal -> नेपाल), blue
 const dw=dict.roman(word).filter(x=>x.u!==wu);firstWord=dw[0]||null;
 dw.forEach(x=>sg.appendChild(chip("w",x.u,"<kbd>"+esc(x.r)+"</kbd>",()=>pick(x.r))));
 const seen=new Set([wu]),opt=(suf,cls)=>{const r=roman(word+suf).u;if(seen.has(r))return;seen.add(r);sg.appendChild(chip(cls,dsp(r),"<kbd>+"+esc(suf)+"</kbd>",()=>insert(suf)))};
 // longer tokens that start with what was just typed: k -> kh, s -> sh, a -> aa
 ALL.filter(k=>k.length>last[0].length&&k.startsWith(last[0])).forEach(k=>opt(k.slice(last[0].length),"c"));
 if(last[1]==="c"){VOW.forEach(x=>opt(x,""));opt("\\","")}
 if(last[1]==="c"||last[1]==="v"){opt("M","");opt("~","");opt("H","")}
 if(!sg.children.length)empty("Keep typing…");
}

// ---------- shared ----------
function draw(last){
 if(mode==="roman"){drawRoman();store.set("nw-rom",rin.value)}else{drawPreeti(last);store.set("nw-buf",buf)}
 // keep the newest text in view while tapping keys (not while the text box is being edited)
 const top=$("#top");if(document.activeElement!==rin)top.scrollTop=top.scrollHeight;
}
function setMode(m){
 mode=m;store.set("nw-mode",m);document.body.classList.toggle("roman",m==="roman");
 rin.hidden=m!=="roman";
 const mb=$("#mode");mb.innerHTML=m==="roman"?"⌨ <span class=tx>Preeti keys</span><span class=d aria-hidden=true>&nbsp;s→क</span>":"ABC";
 mb.setAttribute("aria-label",m==="roman"?"Switch to Preeti keys":"Switch to Romanized");mb.title=mb.getAttribute("aria-label");
 document.querySelectorAll("[data-mode]").forEach(e=>e.hidden=e.dataset.mode!==m);
 draw();if(m==="roman"&&fine)rin.focus();
}
$("#mode").onclick=()=>{buzz();setMode(mode==="roman"?"preeti":"roman")};
rin.addEventListener("input",()=>draw());
// Tab takes the first dictionary word, like a phone keyboard's middle suggestion
rin.addEventListener("keydown",e=>{if(e.key==="Tab"&&!e.shiftKey&&firstWord){e.preventDefault();pick(firstWord.r)}});
// caret moves change which word the hints are for
rin.addEventListener("keyup",e=>{if(e.key.startsWith("Arrow")||e.key==="Home"||e.key==="End")draw()});
rin.addEventListener("click",()=>draw());

// on-screen Preeti keyboard
const kb=$("#kb"),keys={};let sb;
function layer(){const s=shift>0||held;Object.entries(keys).forEach(([n,b])=>{const c=s?SH2[n]:n;b.firstElementChild.textContent=c;b.lastElementChild.textContent=lab(c);b.classList.toggle("h",isHalf(c));b.classList.toggle("md",c==="m");b._c=c;b.setAttribute("aria-label",c)});
 sb.classList.toggle("on",s);sb.textContent=shift===2?"⇪":"⇧"}
function key(cls,html,lbl,fn){const b=document.createElement("button");b.className="k "+cls;b.innerHTML=html;if(lbl)b.setAttribute("aria-label",lbl);b.onclick=()=>{buzz();fn(b)};return b}
R.forEach(([a],ri)=>{const r=document.createElement("div");r.className="row";
 if(ri===3)r.appendChild(sb=key("w","","Shift",()=>{shift=(shift+1)%3;layer()}));
 [...a].forEach(c=>r.appendChild(keys[c]=key("d","<i></i><span></span>","",b=>{add(b._c);if(shift===1)shift=0;layer()})));
 kb.appendChild(r)});
// space, backspace and enter share the toolbar row, after the mode switch, chart and saved keys
$("#bar").append(key("sp pk","space","Space",()=>add(" ")),key("w pk","⌫","Backspace",()=>{buf=buf.slice(0,-1);draw()}),key("w pk","↵","Enter",()=>add("\n")));
layer();
const flash=c=>{const b=keys[SH[c]||c];if(b){b.classList.add("p");setTimeout(()=>b.classList.remove("p"),120)}};
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){document.body.classList.remove("open");return}
 if(e.key==="Shift"){held=true;layer();return}
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 const t=e.target.tagName;if(t==="INPUT"||t==="TEXTAREA"||mode!=="preeti"||document.body.classList.contains("open"))return;
 if(e.key==="Backspace"){e.preventDefault();buf=buf.slice(0,-1);draw();return}
 if(e.key==="Enter"){e.preventDefault();add("\n");return}
 if(e.key===" "){e.preventDefault();add(" ");return}
 if(e.key.length===1&&(P[e.key]!==undefined||e.key==="m")){e.preventDefault();flash(e.key);add(e.key)}
});
document.addEventListener("keyup",e=>{if(e.key==="Shift"){held=false;layer()}});
// Shift can get stuck if the window loses focus while it is held
const unheld=()=>{if(held){held=false;layer()}};
window.addEventListener("blur",unheld);
document.addEventListener("visibilitychange",()=>{if(document.hidden)unheld()});

// toast with an optional action (used for Undo)
const tEl=$("#t");let tt;
function toast(m,act,fn){tEl.firstChild.textContent=m;const b=tEl.lastChild;b.textContent=act||"";b.onclick=()=>{fn();tEl.classList.remove("on")};
 tEl.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>tEl.classList.remove("on"),act?4000:1200)}
// copy: report the real result, with a fallback for browsers/contexts that block the clipboard API
function cp(s){
 if(!s){toast("Nothing to copy yet");return}
 const fb=()=>{let ok=false;try{const a=document.createElement("textarea");a.value=s;a.setAttribute("readonly","");a.style.cssText="position:fixed;top:0;left:0;opacity:0";document.body.appendChild(a);a.select();a.setSelectionRange(0,s.length);ok=document.execCommand("copy");a.remove()}catch(e){}toast(ok?"Copied ✓":"Copy failed")};
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(s).then(()=>toast("Copied ✓"),fb);else fb()}
$("#c1").onclick=()=>cp(uni());$("#c2").onclick=()=>cp(preeti());
$("#cl").onclick=()=>{
 const was=mode==="roman"?rin.value:buf;if(!was)return;
 if(mode==="roman")rin.value="";else buf="";draw();
 toast("Cleared","Undo",()=>{if(mode==="roman")rin.value=was;else buf=was;draw()})};
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

// top bar can be hidden for more room; remembered
const setHd=on=>{document.documentElement.classList.toggle("hd-off",!on);store.set("nw-hd",on?"1":"0")};
$("#hidehd").onclick=()=>setHd(false);$("#showhd").onclick=()=>setHd(true);

// iOS Safari ignores interactive-widget: size the app to the visible area so the dock sits above the keyboard
if(window.visualViewport){const vv=visualViewport,fit=()=>{document.documentElement.style.setProperty("--vh",vv.height+"px");if(vv.offsetTop)scrollTo(0,0)};vv.addEventListener("resize",fit);fit()}

// install (PWA): Chrome/Edge/Android fire beforeinstallprompt; elsewhere the button stays hidden
let deferred;const inst=$("#inst");
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;inst.hidden=false});
addEventListener("appinstalled",()=>{inst.hidden=true;deferred=null});
inst.onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;inst.hidden=true};

// ---------- chart sheet. Tabs tagged with a mode only show in that mode ----------
const TABS=[["f","★ Saved"],["r","Romanized","roman"],["v","Vowels","preeti"],["c","Letters","preeti"],["h","Half forms","preeti"],["j","Conjuncts","preeti"],["s","Special","preeti"],["n","Digits","preeti"],["b","Table","preeti"],["i","Help"]];
const tabs=$("#tabs"),body=$("#body");
TABS.forEach(([id,t,m])=>{const b=document.createElement("button");b.className="tb";b.textContent=t;b.onclick=()=>show(id);b.dataset.t=id;if(m)b.dataset.mode=m;tabs.appendChild(b);
 const p=document.createElement("div");p.className="pn";p.id="p-"+id;body.appendChild(p)});
function show(id){tabs.querySelectorAll(".tb").forEach(b=>b.classList.toggle("on",b.dataset.t===id));body.querySelectorAll(".pn").forEach(p=>p.classList.toggle("on",p.id==="p-"+id))}
function grid(id,items){const g=document.createElement("div");g.className="g";items.forEach(([html,fn,cls])=>{const b=document.createElement("button");b.className="ch "+(cls||"");b.innerHTML=html;b.onclick=fn;g.appendChild(b)});$("#p-"+id).appendChild(g);return g}
const chips=(id,list,cls)=>grid(id,list.split(" ").map(k=>["<span class=d>"+dsp(clean(conv(k)))+"</span>"+ks(k),()=>add(k),cls]));
const note=(id,t)=>{const p=document.createElement("p");p.className="nt";p.innerHTML=t;$("#p-"+id).appendChild(p)};
function drawFavs(){
 const p=$("#p-f");p.innerHTML="";$("#favn").textContent=favs.length||"";
 if(!favs.length){note("f","No saved words yet. Type a word and press <b>★ Save</b>. Saved words stay on this device and show up in the suggestion bar.");return}
 note("f","Tap a word to type it. Saved words stay on this device only.");
 grid("f",favs.map((f,i)=>["<span class=d>"+esc(f.u)+"</span><kbd>"+esc(f.r||toPreeti(f.u))+"</kbd><span class=x role=button aria-label='Remove'>×</span>",
  e=>{if(e.target.classList.contains("x")){favs.splice(i,1);saveFavs();draw()}else{document.body.classList.remove("open");putWord(f)}}]));
}
drawFavs();
// Romanized chart
const rchips=list=>grid("r",list.map(k=>["<span class=d>"+sign(roman(k).u)+"</span><kbd>"+esc(k)+"</kbd>",()=>{document.body.classList.remove("open");insert(k)}]));
note("r","Type how it sounds. A consonant alone keeps its <b>a</b> sound; two consonants join: <kbd>kt</kbd> क्त. Capitals matter: <kbd>t</kbd> त <kbd>T</kbd> ट. Blue suggestions come from the built-in dictionary of "+dict.size+" words, so <kbd>nepal</kbd> still finds नेपाल.");
rchips(Object.keys(ROMAN.V));
note("r","Consonants");rchips(Object.keys(ROMAN.C));
note("r","Signs: <kbd>M</kbd> ं &nbsp;<kbd>~</kbd> ँ &nbsp;<kbd>H</kbd> ः &nbsp;<kbd>\\</kbd> halant ् (word-final: <kbd>chhan\\</kbd> छन्) &nbsp;<kbd>.</kbd> । &nbsp;<kbd>..</kbd> . &nbsp;digits → ०-९. <kbd>n</kbd> before k/kh/g/gh becomes ङ: <kbd>gangaa</kbd> गङ्गा. <kbd>'</kbd> keeps letters apart: <kbd>ra'aa</kbd> रआ.");
rchips(["kamal","kaa","ki","kii","ku","kuu","ke","kai","ko","kau","kRi","kaM","kaa~","dukha","kShetra","gyaan","shrii","prem","sangiit","maanchhe","hunchha","chha\\"]);
// Preeti charts
const CN="s v u 3 ª r 5 h em ` 6 7 8 9 0f t y b w g k km a e d o / n j z if ; x If q 1";
note("v","Tap to type. Keys shown as <kbd>⇧x</kbd> need Shift.");chips("v","c cf O O{ p pm C P P] cf] cf} c+ cF cM");
chips("c",CN);
note("h","Half letters join the next letter: <kbd>⇧s</kbd> then <kbd>t</kbd> makes क्त.");chips("h","S V U R H T Y W G K A E D N J Z i I : X ~","h");
chips("j","St s| So Ug Gt Gb ;t ;y ;g Hh B Bj Kt k| k|m Dk Da Nn Q 4 2 R5 > cy{ wd{ sd{ k{ /");
note("s","Extra Preeti glyphs. In Windows apps they need Alt codes; here you just tap them.");
grid("s",[["ª","0170"],["«","0171"],["¿","0191"],["Í","0205"],["Ë","0203"],["ß","0223"],["§","0167"],["¶","0182"],["•","0149"],["å","0229"],["¢","0162"],["Ø","0216"]].map(([c,a])=>["<span class=d>"+dsp(conv(c))+"</span><kbd>Alt+"+a+"</kbd>",()=>add(c)]));
note("s","Unicode-only signs with no Preeti key.");
grid("s",["ॐ","ऽ"].map(c=>["<span class=d>"+c+"</span><kbd>Unicode</kbd>",()=>add(c)]));
chips("n","1 2 3 4 5 6 7 8 9 0f ! @ # $ % ^ & * ( ) . , -");
note("n","Words to try:");chips("n","g]kfn gd:t] ef/t ldq cy{ wd{ k|mfO{ sf7df08f}+");
const MK=[["",""],["","f"],["l",""],["","L"],["","'"],["","\""],["","["],["","]"],["","}"],["","f]"],["","f}"],["","+"],["","M"]];
const cell=(k,i)=>k==="/"&&i===4?"?":k==="/"&&i===5?"¿":MK[i][0]+k+MK[i][1];
$("#p-b").innerHTML="<p class=nt>Every letter with every vowel sign. Tap one to type it.</p><div class=vt>"+CN.split(" ").map(k=>
 "<div class=vr><b class=d>"+clean(conv(k))+"</b><div class=vc>"+MK.map((_,i)=>{const c=cell(k,i);return"<button data-k=\""+esc(c)+"\"><span class=d>"+clean(conv(c))+"</span><kbd>"+esc(c)+"</kbd></button>"}).join("")+"</div></div>").join("")+"</div>";
$("#p-b").onclick=e=>{const b=e.target.closest("[data-k]");if(b)add(b.dataset.k)};
$("#p-i").innerHTML="<ul class=nt><li><b>Romanized</b>: type English sounds and get Unicode plus the matching Preeti keystrokes. Works with any phone keyboard. Blue suggestions are dictionary words: tap one (or press <kbd>Tab</kbd>) to use it.</li><li>Switch modes with the <b>ABC / ⌨</b> key at the bottom left. <b>Chart</b> and <b>★ Saved</b> sit next to it. Hide the top bar with <b>⌃</b> for more room.</li><li><b>Preeti keys</b> works like typing with the Preeti font in Word or LibreOffice: each key is one glyph.</li><li><b>★ Save</b> keeps the last word on this device. Saved words appear in the suggestion bar when you start a new word.</li><li><b>⇧</b> Shift: tap once for the next key, twice to lock, three times to release. On a physical keyboard just hold Shift.</li><li><b>Blue keys</b> are half letters. They join with the next letter to make a conjunct.</li><li><b>ि</b> is typed before the letter or conjunct (<kbd>l</kbd>, then the letter). It is placed correctly for you.</li><li><b>Reph र्</b> is typed after the letter it sits over: <kbd>c</kbd><kbd>y</kbd><kbd>⇧[</kbd> gives अर्थ.</li><li><b>m</b> is not a letter. In the Preeti font it is a hook that changes the letter before it: <kbd>k</kbd><kbd>m</kbd> फ, <kbd>p</kbd><kbd>m</kbd> ऊ, <kbd>e</kbd><kbd>m</kbd> झ, <kbd>q</kbd><kbd>m</kbd> क्र, <kbd>Q</kbd><kbd>m</kbd> क्त. Anywhere else it shows as a red <span class=sm>m</span> and is left out when you copy. For म type <kbd>d</kbd>.</li><li><b>0f</b>, <b>if</b> and <b>If</b> are single letters (ण, ष, क्ष).</li><li>The Preeti layout assumes US QWERTY.</li><li>Install it with the <b>Install</b> button (Chrome, Edge, Android) or Share → Add to Home Screen (iPhone). It works offline.</li></ul>";
const openSheet=id=>{document.body.classList.add("open");show(id)};
$("#chart").onclick=()=>{buzz();openSheet(mode==="roman"?"r":"v")};$("#saved").onclick=()=>{buzz();openSheet("f")};
$("#x").onclick=$("#bd").onclick=()=>document.body.classList.remove("open");
setMode(mode);
