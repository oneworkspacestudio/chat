// Real isolated services and synthetic accounts. DOM expansion below exercises
// grid capacity only; it does not simulate app installation or server success.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT,origin=process.env.CHAT_TEST_ORIGIN;
assert(root&&/chat-parity-[0-9]+[\\/]fixture$/.test(root)&&/^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin));
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));
assert(users.length>=3&&users.every(u=>u.email.endsWith('@example.test')));
const checks=[],captures=[],errors=[];
const safe=value=>users.reduce((text,user)=>text.replaceAll(user.password,'[redacted]'),String(value));
const pass=name=>{checks.push(name);console.log('PASS '+name)};
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let page;
 try{
  async function login(user){
   const context=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/chat/');await page.locator('#username').fill(user.username);await page.getByRole('button',{name:'Next',exact:true}).click();
   await page.locator('input[type=password]').fill(user.password);await page.getByRole('button',{name:/Sign in/i}).click();
   await page.locator('.workspace-mobile-header h1').waitFor();return{context,page,base:new URL(page.url()).origin+'/chat/'};
  }
  const alice=await login(users[0]);page=alice.page;const base=alice.base;
  assert.equal(await page.locator('.workspace-mobile-header h1').innerText(),'Chat');
  assert.equal(await page.locator('.workspace-mobile-nav [data-control=navigation]').count(),3);
  assert.equal(await page.locator('.workspace-rail').count(),0);
  const fresh=await page.getByRole('heading',{name:'Your conversations start here',exact:true}).isVisible();
  await page.screenshot({path:root+'/mobile-empty.png'});pass('Mobile branded header, three real tabs and compose action (empty state captured on first fresh run)');
  await page.getByRole('button',{name:'New chat',exact:true}).click();await page.getByRole('textbox',{name:'Find people',exact:true}).fill('Bob');
  await page.getByText('Bob Tester',{exact:true}).first().waitFor({timeout:30000});await page.getByText('Bob Tester',{exact:true}).first().click();
  await page.locator('#send-message-input').waitFor();const first='Hello Bob, the mobile layout is ready. Review '+Date.now();
  await page.locator('#send-message-input').fill(first);await page.locator('#send-message-input').press('Enter');
  const bob=await login(users[1]);await bob.page.locator('.contact-title').filter({hasText:'Alice Tester'}).click();
  await bob.page.locator('#scroller').getByText(first,{exact:true}).waitFor();
  const reply='Thanks! I can read and reply from my phone layout. Review '+Date.now();
  await bob.page.locator('#send-message-input').fill(reply);await bob.page.locator('#send-message-input').press('Enter');await page.locator('#scroller').getByText(reply,{exact:true}).waitFor();
  const conversation=page.url();await page.locator('#send-message-input').fill('Unsent mobile draft');
  assert.equal(await page.locator('.workspace-mobile-nav').count(),0);
  await page.screenshot({path:root+'/mobile-conversation.png'});pass('Real discovery, two-user delivery and full-height conversation without bottom navigation');
  await page.locator('#hide-message-view').click();await page.locator('.workspace-mobile-header').waitFor();
  for(const theme of ['light','dark']){
   await page.getByRole('button',{name:'More options',exact:true}).click();let menu=page.getByRole('dialog',{name:'Chat options',exact:true});
   await menu.getByRole('button',{name:'Appearance',exact:true}).click();await page.locator('input#'+theme).check();await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
   await page.locator('.workspace-mobile-nav').getByRole('button',{name:'Chats',exact:true}).click();await page.locator('.workspace-mobile-header').waitFor();
   for(const [width,height]of[[320,480],[360,640],[390,700],[412,720],[640,360]]){
    await page.setViewportSize({width,height});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const tabs=await page.locator('.workspace-mobile-nav [data-control=navigation]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}));
    assert(tabs.every(r=>r.width>=44&&r.height>=44&&r.x>=0&&r.right<=width&&r.bottom<=height),'Tabs stay inside visual layout');
    const path=root+`/mobile-${theme}-${width}.png`;await page.screenshot({path});captures.push({theme,width,height,documentOverflow:false});
    await page.getByRole('button',{name:'Workspace apps',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Workspace apps',exact:true});
    await dialog.getByRole('link',{name:'Chat',exact:true}).waitFor();
    const grid=dialog.locator('[data-section=app-list]');
    // Expand already-rendered synthetic entries to stress the same DOM/CSS with
    // twenty items. Real catalog auth/destinations are asserted by UI acceptance.
    await grid.evaluate(grid=>{const source=grid.querySelector('a');for(let i=grid.querySelectorAll('a').length;i<20;i++){const link=source.cloneNode(true);link.querySelector('p').textContent='Synthetic app '+(i+1);link.dataset.layoutStress='true';grid.append(link)}});
    const close=dialog.getByRole('button',{name:'Close Workspace apps',exact:true});
    const before=await close.boundingBox();assert(before.y>=0&&before.y+before.height<=height&&before.width>=44&&before.height>=44);
    await grid.evaluate(n=>n.scrollTop=n.scrollHeight);const after=await close.boundingBox();assert.deepEqual(after,before,'Close must not scroll with app list');
    assert.equal(await dialog.evaluate(n=>n.scrollTop),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await close.click();await dialog.waitFor({state:'hidden'});assert(await page.getByRole('button',{name:'Workspace apps',exact:true}).evaluate(n=>n===document.activeElement));
   }
  }pass('Five narrow/short viewports in both themes, visible44px tabs and a fixed close button with a20-item layout stress grid');
  await page.setViewportSize({width:390,height:700});await page.evaluate(()=>document.documentElement.style.fontSize='20px');
  await page.getByRole('button',{name:'Workspace apps',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Workspace apps',exact:true});
  await dialog.getByRole('link',{name:'Chat',exact:true}).waitFor();await page.screenshot({path:root+'/mobile-workspace-picker.png'});
  await page.keyboard.press('Tab');assert(await dialog.evaluate(n=>n.contains(document.activeElement)));
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await page.getByRole('button',{name:'Workspace apps',exact:true}).evaluate(n=>n===document.activeElement));
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  await page.evaluate(()=>document.documentElement.style.fontSize='');pass('Enlarged root text, modal keyboard containment, Escape and opener focus restoration');
  await page.getByRole('button',{name:'More options',exact:true}).click();let menu=page.getByRole('dialog',{name:'Chat options',exact:true});
  await menu.getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('region',{name:'MyAccounts connection'}).waitFor();
  await page.locator('.workspace-mobile-nav').getByRole('button',{name:'Archived',exact:true}).click();await page.getByRole('heading',{name:'No archived chats',exact:true}).waitFor();
  await page.locator('.workspace-mobile-nav').getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('link',{name:/General/i}).waitFor();
  await page.locator('.workspace-mobile-nav').getByRole('button',{name:'Chats',exact:true}).click();await page.locator('.workspace-mobile-header').waitFor();
  await page.goto(conversation);await page.locator('#send-message-input').waitFor();assert.equal(await page.locator('#send-message-input').inputValue(),'Unsent mobile draft');
  // Resize to desktop to exercise the same overlay while a conversation is open.
  await page.setViewportSize({width:1366,height:768});await page.getByRole('button',{name:'Workspace',exact:true}).click();dialog=page.getByRole('dialog',{name:'Workspace apps',exact:true});
  await dialog.getByRole('link',{name:'Chat',exact:true}).waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(await page.locator('#send-message-input').inputValue(),'Unsent mobile draft');await page.locator('#scroller').getByText(reply,{exact:true}).waitFor();
  pass('Profile/settings/archive actions work; picker Escape preserves conversation and unsent draft');
  assert.deepEqual(errors,[]);pass('No uncaught browser errors');
  fs.writeFileSync(root+'/mobile-layout-results.json',JSON.stringify({checks,captures,errors,realSyntheticServices:true,twentyItemStressIsDOMLayoutOnly:true,scope:'Desktop Chrome mobile viewport/touch emulation, not physical Android/iOS acceptance',fullWhatsAppParity:false},null,2));
 }catch(error){if(page)await page.screenshot({path:root+'/mobile-layout-failure.png'}).catch(()=>{});throw error}finally{await browser.close()}
}
main().catch(error=>{console.error(safe(error.message));fs.writeFileSync(root+'/mobile-layout-failure.json',JSON.stringify({checks,error:safe(error.message),errors},null,2));process.exitCode=1});
