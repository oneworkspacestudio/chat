import React from 'react';
export const FormContext=React.createContext(null);
export const Page=({children})=>{
 const form=React.useContext(FormContext), ref=React.useRef(null);
 React.useLayoutEffect(()=>{
  if(!form?.modal)return;
  const opener=document.activeElement, previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';ref.current.showModal();
  return ()=>{ref.current?.close();document.body.style.overflow=previousOverflow;if(opener?.isConnected)opener.focus()};
 },[!!form?.modal]);
 return React.createElement(form?.modal?'dialog':form?.as||'section',{ref,id:form?.id,dateTime:form?.dateTime,className:form?.kind || 'workspace-connection','aria-label':form?.label,onCancel:form?.modal?e=>{e.preventDefault();form.close()}:undefined},children);
};
export const Card=({children})=>React.createElement(React.Fragment,null,children);
export const Heading=({level=1,children})=>React.createElement('h'+level,null,children);
export const Text=({children,name})=>React.createElement(name==='inline'?'span':'p',null,children);
export const Image=({src,alt})=>React.createElement('img',{src,alt});
const iconPaths={
 search:['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM15 15l6 6'],
 chat_bubble:['M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z','M8 10h8M8 14h5'],
 add_comment:['M21 11v7a2 2 0 0 1-2 2H8l-5 2V5a2 2 0 0 1 2-2h8','M18 2v8M14 6h8','M7 11h5M7 15h8'],
 archive:['M4 8h16v12H4zM3 3h18v5H3zM10 12h4'],
 settings:['m9 3-.7 2.1-2 .9-2.1-.4L2 9l1.5 1.7v2.6L2 15l2.2 3.4 2.1-.4 2 .9L9 21h6l.7-2.1 2-.9 2.1.4L22 15l-1.5-1.7v-2.6L22 9l-2.2-3.4-2.1.4-2-.9L15 3Z','M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z'],
 apps:['M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z'],
 more_vert:['M12 4h.01M12 12h.01M12 20h.01'],
 close:['m6 6 12 12M6 18 18 6'],
 person:['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v2'],
 contrast:['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 3v18M12 6h4M12 9h7M12 12h9M12 15h7M12 18h4'],
 logout:['M9 3H4v18h5M14 8l5 4-5 4M8 12h13']
};
function buttonIcon(icon,outline){
 if(outline&&iconPaths[icon])return React.createElement('svg',{viewBox:'0 0 24 24',className:'workspace-line-icon',fill:'none',stroke:'currentColor',strokeWidth:icon==='more_vert'?3.5:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},...iconPaths[icon].map((d,index)=>React.createElement('path',{d,key:index})));
 return React.createElement('span',{className:'material-icons','aria-hidden':true},icon);
}
export const Icon=({name})=>buttonIcon(name,true);
export const Button=({children,onClick,name,value,icon,label})=>{const form=React.useContext(FormContext);return React.createElement('button',{type:'button','data-control':name,'aria-label':label,disabled:!!form?.busy&&name!=='dialog-close','aria-current':name==='navigation'&&form?.active===value?'page':undefined,'aria-pressed':name==='custom-list'||name==='filter'?form?.filter===value:undefined,onClick:name==='custom-list'?()=>form.select(value):onClick},icon?buttonIcon(icon,form?.outlineIcons):null,children);};
export const Link=({href,children})=>React.createElement('a',{href},children);
export const Section=({children,name})=>React.createElement('section',{'data-section':name},children);
export const Row=({children,name})=>React.createElement('div',{className:'workspace-search-row','data-row':name},children);
export const Field=({label,children})=>React.createElement('label',null,label,children);
export const Alert=({children})=>React.createElement('p',{role:'alert'},children);
export const Input=({name,value,placeholder})=>{const form=React.useContext(FormContext);const label={'query':'Find people','topicID':'Chat or group ID','conversation-search':'Search chats','list-name':'List name'}[name]||name;return React.createElement('input',{name,value,placeholder,type:'text','aria-label':label,autoComplete:'off',onChange:e=>form.change(e.target.value,name),onKeyDown:e=>{if(e.key==='Enter'&&!e.isComposing&&form.submit){e.preventDefault();form.submit();}}});};
export const Checkbox=({label,value,checked})=>{const form=React.useContext(FormContext);return React.createElement('label',{className:'workspace-list-choice'},React.createElement('input',{type:'checkbox',checked:!!checked,onChange:e=>form.toggle(value,e.target.checked)}),label);};
