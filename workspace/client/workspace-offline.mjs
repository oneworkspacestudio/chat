export const OFFLINE_CONTEXT_KEY='oneworkspace.chat.offline-context.v1';
const KEY=OFFLINE_CONTEXT_KEY;
export function saveOfflineContext(bootstrap,uid) {
 if(!bootstrap.isolatedOrigin||!/^usr[A-Za-z0-9_-]{11}$/.test(uid||''))return;
 // Explicit fields only: never serialize the OIDC/engine bootstrap response.
 const {accountKey,host,secure,apiKey,managedDirectory,workspaceNavigation,expires,accountsURL,instance}=bootstrap;
 localStorage.setItem(KEY,JSON.stringify({accountKey,host,secure,apiKey,managedDirectory,workspaceNavigation,expires,accountsURL,instance,uid,isolatedOrigin:true,protocol:2}));
}
export function loadOfflineContext(){
 try{
  const value=JSON.parse(localStorage.getItem(KEY));
  if(!value||!/^[a-f0-9]{64}$/.test(value.accountKey)||!/^usr[A-Za-z0-9_-]{11}$/.test(value.uid)||value.host!==location.host+new URL(document.baseURI).pathname.replace(/\/$/,'')||!Number.isSafeInteger(value.expires)||value.expires*1000<=Date.now()||value.secure!==(location.protocol==='https:'))return null;
  return {...value,offline:true};
 }catch{return null}
}
export function clearOfflineContext(){try{localStorage.removeItem(KEY)}catch{}}
