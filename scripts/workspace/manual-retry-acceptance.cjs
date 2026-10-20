// Drop only a real backend ACK after delivery. Never simulate successful traffic.
// Run against a disposable packaged-runtime fixture with synthetic accounts.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.CHAT_TEST_PRIVATE_ROOT;
const origin = process.env.CHAT_TEST_ORIGIN;
assert(root && /chat-parity-[0-9]+[\\/]fixture$/.test(root) &&
  /^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin), 'Use an isolated loopback fixture.');
const users = JSON.parse(fs.readFileSync(root + '/test-users.json', 'utf8'));
assert(users.length >= 2 && users.every(user => user.email.endsWith('@example.test')));
const text = 'Synthetic lost acknowledgement ' + Date.now();
let stage = 'start';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true
  });
  try {
    async function login(user, fault = false) {
      const context = await browser.newContext();
      if (fault) await context.addInitScript(({text}) => {
        const Native = window.WebSocket;
        window.retryFault = {dropped: false, published: []};
        window.WebSocket = class extends Native {
          send(data) {
            try {
              const pub = JSON.parse(data).pub;
              if (pub && (typeof pub.content === 'string' ? pub.content : pub.content?.txt) === text) {
                retryFault.published.push({wireId: pub.id, id: pub.head?.workspace_id || null});
                if (!retryFault.firstId) retryFault.firstId = pub.id;
              }
            } catch {}
            return super.send(data);
          }
          set onmessage(handler) {
            super.onmessage = event => {
              try {
                const ctrl = JSON.parse(event.data).ctrl;
                if (ctrl?.id === retryFault.firstId && ctrl?.code === 202 && !retryFault.dropped) {
                  retryFault.dropped = true;
                  return;
                }
              } catch {}
              handler?.call(this, event);
            };
          }
          get onmessage() { return super.onmessage; }
        };
      }, {text});
      const page = await context.newPage();
      page.setDefaultTimeout(25000);
      await page.goto(origin + '/chat/');
      await page.locator('#username').fill(user.username);
      await page.getByRole('button', {name: 'Next', exact: true}).click();
      await page.locator('input[type=password]').fill(user.password);
      await page.getByRole('button', {name: /Sign in/i}).click();
      await page.locator('#dummy-view h2').waitFor();
      return {context, page, base: new URL(page.url()).origin + '/chat/'};
    }
    async function open(actor, name) {
      await actor.page.goto(actor.base + '#newtpk');
      await actor.page.getByText('find', {exact: true}).click();
      await actor.page.getByRole('textbox', {name: 'Find people', exact: true}).fill(name);
      await actor.page.getByText(name + ' Tester', {exact: true}).first().click();
      await actor.page.locator('#send-message-input').waitFor();
    }
    const alice = await login(users[0], true), bob = await login(users[1]);
    await open(alice, 'Bob');
    await open(bob, 'Alice');
    stage = 'send and lose ACK';
    await alice.page.locator('#send-message-input').fill(text);
    await alice.page.locator('#send-message-input').press('Enter');
    await bob.page.locator('#scroller').getByText(text, {exact: true}).waitFor();
    assert.equal(await alice.page.evaluate(() => retryFault.dropped), true);
    console.log('PASS Real recipient received the message while its real sender ACK was dropped');
    const row = alice.page.locator('#scroller li').filter({has: alice.page.getByText(text, {exact: true})}).last();
    await row.locator('.timestamp').filter({hasText: 'failed'}).waitFor({timeout: 90000});
    stage = 'actual Retry menu';
    await row.hover();
    await row.locator('.menuTrigger a').click();
    await alice.page.locator('ul.menu').getByText('Retry', {exact: true}).click();
    await alice.page.waitForFunction(() => retryFault.published.length >= 2);
    await alice.page.waitForFunction(() => !Array.from(document.querySelectorAll('#scroller .timestamp'))
      .some(node => node.innerText.includes('failed')));
    const attempts = await alice.page.evaluate(() => retryFault.published);
    assert(attempts[0].id, 'Initial send lacks durable ID');
    assert.equal(attempts[1].id, attempts[0].id, 'Retry changed/dropped the durable message ID');
    assert.notEqual(attempts[1].wireId, attempts[0].wireId, 'Wire request ID must be refreshed');
    await bob.page.reload();
    await bob.page.locator('#scroller').getByText(text, {exact: true}).waitFor();
    assert.equal(await bob.page.locator('#scroller').getByText(text, {exact: true}).count(), 1);
    console.log('PASS Actual Retry menu retains the durable ID and exactly one message after reload');
    fs.writeFileSync(root + '/manual-retry-loss-result.json', JSON.stringify({
      schema: 1, realBackend: true, noMockSuccessfulResponse: true, realACKDropped: true,
      manualMenuUsed: true, durableIdRetained: true, wireIdRefreshed: true,
      recipientCopies: 1, ownerDataUsed: false
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  let message = String(error.message);
  for (const user of users) message = message.replaceAll(user.password, '[redacted]');
  console.error('FAIL manual retry at ' + stage + ': ' + message.replace(/https?:\/\/[^\s"']+/g, '[URL omitted]'));
  process.exitCode = 1;
});
