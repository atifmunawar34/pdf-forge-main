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
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return 'THROW';
  return r.result?.result?.value;
};
const clickAt = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
};
const btnRect = (label) => evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText && x.innerText.trim().includes('${label}')); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);

await send('Page.navigate', { url: 'http://localhost:5173/pdf-forge/edit' });
await sleep(3500);
const doc = await send('DOM.getDocument');
const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
await send('DOM.setFileInputFiles', { files: ['C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_src.pdf'], nodeId: node.result.nodeId });
await sleep(4000);
console.log('after upload:', await evalJs(`document.body.innerText.replace(/\\s+/g,' ').slice(0,150)`));
const start = await btnRect('Start Editing');
console.log('start btn:', JSON.stringify(start));
await evalJs(`[...document.querySelectorAll('button')].find(x=>x.innerText && x.innerText.trim().includes('Start Editing'))?.click()`);
await sleep(6000);
console.log('editor open:', await evalJs(`document.body.innerText.includes('PDF Forge Editor')`));
console.log('body now:', await evalJs(`document.body.innerText.replace(/\\s+/g,' ').slice(0,150)`));

// wait for canvas render (pdf.js worker via CDN can be slow)
let before = null;
for (let i = 0; i < 20; i++) {
  before = await evalJs(`(() => { const c=document.querySelector('canvas'); if(!c || !c.width) return null; const r=c.getBoundingClientRect(); return {top: Math.round(r.top)}; })()`);
  if (before) break;
  await sleep(1000);
}
console.log('canvas top before edit:', JSON.stringify(before));

// click a block
const blk = await evalJs(`(() => {
  const ov=[...document.querySelectorAll('div')].filter(d=>d.style.left&&d.style.top&&d.style.width&&d.style.height&&d.offsetWidth>50&&d.offsetHeight>5&&d.offsetHeight<60);
  const big=ov.sort((a,b)=>b.offsetWidth-a.offsetWidth)[0];
  if(!big) return null; const r=big.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
})()`);
await clickAt(blk.x, blk.y);
await sleep(800);

const after = await evalJs(`(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {top: Math.round(r.top)}; })()`);
console.log('canvas top during edit:', JSON.stringify(after), '-> shifted?', before && after && before.top !== after.top);

// floating bar present + has font info + OK button
console.log('floating bar:', await evalJs(`(() => {
  const el=[...document.querySelectorAll('div')].find(d=>d.className.includes('absolute top-3') && d.className.includes('rounded-xl'));
  if(!el) return null;
  return { text: el.innerText.replace(/\\s+/g,' ').slice(0,80), top: Math.round(el.getBoundingClientRect().top) };
})()`));
console.log('errors:', errors.length ? errors : 'none');
ws.close(); process.exit(0);
