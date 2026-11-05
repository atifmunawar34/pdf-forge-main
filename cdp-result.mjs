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
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true });
  return r.result?.exceptionDetails ? 'ERR:' + r.result.exceptionDetails.exception?.description?.split('\n')[0] : r.result?.result?.value;
};

await send('Page.navigate', { url: 'http://localhost:5173/pdf-forge/' });
await sleep(3500);
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText && b.innerText.includes('Merge PDF')&&b.closest('[data-reveal]'))?.click()`);
await sleep(1200);
const doc = await send('DOM.getDocument');
const fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input#modalFileInput' });
await send('DOM.setFileInputFiles', {
  files: ['C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_src.pdf', 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_src.pdf'],
  nodeId: fi.result.nodeId,
});
await sleep(5000);
// dismiss any intro popup
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText && /get started|start merging|dismiss/i.test(b.innerText))?.click()`);
await sleep(800);
// click the Merge button in the workspace
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText && b.innerText.includes('Merge') && b.innerText.includes('PDF') && !b.closest('header'))?.click()`);
await sleep(8000);
// dismiss success popup if shown
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText && /keep editing|close|dismiss/i.test(b.innerText))?.click()`);
await sleep(2000);
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('shot-result.png', Buffer.from(shot.result.data, 'base64'));
console.log('saved; errors:', errors.length ? errors.slice(0, 3) : 'none');
ws.close(); process.exit(0);
