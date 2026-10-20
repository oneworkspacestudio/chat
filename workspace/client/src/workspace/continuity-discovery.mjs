import {joinRoom, selfId} from 'trystero';

const audience='oneworkspace-chat-discovery-v1';
const relays=new Set(['wss://relay.damus.io','wss://nos.lol','wss://relay.primal.net']);
const encoder=new TextEncoder(), decoder=new TextDecoder();
const algorithm={name:'ECDSA',hash:'SHA-256'};
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function decode(text){
 if(typeof text!=='string'||text.length>4096||!/^[A-Za-z0-9_-]+$/.test(text))throw new Error('Invalid device proof');
 return Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4)),c=>c.charCodeAt(0));
}
const keyEqual=(a,b)=>a?.kty==='EC'&&a.crv==='P-256'&&a.kty===b?.kty&&a.crv===b.crv&&a.x===b.x&&a.y===b.y;
const importKey=key=>crypto.subtle.importKey('jwk',{kty:key.kty,crv:key.crv,x:key.x,y:key.y},{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
const transcript=(room,token,from,to,nonce)=>encoder.encode(JSON.stringify([audience,room,token,from,to,nonce]));

// Credentials are delivered by the authenticated Chat origin and encrypted at
// rest. They are never Nostr events: only encrypted SDP crosses public relays.
export class PublicContinuity {
 constructor({session,uid,origin,identity,attach,changed}){
  this.session=session;this.uid=uid;this.origin=origin;this.identity=identity;this.attach=attach;this.changed=changed;
  this.verified=new Map();this.links=new Map();this.pending=new Set();this.closed=false;this.lastPermit=0;
 }
 async verify(token,uid,peer){
  if(typeof token!=='string'||token.length>4096)throw new Error('Invalid connection permission');
  const parts=token.split('.');if(parts.length!==2)throw new Error('Invalid connection permission');
  if(!await crypto.subtle.verify(algorithm,this.authority,decode(parts[1]),encoder.encode(parts[0])))throw new Error('Untrusted connection permission');
  const claims=JSON.parse(decoder.decode(decode(parts[0]))),now=Date.now();
  if(claims.v!==1||claims.aud!==audience||claims.uid!==uid||claims.peer!==peer||claims.epoch!==this.session.epoch||
   claims.origin!==this.origin||claims.room!==this.config.room||!Number.isSafeInteger(claims.issued)||!Number.isSafeInteger(claims.expires)||
   claims.issued>now+60000||claims.expires<=now||claims.expires-claims.issued>7200000||claims.expires<=claims.issued||
   claims.key?.kty!=='EC'||claims.key.crv!=='P-256'||decode(claims.key.x).length!==32||decode(claims.key.y).length!==32)
   throw new Error('Connection permission expired or changed');
  return claims;
 }
 async update(config){
  if(this.closed)return;
  if(!config||config.v!==1||decode(config.room).length!==32||decode(config.password).length!==32||
   !Array.isArray(config.relays)||!config.relays.length||config.relays.length>3||config.relays.some(url=>!relays.has(url)))
   throw new Error('Invalid public discovery configuration');
  if(this.config&&(this.config.room!==config.room||this.config.password!==config.password||!keyEqual(this.config.authority,config.authority)))
   throw Object.assign(new Error('Connection identity changed. Reconnecting safely.'),{status:403});
  this.config=config;
  this.authority=await importKey(config.authority);
  const claims=await this.verify(config.token,this.uid,this.session.peer);
  if(!keyEqual(claims.key,this.identity.publicKey)||claims.expires!==config.expires||claims.expires>this.session.expires)
   throw new Error('Device permission does not match this browser');
  this.localClaims=claims;
  if(this.closed)return;
  if(!this.room)this.open();
  for(const [id,link] of this.links){
   const remote=this.verified.get(id);link.expires=Math.min(claims.expires,remote?.expires||0);
   if(link.expires<=Date.now())link.pc.close();
  }
  if(Date.now()-this.lastPermit>60000){
   this.lastPermit=Date.now();
   this.permit.send(config.token).catch(()=>{});
  }
 }
 open(){
  this.room=joinRoom({
   appId:audience,password:this.config.password,maxReceiveBytes:64*1024,
   relayConfig:{urls:this.config.relays,redundancy:this.config.relays.length,warnOnRelayFailure:false},
   rtcConfig:{iceServers:this.session.iceServers||[]}
  },this.config.room,{
   handshakeTimeoutMs:12000,
   onPeerHandshake:(id,send,receive)=>this.handshake(id,send,receive),
   onJoinError:({peerId})=>{if(!this.closed){this.disconnected(peerId);this.session.error='Trying to reconnect directly. Undelivered messages stay on this device.';this.changed()}}
  });
  this.packet=this.room.makeAction('chat-packet',{
   onReceive:({peerId,byteLength})=>this.active(peerId)&&byteLength<=16*1024,
   onMessage:(raw,{peerId})=>{if(this.active(peerId)&&typeof raw==='string'&&encoder.encode(raw).length<=16*1024)this.links.get(peerId).channel.onmessage?.({data:raw})}
  });
  this.permit=this.room.makeAction('chat-permit',{
   onReceive:({peerId,byteLength})=>this.active(peerId)&&byteLength<=4096,
   onMessage:async(token,{peerId})=>{
    try{
     const previous=this.verified.get(peerId);if(!previous||!this.active(peerId))return;
     const claims=await this.verify(token,this.session.peer,this.uid);
     if(!keyEqual(previous.key,claims.key)||this.closed||!this.active(peerId))return;
     this.verified.set(peerId,claims);this.links.get(peerId).expires=Math.min(this.localClaims.expires,claims.expires);
    }catch{ /* A bad renewal cannot extend a permission. */ }
   }
  });
  this.room.onPeerJoin=id=>this.connected(id);
  this.room.onPeerLeave=id=>this.disconnected(id);
 }
 active(id){
  const link=this.links.get(id);
  return !this.closed&&link?.channel.readyState==='open'&&link.expires>Date.now();
 }
 async handshake(id,send,receive){
  if(this.closed||new Set([...this.pending,...this.verified.keys(),...this.links.keys()]).size>=4||this.pending.has(id))throw new Error('Device connection limit');
  this.pending.add(id);
  try{
   const nonce=encode(crypto.getRandomValues(new Uint8Array(32))),token=this.config.token;
   await this.verify(token,this.uid,this.session.peer);
   await send({v:1,token,nonce});
   const {data:hello}=await receive();
   if(hello?.v!==1||decode(hello.nonce).length!==32)throw new Error('Invalid device challenge');
   const claims=await this.verify(hello.token,this.session.peer,this.uid);
   const signature=await crypto.subtle.sign(algorithm,this.identity.privateKey,transcript(this.config.room,token,selfId,id,hello.nonce));
   await send({v:1,proof:encode(signature)});
   const {data:response}=await receive();
   if(response?.v!==1||!await crypto.subtle.verify(algorithm,await importKey(claims.key),decode(response.proof),
    transcript(this.config.room,hello.token,id,selfId,nonce))||this.closed||claims.expires<=Date.now())
    throw new Error('Device identity could not be verified');
   this.verified.set(id,claims);
  }finally{this.pending.delete(id)}
 }
 connected(id){
  const remote=this.verified.get(id);
  if(this.closed||!remote||remote.expires<=Date.now()||this.localClaims.expires<=Date.now()){this.room?.getPeers()[id]?.close();return}
  const link={device:'public:'+id,created:Date.now(),expires:Math.min(this.localClaims.expires,remote.expires)};
  const close=()=>{
   if(link.channel.readyState==='closed')return;
   link.channel.readyState='closed';link.channel.onclose?.();
   if(this.session.links.get(link.device)===link)this.session.links.delete(link.device);
   this.links.delete(id);this.verified.delete(id);this.room?.getPeers()[id]?.close();
  };
  link.pc={close,get connectionState(){return link.channel.readyState==='open'?'connected':'closed'}};
  link.channel={readyState:'open',bufferedAmount:0,send:raw=>{
   const size=encoder.encode(raw).length;
   if(!this.active(id)||size>16*1024||link.channel.bufferedAmount+size>64*1024)throw new Error('Direct channel is busy');
   link.channel.bufferedAmount+=size;
   this.packet.send(raw,{target:id,signal:AbortSignal.timeout(10000)}).catch(close).finally(()=>{link.channel.bufferedAmount-=size});
  }};
  this.links.set(id,link);this.session.links.set(link.device,link);this.attach(link,link.channel);
  link.channel.onopen?.();this.session.error='';this.changed();
 }
 disconnected(id){
  const link=this.links.get(id);if(link){link.channel.readyState='closed';link.channel.onclose?.();if(this.session.links.get(link.device)===link)this.session.links.delete(link.device)}
  this.links.delete(id);this.verified.delete(id);this.changed();
 }
 close(){
  if(this.closed)return;this.closed=true;
  for(const id of this.links.keys())this.disconnected(id);
  this.verified.clear();this.room?.leave().catch(()=>{});this.room=null;
 }
}
