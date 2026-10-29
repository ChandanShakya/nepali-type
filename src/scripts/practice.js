// /practice/: type a passage with the Preeti keys; the next key is shown, speed and accuracy count keystrokes.
import {toPreeti} from "./nepali.js";
import {PASSAGES} from "../data/passages.js";

const $=s=>document.querySelector(s),ti=$("#ti");
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let text,keys,t0=0,done=false,idx=Math.floor(Math.random()*PASSAGES.length);
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;");

function start(){
 text=PASSAGES[idx];keys=toPreeti(text);t0=0;done=false;ti.value="";ti.disabled=false;
 $("#tg").textContent=text;$("#res").textContent="";draw();ti.focus()}
// every typed key is right or wrong against the key expected at that place; the next one is underlined
function draw(){
 const v=ti.value;
 $("#ks").innerHTML=[...keys].map((k,i)=>{const c=esc(k===" "?"␣":k);return i<v.length?"<span class="+(v[i]===k?"g":"b")+">"+c+"</span>":i===v.length?"<span class=n>"+c+"</span>":c}).join("");
}
ti.addEventListener("input",()=>{
 if(done)return;
 if(!t0&&ti.value)t0=performance.now();
 draw();
 if(ti.value.length>=keys.length){
  done=true;ti.disabled=true;
  const v=ti.value,right=[...keys].filter((k,i)=>v[i]===k).length,min=(performance.now()-t0)/6e4,
   wpm=Math.round(right/5/Math.max(min,1/600)),acc=Math.round(100*right/keys.length);
  $("#res").textContent=wpm+" WPM · "+acc+"% accurate";
  const best=Number(store.get("nw-best")||0);
  if(acc>=90&&wpm>best){store.set("nw-best",wpm);$("#bs").textContent="New best: "+wpm+" WPM"}
 }});
$("#nx").onclick=()=>{idx=(idx+1+Math.floor(Math.random()*(PASSAGES.length-1)))%PASSAGES.length;start()};
$("#rs").onclick=start;
const best=Number(store.get("nw-best")||0);if(best)$("#bs").textContent="Your best: "+best+" WPM (at 90% accuracy or better)";
start();
