import { connect, sleep } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
const PDF = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_multi.pdf';

await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/remove' });
await sleep(1500);
const doc = await send('DOM.getDocument');
const fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
await send('DOM.setFileInputFiles', { files: [PDF], nodeId: fi.result.nodeId });
for (let i = 0; i < 15; i++) { await sleep(800); if ((await ev(`location.pathname`)).includes('workspace')) break; }
await sleep(2500); // thumbnails render

// click thumbnail page 1
const thumb = await ev(`(()=>{const t=[...document.querySelectorAll('img')].find(i=>i.alt==='Page 1');if(!t)return 'no-thumb';t.closest('div[class*="cursor-pointer"]')?.click();return 'clicked'})()`);
console.log('thumb click:', thumb);
await sleep(600);
const btn = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Remove\\s+\\d+\\s+Pages/i.test(x.innerText)&&!x.disabled);if(!b)return 'disabled';const l=b.innerText.trim();b.click();return l})()`);
console.log('remove button:', btn);
for (let i = 0; i < 25; i++) {
  await sleep(1000);
  const s = await ev(`({dl:document.querySelector('a[download]')?.getAttribute('download')||null})`);
  if (s?.dl) { console.log('remove: OK →', s.dl); process.exit(0); }
}
console.log('remove: timeout');
console.log('ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
process.exit(0);
