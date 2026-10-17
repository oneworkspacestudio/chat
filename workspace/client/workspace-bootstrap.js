try {
 const r=await fetch(new URL('api/bootstrap',document.baseURI),{credentials:'same-origin',cache:'no-store'});
 if(r.status===401){window.location.assign(new URL('auth/login',document.baseURI));}else{
  if(!r.ok)throw new Error('Chat connection unavailable.');
  window.workspaceChat=await r.json();
  await import('./umd/runtime.prod.js');
  await import('./umd/index.prod.js');
 }
}catch(e){const root=document.getElementById('mountPoint');root.textContent='Chat could not connect. ';const retry=document.createElement('a');retry.href=new URL('auth/login',document.baseURI);retry.textContent='Reconnect with MyAccounts';root.append(retry);}
