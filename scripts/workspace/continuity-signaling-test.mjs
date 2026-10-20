import assert from 'node:assert/strict';
import {ContinuitySignaling} from '../../workspace/client/src/workspace/continuity-signaling.mjs';
import {ChatContinuity} from '../../workspace/client/src/workspace/continuity.mjs';
const uid='usrAAAAAAAAAAA',peer='usrBBBBBBBBBBB',epoch='e'.repeat(64),expires=Date.now()+60000;
const base='https://chat.example.test/chat/',endpoint='https://signal.example.test/rendezvous';
const data={uid,epoch,expires,peers:[],signals:[],iceServers:[],relay:{endpoint,expires,token:'synthetic-token'}};
let binding,calls=[],status=200,relayStatus=200;
const transport=new ContinuitySignaling({base,uid:()=>uid,getBinding:()=>binding,saveBinding:async(b,current)=>{assert.equal(typeof current,'function');if(current())binding=structuredClone(b)},
 fetcher:async(url,options)=>{
  calls.push({url:String(url),options});
  const remote=String(url)===endpoint,code=remote?relayStatus:status;
  return new Response(JSON.stringify(remote?{uid,epoch,expires,peers:[],signals:[]}:data),{status:code});
 }});
const body={action:'join',peer,device:crypto.randomUUID()};
await transport.rpc(body);assert(binding.relay);assert.equal(calls.length,2);assert.equal(calls[1].options.credentials,'omit');
assert.equal(calls[1].options.headers.Authorization,'Bearer synthetic-token');
console.log('PASS authoritative online permission is cached and independent signaling uses no session cookies');
status=503;calls=[];await transport.rpc({...body,action:'poll'});assert.equal(calls.length,2);
calls=[];await transport.rpc({...body,action:'poll'});assert.equal(calls.length,1);assert.equal(calls[0].url,endpoint);
console.log('PASS origin outage uses the independent service with bounded origin retry');
for(const denied of [401,403]){
 binding={...binding,enabled:true,relay:data.relay};transport.retryPrimaryAt=0;status=denied;calls=[];
 await assert.rejects(transport.rpc(body),e=>e.status===denied);assert.equal(calls.length,1);assert.equal(binding.relay,null);
}
console.log('PASS authoritative sign-out and revocation cannot fall back to a cached grant');
binding={...binding,enabled:true,relay:data.relay};status=503;relayStatus=403;transport.retryPrimaryAt=0;
await assert.rejects(transport.rpc(body),e=>e.status===503);assert.equal(binding.enabled,true);
console.log('PASS relay failure cannot permanently disable the conversation');
binding.relay={...data.relay,expires:Date.now()-1};calls=[];
await assert.rejects(transport.rpc(body));assert.equal(calls.length,0);
console.log('PASS expired grant never contacts the independent service');
const store={all:async()=>[],put:async()=>{},clear:async()=>{}};
const c=new ChatContinuity({account:'a'.repeat(64),uid,Peer:class{},online:()=>true,getPeers:()=>[peer],publish:async()=>{},store});
await c.ready;let prepared=0;c.enable=async p=>{prepared++;assert.equal(p,peer)};
await c.tick();assert.equal(prepared,1);
await c.disable(peer);c.preparing.clear();await c.tick();assert.equal(prepared,1);assert.equal(c.canQueue(peer),false);await c.stop();
console.log('PASS recent conversations prepare automatically and explicit opt-out is respected');
const id=crypto.randomUUID(),row={key:peer+':in:'+id,peer,author:peer,direction:'in',id,epoch,time:Date.now(),payload:{kind:'text',text:'Synthetic saved history hole'},synced:true,seq:7};
let hydrated=false;
const recovery=new ChatContinuity({account:'a'.repeat(64),uid,online:()=>true,publish:async()=>{},hasHistory:()=>hydrated,
 fetchHistory:async(p,seq)=>{assert.equal(p,peer);assert.equal(seq,7);hydrated=true;return{topic:peer,from:peer,seq:7,head:{workspace_id:id},content:row.payload.text}},
 store:{...store,all:async()=>[row]}});
await recovery.ready;recovery.rpc=async()=>({uid,epoch,receipts:{[id]:7}});
await recovery.recoverIncoming();assert(hydrated);assert(recovery.records[0].synced);await recovery.stop();
console.log('PASS a server-saved incoming message missing from the SDK cache is hydrated again');

const discovery={token:'synthetic-public-grant',expires};
let publicBinding,complete,entered;
const waiting=new Promise(resolve=>entered=resolve);
const pending=new Promise(resolve=>complete=resolve);
const publicTransport=new ContinuitySignaling({base,uid:()=>uid,getBinding:()=>publicBinding,
 saveBinding:async(b,current)=>{assert.equal(typeof current,'function');if(current())publicBinding=structuredClone(b)},
 getPublicKey:async()=>({kty:'EC',crv:'P-256',x:'synthetic',y:'synthetic'}),
 fetcher:async(url,options)=>{assert.equal(new URL(url).origin,new URL(base).origin);assert(JSON.parse(options.body).publicKey);entered();return pending}
});
const late=publicTransport.rpc(body);await waiting;publicTransport.invalidate(peer);
complete(new Response(JSON.stringify({...data,relay:null,discovery})));
await assert.rejects(late,e=>e.status===409);assert.equal(publicBinding,undefined);
console.log('PASS opt-out rejects a late authoritative grant before persistence');
publicTransport.fetcher=async()=>new Response(JSON.stringify({...data,relay:null,discovery}));
assert.equal((await publicTransport.rpc(body)).discovery.token,discovery.token);
assert(publicBinding.discovery);assert(publicBinding.enabled);
console.log('PASS public device permission refresh uses the mutation generation predicate');
publicTransport.fetcher=async()=>new Response('',{status:403});
await assert.rejects(publicTransport.rpc(body),e=>e.status===403);
assert.equal(publicBinding.discovery,null);assert.equal(publicBinding.enabled,false);
console.log('PASS authoritative revocation erases public permission');
