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
await sleep(8000);
// dump any error/popup text + worker/console errors
console.log('page error text:', await ev(`(()=>{const t=document.body.innerText.split('\\n').filter(l=>/fail|error|went wrong|unavailable|denied|load/i.test(l));return t.slice(0,6).join(' || ')})()`));
console.log('pageERR:', errors.slice(0, 10));
// try creating tesseract worker directly to see error
const direct = await ev(`(async()=>{try{const m=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm').catch(()=>null);return 'esm-import:'+!!m}catch(e){return 'ERR:'+e.message}})()`);
console.log('direct esm check:', direct);
process.exit(0);
