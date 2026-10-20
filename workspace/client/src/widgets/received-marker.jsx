// Received/read indicator.
import React from 'react';
import { defineMessages, injectIntl } from 'react-intl';

import { Tinode } from 'tinode-sdk';

import { deliveryMarker } from '../lib/utils.js';

const messages = defineMessages({
  delivery_sent: {id:'workspace_delivery_sent',defaultMessage:'Sent to server',description:'Message accepted by the server'},
  delivery_received: {id:'workspace_delivery_received',defaultMessage:'Delivered',description:'Recipient acknowledged delivery'},
  delivery_read: {id:'workspace_delivery_read',defaultMessage:'Read',description:'Recipient acknowledged reading'},
  delivery_group_received: {id:'workspace_delivery_group_received',defaultMessage:'Delivered to all original recipients',description:'Every original recipient acknowledged delivery'},
  delivery_group_read: {id:'workspace_delivery_group_read',defaultMessage:'Read by all original recipients',description:'Every original recipient acknowledged reading'},
  message_sending: {
    id: 'message_sending',
    defaultMessage: 'sending...',
    description: 'Message being sent, in place of time stamp'
  },
  message_sending_failed: {
    id: 'message_sending_failed',
    defaultMessage: 'failed',
    description: 'Failed to send message, in place of time stamp'
  },
  message_edited_marker: {
    id: 'message_edited_marker',
    defaultMessage: ', edited',
    description: 'Marker indicating that the message was edited'
  }
});

class ReceivedMarker extends React.PureComponent {
  render() {
    const {formatMessage} = this.props.intl;
    let timestamp;
    if (this.props.received <= Tinode.MESSAGE_STATUS_SENDING) {
      timestamp = formatMessage(messages.message_sending);
    } else if (this.props.received == Tinode.MESSAGE_STATUS_FAILED ||
        this.props.received == Tinode.MESSAGE_STATUS_FATAL) {
      timestamp = formatMessage(messages.message_sending_failed);
    } else {
      timestamp = this.props.timestamp.toLocaleTimeString(this.props.intl.locale, { timeStyle: 'short' });
    }

    const icon = deliveryMarker(this.props.received);
    const marker = icon ? <i className={'material-icons small ' + icon.color}>{icon.name}</i> : null;
    const edited = this.props.edited ? formatMessage(messages.message_edited_marker) : null;
    const state=this.props.received===Tinode.MESSAGE_STATUS_READ?'read':this.props.received===Tinode.MESSAGE_STATUS_RECEIVED?'delivered':this.props.received===Tinode.MESSAGE_STATUS_SENT?'sent':null;
    const description=state?formatMessage(state==='read'?(this.props.isGroup?messages.delivery_group_read:messages.delivery_read):state==='delivered'?(this.props.isGroup?messages.delivery_group_received:messages.delivery_received):messages.delivery_sent):null;

    return (
      <span className="timestamp" data-delivery-state={state} title={description} aria-label={description?timestamp+', '+description:undefined}>
        {timestamp}{edited}{'\u00a0'}{marker}
      </span>
    );
  }
};

export default injectIntl(ReceivedMarker);
