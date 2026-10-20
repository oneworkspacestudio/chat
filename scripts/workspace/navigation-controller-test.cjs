// Units execute the actual controller methods; fake topics control callback order.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const babel=require(process.env.CHAT_BABEL_MODULE||'../../workspace/client/node_modules/@babel/core');
const code=fs.readFileSync(path.join(__dirname,'../../workspace/client/src/views/messages-view.jsx'),'utf8');
const ast=babel.parseSync(code,{configFile:false,babelrc:false,parserOpts:{sourceType:'module',plugins:['jsx','classProperties']}});
const cls=ast.program.body.find(node=>node.type==='ClassDeclaration'&&node.id.name==='MessagesView');
function method(name){
 const node=cls.body.body.find(node=>node.type==='ClassMethod'&&node.key.name===name);
 const text=code.slice(node.start,node.end).replace(new RegExp('^'+name+'\\('),'(');
 return new Function('MESSAGES_PAGE','HashNavigation','MessagesView','return function'+text)(24,{navigateTo:()=>{throw Error('Stale navigation')}},{getDerivedStateFromProps:()=>({})});
}
function defer(){let resolve;const promise=new Promise(done=>{resolve=done});return{promise,resolve};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const topics=new Map(),events=[],callbacks=[];
 const view={messageViewMounted:true,topicCallbacks:null,leavingTopics:new Map(),state:{topic:'old',pinsLoaded:false},
  props:{ready:true,tinode:{getTopic:name=>topics.get(name),isTopicCached:name=>topics.has(name)},
   onNewTopicCreated:()=>events.push('created'),onError:()=>events.push('error')},
  setState(value,callback){this.state={...this.state,...value};if(callback)callbacks.push(callback)},
  postReadNotification:()=>events.push('read')};
 for(const name of ['bindTopicCallbacks','detachTopicCallbacks','leave','subscribe','handleAllMessagesReceived'])view[name]=method(name).bind(view);
 for(const name of ['handleMessageUpdate','handleInfoReceipt','handleDescChange','handleSubsUpdated','handleAuxUpdate'])view[name]=()=>events.push(name);
 const old={name:'old',isSubscribed:()=>true,getPinnedMessages:()=>events.push('pins')};
 const next={name:'next',isSubscribed:()=>false};topics.set('old',old);topics.set('next',next);
 return{view,topics,events,callbacks,old,next};
}
(async()=>{
 let {view,events,callbacks,old,next}=fixture();view.bindTopicCallbacks(old);const stale=old.onInfo;old.onInfo({});assert.equal(events.length,1);
 view.state.topic='next';view.bindTopicCallbacks(next);stale({});assert.equal(events.length,1);assert.equal(old.onInfo,undefined);
 const foreign=()=>{};next.onInfo=foreign;view.detachTopicCallbacks();assert.equal(next.onInfo,foreign);
 console.log('PASS UNIT retired callbacks cannot update another conversation; cleanup preserves callbacks owned elsewhere');
 ({view,events,callbacks,old}=fixture());view.bindTopicCallbacks(old);view.handleAllMessagesReceived(1);view.state.topic=null;view.detachTopicCallbacks();for(const callback of callbacks)callback();assert(!events.includes('pins'));view.handleAllMessagesReceived(1);
 console.log('PASS UNIT late data-end and deferred pin callbacks are harmless after leaving the conversation');
 ({view,events,old,next}=fixture());const leaving=defer();old.leave=()=>leaving.promise;view.bindTopicCallbacks(old);view.leave('old');view.state.topic='next';view.bindTopicCallbacks(next);view.setState=()=>{throw Error('Old leave changed current view')};leaving.resolve();await tick();assert.equal(view.topicCallbacks.topic,next);assert.equal(view.leavingTopics.size,0);
 console.log('PASS UNIT late leave completion preserves the new conversation and its handlers');
 ({view,old}=fixture());const waiting=defer();old.leave=()=>waiting.promise;view.bindTopicCallbacks(old);view.leave('old');view.bindTopicCallbacks(old);let resumed=0;view.subscribe=topic=>{assert.equal(topic,old);resumed++};waiting.resolve();await tick();assert.equal(resumed,1);
 console.log('PASS UNIT returning during a pending leave waits for completion then resumes the current conversation');
 ({view,events,old,next}=fixture());const subscription=defer();let attached=false,left=0;old.isSubscribed=()=>attached;old.leave=async()=>{left++;attached=false};const query={withLaterDesc(){return this},withLaterSub(){return this},withAux(){return this},build(){return{}}};old.startMetaQuery=()=>query;old.subscribe=()=>subscription.promise;
 view.bindTopicCallbacks(old);view.subscribe(old);view.state.topic='next';view.bindTopicCallbacks(next);attached=true;subscription.resolve({code:200,topic:'old'});await tick();assert.equal(view.state.topic,'next');assert.equal(left,1);assert(!events.includes('created'));
 console.log('PASS UNIT stale subscription acknowledgement cannot reselect a retired conversation');
})().catch(error=>{console.error(error);process.exitCode=1});
