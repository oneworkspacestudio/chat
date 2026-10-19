import React from 'react';
export const FormContext=React.createContext(null);
export const Page=({children})=>{
 const form=React.useContext(FormContext), ref=React.useRef(null);
 React.useLayoutEffect(()=>{
  if(!form?.modal)return;
  const opener=document.activeElement;ref.current.showModal();
  return ()=>{ref.current?.close();if(opener?.isConnected)opener.focus()};
 },[!!form?.modal]);
 return React.createElement(form?.modal?'dialog':'section',{ref,className:form?.kind || 'workspace-connection','aria-label':form?.label,onCancel:form?.modal?e=>{e.preventDefault();form.close()}:undefined},children);
};
export const Card=({children})=>React.createElement(React.Fragment,null,children);
export const Heading=({level=1,children})=>React.createElement('h'+level,null,children);
export const Text=({children})=>React.createElement('p',null,children);
export const Image=({src,alt})=>React.createElement('img',{src,alt});
export const Button=({children,onClick,name,value,icon})=>{const form=React.useContext(FormContext);return React.createElement('button',{type:'button',disabled:!!form?.busy,'aria-pressed':name==='custom-list'||name==='filter'?form?.filter===value:undefined,onClick:name==='custom-list'?()=>form.select(value):onClick},icon?React.createElement('span',{className:'material-icons','aria-hidden':true},icon):null,children);};
export const Link=({href,children})=>React.createElement('a',{href},children);
export const Section=({children})=>React.createElement('section',null,children);
export const Row=({children})=>React.createElement('div',{className:'workspace-search-row'},children);
export const Field=({label,children})=>React.createElement('label',null,label,children);
export const Alert=({children})=>React.createElement('p',{role:'alert'},children);
export const Input=({name,value,placeholder})=>{const form=React.useContext(FormContext);const label={'query':'Find people','topicID':'Chat or group ID','conversation-search':'Search chats','list-name':'List name'}[name]||name;return React.createElement('input',{name,value,placeholder,type:'text','aria-label':label,autoComplete:'off',onChange:e=>form.change(e.target.value,name),onKeyDown:e=>{if(e.key==='Enter'&&!e.isComposing&&form.submit){e.preventDefault();form.submit();}}});};
export const Checkbox=({label,value,checked})=>{const form=React.useContext(FormContext);return React.createElement('label',{className:'workspace-list-choice'},React.createElement('input',{type:'checkbox',checked:!!checked,onChange:e=>form.toggle(value,e.target.checked)}),label);};
