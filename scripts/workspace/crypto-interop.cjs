const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{spawn}=require('node:child_process'),readline=require('node:readline');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CHAT_CRYPTO_PROOF_ROOT;assert(base,'Set CHAT_CRYPTO_PROOF_ROOT to locally built synthetic proof artifacts');
async function main(){
 const child=spawn(base+'/crypto-target/debug/protocol-proof.exe',[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 const waiting=[];let childError='';child.stderr.on('data',()=>{childError='native proof failed'});
 const lines=readline.createInterface({input:child.stdout});lines.on('line',line=>{const next=waiting.shift();if(next)next(JSON.parse(line))});
 const rpc=value=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Native proof timeout')),15000);waiting.push(value=>{clearTimeout(timer);resolve(value)});child.stdin.write(JSON.stringify(value)+'\n')});
 const server=http.createServer((req,res)=>{const name=req.url.slice(1);if(!name){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Native/browser protocol test</title>');return}if(!['oneworkspace_chat_crypto.js','oneworkspace_chat_crypto_bg.wasm'].includes(name)){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':name.endsWith('.wasm')?'application/wasm':'text/javascript'});fs.createReadStream(path.join(base,'crypto-web',name)).pipe(res)});
 await new Promise(resolve=>server.listen(31004,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage();await page.exposeFunction('nativeProof',rpc);await page.goto('http://127.0.0.1:31004/');
  const result=await page.evaluate(async()=>{
   const check=(value,message)=>{if(!value)throw Error(message)},enc=value=>new TextEncoder().encode(value),b64=bytes=>btoa(String.fromCharCode(...bytes)),dec=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
   const m=await import('/oneworkspace_chat_crypto.js');await m.default();const web=new m.ProofClient('synthetic-browser-device');
   const id=enc('synthetic-native-browser-conversation'),aad=enc('v1|synthetic-conversation|native-device|message-1');
   check((await nativeProof({op:'init',identity:'synthetic-native-device'})).ok,'native setup');check((await nativeProof({op:'create',id:b64(id)})).ok,'native group');
   const added=await nativeProof({op:'add',id:b64(id),package:b64(web.key_package()),key:b64(web.public_key())});check(added.ok,'native welcome');web.join(dec(added.result.welcome));
   const outbound=await nativeProof({op:'encrypt',id:b64(id),aad:b64(aad),content:b64(enc('Synthetic native to browser'))});check(outbound.ok,'native encrypt');const incoming=JSON.parse(web.process(id,dec(outbound.result.message)));check(new TextDecoder().decode(dec(incoming.content))==='Synthetic native to browser','native to browser mismatch');check(incoming.aad===b64(aad),'native AAD mismatch');
   const reply=web.encrypt(id,enc('v1|synthetic-conversation|web-device|message-2'),enc('Synthetic browser to native'));const received=await nativeProof({op:'process',id:b64(id),message:b64(reply)});check(received.ok&&new TextDecoder().decode(dec(received.result.content))==='Synthetic browser to native','browser to native mismatch');
   check(!(await nativeProof({op:'process',id:b64(id),message:b64(reply)})).ok,'native replay accepted');let rejected=false;try{web.process(id,dec(outbound.result.message))}catch{rejected=true}check(rejected,'browser replay accepted');
   const corrupted=web.encrypt(id,enc('v1|tamper-proof'),enc('Synthetic tamper check'));corrupted[corrupted.length-1]^=1;check(!(await nativeProof({op:'process',id:b64(id),message:b64(corrupted)})).ok,'native tamper accepted');
   const restored=m.ProofClient.restore(web.snapshot());rejected=false;try{restored.encrypt(id,aad,enc('must not resume old sender'))}catch{rejected=true}check(rejected,'recovered snapshot can send');
   web.free();restored.free();return{nativeToBrowser:true,browserToNative:true,authenticatedAAD:true,bothReplayChecks:true,nativeTamperRejected:true,restoredSenderFenced:true,actualNativeProcess:true,actualBrowserWasm:true,productionChatEncryption:false,nativeMobileAcceptance:false};
  });assert.equal(childError,'');fs.writeFileSync(base+'/crypto-native-browser-results.json',JSON.stringify(result,null,2));console.log('PASS actual native Windows/browser WASM interoperability, replay/tamper and restored-sender fencing');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));child.stdin.end();await new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill();resolve()},2000)})}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});

