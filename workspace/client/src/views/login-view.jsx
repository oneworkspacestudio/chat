import React from 'react';
import {ChatConnection} from '../workspace/connection.generated.jsx';
export default function LoginView(){
 return React.createElement(ChatConnection,{data:{},onAction:()=>window.location.assign(new URL('auth/login',document.baseURI))});
}
