/* ContactsView holds all contacts-related stuff */
import React from 'react';
import { FormattedMessage, defineMessages } from 'react-intl';

import ContactList from '../widgets/contact-list.jsx';

import { updateFavicon } from '../lib/utils.js';
import {ChatFilters} from '../workspace/chat-filters.generated.jsx';
import {ListEditor} from '../workspace/list-editor.generated.jsx';
import {FormContext} from '../workspace/components/ui.js';
import {getPreferences, subscribePreferences, updatePreferences, filterConversations} from '../workspace/preferences.mjs';

const messages = defineMessages({
  archived_contacts_title: {
    id: "archived_contacts",
    defaultMessage: "Archived contacts ({count})",
    description: "Label for archived chats"
  }
});

export default class ContactsView extends React.Component {
  constructor(props) {
    super(props);

    this.handleAction = this.handleAction.bind(this);

    this.state = {...ContactsView.deriveStateFromProps(props), query: '', filter: 'all', preferences: getPreferences(), editor: null, error: '', saving: false};
  }

  componentDidMount() {
    this.unsubscribe = subscribePreferences(preferences => this.setState({preferences}));
    this.draftChanged = () => this.forceUpdate();
    window.addEventListener('workspace:chat-draft', this.draftChanged);
  }

  componentWillUnmount() { this.unsubscribe?.(); window.removeEventListener('workspace:chat-draft', this.draftChanged); }

  async handleFilterAction(action) {
    if (this.state.saving) return;
    if (['all','unread','groups','favourites'].includes(action)) { this.setState({filter: action}); return; }
    if (action === 'new-list' || action === 'edit-list') {
      const saved = this.state.preferences.lists.find(item => item.id === this.state.filter);
      this.setState({editor: action === 'edit-list' && saved ? structuredClone(saved) : {id: crypto.randomUUID(), name: '', topics: []}, error: ''});
      return;
    }
    if (action === 'favourite-selected' && this.props.topicSelected) {
      this.setState({saving: true, error: ''});
      try { await updatePreferences(p => {const id=this.props.topicSelected;p.favourites=p.favourites.includes(id)?p.favourites.filter(value=>value!==id):[...p.favourites,id];}); }
      catch(error) {this.setState({error:error.message});}
      finally {this.setState({saving:false});}
    }
  }

  async handleListAction(action) {
    if (action === 'cancel') { this.setState({editor:null,error:''});return; }
    if (this.state.saving) return;
    const editor=structuredClone(this.state.editor);
    this.setState({saving:true,error:''});
    try {
      await updatePreferences(p=>{
        const index=p.lists.findIndex(item=>item.id===editor.id);
        if(action==='save') { editor.name=editor.name.trim();if(index<0)p.lists.push(editor);else p.lists[index]=editor; }
        else if(action==='delete'){if(index<0)throw new Error('This list was already removed.');p.lists.splice(index,1);}
        else {
          const next=index+(action==='move-up'?-1:1);
          if(index<0||next<0||next>=p.lists.length)throw new Error('The list is already at that end.');
          [p.lists[index],p.lists[next]]=[p.lists[next],p.lists[index]];
        }
      });
      this.setState({editor:null,filter:action==='delete'?'all':editor.id});
    } catch(error) {this.setState({error:error.message});}
    finally {this.setState({saving:false});}
  }

  static deriveStateFromProps(props) {
    const contacts = [];
    let unreadThreads = 0;
    let archivedCount = 0;

    const me = props.tinode.getMeTopic();
    props.chatList.forEach(c => {
      const blocked = c.acs && !c.acs.isJoiner();
      c.pinned = me.pinnedTopicRank(c.topic);

      // Show only blocked contacts only when props.blocked == true.
      if (blocked && props.blocked) {
        contacts.push(c);
      }
      if (blocked || props.blocked) {
        return;
      }

      if (c.private && c.private.arch) {
        if (props.archive) {
          contacts.push(c);
        } else {
          archivedCount ++;
        }
      } else if (!props.archive) {
        contacts.push(c);
        unreadThreads += c.unread > 0 ? 1 : 0;
      }
    });

    contacts.sort((a, b) => {
      const pin = b.pinned - a.pinned;
      return pin != 0 ? pin : (b.touched || 0) - (a.touched || 0);
    });

    if (archivedCount > 0) {
      contacts.push({
        action: 'archive',
        title: messages.archived_contacts_title,
        values: {count: archivedCount}
      });
    }

    return {
      contactList: contacts,
      unreadThreads: unreadThreads
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.chatList != this.props.chatList ||
        prevProps.archive != this.props.archive ||
        prevProps.blocked != this.props.blocked) {
      const newState = ContactsView.deriveStateFromProps(this.props);
      this.setState(newState);
      if (newState.unreadThreads != prevState.unreadThreads) {
        updateFavicon(newState.unreadThreads);
      }
    }
  }

  handleAction(action_ignored) {
    this.props.onShowArchive();
  }

  render() {
    const customList=this.state.preferences.lists.find(item=>item.id===this.state.filter);
    const contacts=filterConversations(this.state.contactList,{query:this.state.query,filter:this.state.filter,preferences:this.state.preferences});
    const filters=React.createElement(FormContext.Provider,{value:{kind:'workspace-chat-filters',label:'Conversation filters',filter:this.state.filter,busy:this.state.saving,change:query=>this.setState({query}),select:filter=>this.setState({filter})}},React.createElement(ChatFilters,{data:{query:this.state.query,lists:this.state.preferences.lists,customList:!!customList,selected:!!this.props.topicSelected,favouriteAction:this.state.preferences.favourites.includes(this.props.topicSelected)?'Remove selected chat from favourites':'Favourite selected chat',error:!this.state.editor?this.state.error:''},onAction:action=>this.handleFilterAction(action)}));
    const editor=this.state.editor;
    const modal=editor?React.createElement(FormContext.Provider,{value:{kind:'workspace-list-editor',label:'Edit chat list',modal:true,busy:this.state.saving,close:()=>this.handleListAction('cancel'),change:name=>this.setState({editor:{...editor,name}}),toggle:(id,checked)=>this.setState({editor:{...editor,topics:checked?[...editor.topics,id]:editor.topics.filter(value=>value!==id)}})}},React.createElement(ListEditor,{data:{heading:customList?'Edit list':'New list',name:editor.name,existing:this.state.preferences.lists.some(list=>list.id===editor.id),error:this.state.error,contacts:this.props.chatList.map(c=>({id:c.topic,name:c.public?.fn||c.topic,selected:editor.topics.includes(c.topic)}))},onAction:action=>this.handleListAction(action)})):null;
    return (
      <React.Fragment>
      {filters}{modal}
      <FormattedMessage id="contacts_not_found"
        defaultMessage="You have no chats\n¯∖_(ツ)_/¯"
        description="HTML message shown in ContactList when no contacts are found">{
        (no_contacts) => <ContactList
          tinode={this.props.tinode}
          connected={this.props.connected}
          contacts={contacts}
          emptyListMessage={this.state.query||this.state.filter!=='all'?'No chats match this filter.':no_contacts}
          topicSelected={this.props.topicSelected}
          myUserId={this.props.myUserId}
          showOnline={true}
          showUnread={true}
          onTopicSelected={this.props.onTopicSelected}
          showContextMenu={this.props.showContextMenu}
          onAction={this.handleAction} />
      }</FormattedMessage>
      </React.Fragment>
    );
  }
};
