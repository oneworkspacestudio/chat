// Real isolated Windows services and Chromium WebRTC. Never an owner fixture.
// Secondary SDK clients MUST use persist:true: Tinode's persist:false constructor
// deletes the shared account cache, invalidating any offline-reload acceptance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT,origin=process.env.CHAT_TEST_ORIGIN;
assert(root&&/continuity-chat-parity-[0-9]+[\\/]fixture$/.test(root)&&origin==='http://localhost:32360');
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));assert(users.length>=4&&users.every(u=>u.email.endsWith('@example.test')));assert(users.some(u=>u.username==='continuity-outsider'),'Seed a fourth isolated account that no conversation uses.');
const config=JSON.parse(fs.readFileSync(root+'/Private/workspace.json','utf8'));assert(config.origin===origin&&config.programs.includes('continuity'));
const checks=[],errors=[];let stopped=false;
const independent=process.env.CHAT_TEST_INDEPENDENT==='1';
const publicDiscovery=process.env.CHAT_TEST_PUBLIC_DISCOVERY==='1';
assert(!(independent&&publicDiscovery),'Choose the public or private discovery acceptance');
const automatic=independent||publicDiscovery;
const relayHosts=new Set();
let rendezvous;
const pass=name=>{checks.push(name);console.log('PASS '+name)};
async function health(ready){const deadline=Date.now()+120000;while(Date.now()<deadline){let ok=false;try{ok=(await fetch('http://127.0.0.1:32360/healthz',{signal:AbortSignal.timeout(2000)})).status===200}catch{}if(ok===ready)return;await new Promise(r=>setTimeout(r,500))}throw Error('Synthetic service readiness timeout')}
function start(){const fd=fs.openSync(root+'/continuity-restart.log','a');const child=spawn(root+'/Private/Workspace.exe',['--data',root+'/Private','run'],{windowsHide:true,stdio:['ignore',fd,fd]});child.unref();fs.closeSync(fd);stopped=false}
async function main(){
 await health(true);
 if(independent){
  const crypto=require('node:crypto'),keys=crypto.generateKeyPairSync('ed25519');
  const seed=keys.privateKey.export({format:'der',type:'pkcs8'}).subarray(-32).toString('base64url');
  const publicKey=keys.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64url');
  const endpoint='http://127.0.0.1:32397/rendezvous';
  fs.writeFileSync(root+'/Private/chat/continuity-relay.json',JSON.stringify({endpoint,signingSeed:seed}));
  const fd=fs.openSync(root+'/rendezvous.log','a');
  rendezvous=spawn(process.env.CHAT_TEST_RENDEZVOUS,['--listen','127.0.0.1:32397','--endpoint',endpoint,'--origin','http://127.0.0.1:32376','--public-key',publicKey],{windowsHide:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);
  for(let i=0;i<50;i++){try{if((await fetch(endpoint,{headers:{Origin:'http://127.0.0.1:32376'},method:'OPTIONS'})).status===204)break}catch{}if(i===49)throw Error('Independent rendezvous readiness failed');await new Promise(r=>setTimeout(r,100))}
 }
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  async function signIn(page,user,base){await page.goto(base||origin+'/chat/');await Promise.race([page.locator('#username').waitFor(),page.locator('.workspace-mobile-header h1').waitFor()]);const userField=page.locator('#username');if(await userField.isVisible().catch(()=>false)){await userField.fill(user.username);await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('input[type=password]').fill(user.password);await page.getByRole('button',{name:/Sign in/i}).click()}await page.locator('.workspace-mobile-header h1').waitFor({timeout:30000});return new URL(page.url()).origin+'/chat/'}
  async function login(user){const context=await browser.newContext({viewport:{width:390,height:760},isMobile:true,hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>{const url=new URL(ws.url());if(url.protocol==='wss:')relayHosts.add(url.host)});page.on('console',m=>{if(m.text().startsWith('CONTINUITY DIAGNOSTIC '))console.error(m.text())});return {context,page,base:await signIn(page,user)}}
  async function restore(clientPage,peer){await clientPage.evaluate(async peer=>{const b=await(await fetch(new URL('api/bootstrap',document.baseURI))).json();const client=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticContinuityRestore',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:true},()=>resolve(c))});client.enableLogging(false);try{await client.connect();await client.login('workspace',b.ticket);await client.getTopic(peer).subscribe(undefined,{sub:{mode:'JRWPA'}})}finally{client.disconnect()}},peer)}
  const alice=await login(users[0]),bob=await login(users[1]);const page=alice.page;const aliceID=await page.evaluate(()=>window.workspaceContinuity.uid),bobID=await bob.page.evaluate(()=>window.workspaceContinuity.uid);await restore(bob.page,aliceID);
  await page.getByRole('button',{name:'New chat',exact:true}).click();await page.getByRole('textbox',{name:'Find people',exact:true}).fill('Bob');await page.getByText('Bob Tester',{exact:true}).first().click();
  const warm='Synthetic conversation before outage '+Date.now();await page.locator('#send-message-input').fill(warm);await page.locator('#send-message-input').press('Enter');
  await bob.page.locator('.contact-title').filter({hasText:'Alice Tester'}).click();await bob.page.locator('#scroller').getByText(warm,{exact:true}).waitFor();
  assert.notEqual(aliceID,bobID);
  const reply='Synthetic mutual conversation ready '+Date.now();await bob.page.locator('#send-message-input').fill(reply);await bob.page.locator('#send-message-input').press('Enter');await page.locator('#scroller').getByText(reply,{exact:true}).waitFor();
  for(const client of [alice,bob]){await client.page.evaluate(async()=>{await navigator.serviceWorker.ready});await client.page.waitForFunction(()=>!!navigator.serviceWorker.controller)}
  async function enable(client){await client.page.getByRole('button',{name:'Direct fallback',exact:true}).click();const dialog=client.page.getByRole('dialog',{name:'Direct fallback',exact:true});await dialog.getByRole('button',{name:'Enable direct fallback',exact:true}).click();try{await dialog.getByRole('button',{name:'Turn off direct fallback',exact:true}).waitFor()}catch(e){console.error('Direct setup status: '+await dialog.innerText());throw e}await dialog.getByRole('button',{name:'Close direct fallback',exact:true}).click()}
  if(!automatic){for(const [client,peer] of [[alice,bobID],[bob,aliceID]])if(!await client.page.evaluate(peer=>window.workspaceContinuity.view(peer).enabled,peer))await enable(client)}
  for(const [client,peer] of [[alice,bobID],[bob,aliceID]])await client.page.waitForFunction(peer=>window.workspaceContinuity.view(peer).connected,peer,{timeout:45000});
  if(publicDiscovery){
   assert(!fs.existsSync(root+'/Private/chat/continuity-relay.json'),'Public acceptance cannot use a private relay');
   for(const [client,peer] of [[alice,bobID],[bob,aliceID]])assert(await client.page.evaluate(peer=>[...window.workspaceContinuity.sessions.get(peer).links.keys()].some(id=>id.startsWith('public:')),peer));
   assert(relayHosts.size>0,'Real public relay WebSockets were observed');
  }
  pass(automatic?'Two authenticated users automatically establish real WebRTC without mode selection':'Two authenticated users establish a real WebRTC data channel');
  const bad=await bob.page.evaluate(async({peer,device})=>{const r=await fetch(new URL('api/continuity',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'poll',peer,device})});return r.status},{peer:aliceID,device:await page.evaluate(peer=>window.workspaceContinuity.sessions.get(peer).device,bobID)});assert.equal(bad,403);
  await page.waitForFunction(async()=>{const list=await(await fetch(new URL('api/people?q=continuity-outsider%40example.test',document.baseURI))).json();return list.users?.length===1});
  const denied=await page.evaluate(async()=>{const list=await(await fetch(new URL('api/people?q=continuity-outsider%40example.test',document.baseURI))).json();const r=await fetch(new URL('api/continuity',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',peer:list.users[0].topic,device:crypto.randomUUID()})});return r.status});assert.equal(denied,403);pass('Foreign session cannot steal a device and a non-member cannot establish fallback');
  const emojiText='Emoji '+Date.now()+' 🥳';await page.locator('#send-message-input').fill(emojiText.slice(0,-2));await page.getByRole('button',{name:'Emoji and stickers',exact:true}).click();await page.getByRole('dialog',{name:'Emoji and stickers',exact:true}).getByRole('button',{name:'🥳',exact:true}).click();assert((await page.locator('#send-message-input').inputValue()).includes('🥳'));await page.locator('#send-message-input').press('Enter');await bob.page.locator('#scroller').getByText(emojiText,{exact:true}).waitFor();
  await page.getByRole('button',{name:'Emoji and stickers',exact:true}).click();await page.screenshot({path:root+'/continuity-picker.png'});
  const picker=page.getByRole('dialog',{name:'Emoji and stickers',exact:true});
  for(const [width,height] of [[320,480],[390,760],[640,360]]){await page.setViewportSize({width,height});const close=picker.getByRole('button',{name:'Close emoji and stickers',exact:true});const before=await close.boundingBox();assert(before.y>=0&&before.y+before.height<=height&&before.width>=44&&before.height>=44);await picker.getByRole('button',{name:'Coffee break',exact:true}).scrollIntoViewIfNeeded();assert.deepEqual(await close.boundingBox(),before);const box=await picker.boundingBox();assert(box.x>=0&&box.x+box.width<=width);assert(await picker.evaluate(n=>n.scrollWidth<=n.clientWidth+1));}
  await page.setViewportSize({width:390,height:760});await picker.getByRole('button',{name:'Close emoji and stickers',exact:true}).click();pass('Local picker sends emoji and keeps its close button reachable on three narrow/short screens');
  const stop=spawnSync(root+'/Private/Workspace.exe',['--data',root+'/Private','stop'],{windowsHide:true,encoding:'utf8',timeout:60000});assert.equal(stop.status,0);stopped=true;await health(false);
  await page.waitForFunction(()=>!window.workspaceContinuity.online());assert(await page.evaluate(peer=>window.workspaceContinuity.view(peer).connected,bobID));
  const outgoing='Synthetic direct message during total server outage 😀 '+Date.now(),incoming='Synthetic reply while server is stopped 💜 '+Date.now(),richPlain='Synthetic bold continuity '+Date.now();
  await page.locator('#send-message-input').fill(outgoing);await page.locator('#send-message-input').press('Enter');await bob.page.locator('.workspace-continuity').getByText(outgoing,{exact:true}).waitFor();await page.locator('.workspace-continuity').getByText('Delivered directly · waiting to save to Chat',{exact:true}).waitFor();
  await bob.page.locator('#send-message-input').fill(incoming);await bob.page.locator('#send-message-input').press('Enter');await page.locator('.workspace-continuity').getByText(incoming,{exact:true}).waitFor();
  await page.getByRole('button',{name:'Emoji and stickers',exact:true}).click();await page.getByRole('dialog',{name:'Emoji and stickers',exact:true}).getByRole('button',{name:'With love',exact:true}).click();await bob.page.locator('.workspace-continuity img[alt="With love"]').waitFor();
  await page.locator('#send-message-input').fill('*'+richPlain+'*');await page.locator('#send-message-input').press('Enter');await bob.page.locator('.workspace-continuity').getByText('*'+richPlain+'*',{exact:true}).waitFor();
  assert.equal(await page.locator('#send-message-input').inputValue(),'');await page.screenshot({path:root+'/continuity-outage.png'});pass('Stop the entire synthetic Workspace: real bidirectional text/emoji/sticker delivery continues over WebRTC');
  const encrypted=await page.evaluate(async marker=>{const manager=window.workspaceContinuity;await manager.store.ready;const tx=manager.store.db.transaction('messages','readonly');const rows=await new Promise((resolve,reject)=>{const r=tx.objectStore('messages').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return{plaintext:JSON.stringify(rows).includes(marker),cipher:rows.every(r=>r.cipher instanceof ArrayBuffer&&r.iv.length===12),extractable:manager.store.cryptoKey.extractable}},outgoing);assert.deepEqual(encrypted,{plaintext:false,cipher:true,extractable:false});pass('IndexedDB contains ciphertext with a non-exportable WebCrypto key');
  const before=await bob.page.evaluate(()=>window.workspaceContinuity.records.filter(r=>r.direction==='in').length);
  await page.evaluate(peer=>{const manager=window.workspaceContinuity,row=manager.records.find(r=>r.direction==='out'&&r.payload.kind==='text');for(const link of manager.sessions.get(peer).links.values())if(link.channel?.readyState==='open')link.channel.send(JSON.stringify({v:1,type:'message',id:row.id,epoch:row.epoch,payload:row.payload,time:row.time}))},bobID);
  await new Promise(r=>setTimeout(r,1000));assert.equal(await bob.page.evaluate(()=>window.workspaceContinuity.records.filter(r=>r.direction==='in').length),before);pass('Actual duplicate data-channel packet creates no extra local message');
  const bobConversation=bob.page.url();await bob.page.reload();await bob.page.locator('#send-message-input').waitFor();await bob.page.locator('.workspace-continuity').getByText(outgoing,{exact:true}).waitFor();assert.equal(bob.page.url(),bobConversation);
  if(automatic){
   const aliceConversation=page.url();await page.reload();await page.locator('#send-message-input').waitFor();assert.equal(page.url(),aliceConversation);
   for(const [client,peer] of [[alice,bobID],[bob,aliceID]])await client.page.waitForFunction(peer=>window.workspaceContinuity.view(peer).connected,peer,{timeout:45000});
  }
  const queued='Synthetic queued after offline reload '+Date.now();await bob.page.locator('#send-message-input').fill(queued);await bob.page.locator('#send-message-input').press('Enter');await bob.page.locator('.workspace-continuity').getByText(queued,{exact:true}).waitFor();
  if(automatic)await page.locator('.workspace-continuity').getByText(queued,{exact:true}).waitFor();
  else await bob.page.locator('.workspace-continuity').getByText('Queued on this device · not delivered',{exact:true}).waitFor();
  await bob.page.screenshot({path:root+'/continuity-offline-reload.png'});pass(automatic?'Both browsers reload the same URLs with Workspace stopped, automatically reconnect and deliver a new message':'Offline reload restores cached UI, direct history and durable queue without claiming reconnection');
  start();await health(true);
  // Gateway sessions are intentionally memory-bound; reauthenticate these same
  // browser profiles so their account-scoped encrypted outboxes can reconcile.
  if(automatic){
   for(const client of [alice,bob])await client.page.waitForFunction(()=>window.workspaceContinuity?.online(),null,{timeout:45000});
  }else{
   await signIn(page,users[0],alice.base+'auth/login');await page.goto(alice.base+'#contacts/'+bobID);await page.locator('#send-message-input').waitFor();
   await signIn(bob.page,users[1],bob.base+'auth/login');await bob.page.goto(bob.base+'#contacts/'+aliceID);await bob.page.locator('#send-message-input').waitFor();
  }
  for(const text of [outgoing,incoming,queued,richPlain]){await page.locator('#scroller').getByText(text,{exact:true}).waitFor({timeout:45000});await bob.page.locator('#scroller').getByText(text,{exact:true}).waitFor({timeout:45000});assert.equal(await page.locator('#scroller').getByText(text,{exact:true}).count(),1);assert.equal(await bob.page.locator('#scroller').getByText(text,{exact:true}).count(),1)}
  for(const client of [alice,bob])await client.page.waitForFunction(()=>window.workspaceContinuity.records.every(r=>r.synced),null,{timeout:30000});pass('Restart server and reconcile every durable UUID into canonical history exactly once');
  await page.screenshot({path:root+'/continuity-reconciled.png'});
  // Chrome network emulation is a separate acceptance case from stopping the
  // server: no Internet means public discovery cannot establish new channels.
  await alice.context.setOffline(true);await bob.context.setOffline(true);
  for(const client of [alice,bob]){
   const sameURL=client.page.url();await client.page.reload();
   await client.page.locator('#send-message-input').waitFor();
   assert.equal(client.page.url(),sameURL);
   assert.equal(await client.page.evaluate(()=>navigator.onLine),false);
   assert.equal(await client.page.evaluate(()=>window.workspaceContinuity.online()),false);
  }
  const networkQueued='Synthetic Chrome network-disabled queue '+Date.now();
  await page.locator('#send-message-input').fill(networkQueued);await page.locator('#send-message-input').press('Enter');
  await page.locator('.workspace-continuity').getByText(networkQueued,{exact:true}).waitFor();
  await page.locator('.workspace-continuity').getByText('Queued on this device · not delivered',{exact:true}).waitFor();
  await page.reload();await page.locator('.workspace-continuity').getByText(networkQueued,{exact:true}).waitFor();
  await page.screenshot({path:root+'/chrome-network-disabled.png'});
  pass('Chrome network disabled: same URL reloads, history stays readable and an unsent message survives a second reload');
  await alice.context.setOffline(false);await bob.context.setOffline(false);
  for(const client of [alice,bob]){
   await client.page.waitForFunction(()=>window.workspaceContinuity?.online(),null,{timeout:45000});
   await client.page.locator('#scroller').getByText(networkQueued,{exact:true}).waitFor({timeout:45000});
   assert.equal(await client.page.locator('#scroller').getByText(networkQueued,{exact:true}).count(),1);
   await client.page.waitForFunction(()=>window.workspaceContinuity.records.every(r=>r.synced),null,{timeout:30000});
  }
  pass('Restoring Chrome network saves the queued message exactly once for both users');
  await page.route('**/api/bootstrap',route=>route.fulfill({status:503,contentType:'text/plain',body:'Synthetic origin unavailable'}));await page.reload();await page.waitForFunction(()=>window.workspaceChat?.offline===true);await page.locator('#send-message-input').waitFor();assert.equal(await page.locator('#send-message-input').count(),1);await page.unroute('**/api/bootstrap');await page.reload();await page.waitForFunction(()=>window.workspaceContinuity?.online());await page.locator('#send-message-input').waitFor();pass('HTTP503 bootstrap keeps the cached conversation usable and recovers without losing it');
  await page.waitForFunction(peer=>window.workspaceContinuity.view(peer).connected,bobID,{timeout:45000});pass('Saved opt-in reconnects automatically after authenticated recovery');
  const oldEpoch=await page.evaluate(peer=>window.workspaceContinuity.permissions.get(peer).epoch,bobID);
  await bob.page.evaluate(async peer=>{const b=await(await fetch(new URL('api/bootstrap',document.baseURI))).json();const client=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticContinuityRevocation',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:true},()=>resolve(c))});client.enableLogging(false);try{await client.connect();await client.login('workspace',b.ticket);const topic=client.getTopic(peer);await topic.subscribe();await topic.setMeta({sub:{mode:topic.getAccessMode().updateWant('-JP').getWant()}})}finally{client.disconnect()}},aliceID);
  const blocked=await page.evaluate(async peer=>(await fetch(new URL('api/continuity',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',device:crypto.randomUUID(),peer})})).status,bobID);assert.equal(blocked,403);
  await page.waitForFunction(peer=>!window.workspaceContinuity.view(peer).connected,bobID,{timeout:15000});
  const rejected=await page.evaluate(async({peer,epoch})=>{const b=await(await fetch(new URL('api/bootstrap',document.baseURI))).json();const client=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticContinuityFence',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:true},()=>resolve(c))});client.enableLogging(false);try{await client.connect();await client.login('workspace',b.ticket);const topic=client.getTopic(peer);await topic.subscribe();const pub=topic.createMessage('Synthetic revoked-lease message',false);pub.head={workspace_id:crypto.randomUUID(),workspace_continuity:epoch};await client.publishMessage(pub);return 200}catch(e){return e.code}finally{client.disconnect()}},{peer:bobID,epoch:oldEpoch});assert.equal(rejected,403);pass('Real membership revocation closes direct fallback and rejects delayed publication');
  await bob.page.evaluate(async peer=>{const b=await(await fetch(new URL('api/bootstrap',document.baseURI))).json();const client=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticContinuityRestore',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:true},()=>resolve(c))});client.enableLogging(false);try{await client.connect();await client.login('workspace',b.ticket);await client.getTopic(peer).subscribe(undefined,{sub:{mode:'JRWPA'}})}finally{client.disconnect()}},aliceID);
  assert.equal(errors.length,0,'Uncaught page errors: '+errors.join('; '));
  fs.writeFileSync(root+'/continuity-results.json',JSON.stringify({checks,uncaughtErrors:errors,realWebRTC:true,independentRendezvous:independent,publicDiscovery,relayHosts:[...relayHosts].sort(),chromeNetworkDisabled:true,automaticSessionRecovery:automatic,syntheticWholeServerStop:true,physicalDevices:false,separateNetworks:false,internetTURNTested:false},null,2));
 }catch(error){for(const context of browser.contexts())for(const page of context.pages()){await page.evaluate(async()=>{const m=window.workspaceContinuity;if(!m||!m.online())return;for(const row of m.records.filter(r=>!r.synced&&r.direction==='in')){const receipt=await m.rpc({action:'receipts',peer:row.peer,device:crypto.randomUUID(),ids:[row.id]});const data=await m.fetchHistory(row.peer,receipt.receipts[row.id]);console.log('CONTINUITY DIAGNOSTIC '+JSON.stringify({id:row.id,receipt,topic:data?.topic,from:data?.from,head:data?.head,expected:m.normalizeContent(row.payload.text),actual:data?.content}))}}).catch(()=>{})}let index=0;for(const context of browser.contexts())for(const page of context.pages()){console.error('Synthetic failure state '+JSON.stringify(await page.evaluate(()=>({path:location.pathname+location.hash,errors:window.workspaceContinuity?.error,uid:window.workspaceContinuity?.uid,online:window.workspaceContinuity?.online(),rows:window.workspaceContinuity?.records.map(r=>({id:r.id,direction:r.direction,synced:r.synced,peer:r.peer})),alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.innerText)})).catch(()=>({unavailable:true}))));await page.screenshot({path:root+'/continuity-failure-'+index+++'.png'}).catch(()=>{})}throw error}finally{await browser.close();rendezvous?.kill();if(stopped){start();await health(true)}}
}
main().catch(e=>{console.error(users.reduce((s,u)=>s.replaceAll(u.password,'[redacted]'),String(e.stack||e)));process.exitCode=1});








