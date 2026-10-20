// Send message form.
import React, { Suspense } from 'react';
import { FormattedMessage, defineMessages, injectIntl } from 'react-intl';
import { Drafty } from 'tinode-sdk';

// Lazy-loading AudioRecorder because it's quite large due to
// a dependency on webm-duration-fix.
const AudioRecorder = React.lazy(_ => import('./audio-recorder.jsx'));

import { KEYPRESS_DELAY } from '../config.js';
import { filePasted } from '../lib/blob-helpers.js';
import { replyFormatter } from '../lib/formatters.js';
import {readDraft, writeDraft, shouldSendKey, acknowledged} from '../workspace/composer-state.mjs';
import {ComposerStatus} from '../workspace/composer-status.generated.jsx';
import {FormContext} from '../workspace/components/ui.js';
import {ComposerMedia} from '../workspace/continuity-ui.js';
import {stickers} from '../workspace/stickers.mjs';

const messages = defineMessages({
  messaging_disabled: {
    id: 'messaging_disabled_prompt',
    defaultMessage: 'Messaging disabled',
    description: 'Prompt in SendMessage in read-only topic'
  },
  type_new_message: {
    id: 'new_message_prompt',
    defaultMessage: 'New message',
    description: 'Prompt in send message field'
  },
  add_image_caption: {
    id: 'image_caption_prompt',
    defaultMessage: 'Image caption',
    description: 'Prompt in SendMessage for attached image'
  },
  file_attachment_too_large: {
    id: 'file_attachment_too_large',
    defaultMessage: 'The file size {size} exceeds the {limit} limit.',
    description: 'Error message when attachment is too large'
  },
  cannot_initiate_upload: {
    id: 'cannot_initiate_file_upload',
    defaultMessage: 'Cannot initiate file upload.',
    description: 'Generic error messagewhen attachment fails'
  },
  icon_title_record_voice: {
    id: 'icon_title_record_voice',
    defaultMessage: 'Record voice message',
    description: 'Icon tool tip for recording a voice message'
  },
  icon_title_attach_file: {
    id: 'icon_title_attach_file',
    defaultMessage: 'Attach file',
    description: 'Icon tool tip for attaching a file'
  },
  icon_title_add_image: {
    id: 'icon_title_add_image',
    defaultMessage: 'Add image',
    description: 'Icon tool tip for attaching an image'
  },
  icon_title_send: {
    id: 'icon_title_send',
    defaultMessage: 'Send message',
    description: 'Icon tool tip for sending a message'
  },
});

class SendMessage extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      quote: null,
      message: props.initMessage || readDraft(localStorage, window.workspaceChat?.accountKey, props.topicName).text,
      sending: false,
      draftError: '',
      audioRec: false,
      audioAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    };

    // Timestamp when the previous key press was sent to the server.
    this.keypressTimestamp = 0;

    this.handlePasteEvent = this.handlePasteEvent.bind(this);
    this.handleAttachImage = this.handleAttachImage.bind(this);
    this.handleAttachFile = this.handleAttachFile.bind(this);
    this.handleAttachAudio = this.handleAttachAudio.bind(this);
    this.handleSend = this.handleSend.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleMessageTyping = this.handleMessageTyping.bind(this);
    this.handleDropAttach = this.handleDropAttach.bind(this);

    this.handleQuoteClick = this.handleQuoteClick.bind(this);

    this.formatReply = this.formatReply.bind(this);
  }

  componentDidMount() {
    this.workspaceAcknowledged=event=>{
      const {topic,id}=event.detail||{};
      if(topic!==this.props.topicName||!id)return;
      const draft=readDraft(localStorage,window.workspaceChat?.accountKey,topic);
      if(draft.id===id&&draft.text===this.state.message){try{writeDraft(localStorage,window.workspaceChat?.accountKey,topic,'');this.setState({message:'',sending:false,draftError:''})}catch{}}
    };
    window.addEventListener('workspace:chat-ack',this.workspaceAcknowledged);
    if (this.messageEditArea) {
      this.messageEditArea.addEventListener('paste', this.handlePasteEvent, false);
      if (window.getComputedStyle(this.messageEditArea).getPropertyValue('transition-property') == 'all') {
        // Set focus on desktop, but not on mobile: focus causes soft keyboard to pop up.
        this.messageEditArea.focus();
      }
    }

    this.setState({quote: this.formatReply()});
  }

  componentWillUnmount() {
    window.removeEventListener('workspace:chat-ack',this.workspaceAcknowledged);
    if (this.messageEditArea) {
      this.messageEditArea.removeEventListener('paste', this.handlePasteEvent, false);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.messageEditArea) {
      if (window.getComputedStyle(this.messageEditArea).getPropertyValue('transition-property') == 'all') {
        // Set focus on desktop, but not on mobile: focus causes soft keyboard to pop up.
        this.messageEditArea.focus();
      }

      // Adjust height of the message area for the amount of text.
      this.messageEditArea.style.height = '0px';
      this.messageEditArea.style.height = this.messageEditArea.scrollHeight + 'px';
    }

    if (prevProps.topicName != this.props.topicName) {
      this.setState({message: this.props.initMessage || readDraft(localStorage, window.workspaceChat?.accountKey, this.props.topicName).text, audioRec: false, quote: null, sending: false, draftError: ''});
    } else if (prevProps.initMessage != this.props.initMessage) {
      const msg = this.props.initMessage || '';
      this.setState({message: msg}, _ => {
        // If there is text, scroll to bottom and set caret to the end.
        this.messageEditArea.scrollTop = this.messageEditArea.scrollHeight;
        this.messageEditArea.setSelectionRange(msg.length, msg.length);
      });
    }
    if (prevProps.reply != this.props.reply) {
      this.setState({quote: this.formatReply()});
    }
  }

  formatReply() {
    return this.props.reply ?
      Drafty.format(this.props.reply.content, replyFormatter, {
        formatMessage: this.props.intl.formatMessage.bind(this.props.intl),
        authorizeURL: this.props.tinode.authorizeURL.bind(this.props.tinode)
      }) : null;
  }

  handlePasteEvent(e) {
    if (this.props.disabled) {
      return;
    }
    // FIXME: handle large files too.
    if (filePasted(e,
      file => { this.props.onAttachImage(file); },
      file => { this.props.onAttachFile(file); },
      this.props.onError)) {

      // If a file was pasted, don't paste base64 data into input field.
      e.preventDefault();
    }
  }

  handleAttachImage(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.props.onAttachImage(e.target.files[0]);
    }
    // Clear the value so the same file can be uploaded again.
    e.target.value = '';
  }

  handleAttachFile(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.props.onAttachFile(e.target.files[0]);
    }
    // Clear the value so the same file can be uploaded again.
    e.target.value = '';
  }

  handleDropAttach(files) {
    if (files && files.length > 0) {
      this.props.onAttachFile(files[0]);
    }
  }

  handleAttachAudio(url, preview, duration) {
    this.setState({audioRec: false});
    this.props.onAttachAudio(url, preview, duration);
  }

  async handleSend(e) {
    e.preventDefault();
    if (this.state.sending) return;
    const message = this.props.noInput ? '' : this.state.message.trim();
    const editing = !!this.props.reply?.editing;
    if (message || this.props.acceptBlank || this.props.noInput) {
      const topic = this.props.topicName;
      const account = window.workspaceChat?.accountKey;
      const draft = readDraft(localStorage, account, topic);
      const retryKey = `${this.props.noInput?'forward':editing?'edit:'+this.props.reply.seq:'text'}:${message}`;
      const clientID = !editing && !this.props.noInput && draft.text.trim() === message && draft.id ? draft.id : this.pendingRetry?.key === retryKey ? this.pendingRetry.id : crypto.randomUUID();
      this.pendingRetry = {key: retryKey, id: clientID};
      try {
        if (!editing && !this.props.noInput) writeDraft(localStorage, account, topic, message, clientID);
        this.setState({sending: true, draftError: ''});
        const ctrl = await this.props.onSendMessage(message, undefined, undefined, {workspace_id: clientID});
        if (!acknowledged(ctrl)&&!ctrl?.workspaceQueued) throw new Error('Not confirmed by the server. Your draft is kept; retry when connected.');
        this.pendingRetry = null;
        if ((editing || this.props.noInput) && this.props.topicName === topic) {
          this.setState({message:readDraft(localStorage,account,topic).text,sending:false});
        } else if (this.props.topicName === topic && this.state.message.trim() === message) {
          writeDraft(localStorage, account, topic, '');
          this.setState({message: '', sending: false});
        } else if (this.props.topicName === topic) this.setState({sending: false});
      } catch (error) {
        if (this.props.topicName === topic) this.setState({sending: false, draftError: error.message});
      }
    }
  }

  /* Send on Enter key */
  handleKeyPress(e) {
    if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return;
    if (this.state.audioRec) {
      // Ignore key presses while audio is being recorded.
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Enter pressed: either send, or enter a new line.
    if (shouldSendKey(e, this.props.sendOnEnter)) {
      e.preventDefault();
      e.stopPropagation();
      this.handleSend(e);
    }
  }

  handleMessageTyping(e) {
    this.setState({message: e.target.value});
    try {
      if (!this.props.reply?.editing) writeDraft(localStorage, window.workspaceChat?.accountKey, this.props.topicName, e.target.value);
      if (this.state.draftError) this.setState({draftError: ''});
      window.dispatchEvent(new CustomEvent('workspace:chat-draft', {detail: {topic: this.props.topicName}}));
    } catch { this.setState({draftError: 'This browser could not save the draft. Keep this window open and retry.'}); }
    if (this.props.onKeyPress) {
      const now = new Date().getTime();
      if (now - this.keypressTimestamp > KEYPRESS_DELAY) {
        this.props.onKeyPress();
        this.keypressTimestamp = now;
      }
    }
  }

  handleQuoteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.props.reply && this.props.onQuoteClick) {
      const replyToSeq = this.props.reply.seq;
      this.props.onQuoteClick(replyToSeq);
    }
  }

  render() {
    const { formatMessage } = this.props.intl;
    const prompt = this.props.disabled ?
      formatMessage(messages.messaging_disabled) :
      (this.props.messagePrompt ?
        formatMessage(messages[this.props.messagePrompt]) :
        formatMessage(messages.type_new_message));

    const sendIcon = (this.props.reply && this.props.reply.editing) ?
      'check_circle' : 'send';

    const quote = this.state.quote ?
      (<div id="reply-quote-preview">
        <div className="cancel">
          <a href="#" onClick={e => {e.preventDefault(); this.props.onCancelReply();}}><i className="material-icons gray">close</i></a>
        </div>
        {this.state.quote}
      </div>) : null;
    const audioEnabled = this.state.audioAvailable && this.props.onAttachAudio;
    return (
      <div id="send-message-wrapper">
        {React.createElement(FormContext.Provider, {value: {kind: 'workspace-composer-status', label: 'Message status'}}, React.createElement(ComposerStatus, {data: {sending: this.state.sending, error: this.state.draftError}, onAction: () => {}}))}
        {!this.props.noInput ? quote : null}
        <div id="send-message-panel">
          {!this.props.disabled ?
            <>
              {!this.props.noInput&&!this.state.audioRec?React.createElement(ComposerMedia,{
                onEmoji:emoji=>{const start=this.messageEditArea?.selectionStart??this.state.message.length,end=this.messageEditArea?.selectionEnd??start;const text=this.state.message.slice(0,start)+emoji+this.state.message.slice(end);this.handleMessageTyping({target:{value:text}});requestAnimationFrame(()=>{this.messageEditArea?.focus();this.messageEditArea?.setSelectionRange(start+emoji.length,start+emoji.length)})},
                onSticker:async id=>{const sticker=stickers.find(s=>s.id===id);if(!sticker)throw new Error('Sticker unavailable');const ctrl=await this.props.onSendMessage(sticker.content,undefined,undefined,{workspace_id:crypto.randomUUID(),workspace_sticker:id});if(!acknowledged(ctrl)&&!ctrl?.workspaceQueued)throw new Error('Sticker not confirmed. Please retry when connected.')}
              }):null}
              {this.props.onAttachFile && !this.state.audioRec ?
                <>
                  <a href="#" onClick={e => {e.preventDefault(); this.attachImage.click();}} title={formatMessage(messages.icon_title_add_image)}>
                    <i className="material-icons secondary">photo</i>
                  </a>
                  <a href="#" onClick={e => {e.preventDefault(); this.attachFile.click();}} title={formatMessage(messages.icon_title_attach_file)}>
                    <i className="material-icons secondary">attach_file</i>
                  </a>
                </>
                :
                null}
              {this.props.noInput ?
                (quote || <div className="hr thin" />) :
                (this.state.audioRec ?
                  (<Suspense fallback={<div><FormattedMessage id="loading_note" defaultMessage="Loading..."
                  description="Message shown when component is loading"/></div>}>
                    <AudioRecorder
                      onRecordingProgress={_ => this.props.onKeyPress(true)}
                      onDeleted={_ => this.setState({audioRec: false})}
                      onFinished={this.handleAttachAudio}/>
                  </Suspense>) :
                  <textarea id="send-message-input" placeholder={prompt}
                    value={this.state.message} onChange={this.handleMessageTyping}
                    onKeyDown={this.handleKeyPress}
                    ref={ref => {this.messageEditArea = ref;}} />)}
              {this.state.message || !audioEnabled ?
                <a href="#" onClick={this.handleSend} title={formatMessage(messages.icon_title_send)}>
                  <i className="material-icons">{sendIcon}</i>
                </a> :
                !this.state.audioRec ?
                  <a href="#" onClick={e => {e.preventDefault(); this.setState({audioRec: true})}} title={formatMessage(messages.icon_title_record_voice)}>
                    <i className="material-icons">mic</i>
                  </a> :
                  null
              }
              <input type="file" ref={ref => {this.attachFile = ref}}
                onChange={this.handleAttachFile} style={{display: 'none'}} />
              <input type="file" ref={ref => {this.attachImage = ref}} accept="image/*, video/*"
                onChange={this.handleAttachImage} style={{display: 'none'}} />
            </>
            :
            <div id="writing-disabled">{prompt}</div>
          }
        </div>
      </div>
    );
  }
};

export default injectIntl(SendMessage);
