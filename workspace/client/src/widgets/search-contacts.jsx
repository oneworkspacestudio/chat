import React from 'react';
import { Tinode } from 'tinode-sdk';
import { ContactSearch } from '../workspace/contact-search.generated.jsx';
import { FormContext } from '../workspace/components/ui.js';

export default class SearchContacts extends React.PureComponent {
  state = {search:this.props.initialQuery || '',edited:false};
  componentDidMount() {
    // New MyAccounts members can arrive after the first directory snapshot.
    // Refresh the open query without requiring the user to retype it. Only the
    // directory picker opts in; local group-member filters do not make requests.
    if(this.props.liveDirectory && window.workspaceChat?.managedDirectory) {
      if(this.state.search.trim().length>=2) this.search();
      this.refresh=setInterval(()=>{
        if(!this.pending && this.state.search.trim().length>=2 &&
          document.visibilityState==='visible' && navigator.onLine) this.search();
      },5000);
    }
  }
  componentWillUnmount() {clearTimeout(this.timer);clearInterval(this.refresh);}
  search = () => {
    clearTimeout(this.timer);
    const query=this.state.search.trim();
    this.setState({edited:query.length>0});
    const request=Promise.resolve(this.props.onSearchContacts(query || Tinode.DEL_CHAR));
    this.pending=request;
    const finished=()=>{if(this.pending===request)this.pending=null;};
    request.then(finished,finished);
    return request;
  };
  change = search => {
    this.setState({search});
    clearTimeout(this.timer);
    if (window.workspaceChat?.managedDirectory) {
      if (!search.trim() || search.trim().length>=2) this.timer=setTimeout(this.search,300);
    }
  };
  action = action => {
    if(action==='search') this.search();
    if(action==='clear') {clearTimeout(this.timer);this.setState({search:'',edited:false},this.search);}
  };
  render() {
    return React.createElement(FormContext.Provider,{value:{kind:'workspace-people-search',change:this.change,submit:this.search}},
      React.createElement(ContactSearch,{data:{query:this.state.search,placeholder:window.workspaceChat?.managedDirectory?'Name, username, email or Chat ID':this.props.placeholder},onAction:this.action}));
  }
}
