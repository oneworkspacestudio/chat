// Unit-test the real controller with explicitly controlled QR completion order.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const babel = require(process.env.CHAT_BABEL_MODULE || '../../workspace/client/node_modules/@babel/core');
const pending = [];
const QRCode = {toDataURL: uri => new Promise(resolve => pending.push({uri, resolve}))};
class Component {
  constructor(props) { this.props = props; }
  setState(value) { this.state = {...this.state, ...value}; }
}
const React = {PureComponent: Component, createElement: (type, props, ...children) => ({type, props, children})};
const source = fs.readFileSync(path.join(__dirname, '../../workspace/client/src/widgets/new-topic-by-id.jsx'), 'utf8');
const code = babel.transformSync(source, {configFile: false, babelrc: false,
  plugins: [require.resolve(process.env.CHAT_BABEL_MODULES_PLUGIN || '../../workspace/client/node_modules/@babel/plugin-transform-modules-commonjs')]}).code;
const moduleValue = {exports: {}};
function load(name) {
  if (name === 'react') return React;
  if (name === 'qrcode') return QRCode;
  if (name.includes('topic-id.generated')) return {ChatById: () => {}};
  if (name.includes('components/ui')) return {FormContext: {Provider: () => {}}};
  if (name.includes('workspace/topic-id.js')) return {normalizeTopicID: value => {
    const id = String(value || '').replace(/^tinode:\/\/\/id\//, '');
    return /^(usr|grp|chn)[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }};
  if (name === '../config') return {QRCODE_SIZE: 128};
  throw Error('Unexpected controller dependency');
}
new Function('require', 'module', 'exports', code)(load, moduleValue, moduleValue.exports);
const View = moduleValue.exports.default;
(async () => {
  const view = new View({myURI: 'tinode:///id/undefined', onSubmit: () => {throw Error('Premature submit');}});
  view.componentDidMount();
  assert.equal(pending.length, 0);
  assert.equal(view.render().props.value.busy, true);
  view.submit();
  assert(view.state.error.includes('connecting'));
  await view.action('copy'); // No clipboard permission/request while identity is absent.
  console.log('PASS UNIT pending identity disables actions and cannot generate/copy an invalid QR/ID');
  const first = view.props;
  view.props = {...first, myURI: 'tinode:///id/usrAAAAAAAAAAA'};
  view.componentDidUpdate(first);
  assert.equal(pending.length, 1);
  assert.equal(view.render().props.value.busy, false);
  const second = view.props;
  view.props = {...second, myURI: 'tinode:///id/usrBBBBBBBBBBB'};
  view.componentDidUpdate(second);
  assert.equal(pending.length, 2);
  pending[0].resolve('stale-qr');
  await Promise.resolve();
  assert.equal(view.state.qr, '');
  pending[1].resolve('current-qr');
  await Promise.resolve();
  assert.equal(view.state.qr, 'current-qr');
  assert.equal(pending[1].uri, view.props.myURI);
  console.log('PASS UNIT identity changes regenerate QR and ignore stale asynchronous completion');
  const third = view.props;
  view.props = {...third, myURI: 'tinode:///id/usrCCCCCCCCCCC'};
  view.componentDidUpdate(third);
  view.componentWillUnmount();
  pending[2].resolve('unmounted-qr');
  await Promise.resolve();
  assert.equal(view.state.qr, '');
  console.log('PASS UNIT unmounted controller ignores late QR completion');
})().catch(error => {console.error(error); process.exitCode = 1;});
