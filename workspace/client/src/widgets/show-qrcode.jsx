import QRCode from 'qrcode';
import React from 'react';
import { FormattedMessage } from 'react-intl';

import { QRCODE_SIZE } from '../config';

export default class ShowQRCode extends React.PureComponent {
  constructor(props) {
    super(props);
    this.qrCodeRef = React.createRef();
  }

  componentDidMount() {
    this.active = true;
    QRCode.toCanvas(this.props.uri, {width: QRCODE_SIZE, margin: 1})
      .then(canvas => {if (this.active && this.qrCodeRef.current) this.qrCodeRef.current.replaceChildren(canvas);})
      .catch(() => {});
  }

  componentWillUnmount() {this.active = false;}

  render() {
    return (
      <div className="panel-form-column">
        <br />
        <div className="qr-code" ref={this.qrCodeRef} />
        <div><tt>{this.props.uri}</tt></div>
        <div className="dialog-buttons">
          <button className="outline" onClick={this.props.onCancel}>
            <FormattedMessage id="button_ok" defaultMessage="OK" description="Button [OK]" />
          </button>
        </div>
      </div>
    );
  }
};
