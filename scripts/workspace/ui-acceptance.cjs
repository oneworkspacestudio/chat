const fs=require('node:fs');const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT,origin=process.env.CHAT_TEST_ORIGIN;
assert(root&&/chat-parity-[0-9]+[\\/]fixture$/.test(root)&&/^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin));
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));assert(users.every(u=>u.email.endsWith('@example.test')));
const meta=JSON.parse(fs.readFileSync(root+'/parity-restart-input.json','utf8'));const checks=[],errors=[];
const safe=value=>users.reduce((text,user)=>text.replaceAll(user.password,'[redacted]'),String(value));
const pass=name=>{checks.push(name);console.log('PASS '+name)};
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let page;
 try{
  async function login(user){
   const context=await browser.newContext();await context.addInitScript(()=>{const Native=window.WebSocket;window.acceptanceSockets=[];window.WebSocket=class extends Native{constructor(...args){super(...args);window.acceptanceSockets.push(this)}}});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await page.goto(origin+'/chat/');await page.locator('#username').fill(user.username);await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('input[type=password]').fill(user.password);await page.getByRole('button',{name:/Sign in/i}).click();await page.locator('#dummy-view h2').waitFor();return{context,page};
  }
  const alice=await login(users[0]),bob=await login(users[1]);page=alice.page;
  const base=new URL(page.url()).origin+'/chat/';
  await page.getByRole('button',{name:'Workspace',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Workspace apps'});await dialog.getByRole('link',{name:'Chat',exact:true}).waitFor();assert(await dialog.getByRole('link',{name:'MyAccounts',exact:true}).getAttribute('href'));
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await page.getByRole('button',{name:'Workspace',exact:true}).evaluate(n=>n===document.activeElement));assert.equal(await page.locator('#one-workspace-nav').count(),0);pass('Dedicated-origin app switcher has real app links, Escape/focus restoration and no duplicate floating launcher');
  await page.goto(base+'#security');await page.getByRole('link',{name:'Open MyAccounts',exact:true}).waitFor();assert.equal(await page.locator('input[type=password]').count(),0);assert.equal(await page.getByText('Delete account',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Blocked contacts',exact:true}).count(),1);
  await page.goto(base+'#general');const accountName=page.getByRole('region',{name:'MyAccounts connection'});await accountName.getByText('Alice Tester',{exact:true}).waitFor();assert.equal(await accountName.locator('input').count(),0);pass('Managed name/password/security point to MyAccounts; no broken second-password or native account-delete control');
  await page.goto(base+'#contacts/'+meta.bobID);await page.locator('#send-message-input').waitFor();await bob.page.goto(base+'#contacts/'+meta.aliceID);await bob.page.locator('#send-message-input').waitFor();
  const incoming='Synthetic visual reply '+Date.now();await bob.page.locator('#send-message-input').fill(incoming);await bob.page.locator('#send-message-input').press('Enter');await page.locator('#scroller').getByText(incoming,{exact:true}).waitFor();
  const outgoing='Synthetic visual message '+Date.now();await page.locator('#send-message-input').fill(outgoing);await page.locator('#send-message-input').press('Enter');await bob.page.locator('#scroller').getByText(outgoing,{exact:true}).waitFor();
  const listName='Synthetic UI list '+Date.now(),renamed=listName+' renamed';
  await page.getByRole('button',{name:'New list',exact:true}).click();let listDialog=page.getByRole('dialog',{name:'Edit chat list'});await listDialog.getByRole('textbox',{name:'List name',exact:true}).fill(listName);await listDialog.getByLabel('Bob Tester',{exact:true}).check();await listDialog.getByRole('button',{name:'Save',exact:true}).click();await listDialog.waitFor({state:'hidden'});await page.getByRole('button',{name:listName,exact:true}).waitFor();
  const secondAlice=await login(users[0]);await secondAlice.page.getByRole('button',{name:listName,exact:true}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'Edit list',exact:true}).click();listDialog=page.getByRole('dialog',{name:'Edit chat list'});await listDialog.getByRole('textbox',{name:'List name',exact:true}).fill(renamed);await listDialog.getByRole('button',{name:'Save',exact:true}).click();await secondAlice.page.getByRole('button',{name:renamed,exact:true}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'Edit list',exact:true}).click();await page.getByRole('dialog',{name:'Edit chat list'}).getByRole('button',{name:'Move earlier',exact:true}).click();await page.getByRole('button',{name:'Edit list',exact:true}).click();await page.getByRole('dialog',{name:'Edit chat list'}).getByRole('button',{name:'Delete list',exact:true}).click();await page.getByRole('button',{name:renamed,exact:true}).waitFor({state:'detached'});await secondAlice.page.getByRole('button',{name:renamed,exact:true}).waitFor({state:'detached',timeout:15000});pass('Create/select/rename/reorder/delete a real custom list with membership and independent-session synchronization');
  const draft='Synthetic draft retained through reload';await page.locator('#send-message-input').fill(draft);await page.reload();await assert.doesNotReject(()=>page.locator('#send-message-input').waitFor());assert.equal(await page.locator('#send-message-input').inputValue(),draft);pass('Conversation deep link and account/topic draft survive reload');
  await page.dispatchEvent('#send-message-input','keypress',{key:'Enter',code:'Enter',charCode:13,keyCode:229,isComposing:true});assert.equal(await page.locator('#send-message-input').inputValue(),draft);pass('Composing Enter retains the unsent draft');
  await page.locator('#send-message-input').fill('');
  const reviewName='Synthetic design review '+Date.now();await page.getByRole('button',{name:'New chat',exact:true}).click();await page.getByText('new group',{exact:true}).click();await page.locator('#new-topic-fn').fill(reviewName);await page.getByRole('button',{name:'Create',exact:true}).click();await page.waitForFunction(()=>/\/grp[A-Za-z0-9_-]{11}/.test(location.hash));const reviewGroup=(await page.evaluate(()=>location.hash)).match(/grp[A-Za-z0-9_-]{11}/)[0];
  await page.goto(base+'#contacts/'+reviewGroup+'?info=members');await page.locator('#group-manager').getByText('Bob Tester',{exact:true}).click();await page.locator('#group-manager').getByRole('button',{name:'OK',exact:true}).click();
  await page.goto(base+'#contacts/'+reviewGroup);await page.locator('#send-message-input').waitFor();await bob.page.goto(base+'#contacts/'+reviewGroup);await bob.page.locator('#send-message-input').waitFor();
  const reviewReply='The shared project files are ready.';await bob.page.locator('#send-message-input').fill(reviewReply);await bob.page.locator('#send-message-input').press('Enter');await page.locator('#scroller').getByText(reviewReply,{exact:true}).waitFor();
  const reviewMessage='Thanks — I’ll review them in Drive.';await page.locator('#send-message-input').fill(reviewMessage);await page.locator('#send-message-input').press('Enter');await bob.page.locator('#scroller').getByText(reviewMessage,{exact:true}).waitFor();pass('Create a native group in the UI, add a contact and exchange actual group messages');
  const captures=[];
  for(const theme of ['light','dark']){
   await page.goto(base+'#acc_general');await page.locator('input#'+theme).check();await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
   await page.goto(base+'#contacts/'+reviewGroup);await page.locator('#send-message-input').waitFor();
   for(const [width,height]of[[360,800],[390,844],[430,932],[768,1024],[1365,768],[1366,768],[1920,1080]]){
    await page.setViewportSize({width,height});await page.screenshot({path:root+`/chat-${theme}-${width}.png`});
    const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,height:document.documentElement.scrollHeight,incoming:getComputedStyle(document.querySelector('li.left .bubble')).backgroundColor,outgoing:getComputedStyle(document.querySelector('li.right .bubble')).backgroundColor,scheme:document.documentElement.style.colorScheme}));
    assert.equal(metrics.overflow,false,'Document must not overflow horizontally');assert.equal(metrics.scheme,theme);assert.equal(metrics.incoming,theme==='dark'?'rgb(41, 49, 61)':'rgb(240, 244, 249)');assert.equal(metrics.outgoing,theme==='dark'?'rgb(36, 63, 96)':'rgb(211, 227, 253)');captures.push({theme,width,height,...metrics});
   }
  }pass('Seven responsive viewports in both themes; actual incoming/outgoing tokens and no document overflow');
  await page.setViewportSize({width:1365,height:768});await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cached=await page.evaluate(async()=>{const urls=[];for(const name of await caches.keys())if(name.startsWith('oneworkspace-chat-shell-'))for(const request of await(await caches.open(name)).keys())urls.push(new URL(request.url).pathname);return urls});assert(cached.length>0&&!cached.some(path=>/\/(api|auth|v0)\//.test(path)));pass('Offline worker caches static shell only; no API, credentials or private attachments');
  // Exercise the ordinary SDK draft path after an explicit direct-mode opt-out.
  // Independent WebRTC/reload/queue behavior is covered in continuity-acceptance.
  await page.evaluate(async peer=>window.workspaceContinuity?.disable(peer),meta.bobID);
  await alice.context.setOffline(true);await page.evaluate(()=>acceptanceSockets.forEach(socket=>socket.close()));
  const pending='Synthetic offline delivery '+Date.now();await page.locator('#send-message-input').fill(pending);await page.locator('#send-message-input').press('Enter');await page.getByText(/Your draft is kept|Not confirmed by the server/).first().waitFor();
  await page.reload();await page.locator('#send-message-input').waitFor();assert.equal(await page.locator('#send-message-input').inputValue(),pending);assert.equal(await page.evaluate(()=>workspaceChat.offline),true);pass('Offline shell reload restores the correct cached account and retains the unacknowledged draft');
  await alice.context.setOffline(false);await bob.page.locator('#scroller').getByText(pending,{exact:true}).waitFor({timeout:30000});await page.waitForFunction(()=>document.querySelector('#send-message-input')?.value==='',{timeout:30000});assert.equal(await bob.page.locator('#scroller').getByText(pending,{exact:true}).count(),1);pass('Reconnect replays the durable outbox once and clears draft only after server acknowledgement');
  await page.evaluate(()=>{window.acceptanceRevokedSocket=acceptanceSockets.findLast(socket=>socket.readyState===WebSocket.OPEN)});
  const portal=await alice.context.newPage();await portal.goto(origin+'/');await portal.getByRole('button',{name:'Sign out of Workspace',exact:true}).click();
  await page.waitForFunction(()=>acceptanceRevokedSocket?.readyState===WebSocket.CLOSED,null,{timeout:3000});
  assert.equal((await alice.context.request.get(base+'api/me')).status(),401);assert.equal((await bob.context.request.get(base+'api/me')).status(),200);await page.bringToFront();await page.getByRole('button',{name:'Reconnect Chat',exact:true}).waitFor({timeout:30000});pass('Workspace logout revokes open Chat sessions and sockets for Alice; Bob remains authenticated');
  assert.deepEqual(errors,[]);pass('No uncaught browser errors');fs.writeFileSync(root+'/ui-results.json',JSON.stringify({checks,captures,deviceScope:'Desktop Chrome viewport emulation; not physical Android/iOS acceptance',errors},null,2));
 }catch(error){if(page)await page.screenshot({path:root+'/ui-failure.png'}).catch(()=>{});throw error}finally{await browser.close()}
}
main().catch(error=>{console.error(safe(error.message));fs.writeFileSync(root+'/ui-failure.json',JSON.stringify({checks,error:safe(error.message),errors},null,2));process.exitCode=1});
