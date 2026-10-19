import test from 'node:test';
import assert from 'node:assert/strict';
import {readDraft,writeDraft,shouldSendKey,acknowledged,clearAccountDrafts} from '../src/workspace/composer-state.mjs';
import {filterConversations} from '../src/workspace/preferences.mjs';
import {resolveTheme} from '../src/workspace/theme.mjs';
const storage=()=>{const data=new Map();return {get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('draft persists with retry ID, isolates account/topic and clears only intended account',()=>{
 const s=storage();writeDraft(s,'alice','usrBob','unsent','stable-id');writeDraft(s,'bob','usrAlice','private');
 assert.deepEqual(readDraft(s,'alice','usrBob').id,'stable-id');assert.equal(readDraft(s,'alice','usrOther').text,'');assert.equal(readDraft(s,'bob','usrBob').text,'');
 clearAccountDrafts(s,'alice');assert.equal(readDraft(s,'alice','usrBob').text,'');assert.equal(readDraft(s,'bob','usrAlice').text,'private');
});
test('invalid storage and quota failures are not silent send success',()=>{
 const s=storage();assert.throws(()=>writeDraft(s,'a','b','x'.repeat(65537)));assert.throws(()=>writeDraft(s,'','b','text'));
 assert.throws(()=>writeDraft({setItem(){throw Error('quota')}},'a','b','text'));
 assert.equal(acknowledged(undefined),false);assert.equal(acknowledged({code:503,params:{seq:1}}),false);assert.equal(acknowledged({code:202,params:{seq:2}}),true);
});
test('Enter, Shift+Enter, Ctrl+Enter and IME composition',()=>{
 assert.equal(shouldSendKey({key:'Enter'},'plain'),true);assert.equal(shouldSendKey({key:'Enter',shiftKey:true},'plain'),false);
 assert.equal(shouldSendKey({key:'Enter',isComposing:true},'plain'),false);assert.equal(shouldSendKey({key:'Enter',keyCode:229},'plain'),false);
 assert.equal(shouldSendKey({key:'Enter',ctrlKey:true},'ctrl'),true);assert.equal(shouldSendKey({key:'Enter'},'ctrl'),false);
});
test('conversation filters select actual unread/groups/favourites/custom membership and search',()=>{
 const contacts=[{topic:'usrAAAAAAAAAAA',public:{fn:'Alice'},unread:1},{topic:'grpBBBBBBBBBBB',public:{fn:'Family'},unread:0}];
 const preferences={lists:[{id:'work',topics:['usrAAAAAAAAAAA']}],favourites:['grpBBBBBBBBBBB']};
 const run=filter=>filterConversations(contacts,{filter,preferences}).map(c=>c.topic);
 assert.deepEqual(run('unread'),['usrAAAAAAAAAAA']);assert.deepEqual(run('groups'),['grpBBBBBBBBBBB']);assert.deepEqual(run('favourites'),['grpBBBBBBBBBBB']);assert.deepEqual(run('work'),['usrAAAAAAAAAAA']);
 assert.equal(filterConversations(contacts,{query:'FAMILY',preferences}).length,1);assert.equal(filterConversations(contacts,{query:'absent',preferences}).length,0);
});
test('theme resolves system without inventing a separate switcher theme',()=>{
 assert.equal(resolveTheme('auto',true),'dark');assert.equal(resolveTheme('auto',false),'light');assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark');
});
