import { connect, sleep } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
const PDF = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_multi.pdf';

async function loadTool(tool, files) {
  await send('Page.navigate', { url: `http://localhost:3000/ilovetopdf/${tool}` });
  await sleep(1500);
  const doc = await send('DOM.getDocument');
  const fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
  await send('DOM.setFileInputFiles', { files, nodeId: fi.result.nodeId });
  for (let i = 0; i < 15; i++) { await sleep(800); if ((await ev(`location.pathname`)).includes('workspace')) return true; }
  return false;
}
const waitResult = async () => {
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const s = await ev(`({dl:document.querySelector('a[download]')?.getAttribute('download')||null,err:(document.body.innerText.match(/processing failed|passwords do not match|something went wrong/i)||[])[0]||null})`);
    if (s?.dl || s?.err) return s;
  }
  return null;
};
const setInput = async (sel, val) => ev(`(()=>{const i=document.querySelector('${sel}');if(!i)return false;const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'${val}');i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);

// --- PROTECT ---
await loadTool('protect', [PDF]);
await sleep(1200);
await setInput('input[placeholder="Type password"]', 'secret123');
await setInput('input[placeholder="Repeat password"]', 'secret123');
await sleep(500);
const protBtn = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText?.includes('Protect PDF')&&!x.disabled);if(!b)return 'disabled';b.click();return 'clicked'})()`);
console.log('protect click:', protBtn);
const r1 = await waitResult();
console.log('protect:', r1 ? (r1.dl ? 'OK → ' + r1.dl : 'ERR ' + r1.err) : 'timeout');

// --- REMOVE: type a page range first ---
await loadTool('remove', [PDF]);
await sleep(1500);
// find the pages range input
const inp = await ev(`(()=>{const i=[...document.querySelectorAll('input')].find(x=>/range|pages/i.test(x.placeholder||x.getAttribute('aria-label')||''));if(!i)return 'none';const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'1');i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return 'set'})()`);
console.log('remove range input:', inp);
await sleep(800);
const rmBtn = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Remove\\s+\\d+\\s+Pages/i.test(x.innerText)&&!x.disabled);if(!b)return 'disabled|'+[...document.querySelectorAll('button')].filter(x=>x.className.includes('w-full')).map(x=>x.innerText.trim().slice(0,30)).join('|');b.click();return 'clicked'})()`);
console.log('remove click:', rmBtn);
const r2 = await waitResult();
console.log('remove:', r2 ? (r2.dl ? 'OK → ' + r2.dl : 'ERR ' + r2.err) : 'timeout');

console.log('ERRORS:', errors.length ? [...new Set(errors)].slice(0, 5) : 'none');
process.exit(0);
