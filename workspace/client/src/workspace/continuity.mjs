import {ContinuityStore} from './continuity-store.mjs';
import {payloadContent} from './stickers.mjs';
import {ContinuitySignaling} from './continuity-signaling.mjs';
import {PublicContinuity} from './continuity-discovery.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const UID=/^usr[A-Za-z0-9_-]{11}$/;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
// Tinode omits zero-valued Drafty offsets/entity keys on the wire. Those two
// fields have zero defaults; restore only these documented representation
// defaults rather than treating arbitrary different message bodies as equal.
const draftyDefaults=value=>value&&typeof value==='object'&&Array.isArray(value.fmt)?{...value,fmt:value.fmt.map(span=>span&&typeof span==='object'?{at:0,key:0,...span}:span)}:value;
export class ChatContinuity extends EventTarget {
 constructor({account,uid,getUID,getPeers=()=>[],online,publish,fetchHistory,hasHistory,normalizeContent=value=>value,fetcher=fetch,Peer=globalThis.RTCPeerConnection,store}){
  super();this.uid=uid;this.getUID=getUID;this.online=online;this.publish=publish;this.fetchHistory=fetchHistory;this.normalizeContent=normalizeContent;this.fetcher=(...args)=>fetcher(...args);this.Peer=Peer;
  this.store=store||new ContinuityStore(account);this.sessions=new Map();this.permissions=new Map();this.enabling=new Set();this.records=[];this.closed=false;
  this.getPeers=getPeers;this.hasHistory=hasHistory;this.preparing=new Map();
  this.signaling=new ContinuitySignaling({fetcher:this.fetcher,base:globalThis.document?.baseURI||'http://localhost/chat/',getBinding:peer=>this.permissions.get(peer),uid:()=>this.uid,
   getPublicKey:this.store.identity?async()=>(await this.store.identity()).publicKey:undefined,
   saveBinding:(binding,current)=>this.writeBinding(binding,current)});
  this.ready=this.store.all().then(rows=>{if(!this.closed){this.records=rows.filter(r=>r.type!=='binding');for(const row of rows.filter(r=>r.type==='binding'))this.permissions.set(row.peer,row);this.changed()}}).catch(()=>{this.error='Local message storage could not be opened. Direct sending is unavailable.';this.changed();throw new Error(this.error)});
  this.ready.catch(()=>{});this.timer=setInterval(()=>this.tick().catch(()=>{}),3000);
  this.resume=()=>this.tick().catch(()=>{});globalThis.addEventListener?.('online',this.resume);globalThis.addEventListener?.('pageshow',this.resume);
  this.visibility=()=>{if(!globalThis.document?.hidden)this.resume()};globalThis.document?.addEventListener('visibilitychange',this.visibility);
 }
 changed(){if(!this.closed)this.dispatchEvent(new Event('change'))}
 async writeBinding(binding,current=()=>true){
  this.bindingMutation=(this.bindingMutation||Promise.resolve()).catch(()=>{}).then(async()=>{
   if(this.closed||!current())return;
   await this.store.put(binding);
   if(!this.closed&&current())this.permissions.set(binding.peer,binding);
  });
  return this.bindingMutation;
 }
 canQueue(peer){return this.sessions.has(peer)||this.permissions.get(peer)?.enabled===true}
 view(peer){const session=this.sessions.get(peer),channels=session?[...session.links.values()]:[];return {enabled:!!session,connected:channels.some(l=>l.channel?.readyState==='open'),error:this.error||session?.error||'',expires:session?.expires,rows:this.records.filter(r=>r.peer===peer&&!r.synced).sort((a,b)=>a.time-b.time)};}
 async rpc(body){return this.signaling.rpc(body)}
 syncIdentity(){const current=this.getUID?.();if(UID.test(current||'')){if(this.uid&&this.uid!==current){this.stop();throw new Error('Chat account changed. Reload before continuing.')}this.uid=current}}
 async enable(peer){await this.ready;this.syncIdentity();if(this.closed||!this.Peer||!UID.test(peer)||peer===this.uid)throw new Error('Direct fallback requires a supported browser and another person.');if(this.sessions.has(peer)||this.enabling.has(peer))return;
  this.enabling.add(peer);try{
  const session={device:crypto.randomUUID(),peer,links:new Map(),expires:0,busy:false};
  const data=await this.rpc({action:'join',device:session.device,peer});if(this.closed)throw new Error('Chat session ended');this.syncIdentity();if(!this.uid&&UID.test(data.uid))this.uid=data.uid;if(data.uid!==this.uid)throw new Error('Chat identity changed. Reload before enabling direct fallback.');
  session.epoch=data.epoch;session.expires=data.expires;session.iceServers=data.iceServers;this.sessions.set(peer,session);this.error='';await this.process(session,data);this.changed();
  const binding={...this.permissions.get(peer),key:peer+':binding',type:'binding',peer,uid:data.uid,epoch:data.epoch,expires:data.expires,iceServers:data.iceServers||[],relay:data.relay||null,discovery:data.discovery||null,enabled:true};await this.writeBinding(binding,()=>this.sessions.get(peer)===session);
  }finally{this.enabling.delete(peer)}
 }
 async disable(peer,remember=true){this.signaling.invalidate(peer);const s=this.sessions.get(peer);if(s){this.sessions.delete(peer);s.discovery?.close();for(const l of s.links.values())l.pc.close();this.rpc({action:'leave',device:s.device,peer}).catch(()=>{})}if(remember){const binding={...this.permissions.get(peer),key:peer+':binding',type:'binding',peer,enabled:false,relay:null,discovery:null};this.permissions.set(peer,binding);await this.writeBinding(binding)}this.changed()}
 async tick(){if(this.closed||this.ticking)return;this.ticking=true;try{await this.ready;this.syncIdentity();
  // Prepare recent conversations without a per-chat mode switch. Explicit user
  // opt-outs are retained, and the server still checks bilateral membership.
  const peers=new Set([...this.permissions.values()].filter(b=>b.enabled).map(b=>b.peer));
  if(this.online())for(const peer of this.getPeers().slice(0,6))if(UID.test(peer)&&peer!==this.uid&&this.permissions.get(peer)?.enabled!==false)peers.add(peer);
  await Promise.all([...peers].map(async peer=>{
   if(this.sessions.has(peer)||this.preparing.get(peer)>Date.now()||(!this.online()&&!this.signaling.usable(this.permissions.get(peer))))return;
   this.preparing.set(peer,Date.now()+15000);
   try{await this.enable(peer)}catch(e){if(this.permissions.has(peer)&&[401,403,410].includes(e.status))await this.disable(peer,e.status===403)}
  }));
  await Promise.all([...this.sessions.values()].map(async s=>{
   if(Date.now()>=s.expires){await this.disable(s.peer,false);this.error='Connection permission expired. Waiting for Chat to renew it.';this.changed();return}
   for(const l of s.links.values())if(Date.now()>=l.expires)l.pc.close();
   if(s.busy)return;s.busy=true;
   try{const data=await this.rpc({action:'poll',device:s.device,peer:s.peer});if(data.uid!==this.uid||data.epoch!==s.epoch)throw Object.assign(new Error('Conversation identity changed.'),{status:403});await this.process(s,data);s.error=''}
   catch(e){s.error=e.message;if([401,403,410].includes(e.status)){await this.disable(s.peer,e.status===403);this.error=e.message}this.changed()}
   finally{s.busy=false}
  }));
  await this.deliver();await this.flush();await this.recoverIncoming();
  }finally{this.ticking=false}
 }
 async process(s,data){
  if(this.closed||this.sessions.get(s.peer)!==s)return;
  s.expires=data.expires;
  s.iceServers=data.iceServers||s.iceServers;
  if(data.discovery){
   if(!s.discovery){
    for(const link of s.links.values())link.pc.close();s.links.clear();
    const identity=await this.store.identity();
    if(this.closed||this.sessions.get(s.peer)!==s)return;
    s.discovery=new PublicContinuity({session:s,uid:this.uid,origin:new URL(this.signaling.base).origin,identity,
     attach:(link,channel)=>this.bind(s,link,channel),changed:()=>this.changed()});
   }
   await s.discovery.update(data.discovery);return;
  }
  // An authoritative configuration change closes old public permissions.
  if(s.discovery){s.discovery.close();s.discovery=null}
  const peers=new Map(data.peers.map(p=>[p.device,p]));
  for(const [device,link] of s.links){if(peers.has(device))link.expires=Math.min(s.expires,peers.get(device).expires)}
  for(const signal of data.signals){if(!peers.has(signal.from))continue;
   if(signal.type==='offer'){
    // Only the lexicographically lower authenticated device initiates. Reject
    // unsolicited/glare offers rather than replacing a live authenticated link.
    if(this.uid+s.device<s.peer+signal.from)continue;
    let link=s.links.get(signal.from);if(link)link.pc.close();link=this.link(s,signal.from,Math.min(s.expires,peers.get(signal.from).expires));
    await link.pc.setRemoteDescription({type:'offer',sdp:signal.sdp});await link.pc.setLocalDescription(await link.pc.createAnswer());await this.signal(s,signal.from,'answer',link.pc);
   }else if(signal.type==='answer'){const link=s.links.get(signal.from);if(link?.pc.signalingState==='have-local-offer')await link.pc.setRemoteDescription({type:'answer',sdp:signal.sdp})}
  }
  for(const peer of data.peers){
   const old=s.links.get(peer.device);
   if(old&&(['failed','closed'].includes(old.pc.connectionState)||(old.channel?.readyState!=='open'&&Date.now()-old.created>30000))){old.pc.close();s.links.delete(peer.device)}
   if(!s.links.has(peer.device)&&this.uid+s.device<s.peer+peer.device){const l=this.link(s,peer.device,Math.min(s.expires,peer.expires));this.bind(s,l,l.pc.createDataChannel('oneworkspace-chat-continuity-v1',{ordered:true}));await l.pc.setLocalDescription(await l.pc.createOffer());await this.signal(s,peer.device,'offer',l.pc)}
  }
 }
 async signal(s,target,type,pc){
  if(pc.iceGatheringState!=='complete')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();resolve()},5000);const changed=()=>{if(pc.iceGatheringState==='complete'){cleanup();resolve()}};const cleanup=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',changed)};pc.addEventListener('icegatheringstatechange',changed)});
  const data=await this.rpc({action:'signal',device:s.device,peer:s.peer,target,type,sdp:pc.localDescription.sdp});
  // A signaling POST also drains our mailbox. Do not lose a concurrent answer.
  await this.process(s,data);
 }
 link(s,device,expires){const pc=new this.Peer({iceServers:s.iceServers||[]}),l={pc,device,expires,created:Date.now()};s.links.set(device,l);
  pc.ondatachannel=e=>{if(e.channel.label!=='oneworkspace-chat-continuity-v1'||l.channel){e.channel.close();return}this.bind(s,l,e.channel)};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'){s.error='Direct connection could not be established. Keep Chat online; restrictive networks need an administrator-configured TURN relay.';pc.close()}this.changed()};return l;
 }
 bind(s,l,channel){l.channel=channel;channel.onopen=()=>{this.changed();this.deliver().catch(()=>{})};channel.onclose=()=>this.changed();channel.onerror=()=>{s.error='Direct connection interrupted; messages remain on this device.';this.changed()};
  channel.onmessage=e=>{this.incoming=(this.incoming||Promise.resolve()).then(()=>this.receive(s,l,e.data)).catch(()=>{s.error='A direct message could not be stored or verified; it was not acknowledged.';this.changed()})};
 }
 async receive(s,l,raw){if(this.closed||this.sessions.get(s.peer)!==s||s.links.get(l.device)!==l||l.channel?.readyState!=='open'||Date.now()>=l.expires||typeof raw!=='string'||new TextEncoder().encode(raw).length>16*1024)throw new Error('Expired or oversized direct packet');const packet=JSON.parse(raw);
  if(packet.v!==1||packet.epoch!==s.epoch||!UUID.test(packet.id)||!['message','ack'].includes(packet.type))throw new Error('Invalid direct packet');
  if(packet.type==='ack'){const own=this.records.find(r=>r.direction==='out'&&r.peer===s.peer&&r.id===packet.id&&r.epoch===s.epoch);if(own&&!own.delivered){await this.update(own,{delivered:true});this.changed()}return}
  payloadContent(packet.payload);if(!Number.isSafeInteger(packet.time)||packet.time<0)throw new Error('Invalid time');
  const key=s.peer+':in:'+packet.id,existing=this.records.find(r=>r.key===key);
  if(existing){if(existing.epoch!==s.epoch||!same(existing.payload,packet.payload))throw new Error('Message ID conflict')}
  else{const row={key,peer:s.peer,author:s.peer,direction:'in',id:packet.id,epoch:s.epoch,payload:packet.payload,time:packet.time,delivered:true,synced:false};await this.store.put(row);if(this.closed||this.sessions.get(s.peer)!==s||Date.now()>=l.expires){await this.store.remove(key);return}this.records.push(row);this.changed()}
  if(channelWritable(l)){try{l.channel.send(JSON.stringify({v:1,type:'ack',id:packet.id,epoch:s.epoch}))}catch{l.pc.close();this.changed()}}
 }
 async update(row,patch){this.mutation=(this.mutation||Promise.resolve()).catch(()=>{}).then(async()=>{const next={...row,...patch};await this.store.put(next);Object.assign(row,next)});return this.mutation}
 async send(peer,payload,id=crypto.randomUUID()){
  await this.ready;payloadContent(payload);if(this.closed||!UID.test(peer)||!UUID.test(id))throw new Error('Chat account unavailable');
  const s=this.sessions.get(peer)||this.permissions.get(peer);if(!s)throw new Error('Enable direct fallback while Chat is online before using the local outbox for this conversation.');
  if(new TextEncoder().encode(JSON.stringify({v:1,type:'message',id,epoch:s.epoch,payload,time:Date.now()})).length>16*1024)throw new Error('This message is too large for direct delivery. Split it into shorter messages.');
  const key=peer+':out:'+id,existing=this.records.find(r=>r.key===key);
  if(existing&&!same(existing.payload,payload))throw new Error('Message ID conflict');
  if(!existing){const row={key,peer,author:this.uid,direction:'out',id,epoch:s.epoch,payload,time:Date.now(),delivered:false,synced:false};await this.store.put(row);this.records.push(row)}
  this.changed();await this.deliver();return {workspaceQueued:true,id};
 }
 async deliver(){for(const row of this.records){if(row.direction!=='out'||row.delivered||row.synced)continue;const s=this.sessions.get(row.peer);if(!s||s.epoch!==row.epoch)continue;
  for(const l of s.links.values()){if(!channelWritable(l)||Date.now()>=l.expires)continue;const key=l.device+':'+row.id;if((this.lastSent?.get(key)||0)>Date.now()-5000)continue;if(!this.lastSent)this.lastSent=new Map();try{l.channel.send(JSON.stringify({v:1,type:'message',id:row.id,epoch:row.epoch,payload:row.payload,time:row.time}));this.lastSent.set(key,Date.now())}catch{l.pc.close();this.changed()}}
 }}
 async flush(){if(this.flushing||this.closed||!this.online())return;this.flushing=true;const failedPeers=new Set();try{for(const row of this.records){if(this.closed||!this.online())return;if(row.direction!=='out'||row.synced||failedPeers.has(row.peer))continue;
   try{const ctrl=await this.publish(row.peer,payloadContent(row.payload),{workspace_id:row.id,workspace_continuity:row.epoch});if(!(ctrl?.code>=200&&ctrl.code<300&&Number.isInteger(ctrl.params?.seq)))throw new Error('No server receipt');await this.update(row,{synced:true});await this.prune();this.error='';this.changed()}
   catch(error){failedPeers.add(row.peer);this.error='A direct message is waiting for server sync. Its local copy is kept. '+String(error.message||'Check connection and conversation access.').slice(0,160);this.changed()}
  }}finally{this.flushing=false}}
 async prune(){const saved=this.records.filter(r=>r.synced).sort((a,b)=>b.time-a.time);for(const row of saved.slice(100)){await this.store.remove(row.key);this.records=this.records.filter(r=>r!==row)}}
 async recoverIncoming(){
  if(this.recovering||!this.online()||!this.fetchHistory||this.closed)return;this.recovering=true;
  const missing=r=>r.direction==='in'&&!r.deleted&&(!r.synced||(this.hasHistory&&!this.hasHistory(r.peer,r.seq,r.id)));
  try{const peers=[...new Set(this.records.filter(missing).map(r=>r.peer))];for(const peer of peers){
   const rows=this.records.filter(r=>r.peer===peer&&missing(r)).slice(0,32);
   if(!rows.length)continue;
   const result=await this.rpc({action:'receipts',device:crypto.randomUUID(),peer,ids:rows.map(r=>r.id)});
   if(result.uid!==this.uid)throw new Error('Chat account changed');
   for(const row of rows){if(result.epoch!==row.epoch)continue;const seq=result.receipts?.[row.id];if(seq===-1){await this.update(row,{synced:true,deleted:true});this.changed()}else if(Number.isInteger(seq)&&seq>0){const data=await this.fetchHistory(peer,seq);if(data)await this.reconcile(data)}}
  }}catch{ /* Keep unconfirmed local copies; a later authenticated tick retries. */ }finally{this.recovering=false}
 }
 async discardConversation(peer){await this.disable(peer);for(const row of this.records.filter(r=>r.peer===peer))await this.store.remove(row.key);this.records=this.records.filter(r=>r.peer!==peer);await this.store.remove(peer+':binding');this.permissions.delete(peer);this.changed()}
 async reconcile(data){if(!data?.head?.workspace_id)return;await this.ready;const row=this.records.find(r=>r.id===data.head.workspace_id&&r.peer===data.topic&&r.author===data.from);if(row&&same(draftyDefaults(this.normalizeContent(payloadContent(row.payload))),draftyDefaults(data.content))){if(!row.synced||row.seq!==data.seq)await this.update(row,{synced:true,seq:data.seq});await this.prune();this.changed()}}
 async stop(clear=false){if(this.closed)return;this.closed=true;clearInterval(this.timer);globalThis.removeEventListener?.('online',this.resume);globalThis.removeEventListener?.('pageshow',this.resume);globalThis.document?.removeEventListener('visibilitychange',this.visibility);for(const s of this.sessions.values()){s.discovery?.close();for(const l of s.links.values())l.pc.close()}this.sessions.clear();if(clear)await this.store.clear()}
}
function channelWritable(link){return link.channel?.readyState==='open'&&link.channel.bufferedAmount<64*1024}
