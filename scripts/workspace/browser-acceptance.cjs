const fs=require('node:fs');const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT,origin=process.env.CHAT_TEST_ORIGIN;
assert(root && origin && /^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin),'Use a dedicated local test installation and protected test credential folder.');
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));
const safeError=value=>users.reduce((text,user)=>user.password?text.replaceAll(user.password,'[redacted]'):text,String(value));
assert(users.length>=3 && users.every(u=>u.email.endsWith('@example.test')),'Only synthetic example.test users may be used.');
async function main(){
 const browser=await chromium.launch({executablePath:process.env.CHAT_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const checks=[],errors=[];let current;const runID=Date.now();const outbound='Synthetic delivery check '+runID;const reply='Synthetic reply '+runID;
 const pass=name=>{checks.push(name);console.log('PASS '+name);};
 try{
  async function login(user){const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();current=page;page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/chat/');await page.locator('#username').fill(user.username);await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('input[type=password]').fill(user.password);await page.getByRole('button',{name:/Sign in/i}).click();await page.locator('#side-caption-panel').waitFor();await page.locator('#dummy-view h2').waitFor();return{context,page};}
  async function newChat(page){await page.goto(origin+'/chat/#newtpk');await page.getByText('Start New Chat',{exact:true}).waitFor();}
  async function search(page,q,name){await newChat(page);await page.getByText('find',{exact:true}).click();await page.getByRole('textbox',{name:'Find people',exact:true}).fill(q);await page.getByText(name,{exact:true}).first().waitFor({timeout:15000});}
  async function myID(page){await newChat(page);await page.getByText('by id',{exact:true}).click();await page.getByRole('heading',{name:'Your Chat ID',exact:true}).waitFor();const text=await page.locator('.workspace-topic-id').innerText();return text.match(/usr[A-Za-z0-9_-]{11}/)[0];}
  const alice=await login(users[0]);pass('Alice MyAccounts browser sign-in');
  await search(alice.page,'Charlie','Charlie Tester');pass('Find a MyAccounts user before their first Chat login');
  await search(alice.page,'BOB','Bob Tester');pass('Case-insensitive name search');
  await search(alice.page,'bob-tester','Bob Tester');pass('Username search');
  await search(alice.page,'bob-tester@example.test','Bob Tester');pass('Verified email search');
  const aliceID=await myID(alice.page);await alice.page.getByRole('textbox',{name:'Chat or group ID',exact:true}).fill('bad-id');await alice.page.getByRole('button',{name:'Open chat',exact:true}).click();await alice.page.getByRole('alert').filter({hasText:'valid Chat ID'}).waitFor();pass('Invalid ID shows guidance without crashing');
  await alice.page.getByAltText('QR code for your Chat ID').waitFor();assert(await alice.page.getByAltText('QR code for your Chat ID').evaluate(n=>n.naturalWidth>0));pass('By ID panel and QR code render');
  await alice.page.getByRole('button',{name:'Copy my ID',exact:true}).click();await alice.page.getByText('ID copied',{exact:true}).waitFor();assert.equal(await alice.page.evaluate(()=>navigator.clipboard.readText()),aliceID);pass('Copy my Chat ID');
  const bob=await login(users[1]);pass('Bob independent MyAccounts browser sign-in');const bobID=await myID(bob.page);assert.notEqual(aliceID,bobID);
  await alice.page.getByRole('textbox',{name:'Chat or group ID',exact:true}).fill(bobID);await alice.page.getByRole('button',{name:'Open chat',exact:true}).click();await alice.page.locator('#send-message-input').waitFor();await alice.page.locator('#send-message-input').fill(outbound);await alice.page.locator('#send-message-input').press('Enter');await alice.page.locator('#scroller').getByText(outbound,{exact:true}).waitFor();
  await search(bob.page,'Alice','Alice Tester');await bob.page.getByText('Alice Tester',{exact:true}).first().click();await bob.page.locator('#scroller').getByText(outbound,{exact:true}).waitFor({timeout:15000});pass('Open by native ID and deliver Alice to Bob');
  await bob.page.locator('#send-message-input').fill(reply);await bob.page.locator('#send-message-input').press('Enter');await alice.page.locator('#scroller').getByText(reply,{exact:true}).waitFor({timeout:15000});pass('Two-way message delivery across isolated browser sessions');
  await bob.page.reload();await bob.page.locator('#scroller').getByText(outbound,{exact:true}).waitFor();await bob.page.locator('#scroller').getByText(reply,{exact:true}).waitFor();pass('Conversation history after reload without repeated sign-in');
  await newChat(alice.page);await alice.page.getByText('by id',{exact:true}).click();await alice.page.getByRole('textbox',{name:'Chat or group ID',exact:true}).fill('tinode:///id/'+bobID);await alice.page.getByRole('button',{name:'Open chat',exact:true}).click();await alice.page.locator('#scroller').getByText(reply,{exact:true}).waitFor();pass('Open conversation using copied QR URI');
  const unauth=await browser.newContext();const anon=await unauth.request.get(origin+'/chat/api/people?q=Bob');assert.equal(anon.status(),401);await unauth.close();pass('Anonymous member-directory request rejected');
  await search(alice.page,'no-such-person-94827','Search returned no results');pass('Unknown person gives an empty result');
  assert.deepEqual(errors,[]);pass('No uncaught browser errors');
  await bob.page.screenshot({path:root+'/messages-after.png'});await alice.page.screenshot({path:root+'/search-after.png'});
  fs.writeFileSync(root+'/browser-results.json',JSON.stringify({passed:checks,uncaughtErrors:errors,isolatedFixture:true},null,2));
 }catch(e){if(current)await current.screenshot({path:root+'/failure.png'}).catch(()=>{});fs.writeFileSync(root+'/browser-failure.json',JSON.stringify({passed:checks,error:safeError(e.message),uncaughtErrors:errors},null,2));throw e;}finally{await browser.close();}
}
main().catch(e=>{console.error(safeError(e.message));process.exitCode=1;});
