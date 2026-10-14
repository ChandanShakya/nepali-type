import {defineConfig} from "astro/config";
import {readdir,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

// Writes the list of built files and a content hash into dist/sw.js for offline precaching.
const precache={name:"precache",hooks:{"astro:build:done":async({dir})=>{
 const root=fileURLToPath(dir),files=(await readdir(root,{recursive:true,withFileTypes:true}))
  .filter(f=>f.isFile()&&!["sw.js","og.png","robots.txt","_headers"].includes(f.name)).map(f=>(f.parentPath+"/"+f.name).slice(root.length).replace(/^\/?/,"/"));
 const hash=createHash("sha256");for(const f of files.sort())hash.update(f).update(await readFile(root+f));
 const urls=files.map(f=>f.replace(/\/index\.html$/,"/"));
 const sw=root+"sw.js";
 await writeFile(sw,(await readFile(sw,"utf8")).replace('VERSION="dev",FILES=["/"]',`VERSION=${JSON.stringify(hash.digest("hex").slice(0,12))},FILES=${JSON.stringify(urls)}`));
}}};

export default defineConfig({
 site:"https://nepali-type.chandanshakya.com.np",
 build:{inlineStylesheets:"always"},
 integrations:[precache],
});
