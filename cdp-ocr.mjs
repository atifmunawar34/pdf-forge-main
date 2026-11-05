import { connect, sleep } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
const PDF = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_multi.pdf';
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/ocr' });
await sleep(1500);
const doc = await send('DOM.getDocument');
const fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
await send('DOM.setFileInputFiles', { files: [PDF], nodeId: fi.result.nodeId });
for (let i = 0; i < 15; i++) { await sleep(800); if ((await ev(`location.pathname`)).includes('workspace')) break; }
await sleep(1500);
await ev(`[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.className.includes('w-full')&&(b.className.includes('py-4')||b.className.includes('py-3')))?.click()`);
for (let i = 0; i < 60; i++) {
  await sleep(1000);
  const s = await ev(`({dl:document.querySelector('a[download]')?.getAttribute('download')||null,prog:(document.body.innerText.match(/(Loading|Scanning|Rendering)[^\\n]*/)||[])[0]||null,err:(document.body.innerText.match(/(failed|error|unavailable)[^\\n]*/i)||[])[0]||null})`);
  if (i % 5 === 0) console.log(`t+${i}s:`, JSON.stringify(s));
  if (s?.dl) { console.log('OCR: OK →', s.dl); break; }
  if (s?.err && !s?.prog) { console.log('OCR: ERR →', s.err); break; }
}
console.log('ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
process.exit(0);
