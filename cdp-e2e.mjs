const CDP = 'http://localhost:9226';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true });
  return r.result?.exceptionDetails ? 'ERR:' + r.result.exceptionDetails.exception?.description?.split('\n')[0] : r.result?.result?.value;
};
const ok = (name, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);

await send('Page.navigate', { url: 'http://localhost:5173/pdf-forge/' });
await sleep(3500);

// open Merge modal
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText && b.innerText.includes('Merge PDF')&&b.closest('[data-reveal]'))?.click()`);
await sleep(1200);
ok('merge modal open', await ev(`document.body.innerText.toLowerCase().includes('select pdf files')`) === true);

// attach 2 test PDFs to the modal file input
const doc = await send('DOM.getDocument');
const fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input#modalFileInput' });
ok('file input found', !!fi.result?.nodeId);
await send('DOM.setFileInputFiles', {
  files: ['C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_src.pdf', 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_src.pdf'],
  nodeId: fi.result.nodeId,
});
await sleep(6000);
const body = await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,300)`);
ok('merge workspace opened', body.includes('test_src') || body.toLowerCase().includes('merge'), body.slice(0, 120));

console.log('JS errors:', errors.length ? errors.slice(0, 5) : 'none');
ws.close(); process.exit(0);
