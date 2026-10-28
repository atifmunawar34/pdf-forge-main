const CDP = 'http://localhost:9226';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fs = await import('fs');
const t = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]);
};
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
await new Promise((r) => (ws.onopen = r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true });
  return r.result?.exceptionDetails ? 'ERR:' + r.result.exceptionDetails.exception?.description?.split('\n')[0] : r.result?.result?.value;
};
await send('Page.navigate', { url: 'http://localhost:3000/pdf-forge/' });
await sleep(4000);
console.log('NAV:', await ev(`document.querySelector('header')?.innerText.replace(/\\n/g,' | ').slice(0,300)`));
console.log('HAS_TEMPLATES_BTN:', await ev(`document.querySelector('header')?.innerText.includes('Template')`));
console.log('HAS_MORE_TOOLS:', await ev(`document.body.innerText.includes('power your work')`));
console.log('HAS_TPL_SECTION:', await ev(`document.body.innerText.includes('Free Document Templates')`));
console.log('CARDS:', await ev(`document.querySelectorAll('h3').length`));
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('shot-verify.png', Buffer.from(shot.result.data, 'base64'));
console.log('errors:', errors.length ? errors.slice(0,3) : 'none');
ws.close(); process.exit(0);
