// Offline cache. The build (astro.config.mjs) fills in VERSION and FILES, so every deploy
// ships a new sw.js, which installs a fresh cache and drops the old one.
const VERSION="dev",FILES=["/"];
self.addEventListener("install",e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
 // pages: network first so a deploy never pairs old HTML with deleted hashed assets; offline falls back to the cache.
 // everything else: cache first (hashed or versioned with this file).
 if(r.mode==="navigate")e.respondWith(fetch(r).catch(()=>caches.match(r,{ignoreSearch:true,ignoreVary:true}).then(hit=>hit||caches.match("/",{ignoreVary:true}))));
 else e.respondWith(caches.match(r,{ignoreSearch:true,ignoreVary:true}).then(hit=>hit||fetch(r)));
});
