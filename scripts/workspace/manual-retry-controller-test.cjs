const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const babel=require(process.env.CHAT_BABEL_MODULE||'../../workspace/client/node_modules/@babel/core');
function method(file,className,name,globals={}){
 const code=fs.readFileSync(file,'utf8'),ast=babel.parseSync(code,{configFile:false,babelrc:false,parserOpts:{sourceType:'module',plugins:['jsx','classProperties']}});
 const cls=ast.program.body.find(node=>node.type==='ClassDeclaration'&&node.id.name===className);
 const node=cls.body.body.find(node=>node.type==='ClassMethod'&&node.key.name===name);
 const text=code.slice(node.start,node.end).replace(/^async /,'').replace(new RegExp('^'+name+'\\('),'(');
 return new Function(...Object.keys(globals),'return '+(node.async?'async ':'')+'function'+text)(...Object.values(globals));
}
const notices=[],acks=[];global.window={dispatchEvent:event=>acks.push(event)};
const retry=method(path.join(__dirname,'../../workspace/client/src/views/messages-view.jsx'),'MessagesView','retrySend',{
 Tinode:{isServerAssignedSeq:seq=>seq<1000},refreshDeliveryAudience:()=>{},CustomEvent:class{constructor(type,data){this.type=type;this.detail=data.detail}}
});
const menu=method(path.join(__dirname,'../../workspace/client/src/widgets/context-menu.jsx'),'ContextMenu','retryMessage');
const view={props:{onError:text=>notices.push(text),tinode:{createMessage:(name,content)=>({id:'new-wire'})}},forceUpdate:()=>{}};
const make=()=>({seq:1001,id:'old-wire',head:{workspace_id:'original-durable-id',reply:'42'},content:{txt:'Synthetic',ent:[{tp:'EX',data:{ref:'/private-document'}}]}});
(async()=>{
 let pub=make(),published,topic={name:'original-conversation',isSubscribed:()=>true,publishMessage:async value=>{published=value;return{code:202,params:{seq:42}}}};
 const head=pub.head,content=pub.content;await retry.call(view,topic,pub);assert.equal(published,pub);assert.equal(pub.head,head);assert.equal(pub.content,content);assert.equal(pub.id,'new-wire');assert.equal(acks.length,1);console.log('PASS UNIT original queued object, topic, headers, document and durable ID retained');
 pub=make();delete pub.head.workspace_id;published=null;await retry.call(view,topic,pub);assert.equal(published,null);assert.equal(pub.id,'old-wire');assert(notices.at(-1).includes('older pending'));console.log('PASS UNIT ambiguous legacy draft retained without inventing an ID');
 pub=make();published=null;topic={...topic,isSubscribed:()=>false,subscribe:async()=>{pub._sending=true}};await retry.call(view,topic,pub);assert.equal(published,null);assert.equal(pub.id,'old-wire');console.log('PASS UNIT automatic replay during subscribe prevents a concurrent manual send');
 pub=make();const before=JSON.stringify(pub.head);topic={...topic,isSubscribed:()=>true,publishMessage:async()=>undefined};await retry.call(view,topic,pub);assert.equal(JSON.stringify(pub.head),before);assert(notices.at(-1).includes('remains pending'));assert.equal(acks.length,1);console.log('PASS UNIT swallowed SDK rejection retains draft and never clears composer');
 let called=0;menu.call({props:{tinode:{getTopic:()=>{throw Error('Must not flush/recreate')}}}},{retrySend:()=>++called});assert.equal(called,1);console.log('PASS UNIT context menu delegates without flushing or recreating a message');
})().catch(error=>{console.error(error);process.exitCode=1});
