import React from 'react';
import {AccountConnection} from './account-connection.generated.jsx';
import {FormContext} from './components/ui.js';
export function ManagedAccountConnection({name='',actions=false,onBlocked,onLogout}){
 return React.createElement(FormContext.Provider,{value:{kind:'workspace-account-connection',label:'MyAccounts connection'}},React.createElement(AccountConnection,{data:{name,actions,accountsURL:window.workspaceChat.accountsURL},onAction:action=>{if(action==='blocked')onBlocked?.();if(action==='logout')onLogout?.();}}));
}
