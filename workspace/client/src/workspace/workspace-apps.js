import React from 'react';
import {WorkspaceApps} from './workspace-apps.generated.jsx';
import {FormContext} from './components/ui.js';

export function WorkspaceAppsDialog({close,logout}) {
 const [state,setState]=React.useState({apps:[],loading:true,error:'',home:''});
 const load=React.useCallback(async signal=>{
  setState(value=>({...value,loading:true,error:''}));
  try{
   const response=await fetch(new URL('api/workspace/apps',document.baseURI),{credentials:'same-origin',cache:'no-store',signal});
   if(!response.ok)throw new Error('Workspace apps could not connect. You can keep using this conversation and retry.');
   const catalog=await response.json();
   if(!Array.isArray(catalog.apps))throw new Error('Workspace returned an invalid app catalog.');
   // The manager supplies absolute destinations; no portal session, external
   // script or cross-origin credential request enters this page.
   const safeURL=value=>{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('Invalid Workspace destination.');return u.href};
   setState({loading:false,error:'',home:safeURL(catalog.home),apps:catalog.apps.map(app=>({...app,url:safeURL(app.url),icon:/^img\/apps\/[A-Za-z0-9_-]+\.svg$/.test(app.icon)?app.icon:'img/my_chat.svg'}))});
  }catch(error){if(error.name!=='AbortError')setState(value=>({...value,loading:false,error:error.message}));}
 },[]);
 React.useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort()},[load]);
 return React.createElement(FormContext.Provider,{value:{kind:'workspace-apps',label:'Workspace apps',modal:true,close}},React.createElement(WorkspaceApps,{data:state,onAction:action=>{if(action==='close')close();if(action==='retry')load();if(action==='logout')logout();}}));
}
