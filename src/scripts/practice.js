// /practice/: learn and drill the Preeti keys. Keys (a row at a time, or your weakest), Words and Sentences. The next key is lit on an
// on-screen keyboard that also works by touch; a wrong key does not move you on. Speed counts correct keys (5 to a word).
import {R,SH,SH2,P,toPreeti,conv,clean} from "./nepali.js";
import {PASSAGES} from "../data/passages.js";
import wordList from "../data/words.txt?raw";

const $=s=>document.querySelector(s);
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)];
const KEYSET=new Set(R.flatMap(([a,b])=>[...a,...b]));
const typeable=k=>[...k].every(c=>c===" "||KEYSET.has(c));
// the letter a key makes, for the label (a vowel sign shows on a dotted circle)
const glyph=c=>{const v=P[c];if(v===undefined)return"";const t=v.replace("\u0001","ि").replace("\u0002","र्");return/^[ािीुूृेैोौंँः्]/.test(t)?"◌"+t:t};

const SETS={home:["Home row","asdfghjkl;'"],top:["Top row","qwertyuiop[]"],bottom:["Bottom row","zxcvbnm,./"],num:["Numbers","1234567890"],shift:["Shift","QWERTYUIOPASDFGHJKLZXCVBNM"]};
// words for the Words drill: common curated words that can be typed with the keys on the keyboard
const WORDS=wordList.split("\n").slice(0,2500).map(l=>l.trim().split(/\s+/)[0]).filter(w=>/^[ऀ-ॿ]{3,8}$/.test(w)&&typeable(toPreeti(w))&&clean(conv(toPreeti(w)))===w);

let tab=["keys","words","text"].includes(store.get("nw-ptab"))?store.get("nw-ptab"):"keys",set=store.get("nw-pset")==="weak"||SETS[store.get("nw-pset")]?store.get("nw-pset"):"home";
let stat={};try{stat=JSON.parse(store.get("nw-keys"))||{}}catch(e){}
let item,pos,err,t0,last,done,timer;

// keys that were missed or slow: the weakest eight with at least five tries
const weak=()=>Object.entries(stat).filter(([k,s])=>s.n>=5&&KEYSET.has(k)&&k!==" ").sort((a,b)=>(b[1].miss/b[1].n*3+b[1].ms/b[1].n/1000)-(a[1].miss/a[1].n*3+a[1].ms/a[1].n/1000)).slice(0,8).map(([k])=>k);
function make(){
 if(tab==="keys"){
  const pool=set==="weak"?weak():[...(SETS[set]||SETS.home)[1]];
  const ks=Array.from({length:24},()=>pick(pool.length?pool:[..."asdfjkl;"]));
  const keys=ks.map((k,i)=>(i&&i%4===0?" ":"")+k).join("");
  return{keys,glyphs:keys.split("").map(c=>c===" "?" ":glyph(c))}}
 const text=tab==="words"?Array.from({length:6},()=>pick(WORDS)).join(" "):pick(PASSAGES);
 return{text,keys:toPreeti(text)}}
function start(){item=make();pos=0;err=0;t0=0;last=0;done=false;clearInterval(timer);$("#fin").hidden=true;draw();paintKeys()}

// ----- the keyboard on screen -----
const kb=$("#kb"),KK={};
R.forEach(([a],ri)=>{const r=document.createElement("div");r.className="kr";
 if(ri===3)r.appendChild(KK.shift=key("w","⇧","Shift"));
 [...a].forEach(c=>r.appendChild(KK[c]=key("",`<i>${c}</i><span class=d></span>`,c)));kb.appendChild(r)});
const sr=document.createElement("div");sr.className="kr";sr.appendChild(KK[" "]=key("sp","space","Space"));kb.appendChild(sr);
let shiftOn=false;
function key(cls,html,label){const b=document.createElement("button");b.className="kk "+cls;b.innerHTML=html;b.setAttribute("aria-label",label);
 b.tabIndex=-1;b.onpointerdown=e=>{e.preventDefault();if(label==="Shift"){shiftOn=!shiftOn;paintKeys();return}
  const c=label==="Space"?" ":shiftOn?SH2[label]||label:label;shiftOn=false;press(c)};return b}
// the layer shown is the one the next key needs (or the one Shift was tapped for)
function paintKeys(){
 const exp=item&&!done?item.keys[pos]:"",needs=!!exp&&exp in SH,layer=needs||shiftOn,nb=exp?SH[exp]||exp:"";
 for(const[c,b] of Object.entries(KK)){
  if(c==="shift"){b.classList.toggle("nx",needs&&!shiftOn);b.classList.toggle("on",shiftOn);continue}
  if(c===" ")continue;
  const ch=layer?SH2[c]:c;b.lastElementChild.textContent=glyph(ch);b.firstElementChild.textContent=ch;
  b.classList.toggle("nx",c===nb)}
 KK[" "].classList.toggle("nx",exp===" ")}
function flash(c,cls){const b=KK[SH[c]||c];if(!b)return;b.classList.add(cls);setTimeout(()=>b.classList.remove(cls),160)}

// ----- typing -----
function press(c){
 if(done||!item)return;
 const exp=item.keys[pos],now=performance.now();
 if(!t0){t0=now;last=now;timer=setInterval(draw,250)}
 const s=stat[exp]||(stat[exp]={n:0,miss:0,ms:0});
 if(c===exp){s.n++;s.ms+=Math.min(3000,now-last);last=now;pos++;flash(exp,"g");if(pos>=item.keys.length)return finish()}
 else{err++;s.miss++;flash(c,"b")}
 draw();paintKeys()}
function finish(){
 done=true;clearInterval(timer);store.set("nw-keys",JSON.stringify(stat));
 const m=metrics();let msg=m.wpm+" WPM · "+m.acc+"% accurate · "+m.time;
 const best=Number(store.get("nw-best")||0);
 if(m.acc>=90&&m.wpm>best){store.set("nw-best",m.wpm);msg+=" · new best!"}
 $("#fres").textContent=msg;$("#fin").hidden=false;draw();paintKeys();$("#nx").focus({preventScroll:true})}
function metrics(){
 const ms=t0?(done?last:performance.now())-t0:0,min=Math.max(ms,1500)/6e4,s=Math.round(ms/1000);
 return{wpm:t0?Math.round(pos/5/min):0,acc:pos+err?Math.round(100*pos/(pos+err)):100,time:Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}}

function draw(){
 // what is to be typed; the part typed correctly so far is solid
 if(tab==="keys"){let n=0;const typed=[...item.keys].slice(0,pos).filter(c=>c!==" ").length;
  $("#tg").innerHTML=item.glyphs.map(g=>g===" "?" ":"<span class='"+(n++<typed?"dn":"")+"'>"+g+"</span>").join("")}
 else{const u=clean(conv(item.keys.slice(0,pos)));let i=0;while(i<u.length&&u[i]===item.text[i])i++;
  $("#tg").innerHTML="<span class=dn>"+esc(item.text.slice(0,i))+"</span>"+esc(item.text.slice(i))}
 $("#pg").style.width=100*pos/item.keys.length+"%";
 const m=metrics();$("#s1").textContent=m.wpm;$("#s2").textContent=m.acc+"%";$("#s3").textContent=m.time}
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;");

// physical keyboard
document.addEventListener("keydown",e=>{
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(done&&(e.key==="Enter"||e.key===" ")){e.preventDefault();start();return}
 if(e.key.length!==1)return;
 e.preventDefault();press(e.key)});

// tabs and the key sets
function paintTabs(){
 document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===tab));
 $("#sets").hidden=tab!=="keys";
 $("#sets").innerHTML=Object.entries(SETS).map(([k,[n]])=>"<button data-s="+k+(k===set?" class=on":"")+">"+n+"</button>").join("")+(weak().length?"<button data-s=weak"+(set==="weak"?" class=on":"")+">Weak keys</button>":"")}
$("#tabs").onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;tab=b.dataset.t;store.set("nw-ptab",tab);paintTabs();start()};
$("#sets").onclick=e=>{const b=e.target.closest("[data-s]");if(!b)return;set=b.dataset.s;store.set("nw-pset",set);paintTabs();start()};
$("#nx").onclick=start;$("#rs").onclick=()=>{pos=0;err=0;t0=0;done=false;clearInterval(timer);$("#fin").hidden=true;draw();paintKeys()};
const best=Number(store.get("nw-best")||0);if(best)$("#bs").textContent="Your best: "+best+" WPM at 90% accuracy or better";
paintTabs();start();
