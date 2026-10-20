import React from 'react';
import {ContinuityPanel} from './continuity-panel.generated.jsx';
import {ContinuityDialog} from './continuity-dialog.generated.jsx';
import {ComposerExtras} from './composer-extras.generated.jsx';
import {EmojiStickers} from './emoji-stickers.generated.jsx';
import {FormContext} from './components/ui.js';
import {stickers,emojiChoices} from './stickers.mjs';
export function DirectConversation({peer}){
 const manager=window.workspaceContinuity;
 const [,refresh]=React.useReducer(v=>v+1,0),[open,setOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 React.useEffect(()=>{manager?.addEventListener('change',refresh);return()=>manager?.removeEventListener('change',refresh)},[manager]);
 if(!manager||!/^usr[A-Za-z0-9_-]{11}$/.test(peer))return null;
 const view=manager.view(peer),status=manager.online()?'Connected':view.connected?'Connected to this person · syncing when Chat returns':'Reconnecting · messages stay on this device';
 const rows=view.rows.map(r=>{const sticker=r.payload.kind==='sticker'?stickers.find(s=>s.id===r.payload.id):null;return{id:r.id,caption:(r.direction==='out'?'You':'Received')+' · '+new Date(r.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),text:r.payload.text,image:sticker?.src,alt:sticker?.label,status:r.direction==='in'?'Received directly · waiting for sender to save to Chat':r.delivered?'Delivered directly · waiting to save to Chat':'Queued on this device · not delivered'}});
 const data={...view,error:error||(!manager.online()&&!view.connected?view.error:''),status,rows,hasRows:rows.length>0,expires:view.expires?'Connection permission renews online; current permission ends '+new Date(view.expires).toLocaleTimeString():''};
 const act=async action=>{if(action==='details'){setOpen(true);return}if(action==='close'){setOpen(false);return}setBusy(true);setError('');try{if(action==='enable')await manager.enable(peer);if(action==='disable')await manager.disable(peer)}catch(e){setError(e.message)}finally{setBusy(false)}};
 return React.createElement(React.Fragment,null,
  React.createElement(FormContext.Provider,{value:{kind:'workspace-continuity',label:'Conversation connection'}},React.createElement(ContinuityPanel,{data,onAction:act})),
  open?React.createElement(FormContext.Provider,{value:{kind:'workspace-continuity-dialog',label:'Direct fallback',modal:true,outlineIcons:true,busy,close:()=>setOpen(false)}},React.createElement(ContinuityDialog,{data,onAction:act})):null);
}
export function ComposerMedia({onEmoji,onSticker}){
 const [open,setOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const choose=async(type,value)=>{if(busy)return;setError('');if(type==='emoji'){onEmoji(value);setOpen(false);return}setBusy(true);try{await onSticker(value);setOpen(false)}catch(e){setError(e.message)}finally{setBusy(false)}};
 const action=name=>{if(name==='open')setOpen(true);if(name==='close')setOpen(false)};
 return React.createElement(React.Fragment,null,React.createElement(FormContext.Provider,{value:{kind:'workspace-composer-extras'}},React.createElement(ComposerExtras,{data:{},onAction:action})),open?React.createElement(FormContext.Provider,{value:{kind:'workspace-emoji-stickers',label:'Emoji and stickers',modal:true,outlineIcons:true,busy,choose,close:()=>setOpen(false)}},React.createElement(EmojiStickers,{data:{emoji:emojiChoices,stickers,error},onAction:action})):null);
}
