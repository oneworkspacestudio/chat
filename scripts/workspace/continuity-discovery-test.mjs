import assert from 'node:assert/strict';
import {PublicContinuity} from '../../workspace/client/src/workspace/continuity-discovery.mjs';
const algorithm={name:'ECDSA',namedCurve:'P-256'},signature={name:'ECDSA',hash:'SHA-256'};
const encoder=new TextEncoder(),enc=bytes=>Buffer.from(bytes).toString('base64url');
const authority=await crypto.subtle.generateKey(algorithm,true,['sign','verify']);
const device=await crypto.subtle.generateKey(algorithm,false,['sign','verify']);
const key=await crypto.subtle.exportKey('jwk',device.publicKey);
const authorityKey=await crypto.subtle.exportKey('jwk',authority.publicKey);
const now=Date.now(),uid='usrAAAAAAAAAAA',peer='usrBBBBBBBBBBB',origin='https://chat.example.test';
const room=enc(crypto.getRandomValues(new Uint8Array(32))),epoch='e'.repeat(64);
const claims={v:1,aud:'oneworkspace-chat-discovery-v1',uid,peer,epoch,origin,room,issued:now,expires:now+60000,key};
async function token(value,signer=authority.privateKey){const body=enc(encoder.encode(JSON.stringify(value)));return body+'.'+enc(await crypto.subtle.sign(signature,signer,encoder.encode(body)))}
const session={peer,epoch,expires:claims.expires,links:new Map()};
const adapter=new PublicContinuity({session,uid,origin,identity:{publicKey:key,privateKey:device.privateKey},attach:()=>{},changed:()=>{}});
adapter.room={leave:async()=>{}};adapter.permit={send:async()=>{}};
const config={v:1,room,password:enc(crypto.getRandomValues(new Uint8Array(32))),relays:['wss://nos.lol'],authority:authorityKey,token:await token(claims),expires:claims.expires};
await adapter.update(config);assert.equal(adapter.localClaims.uid,uid);
console.log('PASS actual WebCrypto verifies authority signature and device-bound permission');
for(const patch of [{uid:peer},{peer:uid},{epoch:'f'.repeat(64)},{origin:'https://foreign.example.test'},{room:'foreign'},{expires:now-1},{expires:now+7200001},{issued:now+120000}]){
 await assert.rejects(adapter.verify(await token({...claims,...patch}),uid,peer));
}
console.log('PASS wrong account, conversation, origin, room and expired or oversized leases fail closed');
const foreign=await crypto.subtle.generateKey(algorithm,true,['sign','verify']);
await assert.rejects(adapter.verify(await token(claims,foreign.privateKey),uid,peer));
await assert.rejects(adapter.verify(config.token+'a',uid,peer));
console.log('PASS foreign authority and modified signatures are rejected');
await assert.rejects(adapter.update({...config,relays:['wss://untrusted.example.test']}));
await assert.rejects(adapter.update({...config,password:enc(crypto.getRandomValues(new Uint8Array(32)))}),e=>e.status===403);
console.log('PASS unapproved relays and changed room secrets cannot replace trust');
const otherKey=await crypto.subtle.exportKey('jwk',foreign.publicKey);
await assert.rejects(adapter.update({...config,token:await token({...claims,key:otherKey})}));
console.log('PASS another browser key cannot use this device permission');
adapter.close();
