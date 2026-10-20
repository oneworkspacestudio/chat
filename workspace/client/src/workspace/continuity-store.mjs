const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('Local storage transaction aborted'));tx.onerror=()=>{}});
const encoder=new TextEncoder(),decoder=new TextDecoder();
// Adapter contract is shared with the future bundled Android/iOS shells. The
// browser implementation never serializes the non-exportable AES key to JSON.
export class ContinuityStore {
 constructor(account){if(!/^[a-f0-9]{64}$/.test(account))throw new Error('Sign in before using continuity');this.name='oneworkspace-chat-continuity-v1-'+account;this.ready=this.open()}
 async open(){
  const opening=indexedDB.open(this.name,1);opening.onupgradeneeded=()=>{opening.result.createObjectStore('keys');opening.result.createObjectStore('messages',{keyPath:'key'})};
  this.db=await request(opening);this.db.onversionchange=()=>this.db.close();
  const candidate=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const tx=this.db.transaction('keys','readwrite'),complete=done(tx),store=tx.objectStore('keys'),get=store.get('payload');
  get.onsuccess=()=>{this.cryptoKey=get.result||candidate;if(!get.result)store.put(candidate,'payload')};await complete;
 }
 async all(){await this.ready;const tx=this.db.transaction('messages','readonly'),complete=done(tx);const rows=await request(tx.objectStore('messages').getAll());await complete;
  return Promise.all(rows.map(async row=>{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:encoder.encode(row.key)},this.cryptoKey,row.cipher);return {...JSON.parse(decoder.decode(plain)),key:row.key}}));
 }
 async put(record){await this.ready;const iv=crypto.getRandomValues(new Uint8Array(12)),key=record.key;const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(key)},this.cryptoKey,encoder.encode(JSON.stringify(record)));
  const tx=this.db.transaction('messages','readwrite'),complete=done(tx),store=tx.objectStore('messages');
  const count=await request(store.count());
  if(count>=1000&&!await request(store.get(key))){tx.abort();await complete.catch(()=>{});throw new Error('Local outbox is full. Reconnect and sync messages before sending more.')}
  store.put({key,iv,cipher});await complete;
 }
 async identity(){
  await this.ready;
  if(!this.identityReady)this.identityReady=(async()=>{
   const candidate=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
   const tx=this.db.transaction('keys','readwrite'),complete=done(tx),keys=tx.objectStore('keys'),get=keys.get('device-identity');
   let pair;get.onsuccess=()=>{pair=get.result||candidate;if(!get.result)keys.put(pair,'device-identity')};await complete;
   const {kty,crv,x,y}=await crypto.subtle.exportKey('jwk',pair.publicKey);
   return {privateKey:pair.privateKey,publicKey:{kty,crv,x,y}};
  })();
  return this.identityReady;
 }
 async remove(key){await this.ready;const tx=this.db.transaction('messages','readwrite'),complete=done(tx);tx.objectStore('messages').delete(key);await complete}
 async clear(){await this.ready;const tx=this.db.transaction(['messages','keys'],'readwrite'),complete=done(tx);tx.objectStore('messages').clear();tx.objectStore('keys').clear();await complete;this.db.close()}
}
