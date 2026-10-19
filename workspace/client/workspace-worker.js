// Offline shell only. Never cache API responses, tickets, cookies, attachment
// URLs, message bodies or provider sign-in pages. Chat caches belong to this
// dedicated origin; no other Workspace app's caches are changed.
const PREFIX='oneworkspace-chat-shell-';
const REVISION='__WORKSPACE_ASSET_REVISION__';
let assetPaths;
async function manifest(){
 const response=await fetch(new URL('offline-assets.json',self.registration.scope),{cache:'no-store',credentials:'same-origin'});
 if(!response.ok||response.redirected)throw new Error('Authenticated static manifest unavailable');
 const value=await response.json();
 if(value.revision!==REVISION||!Array.isArray(value.assets)||value.assets.some(path=>!/^\.\/(index\.html|workspace-bootstrap\.js|workspace-offline\.mjs|manifest\.json|umd\/|css\/|img\/|audio\/|fonts\/)/.test(path)||path.includes('..')))throw new Error('Invalid static manifest');
 return value;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const value=await manifest(),cache=await caches.open(PREFIX+value.revision);
 try{
  for(const path of value.assets){
   const response=await fetch(new URL(path,self.registration.scope),{credentials:'same-origin',cache:'reload'});
   if(!response.ok||response.redirected||new URL(response.url).origin!==self.location.origin)throw new Error('Static download interrupted');
   await cache.put(new URL(path,self.registration.scope),response);
  }
  const shell=await fetch(self.registration.scope,{credentials:'same-origin',cache:'reload'});
  if(!shell.ok||shell.redirected||shell.headers.get('X-Chat-Shell')!=='static')throw new Error('Authenticated shell unavailable');
  await cache.put(self.registration.scope,shell);
  await cache.put(new URL('offline-assets.json',self.registration.scope),new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}));
 }catch(error){await caches.delete(PREFIX+value.revision);throw error}
 self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==PREFIX+REVISION)await caches.delete(key);
 await self.clients.claim();
})()));
async function paths(){
 if(assetPaths)return assetPaths;
 const cache=await caches.open(PREFIX+REVISION),stored=await cache.match(new URL('offline-assets.json',self.registration.scope));
 if(!stored)return new Set();const value=await stored.json();assetPaths=new Set(value.assets.map(path=>new URL(path,self.registration.scope).pathname));return assetPaths;
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 // Explicit allowlist is checked before any cache lookup. The query contains
 // no credentials for static assets; API/media/auth paths are never handled.
 const navigation=request.mode==='navigate'&&(url.pathname===new URL(self.registration.scope).pathname||url.pathname===new URL('index.html',self.registration.scope).pathname)&&!url.search;
 if(/\/(api|auth|v0)\//.test(url.pathname))return;
 event.respondWith((async()=>{
  const allowed=navigation||(await paths()).has(url.pathname);
  if(!allowed)return fetch(request);
  try{return await fetch(request)}catch(error){
   const cache=await caches.open(PREFIX+REVISION),cached=await cache.match(navigation?self.registration.scope:new URL(url.pathname,self.location.origin));
   if(cached)return cached;throw error;
  }
 })());
});
