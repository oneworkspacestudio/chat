// Three real accounts; assertions inspect the actual rendered receipt marker.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT,origin=process.env.CHAT_TEST_ORIGIN;
assert.equal(root,'C:/Projects/.cache/chat-parity-20261019/fresh-chat-parity-20261020/fixture');assert.equal(origin,'http://localhost:31060');
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));assert(users.every(u=>u.email.endsWith('@example.test')));
const checks=[],errors=[];let stage='start',inspectedPage;const pass=text=>{checks.push(text);console.log('PASS '+text)};
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  async function login(user){
   const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(25000);
   await page.goto(origin+'/chat/');await page.locator('#username').fill(user.username);await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('input[type=password]').fill(user.password);await page.getByRole('button',{name:/Sign in/i}).click();await page.locator('#dummy-view h2').waitFor();
   const uid=await page.evaluate(async()=>{const b=await(await fetch(new URL('api/bootstrap',document.baseURI))).json();window.receipts=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticGroupReceipts',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:false},()=>resolve(c))});await receipts.connect();await receipts.login('workspace',b.ticket);await receipts.getMeTopic().subscribe();return receipts.getCurrentUserID()});return{context,page,uid,base:new URL(page.url()).origin+'/chat/'};
  }
  const alice=await login(users[0]),bob=await login(users[1]);let charlie=await login(users[2]);inspectedPage=alice.page;
  stage='create real group';const group=await alice.page.evaluate(async members=>{const t=receipts.getTopic(receipts.newGroupTopicName(false));await t.subscribe(undefined,{desc:{public:{fn:'Synthetic group receipts'},defacs:{auth:'N',anon:'N'}}});for(const user of members)await t.setMeta({sub:{user,mode:'JRWPS'}});return t.name},[bob.uid,charlie.uid]);
  for(const actor of [bob,charlie])await actor.page.evaluate(async group=>{await receipts.getTopic(group).subscribe()},group);
  await charlie.page.evaluate(async group=>{await receipts.getTopic(group).leave()},group);
  await charlie.context.close();
  await alice.page.goto(alice.base+'#contacts/'+group);await alice.page.locator('#send-message-input').waitFor();
  async function publish(content,id){return alice.page.evaluate(async({group,content,id})=>{const pub=receipts.createMessage(group,content,false);pub.head={workspace_id:id,workspace_audience:{version:1,members:[]}};return receipts.publishMessage(pub)},{group,content,id})}
  async function note(actor,what,seq){await actor.page.evaluate(({group,what,seq})=>{receipts.getTopic(group)[what](seq)},{group,what,seq})}
  async function marker(content,state){await alice.page.waitForFunction(({content,state})=>Array.from(document.querySelectorAll('#scroller li')).some(n=>n.innerText.includes(content)&&n.querySelector('[data-delivery-state]')?.getAttribute('data-delivery-state')===state),{content,state},{timeout:15000})}
  const content='Synthetic historical-audience receipt '+Date.now(),id=crypto.randomUUID();const first=await publish(content,id);assert.equal(first.code,202);const seq=first.params.seq;
  stage='one reader with another offline';await alice.page.locator('#scroller').getByText(content,{exact:true}).waitFor();await note(bob,'noteRead',seq);await marker(content,'sent');
  pass('One reader with another original recipient offline remains Sent, not all delivered/read');
  stage='delivery convergence';charlie=await login(users[2]);await charlie.page.evaluate(async group=>{await receipts.getTopic(group).subscribe({what:'data sub',data:{since:1},sub:{}})},group);
  await charlie.page.waitForFunction(({group,seq})=>!!receipts.getTopic(group).findMessage(seq),{group,seq});await note(charlie,'noteRecv',seq);await marker(content,'delivered');
  pass('All original recipients acknowledging receipt changes the real UI to Delivered');
  await note(charlie,'noteRead',seq);await marker(content,'read');pass('Only all original recipients reading changes the real UI to Read');
  stage='removal history';await charlie.context.close();
  const secondContent='Synthetic removed-reader receipt '+Date.now(),secondID=crypto.randomUUID(),second=await publish(secondContent,secondID);assert.equal(second.code,202);await note(bob,'noteRead',second.params.seq);await marker(secondContent,'sent');
  await alice.page.evaluate(async({group,user})=>{await receipts.getTopic(group).delSubscription(user)},{group,user:charlie.uid});await marker(secondContent,'sent');
  await alice.page.reload();await alice.page.locator('#scroller').getByText(secondContent,{exact:true}).waitFor();await marker(secondContent,'sent');pass('Removing the unread member and reloading cannot shrink the historical audience into all-read');
  // Reload removed the independent SDK object. The old page context is retained
  // by the browser, but create a fresh bound socket for retry and stored-data checks.
  await alice.page.evaluate(async()=>{const b=await(await fetch(new URL('api/bootstrap',document.baseURI))).json();window.receipts=await new Promise(resolve=>{const c=new tinode.Tinode({appName:'SyntheticGroupReceiptsRetry',host:b.host,apiKey:b.apiKey,secure:b.secure,transport:'ws',persist:false},()=>resolve(c))});await receipts.connect();await receipts.login('workspace',b.ticket)});
  await alice.page.evaluate(async group=>{await receipts.getTopic(group).subscribe({what:'data sub',data:{since:1},sub:{}})},group);
  const stored=await alice.page.evaluate(({group,seq})=>receipts.getTopic(group).findMessage(seq)?.head.workspace_audience,{group,seq:second.params.seq});assert.equal(stored.version,1);assert.deepEqual(stored.members.slice().sort(),[bob.uid,charlie.uid].sort());pass('Server ignores forged audience and stores both original recipients after later removal');
  const retry=await publish(secondContent,secondID);assert.equal(retry.code,202);assert.equal(retry.params.seq,second.params.seq);assert.equal(retry.params.duplicate,true);assert.equal(await alice.page.locator('#scroller').getByText(secondContent,{exact:true}).count(),1);pass('Retry after membership change keeps the original sequence and one message');
  assert.deepEqual(errors,[]);fs.writeFileSync(root+'/group-receipts-results.json',JSON.stringify({schema:1,checks,uncaughtErrors:errors,realBackend:true,legacyGroupAudience:'Unknown; Sent only',applicationE2EE:false},null,2));
 }catch(error){if(inspectedPage){await inspectedPage.screenshot({path:root+'/group-receipts-failure.png'}).catch(()=>{});console.log(JSON.stringify(await inspectedPage.locator('#scroller [data-delivery-state]').evaluateAll(nodes=>nodes.map(n=>({state:n.dataset.deliveryState,label:n.title}))).catch(()=>[])));console.log(JSON.stringify(await inspectedPage.evaluate(()=>{const mount=document.getElementById('mountPoint'),key=Object.keys(mount).find(k=>k.startsWith('__reactContainer$')),start=mount[key],stack=[start.stateNode?.current||start];while(stack.length){const node=stack.pop(),app=node?.stateNode;if(app?.tinode?.getTopic&&app.state?.topicSelected){const topic=app.tinode.getTopic(app.state.topicSelected),message=topic.latestMessage(),subscribers=[];topic.subscribers(user=>subscribers.push({user:user.user,read:user.read,recv:user.recv}));return{audience:message?.head?.workspace_audience,subscribers,seq:message?.seq,stockStatus:message?topic.msgStatus(message):null}}if(node?.child)stack.push(node.child);if(node?.sibling)stack.push(node.sibling)}return{uiInstanceLocated:false}}).catch(()=>({diagnosticUnavailable:true}))))}throw error}finally{await browser.close()}
})().catch(error=>{let message=String(error.message);for(const user of users)message=message.replaceAll(user.password,'[redacted]');console.error('FAIL group receipts at '+stage+': '+message.replace(/https?:\/\/[^\s"']+/g,'[URL omitted]'));process.exitCode=1});
