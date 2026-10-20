// Both endpoints carry signaling only. A primary 401/403 is authoritative and
// must never be converted into an outage in order to reuse a cached permission.
export class ContinuitySignaling {
 constructor({fetcher,base,getBinding,saveBinding,uid,getPublicKey}) {
  this.fetcher=fetcher;this.base=base;this.getBinding=getBinding;this.saveBinding=saveBinding;this.uid=uid;this.retryPrimaryAt=0;
  this.getPublicKey=getPublicKey;
  this.versions=new Map();
 }
 invalidate(peer){this.versions.set(peer,(this.versions.get(peer)||0)+1)}
 async request(url,body,token) {
  const r=await this.fetcher(url,{method:'POST',credentials:token?'omit':'same-origin',cache:'no-store',redirect:'error',
   headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(2500)});
  if(!r.ok)throw Object.assign(new Error(r.status===403?'Conversation access changed. Connection stopped.':r.status===401?'Sign in to renew your Chat session.':'Chat is reconnecting. Messages are kept on this device.'),{status:r.status});
  return r.status===204?null:r.json();
 }
 publicUsable(binding){return binding?.enabled&&binding.discovery?.expires>Date.now()&&binding.discovery.expires<=binding.expires&&typeof binding.discovery.token==='string'}
 relayUsable(binding){return binding?.enabled&&binding.relay?.expires>Date.now()&&binding.relay.expires<=binding.expires&&typeof binding.relay.token==='string'}
 usable(binding){return this.publicUsable(binding)||this.relayUsable(binding)}
 async rpc(body) {
  const version=this.versions.get(body.peer)||0,current=()=>(this.versions.get(body.peer)||0)===version;
  const assertCurrent=()=>{if(!current())throw Object.assign(new Error('Connection request cancelled'),{status:409})};
  let binding=this.getBinding(body.peer),primary,lastError;
  if(body.action==='receipts')return this.request(new URL('api/continuity',this.base),body);
  // Signal directly through the configured rendezvous; the ordinary poll still
  // revalidates membership at the origin, so a live 403 immediately closes it.
  if(!(body.action==='signal'&&this.relayUsable(binding))&&Date.now()>=this.retryPrimaryAt){
   try{
    const publicKey=this.getPublicKey?await this.getPublicKey():undefined;
    primary=await this.request(new URL('api/continuity',this.base),{...body,...(publicKey?{publicKey}:{})});this.retryPrimaryAt=0;
    assertCurrent();
    if(primary){
     const currentUID=this.uid();
     if(currentUID&&primary.uid!==currentUID)throw Object.assign(new Error('Chat identity changed'),{status:403});
     if(primary.relay){
      const endpoint=new URL(primary.relay.endpoint);
      if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||
       (endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&['localhost','127.0.0.1'].includes(endpoint.hostname))))throw new Error('Invalid connection service');
     }
     binding={key:body.peer+':binding',type:'binding',peer:body.peer,uid:primary.uid,epoch:primary.epoch,enabled:true,
      expires:primary.expires,iceServers:primary.iceServers||[],relay:primary.relay||null,discovery:primary.discovery||null};
     await this.saveBinding(binding,current);assertCurrent();
    }
   }catch(error){
    assertCurrent();
    if([401,403].includes(error.status)){
     if(binding)await this.saveBinding({...binding,relay:null,discovery:null,enabled:error.status===403?false:binding.enabled},current);
     throw error;
    }
    // 410 means the restarted primary forgot its in-memory device, not that
    // its authenticated conversation permission was revoked.
    if(error.status===410&&body.action!=='join')return this.rpc({...body,action:'join'});
    lastError=error;
    if(!error.status||error.status>=500)this.retryPrimaryAt=Date.now()+10000;
    else throw error;
   }
  }
  assertCurrent();
  if(this.publicUsable(binding)){
   if(body.action==='leave')return null;
   return {...primary,uid:binding.uid,epoch:binding.epoch,expires:binding.expires,iceServers:binding.iceServers||[],discovery:binding.discovery,peers:[],signals:[]};
  }
  if(this.relayUsable(binding)){
   try{
    const remote=await this.request(binding.relay.endpoint,body,binding.relay.token);
    if(!remote)return remote;
    if(remote.uid!==binding.uid||remote.epoch!==binding.epoch||remote.expires>binding.expires)throw Object.assign(new Error('Connection permission mismatch'),{status:403});
    return {...remote,iceServers:binding.iceServers||[],relay:binding.relay};
   }catch(error){
    // A relay rejection cannot renew or erase authoritative membership.
    // Fall back to the origin only when it successfully authorized this call.
    if(primary)return primary;
    throw Object.assign(new Error('Connection service is reconnecting. Messages stay on this device.'),{status:503});
   }
  }
  if(primary!==undefined)return primary;
  throw lastError||new Error('Waiting to reconnect. Messages are kept on this device.');
 }
}
