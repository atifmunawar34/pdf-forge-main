const CDP = 'http://localhost:9226';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
await new Promise((r) => (ws.onopen = r));
await send('Page.enable'); await send('Runtime.enable');
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.navigate', { url: 'http://localhost:5173/pdf-forge/' });
await sleep(4000);
console.log('nav:', await ev(`document.querySelector('header nav')?.innerText.split('\\n').join(' | ')`));
// convert dropdown
await ev(`[...document.querySelectorAll('header nav button')].find(b=>b.innerText.trim().toUpperCase()==='CONVERT PDF')?.click()`);
await sleep(700);
console.log('convert menu:', await ev(`document.querySelector('.pf-menu')?.innerText.split('\\n').slice(0,14).join(' | ')`));
ws.close(); process.exit(0);
