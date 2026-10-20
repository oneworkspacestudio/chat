// Synthetic provider acceptance, not mobile-app acceptance. No secrets in output.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.CHAT_TEST_PRIVATE_ROOT;assert(root==='C:/Projects/.cache/chat-parity-20261019/fixture');
const config=JSON.parse(fs.readFileSync(root+'/native-oidc-public.json','utf8'));
const users=JSON.parse(fs.readFileSync(root+'/test-users.json','utf8'));assert(users.every(u=>u.email.endsWith('@example.test')));
assert.equal(config.issuer,'http://localhost:30961');assert.equal(config.redirectURI,'http://localhost:30960/chat/auth/callback');assert(!('clientSecret'in config));
const checks=[];let stage='start';const pass=text=>{checks.push(text);console.log('PASS '+text)};
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 stage='discovery';const discovery=await(await fetch(config.issuer+'/.well-known/openid-configuration')).json();assert.equal(discovery.issuer,config.issuer);assert(discovery.code_challenge_methods_supported.includes('S256'));
 const context=await browser.newContext(),page=await context.newPage();let resolveCallback;page.on('request',request=>{const u=new URL(request.url());if(u.origin+u.pathname===config.redirectURI&&resolveCallback)resolveCallback(u)});await page.route(config.redirectURI+'**',async route=>{const result=new URL(route.request().url());await route.fulfill({status:200,contentType:'text/plain',headers:{'Cache-Control':'no-store'},body:'Synthetic native callback received'});if(resolveCallback)resolveCallback(result)});
 async function authorize(requireSSO=false){
  stage='authorize';const verifier=crypto.randomBytes(48).toString('base64url'),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),state=crypto.randomBytes(32).toString('base64url'),nonce=crypto.randomBytes(32).toString('base64url');
  const callback=new Promise(resolve=>resolveCallback=resolve);
  const url=new URL(discovery.authorization_endpoint);url.search=new URLSearchParams({client_id:config.clientID,redirect_uri:config.redirectURI,response_type:'code',scope:'openid profile email',code_challenge_method:'S256',code_challenge:challenge,state,nonce}).toString();await page.goto(url.href);
  if(!requireSSO&&!page.url().startsWith(config.redirectURI)){stage='synthetic sign-in';await page.locator('#username').fill(users[0].username);await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('input[type=password]').fill(users[0].password);await page.getByRole('button',{name:/Sign in/i}).click()}
  let timer;const result=await Promise.race([callback,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Callback timeout')),20000))]).finally(()=>clearTimeout(timer));assert.equal(result.searchParams.get('state'),state);assert(result.searchParams.get('code'));resolveCallback=null;return{code:result.searchParams.get('code'),verifier,nonce};
 }
 async function exchange(flow,overrides={},json=false){
  // Node fetch has no browser cookie jar. Never copy browser session cookies.
  const form=new URLSearchParams({grant_type:'authorization_code',client_id:config.clientID,redirect_uri:config.redirectURI,code:flow.code,code_verifier:flow.verifier,...overrides});assert(!form.has('client_secret'));
  const response=await fetch(discovery.token_endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':json?'application/json':'application/x-www-form-urlencoded'},body:json?JSON.stringify(Object.fromEntries(form)):form});return{status:response.status,body:await response.json()};
 }
 const flow=await authorize();stage='public token exchange';const result=await exchange(flow);assert(result.status===200&&!result.body.error&&result.body.id_token);const parts=result.body.id_token.split('.');assert.equal(parts.length,3);const header=JSON.parse(Buffer.from(parts[0],'base64url'));assert.equal(header.alg,'RS256');
 stage='signature validation';const jwks=await(await fetch(discovery.jwks_uri,{redirect:'error'})).json(),matches=jwks.keys.filter(k=>k.kid===header.kid);assert.equal(matches.length,1);assert(crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key:matches[0],format:'jwk'}),Buffer.from(parts[2],'base64url')));const claims=JSON.parse(Buffer.from(parts[1],'base64url'));assert.equal(claims.iss,config.issuer);assert((Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(config.clientID));assert.equal(claims.nonce,flow.nonce);assert(claims.exp>Date.now()/1000&&claims.sub);
 pass('Actual MyAccounts S256 authorization-code exchange works without a client secret or browser cookies; ID-token signature/issuer/audience/nonce verified');
 if(process.env.CHAT_TEST_UPGRADE_PROVIDER==='1'){
  const legacy=await authorize(true);stage='isolated provider migration';
  // Wait for the helper's exit, not inherited pipe closure from its supervised
  // server children. All service logs stay in the protected synthetic fixture.
  await new Promise((resolve,reject)=>{const helper=spawn('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-File','I:/Projects/tooling/chat-parity-20261019/deploy-primary-provider.ps1'],{stdio:'ignore'});const timer=setTimeout(()=>{helper.kill();reject(new Error('Synthetic provider migration timeout'))},150000);helper.once('error',error=>{clearTimeout(timer);reject(error)});helper.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Synthetic provider migration helper rejected'))})});
  stage='legacy unbound code';const denied=await exchange(legacy);assert(denied.status>=400||denied.body.error);pass('Code issued by the legacy provider must restart authorization after upgrade');
  const userinfo=await fetch(discovery.userinfo_endpoint,{headers:{Authorization:'Bearer '+result.body.access_token},redirect:'error'});assert.equal(userinfo.status,200);assert.equal((await userinfo.json()).sub,claims.sub);pass('Existing access token, signing identity and immutable subject survive provider migration');
  const fresh=await authorize(true);const accepted=await exchange(fresh);assert(accepted.status===200&&!accepted.body.error);pass('Existing browser SSO survives migration and obtains a newly bound code without another password');
 }
 stage='code replay';const replay=await exchange(flow);assert(replay.status>=400||replay.body.error);pass('Consumed authorization code cannot be reused');
 const badVerifierFlow=await authorize(true);stage='wrong PKCE verifier';const badVerifier=await exchange(badVerifierFlow,{code_verifier:crypto.randomBytes(48).toString('base64url')});assert(badVerifier.status>=400||badVerifier.body.error);const afterBadVerifier=await exchange(badVerifierFlow);assert(afterBadVerifier.status===200&&!afterBadVerifier.body.error);pass('Wrong PKCE verifier is rejected without consuming the legitimate code');
 const wrongRedirectFlow=await authorize(true);stage='mismatched token redirect URI';const wrongRedirect=await exchange(wrongRedirectFlow,{redirect_uri:config.redirectURI+'/unregistered'});assert(wrongRedirect.status>=400||wrongRedirect.body.error);assert((await exchange(wrongRedirectFlow)).body.id_token);pass('Mismatched token redirect URI is rejected without consuming the legitimate code');
 assert.equal(config.alternateRegisteredURI,config.redirectURI+'-alternate');
 const alternate=await authorize(true);stage='different registered callback';const differentRegistered=await exchange(alternate,{redirect_uri:config.alternateRegisteredURI});assert(differentRegistered.status>=400||differentRegistered.body.error);assert((await exchange(alternate)).body.id_token);pass('A different registered callback is also rejected; binding is to the original request');
 for(const json of [false,true]){
  const missing=await authorize(true);stage='missing token redirect URI';const denied=await exchange(missing,{redirect_uri:''},json);assert(denied.status>=400||denied.body.error);assert((await exchange(missing,{},json)).body.id_token);pass((json?'JSON':'Form')+' token input requires the original callback and accepts it when supplied');
 }
 const concurrent=await authorize(true);stage='concurrent code exchange';const simultaneous=await Promise.all([exchange(concurrent),exchange(concurrent)]);assert.equal(simultaneous.filter(r=>r.status===200&&!r.body.error&&r.body.id_token).length,1);pass('Concurrent authorization-code exchanges produce exactly one successful token response');
 fs.writeFileSync(root+'/native-oidc-results.json',JSON.stringify({schema:1,checks,nativeAppAcceptance:false,signedMobileBuild:false,noClientSecretExported:true,noBrowserCookiesCopied:true},null,2));
}finally{await browser.close()}})().catch(error=>{let message=String(error.message);for(const user of users)message=message.replaceAll(user.password,'[redacted]');message=message.replace(/https?:\/\/[^\s"']+/g,'[URL omitted]').replace(/[A-Za-z0-9_-]{24,}/g,'[value omitted]');console.error('FAIL native public-client prerequisite at '+stage+': '+message);process.exitCode=1});
