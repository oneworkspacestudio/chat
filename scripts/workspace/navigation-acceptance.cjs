// Real delayed server frames, preserving their order; never synthesize success.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.CHAT_TEST_PRIVATE_ROOT, origin = process.env.CHAT_TEST_ORIGIN;
assert(root && /chat-parity-[0-9]+[\\/]fixture$/.test(root) &&
  /^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin));
const users = JSON.parse(fs.readFileSync(root + '/test-users.json', 'utf8'));
assert(users.every(user => user.email.endsWith('@example.test')));
const meta = JSON.parse(fs.readFileSync(root + '/parity-restart-input.json', 'utf8'));
assert(/^usr[A-Za-z0-9_-]{11}$/.test(meta.bobID));
(async () => {
  const browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  const errors = [];
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const Native = window.WebSocket;
      window.navigationFault = {delayed: false, deliveredDataEnd: 0};
      window.WebSocket = class extends Native {
        set onmessage(handler) {
          let lastDue = 0, delay = 0;
          super.onmessage = event => {
            let ctrl;
            try { ctrl = JSON.parse(event.data).ctrl; } catch {}
            const dataEnd = ctrl?.params?.what === 'data' && ctrl.params.count > 0;
            if (dataEnd) { delay = 2000; window.navigationFault.delayed = true; }
            if (!delay) { handler?.call(this, event); return; }
            // The same added latency applies to this frame and every following
            // frame. A late leave ACK cannot overtake the earlier data end.
            const due = Math.max(Date.now() + delay, lastDue + 1);
            lastDue = due;
            setTimeout(() => {
              handler?.call(this, event);
              if (dataEnd) window.navigationFault.deliveredDataEnd++;
            }, due - Date.now());
          };
        }
        get onmessage() { return super.onmessage; }
      };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/chat/');
    await page.locator('#username').fill(users[0].username);
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    await page.locator('input[type=password]').fill(users[0].password);
    await page.getByRole('button', {name: /Sign in/i}).click();
    await page.getByRole('button', {name: 'New chat', exact: true}).waitFor();
    await page.evaluate(id => { location.hash = 'contacts/' + id; }, meta.bobID);
    await page.waitForFunction(() => window.navigationFault.delayed);
    await page.evaluate(() => { location.hash = 'acc_general'; });
    await page.locator('input#light').waitFor();
    await page.waitForFunction(() => window.navigationFault.deliveredDataEnd > 0);
    // Wait for the SDK's own next-task _allMessagesReceived dispatch.
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
    assert.deepEqual(errors, []);
    assert.equal(await page.locator('input#light').isVisible(), true);
    console.log('PASS Leaving a conversation before a real delayed data end preserves Settings without stale callbacks or crashes');
    const base = new URL(page.url()).origin + '/chat/';
    for (let step = 0; step < 5; step++) {
      await page.evaluate(id => { location.hash = 'contacts/' + id; }, meta.bobID);
      await page.locator('#send-message-input').waitFor();
      await page.evaluate(() => { location.hash = 'acc_general'; });
      await page.locator('input#light').waitFor();
    }
    await page.goto(base + '#contacts/' + meta.bobID);
    await page.locator('#send-message-input').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS Rapid conversation/settings navigation and re-entry retain a usable conversation with no uncaught errors');
    fs.writeFileSync(root + '/navigation-result.json', JSON.stringify({schema: 1,
      realBackend: true, realDelayedOrderedFrames: true, noMockSuccessfulResponse: true,
      settingsSurvivesLateDataEnd: true, rapidReentry: true, uncaughtErrors: errors, ownerDataUsed: false}, null, 2));
  } finally { await browser.close(); }
})().catch(error => {
  let message = String(error.message);
  for (const user of users) message = message.replaceAll(user.password, '[redacted]');
  console.error('FAIL navigation: ' + message.replace(/https?:\/\/[^\s"']+/g, '[URL omitted]'));
  process.exitCode = 1;
});
