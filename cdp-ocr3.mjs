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
await sleep(12000);
// capture SharedArrayBuffer support + the popup description text
console.log('SAB supported:', await ev(`typeof SharedArrayBuffer`));
console.log('crossOriginIsolated:', await ev(`window.crossOriginIsolated`));
console.log('popup area text:', await ev(`(()=>{const els=[...document.querySelectorAll('div')].filter(d=>d.innerText?.includes('Processing failed'));const p=els[els.length-1];return p?p.innerText.slice(0,400):'none'})()`));
process.exit(0);
