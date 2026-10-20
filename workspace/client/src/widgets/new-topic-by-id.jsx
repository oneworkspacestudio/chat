import React from 'react';
import QRCode from 'qrcode';
import { ChatById } from '../workspace/topic-id.generated.jsx';
import { FormContext } from '../workspace/components/ui.js';
import { normalizeTopicID } from '../workspace/topic-id.js';
import { QRCODE_SIZE } from '../config';

export default class NewTopicById extends React.PureComponent {
  state = {topicID: '', error: '', qr: '', copied: false};
  componentDidMount() {
    this.active = true;
    this.refreshQRCode();
  }
  componentDidUpdate(previous) {
    if (previous.myURI !== this.props.myURI) this.refreshQRCode();
  }
  componentWillUnmount() {this.active = false;}
  currentID = () => {
    const id = normalizeTopicID(this.props.myURI);
    return id?.startsWith('usr') ? id : null;
  };
  refreshQRCode = () => {
    const id = this.currentID(), uri = this.props.myURI;
    this.setState({qr: '', copied: false});
    if (!id) return;
    QRCode.toDataURL('tinode:///id/' + id, {width: QRCODE_SIZE, margin: 1})
      .then(qr => {if (this.active && this.props.myURI === uri) this.setState({qr});})
      .catch(() => {}); // The readable ID and Copy remain available.
  };
  submit = () => {
    if (!this.currentID()) {
      this.setState({error: 'Chat is connecting. Try again once your ID appears.'});
      return;
    }
    const id = normalizeTopicID(this.state.topicID);
    if (!id) {
      this.setState({error: 'Enter a valid Chat ID (usr...), group ID (grp...) or tinode:///id/ link.'});
      return;
    }
    this.props.onSubmit(id);
  };
  action = async action => {
    if (action === 'open') return this.submit();
    if (action === 'copy') {
      const id = this.currentID();
      if (!id) return;
      try {await navigator.clipboard.writeText(id);if (this.active && this.currentID() === id) this.setState({copied:true});}
      catch (_) {this.setState({error:'Select and copy your Chat ID below.'});}
    }
  };
  render() {
    const id = this.currentID();
    return React.createElement(FormContext.Provider, {value:{kind:'workspace-topic-id',busy:!id,change:topicID=>this.setState({topicID,error:''}),submit:this.submit}},
      React.createElement(ChatById, {data:{...this.state,myID:id || 'Connecting to Chat…',qr:id ? this.state.qr : ''},onAction:this.action}));
  }
}
