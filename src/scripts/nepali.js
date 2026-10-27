// Pure conversion logic, shared by the page and test.mjs. No DOM here.

// US QWERTY rows: [unshifted, shifted]
export const R=[["`1234567890-=","~!@#$%^&*()_+"],["qwertyuiop[]\\","QWERTYUIOP{}|"],["asdfghjkl;'","ASDFGHJKL:\""],["zxcvbnm,./","ZXCVBNM<>?"]];
export const SH={},SH2={};R.forEach(([a,b])=>[...a].forEach((c,i)=>{SH[b[i]]=c;SH2[c]=b[i]}));
export const KEYS=R.flatMap(([a,b])=>[...a,...b]);

// Preeti key -> Unicode. \u0001 = ि (typed before its letter), \u0002 = reph र् (typed after its letter).
// "m" is absent on purpose: in the Preeti font it is only a hook glyph that turns प/उ/भ/त्र/त्त into फ/ऊ/झ/क्र/क्त.
export const P={a:"ब",b:"द",c:"अ",d:"म",e:"भ",f:"ा",g:"न",h:"ज",i:"ष्",j:"व",k:"प",l:"\u0001",n:"ल",o:"य",p:"उ",q:"त्र",r:"च",s:"क",t:"त",u:"ग",v:"ख",w:"ध",x:"ह",y:"थ",z:"श",
A:"ब्",B:"द्य",C:"ऋ",D:"म्",E:"भ्",F:"ँ",G:"न्",H:"ज्",I:"क्ष्",J:"व्",K:"प्",L:"ी",M:"ः",N:"ल्",O:"इ",P:"ए",Q:"त्त",R:"च्",S:"क्",T:"त्",U:"ग्",V:"ख्",W:"ध्",X:"ह्",Y:"थ्",Z:"श्",
"1":"ज्ञ","2":"द्द","3":"घ","4":"द्ध","5":"छ","6":"ट","7":"ठ","8":"ड","9":"ढ","0":"ण्","!":"१","@":"२","#":"३","$":"४","%":"५","^":"६","&":"७","*":"८","(":"९",")":"०",
";":"स",":":"स्","'":"ु",'"':"ू","[":"ृ","]":"े","{":"\u0002","}":"ै","\\":"्","|":"्र","`":"ञ","~":"ञ्","+":"ं",">":"श्र","<":"?","?":"रु","/":"र",",":",",".":"।","-":"(","=":".","_":")",
"ª":"ङ","«":"्र","¿":"रू","Í":"ङ्क","Ë":"ङ्ग","ß":"द्म","§":"ट्ट","¶":"ठ्ठ","•":"ड्ड","å":"द्व","¢":"द्घ","Ø":"्य","¥":"र्\u200d"};

const K="क-ह",MT="ािीुूृेैोौंँः",CL="(?:["+K+"]्)*["+K+"](?:्र|्य)?",RX=s=>new RegExp(s,"g");
// What m combines with, as the Preeti font draws it.
const MOD=RX("([पउभ]|त्र|त्त)((?:्र|्य)?["+MT+"]*्?)m"),MODTO={"प":"फ","उ":"ऊ","भ":"झ","त्र":"क्र","त्त":"क्त"};

// Preeti keystrokes -> Unicode. A stray m (one that does not follow प/उ/भ/त्र/त्त) is kept as
// the ASCII letter "m" so the caller can show it; strip it with /m/g before copying.
export function conv(s){
 // 0f, if, If are single Preeti letters (ण, ष, क्ष): the f is part of the letter, not a vowel sign
 s=s.replace(/0f/g,"ण").replace(/if/g,"ष").replace(/If/g,"क्ष");
 s=[...s].map(c=>P[c]??c).join("");
 s=s.replace(MOD,(a,b,c)=>MODTO[b]+c);
 s=s.replace(/इ\u0002/g,"ई");
 s=s.replace(RX("\u0001("+CL+")"),"$1ि");
 s=s.replace(RX("("+CL+"["+MT+"]*)\u0002"),"र्$1");
 s=s.replace(RX("(["+MT+"]+)(्र|्य)"),"$2$1");
 s=s.replace(RX("्(["+MT+"]+)((?:["+K+"]्)*["+K+"])"),"्$2$1");
 s=s.replace(/([ंँ])([ािीुूृेैोौः]*)/g,"$2$1");
 // टृ -> ट्ट is kept on purpose (carried over from the original converter)
 s=s.replace(/ेा/g,"ाे").replace(/ैा/g,"ाै").replace(/अाे/g,"ओ").replace(/अाै/g,"औ").replace(/अा/g,"आ").replace(/एे/g,"ऐ").replace(/ाे/g,"ो").replace(/ाै/g,"ौ").replace(/टृ/g,"ट्ट");
 return s.replace(/\u0001/g,"ि").replace(/\u0002/g,"र्");
}
export const clean=u=>u.replace(/m/g,"");

// Unicode -> Preeti keystrokes. Built from conv itself, so the two can never disagree.
const T={"ि":"l","\u0002":"{"};
["cf]","cf}","O{","P]","f]","f}",...KEYS,...Object.keys(P).filter(c=>c>"~"),...KEYS.map(k=>k+"f"),...KEYS.map(k=>k+"m")].forEach(k=>{
 if(/[{l]/.test(k)&&k!=="O{")return;const u=clean(conv(k));if(u&&u!==k&&!(u in T))T[u]=k});
const TMAX=Math.max(...Object.keys(T).map(u=>u.length));
// A character the font has no key for: Devanagari letters it lacks (ऑ ॉ ऽ ॐ …) and ASCII symbols whose keys mean
// something else in the font (! is १, - is "(", ; is स). With mark set, such a character is wrapped in \u0003 … \u0004
// so the page can show it as "no key"; without it the character is left as is (copying keeps it).
const noKey=c=>c>" "&&(/[\u0900-\u097f]/.test(c)||c==="m"||conv(c)!==c);
export function toPreeti(u,mark=false){
 // a joiner is dropped, except after र् where र्‍ is the half-ra glyph ¥
 u=u.replace(/(?<!\u0930\u094d)\u200d/g,"");
 // reph र् goes after its whole syllable (letter and vowel signs). It must be placed before ि is moved:
 // otherwise the ि of the next syllable ends up beside this one and is pulled into it (अन्तर्राष्ट्रिय)
 // a reph starts its syllable: after a halant the र् is part of a conjunct chain (ट्र्ब), not a reph
 u=u.replace(RX("(?<!्)र्((?:["+K+"]्)*["+K+"][ािीुूृेैोौ]*)"),"$1\u0002");
 // ि is typed before its whole conjunct
 u=u.replace(RX("((?:["+K+"]्)*["+K+"])ि"),"ि$1");
 let o="";
 for(let i=0;i<u.length;){let n=Math.min(TMAX,u.length-i);while(n>1&&!(u.substr(i,n) in T))n--;const c=u.substr(i,n);o+=T[c]??(mark&&noKey(c)?"\u0003"+c+"\u0004":c);i+=n}
 return o;
}

// Romanized (phonetic) typing: "ka" -> क, "kaa" -> का, "k" alone -> क, "kt" -> क्त.
// Same idea as Google Input Tools / Easy Nepali typing, without the dictionary.
const C={k:"क",kh:"ख",g:"ग",gh:"घ",Ng:"ङ",c:"च",ch:"च",chh:"छ",Ch:"छ",j:"ज",jh:"झ",Ny:"ञ",T:"ट",Th:"ठ",D:"ड",Dh:"ढ",N:"ण",
 t:"त",th:"थ",d:"द",dh:"ध",n:"न",p:"प",ph:"फ",f:"फ",b:"ब",bh:"भ",m:"म",y:"य",r:"र",l:"ल",w:"व",v:"व",sh:"श",Sh:"ष",S:"ष",s:"स",h:"ह",
 x:"क्ष",ksh:"क्ष",gy:"ज्ञ",q:"क",z:"ज"};
// [independent vowel, vowel sign]
const V={a:["अ",""],aa:["आ","ा"],A:["आ","ा"],i:["इ","ि"],ii:["ई","ी"],ee:["ई","ी"],I:["ई","ी"],u:["उ","ु"],uu:["ऊ","ू"],oo:["ऊ","ू"],U:["ऊ","ू"],
 e:["ए","े"],ai:["ऐ","ै"],E:["ऐ","ै"],o:["ओ","ो"],au:["औ","ौ"],O:["औ","ौ"],R:["ऋ","ृ"],Ri:["ऋ","ृ"]};
// signs that attach to the syllable before them
const X={M:"ं","~":"ँ",H:"ः"};
const O={".":"।","..":".","0":"०","1":"१","2":"२","3":"३","4":"४","5":"५","6":"६","7":"७","8":"८","9":"९"};
export const ROMAN={C,V};
const RMAX=3,NAS={"क":"ङ","ख":"ङ","ग":"ङ","घ":"ङ"};
const known=t=>t in C||t in V||t in X||t in O||t==="\\"||t==="'";
// longest known token at i; unknown capitals fall back to lowercase (K -> k)
function tok(s,i){
 for(let n=Math.min(RMAX,s.length-i);n>0;n--){const t=s.substr(i,n);if(known(t))return[t,n]}
 const l=s[i].toLowerCase();return[known(l)?l:s[i],1];
}
// returns {u: unicode, toks: [[roman, kind]]} so the UI can show hints for the last token
export function roman(s){
 let u="",prevC=false;const toks=[];
 for(let i=0;i<s.length;){
  const[t,n]=tok(s,i);i+=n;
  if(t in C){
   if(prevC)u+="्";
   // n before a velar is written ङ in Nepali: gangaa -> गङ्गा (palatals stay न्: hunchha -> हुन्छ)
   if(u.endsWith("न्")&&toks.at(-1)[0]==="n"){const v=NAS[C[t]];if(v)u=u.slice(0,-2)+v+"्"}
   u+=C[t];prevC=true;toks.push([t,"c"])}
  else if(t in V){u+=prevC?V[t][1]:V[t][0];prevC=false;toks.push([t,"v"])}
  else if(t==="\\"){if(prevC)u+="्";prevC=false;toks.push([t,"h"])}
  // ' ends the syllable without joining: ra'aa -> रआ (not रा), k'kh -> कख (not क्ख)
  else if(t==="'"){prevC=false;toks.push([t,"s"])}
  else if(t in X){u+=X[t];prevC=false;toks.push([t,"x"])}
  else{u+=O[t]??t;prevC=false;toks.push([t,"o"])}
 }
 return{u,toks};
}

// ---------- Unicode -> romanized (this app's scheme), for putting dictionary words back as keystrokes ----------
const RC={},RV={},RM={"ा":"aa","ि":"i","ी":"ii","ु":"u","ू":"uu","ृ":"Ri","े":"e","ै":"ai","ो":"o","ौ":"au"},RX2={"ं":"M","ँ":"~","ः":"H","।":".",".":".."};
for(const[k,v] of Object.entries(C))if(!(v in RC)&&v.length===1)RC[v]=k;
Object.assign(RC,{"फ":"ph","व":"w","छ":"chh","ष":"Sh","च":"ch","क":"k","ज":"j"});
for(const[k,[ind]] of Object.entries(V))if(!(ind in RV))RV[ind]=k;
Object.assign(RV,{"आ":"aa","ई":"ii","ऊ":"uu","ऋ":"Ri"});
const isC=c=>c>="क"&&c<="ह";
// returns null when the word cannot be spelled so that roman() gives it back exactly
export function toRoman(u,sep=""){
 u=u.replace(/[\u200c\u200d]/g,"");
 let o="";
 for(let i=0;i<u.length;i++){
  const c=u[i],n=u[i+1];
  if(u.startsWith("क्ष",i)||u.startsWith("ज्ञ",i)){o+=u[i]==="क"?"ksh":"gy";i+=2;if(!RM[u[i+1]]&&u[i+1]!=="्"&&(isC(u[i+1])||RV[u[i+1]]))o+="a";continue}
  if(isC(c)){
   const r=RC[c];if(!r)return null;o+=r;
   if(RM[n]){o+=RM[n];i++}
   else if(n==="्"){i++;const nx=u[i+1];
    if(!isC(nx)){o+="\\";continue}
    const nr=u.startsWith("क्ष",i+1)?"ksh":u.startsWith("ज्ञ",i+1)?"gy":RC[nx]||"";
    if(tok(r+nr,0)[0]!==r||(r==="n"&&NAS[nx]))o+="\\"}
   else if(isC(n)||RV[n]||"ंँः".includes(n??"\0"))o+="a";
  }
  else if(RV[c])o+=(/[aeiouAEIOUR~]$/.test(o)?sep:"")+RV[c];
  else if(RX2[c])o+=RX2[c];
  else if(c>="०"&&c<="९")o+=String(c.charCodeAt(0)-0x966);
  else o+=c;
 }
 return roman(o).u===u?o:sep?null:toRoman(u,"'");
}

// ---------- dictionary ----------
// A loose phonetic key, so "nepal", "nepaal" and "Nepal" all find नेपाल.
const LC={"क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"n","च":"ch","छ":"ch","ज":"j","झ":"jh","ञ":"n","ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n","त":"t","थ":"th","द":"d","ध":"dh","न":"n","प":"p","फ":"f","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"b","श":"s","ष":"s","स":"s","ह":"h"};
const LV={"अ":"a","आ":"a","इ":"i","ई":"i","उ":"u","ऊ":"u","ऋ":"ri","ए":"e","ऐ":"ai","ओ":"o","औ":"au","ा":"a","ि":"i","ी":"i","ु":"u","ू":"u","ृ":"ri","े":"e","ै":"ai","ो":"o","ौ":"au","ं":"n","ः":""};
const trimA=k=>k.length>1?k.replace(/a$/,""):k;
export function looseRoman(s){
 s=s.toLowerCase().replace(/chh/g,"ch").replace(/c(?!h)/g,"ch").replace(/ksh|x/g,"x").replace(/jny/g,"gy").replace(/sh/g,"s").replace(/ph/g,"f").replace(/[vw]/g,"b")
  .replace(/z/g,"j").replace(/q/g,"k").replace(/aa/g,"a").replace(/ee|ii/g,"i").replace(/oo|uu/g,"u").replace(/[^a-z]/g,"");
 return trimA(s);
}
// keys for a Unicode word; ँ is often typed as "n" and often left out, so both are indexed
export function looseKeys(u,cb="n"){
 let o="";
 for(let i=0;i<u.length;i++){const c=u[i],n=u[i+1];
  if(u.startsWith("क्ष",i)){o+="x";i+=2}else if(u.startsWith("ज्ञ",i)){o+="gy";i+=2}
  else if(LC[c])o+=LC[c];
  else{o+=c==="ँ"?cb:LV[c]??"";continue}
  const nx=u[i+1];if(!LV[nx]&&nx!=="्"&&nx!=="ँ"&&!/[ािीुूृेैोौ]/.test(nx??""))o+="a";
 }
 o=trimA(o);
 return u.includes("ँ")&&cb==="n"?[o,...looseKeys(u,"")]:[o];
}
export function makeDict(text){
 const seen=new Set(),W=[];
 for(const line of text.split("\n")){
  const[w,...alias]=line.trim().replace(/[\u200c\u200d]/g,"").split(/\s+/);if(!w||w[0]==="#"||seen.has(w))continue;seen.add(w);
  const k=[...looseKeys(w),...alias.map(looseRoman)];
  // s: the same keys without any "a", so a dropped or extra schwa still matches (sagarmatha, nepal)
  W.push({u:w,k,s:k.map(x=>x.replace(/a/g,"")),r:toRoman(w)})}
 return{
  // romanized word -> best Unicode words: exact sound matches, then schwa-tolerant ones, then completions
  roman(r,max=6){const k=looseRoman(r),ks=k.replace(/a/g,"");if(!k)return[];const ex=[],near=[],pre=[];
   for(const w of W){if(!w.r)continue;
    if(w.k.includes(k))ex.push(w);else if(ks.length>1&&w.s.includes(ks))near.push(w);else if(k.length>1&&w.k.some(x=>x.startsWith(k)))pre.push(w)}
   return ex.concat(near,pre).slice(0,max)},
  // Unicode prefix -> completions
  prefix(u,max=6){if(!u)return[];return W.filter(w=>w.u.length>u.length&&w.u.startsWith(u)).slice(0,max)},
  size:W.length};
}
