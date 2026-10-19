// Product empty state; protocol diagnostics remain in advanced support.
import React from 'react';
import {ChatEmpty} from '../workspace/empty-state.generated.jsx';
import {FormContext} from '../workspace/components/ui.js';
export default function LogoView(){
 return React.createElement('div',{id:'dummy-view'},React.createElement(FormContext.Provider,{value:{kind:'workspace-empty',label:'Chat'}},React.createElement(ChatEmpty,{data:{},onAction:()=>{}})));
}
