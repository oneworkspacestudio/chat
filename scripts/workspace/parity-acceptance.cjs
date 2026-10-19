// Real packaged-runtime regression checks. Never point this at owner data.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT,origin=process.env.CHAT_TEST_ORIGIN;
assert(root&&/chat-parity-[0-9]+[\\/]fixture$/.test(root)&&/^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin),'Use only the named isolated loopback fixture.');
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));
assert(users.length>=3&&users.every(u=>u.email.endsWith('@example.test')),'Synthetic accounts required.');
const safeError=value=>users.reduce((text,user)=>text.replaceAll(user.password,'[redacted]'),String(value));
const checks=[];
const pass=name=>{checks.push(name);console.log('PASS '+name)};
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  async function login(user){
   const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(20000);
   await page.goto(origin+'/chat/');await page.locator('#username').fill(user.username);await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('input[type=password]').fill(user.password);await page.getByRole('button',{name:/Sign in/i}).click();await page.locator('#dummy-view h2').waitFor();
   const url=new URL(page.url());assert.notEqual(url.hostname,new URL(origin).hostname);const base=url.origin+'/chat/';
   const uid=await page.evaluate(async()=>{
    const b=await(await fetch(new URL('api/bootstrap',document.baseURI),{cache:'no-store'})).json();
    const client=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticParityAcceptance',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:false},()=>resolve(c));});
    client.enableLogging(false);await client.connect();await client.login('workspace',b.ticket);await client.getMeTopic().subscribe();
    window.parityClient=client;window.parityReceived=[];client.onDataMessage=data=>window.parityReceived.push({seq:data.seq,topic:data.topic,id:data.head?.workspace_id});return client.getCurrentUserID();
   });
   return{context,page,uid,base};
  }
  const alice=await login(users[0]),bob=await login(users[1]),charlie=await login(users[2]);pass('Three independent MyAccounts identities on a dedicated Chat hostname');
  const cookies=await alice.context.cookies(alice.base);assert(cookies.some(c=>c.name==='chat_session'&&c.domain==='127.0.0.1'&&c.httpOnly));assert(!cookies.some(c=>c.name==='workspace_session'));pass('Host-only Chat session does not share the portal cookie');
  for(const [actor,peer]of[[alice,bob],[bob,alice]])await actor.page.evaluate(async peer=>{const topic=parityClient.getTopic(peer);await topic.subscribe();},peer.uid);
  const id=crypto.randomUUID(),content='Synthetic atomic delivery '+Date.now();
  async function send(actor,topic,id,content,attachments){return actor.page.evaluate(async args=>{try{const message=parityClient.createMessage(args.topic,args.content,false);message.head={workspace_id:args.id,...(typeof args.content==='object'?{mime:'text/x-drafty'}:{})};return await parityClient.publishMessage(message,args.attachments);}catch(error){return{code:error.code,error:'server rejected publication'}}},{topic,id,content,attachments});}
  if(process.env.CHAT_TEST_RESTART==='1'){
   const previous=JSON.parse(fs.readFileSync(root+'/parity-restart-input.json','utf8'));
   assert.equal(alice.uid,previous.aliceID);assert.equal(bob.uid,previous.bobID);assert.equal(charlie.uid,previous.charlieID);
   const retry=await send(alice,bob.uid,previous.retryID,previous.retryContent);assert.equal(retry.code,410);
   const restored=await bob.context.request.get(previous.attachmentURL);assert.equal(restored.status(),200);assert.equal(crypto.createHash('sha256').update(await restored.body()).digest('hex'),previous.attachmentSHA256);
   pass('Native runtime restart preserves identity links, durable deleted-message receipt and exact attachment bytes');
  }
  const first=await send(alice,bob.uid,id,content);assert.equal(first.code,202);
  const second=await send(alice,bob.uid,id,content);assert.equal(second.code,202);assert.equal(second.params.seq,first.params.seq);assert.equal(second.params.duplicate,true);
  assert.equal((await send(alice,bob.uid,id,'changed body')).code,400);
  await bob.page.waitForFunction(id=>parityReceived.some(item=>item.id===id),id);
  assert.equal(await bob.page.evaluate(id=>parityReceived.filter(item=>item.id===id).length,id),1);pass('Durable retry returns the original sequence; changed payload rejected; recipient sees one delivery');
  const bytes=Buffer.from('Exact synthetic attachment bytes\n'+crypto.randomBytes(512).toString('hex'));
  const upload=await alice.context.request.post(alice.base+'v0/file/u/',{headers:{Origin:new URL(alice.base).origin},multipart:{file:{name:'synthetic-attachment.bin',mimeType:'application/octet-stream',buffer:bytes}}});
  assert([200,201].includes(upload.status()),'Native file upload must succeed');const uploaded=await upload.json();const file=uploaded.ctrl.params.url;assert(file&&file.includes('/v0/file/s/'));assert(!/[?&](auth|secret|sid|apikey)=/.test(file));
  const attachmentURL=new URL(file,alice.base).href;
  assert.equal((await bob.context.request.get(attachmentURL)).status(),403);assert.equal((await charlie.context.request.head(attachmentURL)).status(),403);pass('Unshared uploaded file denies other signed-in users for GET and HEAD');
  const attachmentID=crypto.randomUUID();
  const shared=await send(alice,bob.uid,attachmentID,{txt:'Synthetic document',fmt:[{at:-1,len:0,key:0}],ent:[{tp:'EX',data:{ref:file,name:'synthetic-attachment.bin',mime:'application/octet-stream',size:bytes.length}}]},[file]);
  assert.equal(shared.code,202);
  const downloaded=await bob.context.request.get(attachmentURL);assert.equal(downloaded.status(),200);assert.deepEqual(await downloaded.body(),bytes);assert(downloaded.headers()['content-security-policy'].includes('sandbox'));
  assert.equal((await charlie.context.request.get(attachmentURL)).status(),403);pass('Authorized recipient downloads exact bytes; outsider remains denied; active documents sandboxed');
  await charlie.page.evaluate(async()=>{const topic=parityClient.getTopic('slf');await topic.subscribe()});
  assert.equal((await send(charlie,'slf',crypto.randomUUID(),{txt:'Attempted reference',ent:[{tp:'EX',data:{ref:file,name:'foreign.bin'}}]},[file])).code,403);
  assert.equal((await charlie.context.request.get(attachmentURL)).status(),403);
  assert.equal((await send(charlie,'slf',crypto.randomUUID(),'Synthetic self message after denied grant')).code,202);pass('Forged attachment sharing rejected atomically; subsequent valid send still works');
  await alice.page.evaluate(async({peer,seq})=>{await parityClient.getTopic(peer).delMessages([{low:seq,hi:seq+1}],true)},{peer:bob.uid,seq:first.params.seq});
  const deletedRetry=await send(alice,bob.uid,id,content);assert.equal(deletedRetry.code,410);pass('Retry after delete returns Gone without republishing or reinserting deleted content into the SDK');
  const preferences=await alice.context.request.get(alice.base+'api/preferences');const p=await preferences.json();
  const next={...p,lists:[{id:crypto.randomUUID(),name:'Synthetic list',topics:[bob.uid]}],favourites:[bob.uid]};
  const save=await alice.context.request.put(alice.base+'api/preferences',{headers:{Origin:new URL(alice.base).origin,'If-Match':preferences.headers().etag},data:next});assert.equal(save.status(),200);
  assert.equal((await alice.context.request.put(alice.base+'api/preferences',{headers:{Origin:new URL(alice.base).origin,'If-Match':preferences.headers().etag},data:next})).status(),409);
  assert.equal((await bob.context.request.get(bob.base+'api/preferences')).status(),200);assert(!(await(await bob.context.request.get(bob.base+'api/preferences')).json()).favourites.includes(bob.uid));pass('Account-scoped custom lists persist with concurrent-write conflict protection');
  const lp=await alice.context.request.get(alice.base+'v0/channels/lp');assert.equal(lp.status(),201);const sid=(await lp.json()).ctrl.params.sid;
  assert.equal((await bob.context.request.post(bob.base+'v0/channels/lp?sid='+encodeURIComponent(sid),{headers:{Origin:new URL(bob.base).origin},data:{hi:{id:'synthetic',ver:'0.25'}}})).status(),403);pass('Long-poll session cannot be transplanted to a different authenticated account');
  const foreignTicket=await alice.page.evaluate(async()=>{const response=await fetch(new URL('api/bootstrap',document.baseURI));return(await response.json()).ticket});
  const foreignLogin=await bob.page.evaluate(async ticket=>{const b=await(await fetch(new URL('api/bootstrap',document.baseURI))).json();const client=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticBindingAcceptance',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:false},()=>resolve(c));});try{await client.connect();await client.login('workspace',ticket);return 200}catch(error){return error.code}finally{client.disconnect()}},foreignTicket);assert.equal(foreignLogin,403);pass('WebSocket gateway identity rejects a valid ticket for a different account');
  const group=await alice.page.evaluate(async bobID=>{const group=parityClient.getTopic(parityClient.newGroupTopicName(false));await group.subscribe(undefined,{desc:{public:{fn:'Synthetic membership check'},defacs:{auth:'N',anon:'N'}}});await group.setMeta({sub:{user:bobID,mode:'JRWPS'}});return group.name},bob.uid);
  await bob.page.evaluate(async group=>{await parityClient.getTopic(group).subscribe()},group);
  const groupBytes=Buffer.from('Synthetic group attachment '+crypto.randomBytes(24).toString('hex'));
  const groupUpload=await alice.context.request.post(alice.base+'v0/file/u/',{headers:{Origin:new URL(alice.base).origin},multipart:{file:{name:'group-only.bin',mimeType:'application/octet-stream',buffer:groupBytes}}});assert([200,201].includes(groupUpload.status()));const groupFile=(await groupUpload.json()).ctrl.params.url;
  assert.equal((await send(alice,group,crypto.randomUUID(),{txt:'Group document',ent:[{tp:'EX',data:{ref:groupFile,name:'group-only.bin'}}]},[groupFile])).code,202);
  const groupURL=new URL(groupFile,alice.base).href;assert.deepEqual(await(await bob.context.request.get(groupURL)).body(),groupBytes);assert.equal((await charlie.context.request.get(groupURL)).status(),403);
  await alice.page.evaluate(async({group,bobID})=>{await parityClient.getTopic(group).delSubscription(bobID)},{group,bobID:bob.uid});assert.equal((await bob.context.request.get(groupURL)).status(),403);pass('Group media membership enforced; removed member loses access; outsider denied');
  for(const [actor,peer]of[[charlie,alice],[alice,charlie]])await actor.page.evaluate(async peer=>{await parityClient.getTopic(peer).subscribe()},peer.uid);
  const retiredID=crypto.randomUUID(),retiredText='Synthetic conversation retirement '+Date.now();assert.equal((await send(charlie,alice.uid,retiredID,retiredText)).code,202);
  for(const [actor,peer]of[[charlie,alice],[alice,charlie]])await actor.page.evaluate(async peer=>{await parityClient.getTopic(peer).delTopic(true)},peer.uid);
  for(const [actor,peer]of[[charlie,alice],[alice,charlie]])await actor.page.evaluate(async peer=>{await parityClient.getTopic(peer).subscribe()},peer.uid);
  assert.equal((await send(charlie,alice.uid,crypto.randomUUID(),'Synthetic reopened conversation')).code,202);assert.equal((await send(charlie,alice.uid,retiredID,retiredText)).code,410);pass('Deleting and reopening a private conversation cannot replay its retired message UUID');
  const meta={aliceID:alice.uid,bobID:bob.uid,charlieID:charlie.uid,retryID:id,retryContent:content,retrySeq:first.params.seq,attachmentURL,attachmentSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),attachmentID,base:alice.base};
  fs.writeFileSync(root+'/parity-restart-input.json',JSON.stringify(meta,null,2));
  const portalURL=new URL(origin);const spoof=await alice.context.request.get(alice.base+'api/me',{headers:{Host:portalURL.host}});assert.equal(spoof.status(),421);pass('Shared hostname cannot access the isolated gateway');
  fs.writeFileSync(root+'/parity-results.json',JSON.stringify({checks,synthetic:true,mockedSuccessfulResponses:false,cryptoAcceptance:false},null,2));
 }finally{await browser.close()}
}
main().catch(error=>{console.error(safeError(error.message));fs.writeFileSync(root+'/parity-failure.json',JSON.stringify({checks,error:safeError(error.message)}));process.exitCode=1});
