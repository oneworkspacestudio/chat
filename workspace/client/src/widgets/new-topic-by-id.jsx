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
    QRCode.toDataURL(this.props.myURI, {width: QRCODE_SIZE, margin: 1})
      .then(qr => {if (this.active) this.setState({qr});})
      .catch(() => {}); // The readable ID remains available if QR generation fails.
  }
  componentWillUnmount() {this.active = false;}
  submit = () => {
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
      try {await navigator.clipboard.writeText(this.props.myURI.replace('tinode:///id/', ''));this.setState({copied:true});}
      catch (_) {this.setState({error:'Select and copy your Chat ID below.'});}
    }
  };
  render() {
    return React.createElement(FormContext.Provider, {value:{kind:'workspace-topic-id',change:topicID=>this.setState({topicID,error:''}),submit:this.submit}},
      React.createElement(ChatById, {data:{...this.state,myID:this.props.myURI.replace('tinode:///id/', '')},onAction:this.action}));
  }
}
