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
await send('Page.enable'); await send('Runtime.enable');
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true });
  return r.result?.exceptionDetails ? 'EVAL_ERR' : r.result?.result?.value;
};
const ok = (name, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
const heroSet = `const i=[...document.querySelectorAll('input')].find(x=>x.placeholder&&x.placeholder.includes('Search all tools')); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;`;

await send('Page.navigate', { url: 'http://localhost:5173/pdf-forge/' });
await sleep(4000);

ok('hero headline', await ev(`document.body.innerText.includes('Every tool you need to work with PDFs')`));
const cellCount = await ev(`document.querySelectorAll('[data-reveal] button').length`);
ok('tool grid cells > 40', cellCount > 40, `${cellCount} cells`);

await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='PDF Security')?.click()`);
await sleep(800);
const secCount = await ev(`[...document.querySelectorAll('[data-reveal]')].filter(d=>d.querySelector('button')).length`);
ok('tab filter works', secCount > 0 && secCount < cellCount, `${secCount} after filter`);
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='All')?.click()`);
await sleep(800);

// header search — typing opens dropdown with matching tools
await ev(`${heroSet} s.call(i,'image'); i.dispatchEvent(new Event('input',{bubbles:true}));`);
await sleep(1200);
const searchRows = await ev(`document.querySelector('.pf-menu')?.innerText.length || 0`);
ok('header search dropdown shows results', searchRows > 20, `${searchRows} chars in dropdown`);
await ev(`document.activeElement?.blur(); document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);
await sleep(800);

// tool card -> upload modal
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText && b.innerText.includes('Merge PDF')&&b.closest('[data-reveal]'))?.click()`);
await sleep(1200);
ok('tool click -> big red "Select PDF files"', await ev(`document.body.innerText.toLowerCase().includes('select pdf files')`) === true);
await ev(`[...document.querySelectorAll('button')].find(b=>b.querySelector('svg.lucide-x'))?.click()`);
await sleep(700);
ok('modal closed', await ev(`!document.body.innerText.toLowerCase().includes('select pdf files')`) === true);

// mega menu
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim().toUpperCase()==='ALL PDF TOOLS')?.click()`);
await sleep(800);
const menuTxt = await ev(`document.querySelector('.pf-menu')?.innerText.toUpperCase() || ''`);
ok('mega menu grouped columns', menuTxt.includes('ORGANIZE PDF') && menuTxt.includes('PDF INTELLIGENCE') && menuTxt.includes('MERGE PDF'));
await ev(`document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await sleep(400);

// footer (fresh state — navigate home first to be safe)
await send('Page.navigate', { url: 'http://localhost:5173/pdf-forge/' });
await sleep(3000);
const footTxt = await ev(`document.querySelector('footer')?.innerText.toUpperCase() || ''`);
ok('footer columns', footTxt.includes('PRODUCT') && footTxt.includes('SOLUTIONS') && footTxt.includes('LEGAL'));
ok('templates section', await ev(`document.body.innerText.toLowerCase().includes('template')`));
const catBtn = await ev(`[...document.querySelectorAll('button')].filter(b=>b.innerText&&b.innerText.toUpperCase().includes('IMAGE TOOLS')).length`);
ok('category cards present', catBtn >= 1, `${catBtn} found`);

console.log('JS errors:', errors.length ? errors.slice(0, 5) : 'none');
ws.close(); process.exit(0);
