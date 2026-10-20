import React from 'react';
import {MobileHeader} from './mobile-header.generated.jsx';
import {MobileMenu} from './mobile-menu.generated.jsx';
import {FormContext} from './components/ui.js';

export function MobileChatHeader({onAction}) {
 const [open,setOpen]=React.useState(false);
 const data={workspace:!!window.workspaceChat?.workspaceNavigation};
 const act=action=>{
  if(action==='more'){setOpen(true);return;}
  setOpen(false);
  if(action!=='close')onAction(action);
 };
 return React.createElement(React.Fragment,null,
  React.createElement(FormContext.Provider,{value:{kind:'workspace-mobile-header',id:'side-caption-panel',label:'Chat',as:'header',outlineIcons:true}},React.createElement(MobileHeader,{data,onAction:act})),
  open?React.createElement(FormContext.Provider,{value:{kind:'workspace-mobile-menu',label:'Chat options',modal:true,outlineIcons:true,close:()=>setOpen(false)}},React.createElement(MobileMenu,{data,onAction:act})):null);
}
