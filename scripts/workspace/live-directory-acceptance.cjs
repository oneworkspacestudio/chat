// Real MyAccounts account creation while the Find query remains open.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT,origin=process.env.CHAT_TEST_ORIGIN;
assert.equal(root,'C:/Projects/.cache/chat-parity-20261019/fresh-chat-parity-20261020/fixture');
assert.equal(origin,'http://localhost:31060');
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));
assert(users.every(u=>u.email.endsWith('@example.test')));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const errors=[],member='delta-'+Date.now();
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/chat/');await page.locator('#username').fill(users[0].username);
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('input[type=password]').fill(users[0].password);
  await page.getByRole('button',{name:/Sign in/i}).click();await page.locator('#side-caption-panel').waitFor();
  await page.goto(origin+'/chat/#newtpk');await page.getByText('find',{exact:true}).click();
  const search=page.getByRole('textbox',{name:'Find people',exact:true});await search.fill(member);
  await page.getByText('Search returned no results',{exact:true}).waitFor();
  const start=Date.now();
  await promisify(execFile)('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-File',path.join(__dirname,'create-synthetic-member.ps1'),'-FixtureRoot',root,'-Member',member],{timeout:45000});
  await page.getByText(member,{exact:true}).first().waitFor({timeout:35000});assert.equal(await search.inputValue(),member);
  console.log('PASS Newly created MyAccounts member appears in the already-open Find query without retyping or retry');
  await page.getByText(member,{exact:true}).first().click();await page.locator('#send-message-input').waitFor();
  assert.deepEqual(errors,[]);console.log('PASS Member who has never opened Chat can be selected; no uncaught browser errors');
  fs.writeFileSync(root+'/live-directory-results.json',JSON.stringify({schema:1,isolatedFixture:true,elapsedMilliseconds:Date.now()-start,queryUnchanged:true,memberNeverOpenedChat:true,uncaughtErrors:errors,applicationE2EE:false},null,2));
 }finally{await browser.close()}
})().catch(error=>{let message=String(error.message);for(const user of users)message=message.replaceAll(user.password,'[redacted]');console.error(message.replace(/https?:\/\/[^\s"']+/g,'[URL omitted]'));process.exitCode=1});
