// /convert/: a Preeti .docx or .txt file in, Unicode out. Runs in the page; the file is never uploaded.
import {conv,clean,looksLikeUnicode} from "./nepali.js";
import {convertDocx} from "./docx.js";

const $=s=>document.querySelector(s),st=$("#st"),out=$("#out"),dz=$("#dz");
let result=null;
// a Preeti .txt is often saved as plain "ANSI": try UTF-8 first, then Windows-1252, where the font's odd letters (« ¿ Ì …) live
const decode=b=>{try{return new TextDecoder("utf-8",{fatal:true}).decode(b)}catch(e){return new TextDecoder("windows-1252").decode(b)}};

async function run(file){
 out.hidden=true;result=null;
 st.textContent="Converting…";
 try{
  const buf=new Uint8Array(await file.arrayBuffer()),base=file.name.replace(/\.[^.]*$/,"");
  if(/\.docx$/i.test(file.name)){
   const r=await convertDocx(buf);
   if(!r.runs){st.textContent="No text in a Preeti font was found in this file. It may already be Unicode.";return}
   result={blob:new Blob([r.data],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),name:base+"-unicode.docx"};
   $("#pv").textContent=r.text;st.textContent=r.runs+" Preeti "+(r.runs>1?"pieces":"piece")+" of text converted. Check the result in Word: fonts become Mangal and the layout can shift a little."}
  else{
   const t=decode(buf);
   if(looksLikeUnicode(t)){st.textContent="This text already has Devanagari letters, so it is not Preeti.";return}
   const u=clean(conv(t));
   result={blob:new Blob([u],{type:"text/plain;charset=utf-8"}),name:base+"-unicode.txt"};
   $("#pv").textContent=u.slice(0,600);st.textContent="Converted."}
  out.hidden=false}
 catch(e){st.textContent="This file could not be read. Is it a Word .docx or a text file?"}
}
$("#f").onchange=e=>{const f=e.target.files[0];if(f)run(f)};
["dragenter","dragover"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.add("on")}));
["dragleave","drop"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.remove("on")}));
dz.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f)run(f)});
$("#dl").onclick=()=>{if(!result)return;const a=document.createElement("a");a.href=URL.createObjectURL(result.blob);a.download=result.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
