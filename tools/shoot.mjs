// Takes the screenshots listed in shots.json with headless Chromium over CDP:
//   node tools/shoot.mjs [port] [cdp-port]
// Writes screenshots/<name> as JPEG (quality 88). Chrome must already run with
// --remote-debugging-port=<cdp-port> and the WebGL domain policy switches.
// Rebuilt in the recorded session; same CDP flow, same shot list from shots.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = process.argv[2] || '8091';
const cdpPort = process.argv[3] || '9222';
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));

const version = await (await fetch(`http://localhost:${cdpPort}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let nextId = 1;
const pending = new Map();
const events = [];
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result);
  } else if (data.method) {
    events.push(data);
  }
};
function send(method, params = {}, sessionId) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const shot of shots) {
  // file:// avoids this build's local-network block on http://localhost.
  const url = `file://${root}/app/index.html${shot.query}`;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: false,
  }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  // Wait until the scene reports itself ready (or 20 s, whichever first).
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    await sleep(200);
    const { result } = await send('Runtime.evaluate', {
      expression: 'window.__shotReady === true', returnByValue: true,
    }, sessionId);
    ready = result.value === true;
  }
  await sleep(300);
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, sessionId);
  writeFileSync(join(root, 'screenshots', shot.name), Buffer.from(data, 'base64'));
  console.log('wrote', shot.name, ready ? '(scene ready)' : '(timed out waiting for __shotReady)');
  await send('Target.closeTarget', { targetId });
}
ws.close();
