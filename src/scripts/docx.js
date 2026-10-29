// Preeti .docx -> Unicode .docx, with no dependency: a small zip reader and writer on the browser's own deflate, and the
// document's text runs rewritten as text. Only runs set in a Preeti font are touched; the other entries of the file are copied
// as they are. Pure functions (Uint8Array in, Uint8Array out), so test.mjs runs them without a page.
import {conv,clean} from "./nepali.js";

const u16=(b,o)=>b[o]|b[o+1]<<8,u32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
const td=new TextDecoder(),te=new TextEncoder();
const bytes=async s=>new Uint8Array(await new Response(s).arrayBuffer());
const inflate=d=>bytes(new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw")));
const deflate=d=>bytes(new Blob([d]).stream().pipeThrough(new CompressionStream("deflate-raw")));
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^c>>>1:c>>>1;t[n]=c>>>0}return t})();
const crc32=d=>{let c=~0;for(let i=0;i<d.length;i++)c=CRC[(c^d[i])&255]^c>>>8;return ~c>>>0};

export function readZip(buf){
 let e=buf.length-22;while(e>=0&&u32(buf,e)!==0x06054b50)e--;
 if(e<0)throw new Error("not a zip file");
 const n=u16(buf,e+10),entries=[];let p=u32(buf,e+16);
 for(let i=0;i<n;i++){
  if(u32(buf,p)!==0x02014b50)throw new Error("damaged zip file");
  const nl=u16(buf,p+28),el=u16(buf,p+30),cl=u16(buf,p+32),lho=u32(buf,p+42),
   z={flags:u16(buf,p+8),method:u16(buf,p+10),time:u16(buf,p+12),date:u16(buf,p+14),crc:u32(buf,p+16),csize:u32(buf,p+20),usize:u32(buf,p+24),name:td.decode(buf.subarray(p+46,p+46+nl))};
  const ln=u16(buf,lho+26),le=u16(buf,lho+28);
  z.data=buf.subarray(lho+30+ln+le,lho+30+ln+le+z.csize);   // still compressed
  entries.push(z);p+=46+nl+el+cl}
 return entries}

const content=z=>z.method===0?Promise.resolve(z.data):inflate(z.data);

export function writeZip(entries){
 const parts=[],cd=[];let off=0;
 const h=(len,f)=>{const a=new Uint8Array(len),v=new DataView(a.buffer);f(v);return a};
 for(const z of entries){
  const nm=te.encode(z.name),flags=z.flags&~8|0x800;
  const lh=h(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,flags,true);v.setUint16(8,z.method,true);v.setUint16(10,z.time,true);v.setUint16(12,z.date,true);v.setUint32(14,z.crc,true);v.setUint32(18,z.csize,true);v.setUint32(22,z.usize,true);v.setUint16(26,nm.length,true)});
  const ch=h(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,flags,true);v.setUint16(10,z.method,true);v.setUint16(12,z.time,true);v.setUint16(14,z.date,true);v.setUint32(16,z.crc,true);v.setUint32(20,z.csize,true);v.setUint32(24,z.usize,true);v.setUint16(28,nm.length,true);v.setUint32(42,off,true)});
  parts.push(lh,nm,z.data);cd.push(ch,nm);off+=30+nm.length+z.data.length}
 const cdLen=cd.reduce((s,a)=>s+a.length,0);
 const end=h(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,cdLen,true);v.setUint32(16,off,true)});
 const all=[...parts,...cd,end],out=new Uint8Array(all.reduce((s,a)=>s+a.length,0));let o=0;for(const a of all){out.set(a,o);o+=a.length}
 return out}

// ---------- the text of a Word part ----------
const isPreeti=f=>/preeti/i.test(f||"");
const UNICODE_FONT="Mangal";   // ships with Windows and Office
const dec=s=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
const enc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fontOf=x=>{const m=/<w:rFonts\b[^>]*>/.exec(x);if(!m)return null;const a=/w:(?:ascii|hAnsi)="([^"]*)"/.exec(m[0]);return a?a[1]:null};
const T_RE=/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:t(?:\s[^>]*)?\/>/g;

// the fonts the file's styles give: {styleId: font} plus the document default
function styleFonts(styles){
 const out={};
 for(const m of styles.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)){const f=fontOf(m[2]);if(f)out[m[1]]=f}
 const d=/<w:rPrDefault>([\s\S]*?)<\/w:rPrDefault>/.exec(styles);
 return{styles:out,def:d?fontOf(d[1]):null}}

// One part (document, header, footer…): every run in a Preeti font becomes Unicode text in Mangal. Neighbouring Preeti runs are
// joined first, because ि and the reph reorder across the edge of a run. Returns the new XML and how many runs were Preeti.
export function convertPart(xml,sf){
 let runs=0;
 const out=xml.replace(/<w:p(?=[\s>])[\s\S]*?<\/w:p>/g,p=>{
  const ps=/<w:pStyle w:val="([^"]+)"/.exec(p)?.[1],pf=ps&&sf.styles[ps];
  const list=[...p.matchAll(/<w:r(?=[\s>])[\s\S]*?<\/w:r>/g)].map(m=>{
   const r=m[0],rpr=/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(r)?.[0]||"",rs=/<w:rStyle w:val="([^"]+)"/.exec(rpr)?.[1];
   const font=fontOf(rpr)||(rs&&sf.styles[rs])||pf||sf.def;
   return{src:r,rpr,pre:isPreeti(font),text:[...r.matchAll(T_RE)].map(t=>dec(t[1]||"")).join("")}});
  let q=p,i=0;
  while(i<list.length){
   if(!list[i].pre){i++;continue}
   let j=i;while(j<list.length&&list[j].pre)j++;
   const joined=list.slice(i,j).map(r=>r.text).join(""),uni=clean(conv(joined));
   list.slice(i,j).forEach((r,k)=>{
    runs++;
    let n=r.src.replace(T_RE,"");   // the text goes, the rest of the run stays
    if(k===0)n=n.replace(/<\/w:r>$/,`<w:t xml:space="preserve">${enc(uni)}</w:t></w:r>`);
    const f='<w:rFonts w:ascii="'+UNICODE_FONT+'" w:hAnsi="'+UNICODE_FONT+'" w:cs="'+UNICODE_FONT+'" w:eastAsia="'+UNICODE_FONT+'"/>';
    let rpr=r.rpr;
    if(!rpr)n=n.replace(/^(<w:r(?:\s[^>]*)?>)/,"$1<w:rPr>"+f+"</w:rPr>");
    else{let nr=/<w:rFonts\b[^>]*>/.test(rpr)?rpr.replace(/<w:rFonts\b[^>]*\/>|<w:rFonts\b[^>]*>[\s\S]*?<\/w:rFonts>/,f):rpr.replace(/(<w:rPr>)(<w:rStyle\b[^>]*\/>)?/,"$1$2"+f);
     // Word sizes Devanagari by the complex-script size
     const sz=/<w:sz w:val="(\d+)"\/>/.exec(nr);if(sz&&!/<w:szCs\b/.test(nr))nr=nr.replace(sz[0],sz[0]+'<w:szCs w:val="'+sz[1]+'"/>');
     n=n.replace(rpr,nr)}
    q=q.replace(r.src,()=>n)});
   i=j}
  return q});
 return{xml:out,runs}}

const PARTS=/^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;
// -> {data: the new .docx, runs: how many Preeti runs were converted, text: the start of the converted text}
export async function convertDocx(buf){
 const zip=readZip(buf),stylesZ=zip.find(z=>z.name==="word/styles.xml");
 const sf=styleFonts(stylesZ?td.decode(await content(stylesZ)):"");
 let runs=0,text="";
 for(const z of zip){
  if(!PARTS.test(z.name))continue;
  const r=convertPart(td.decode(await content(z)),sf);
  if(!r.runs)continue;
  runs+=r.runs;
  const raw=te.encode(r.xml),def=await deflate(raw);
  Object.assign(z,{method:8,data:def,csize:def.length,usize:raw.length,crc:crc32(raw)});
  if(z.name==="word/document.xml")text=[...r.xml.matchAll(T_RE)].map(t=>dec(t[1]||"")).join(" ").slice(0,600)}
 return{data:writeZip(zip),runs,text}}

// for tests and for building a small file
export async function makeZip(files){
 return writeZip(await Promise.all(Object.entries(files).map(async([name,s])=>{const raw=te.encode(s),def=await deflate(raw);return{name,flags:0,method:8,time:0,date:0x21,crc:crc32(raw),csize:def.length,usize:raw.length,data:def}})))}
export async function readFiles(buf){const o={};for(const z of readZip(buf))o[z.name]=td.decode(await content(z));return o}
