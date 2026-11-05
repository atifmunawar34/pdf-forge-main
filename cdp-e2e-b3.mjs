import { connect, sleep } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
const PDF = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_multi.pdf';
const WEBP = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_img.webp';

// webp-to-pdf with real webp + backend converters + interactive tools
const results = [];
const run = async (tool, files, actionRe, waitS = 40) => {
  await send('Page.navigate', { url: `http://localhost:3000/ilovetopdf/${tool}` });
  await sleep(1400);
  const doc = await send('DOM.getDocument');
  let fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input#modalFileInput' });
  if (!fi.result?.nodeId) fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
  if (!fi.result?.nodeId) { results.push(`${tool}: NO INPUT`); return; }
  await send('DOM.setFileInputFiles', { files, nodeId: fi.result.nodeId });
  let wsReady = false;
  for (let i = 0; i < 15; i++) { await sleep(800); if ((await ev(`location.pathname`)).includes('workspace')) { wsReady = true; break; } }
  if (!wsReady) { results.push(`${tool}: no workspace (url=${await ev('location.pathname')}, err=${await ev(`(document.body.innerText.match(/password-protected|unlocked|already/i)||[])[0]||'none'`)}`); return; }
  await sleep(1800);
  const clicked = await ev(`(()=>{const all=[...document.querySelectorAll('button')].filter(b=>!b.disabled);
    let b=all.find(x=>x.className.includes('w-full')&&(x.className.includes('py-4')||x.className.includes('py-3'))&&${actionRe}.test(x.innerText))
      ||all.find(x=>x.className.includes('w-full')&&x.className.includes('py-4'))
      ||all.find(x=>${actionRe}.test(x.innerText)&&x.innerText.trim().length<70);
    if(!b)return 'none';const l=b.innerText.trim().slice(0,50);b.click();return l||'icon'})()`);
  if (clicked === 'none') { results.push(`${tool}: no action btn`); return; }
  for (let i = 0; i < waitS; i++) {
    await sleep(1000);
    const s = await ev(`({dl:document.querySelector('a[download]')?.getAttribute('download')||null,err:(document.body.innerText.match(/(processing failed|something went wrong|server failed|unavailable|cannot process)[^\\n]*/i)||[])[0]||null})`);
    if (s?.dl) { results.push(`${tool}: OK → ${s.dl}${s.dl.toLowerCase().startsWith('ilovetopdf') ? '' : ' << UNBRANDED'}`); return; }
    if (s?.err) { results.push(`${tool}: FAILED — ${s.err.slice(0, 90)}`); return; }
  }
  results.push(`${tool}: timeout (clicked "${clicked}")`);
};

await run('webp-to-pdf', [WEBP], /convert|to pdf/i);
await run('pdf-to-word', [PDF], /convert|to word/i, 60);
await run('pdf-to-excel', [PDF], /convert|to excel/i, 60);
await run('pdf-to-powerpoint', [PDF], /convert|to powerpoint/i, 60);
await run('sign', [PDF], /sign|apply|save|finish/i);
await run('redact', [PDF], /redact|apply|save|finish/i);
await run('scan', [PDF], /scan|create|download|finish|save|convert/i);
await run('edit', [PDF], /open|edit|save|finish/i);

console.log(results.join('\n'));
console.log('\nERRORS:', errors.length ? [...new Set(errors)].slice(0, 8) : 'none');
process.exit(0);
