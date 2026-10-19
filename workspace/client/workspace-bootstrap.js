import {loadOfflineContext,clearOfflineContext} from './workspace-offline.mjs';
try {
 let r;
 try{r=await fetch(new URL('api/bootstrap',document.baseURI),{credentials:'same-origin',cache:'no-store'})}catch(error){
  window.workspaceChat=loadOfflineContext();if(!window.workspaceChat)throw new Error('Connect once to MyAccounts before opening Chat offline.');
 }
 if(r?.status===401){clearOfflineContext();window.location.assign(new URL('auth/login',document.baseURI));}else{
  if(r&&!r.ok)throw new Error('Chat connection unavailable.');
  if(r)window.workspaceChat=await r.json();
  if(!/^[0-9a-f]{64}$/.test(window.workspaceChat.accountKey||''))throw new Error('Chat account scope is unavailable.');
  // Initialise the pinned SDK only after the authenticated account scope exists.
  // Its deterministic build adapter scopes the cache database to that identity.
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('umd/tinode.prod.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
  await import('./umd/runtime.prod.js');
  await import('./umd/index.prod.js');
  if(window.workspaceChat.isolatedOrigin&&'serviceWorker' in navigator)navigator.serviceWorker.register(new URL('workspace-worker.js',document.baseURI),{scope:new URL('./',document.baseURI).pathname,updateViaCache:'none'}).catch(()=>{window.dispatchEvent(new CustomEvent('workspace:offline-unavailable'))});
 }
}catch(e){const root=document.getElementById('mountPoint');root.textContent='Chat could not connect. ';const retry=document.createElement('a');retry.href=new URL('auth/login',document.baseURI);retry.textContent='Reconnect with MyAccounts';root.append(retry);}
