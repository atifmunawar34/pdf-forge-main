import { connect, sleep } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();

const PDF = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_multi.pdf';
const PDF2 = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_src.pdf';
const PNG = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_img.png';
const TXT = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_doc.txt';

const TESTS = process.argv[2]
  ? [[process.argv[2], process.argv[3] === 'img' ? [PNG] : process.argv[3] === 'txt' ? [TXT] : [PDF]]]
  : [
    ['merge', [PDF, PDF2]], ['split', [PDF]], ['compress', [PDF]], ['rotate', [PDF]],
    ['page-numbers', [PDF]], ['jpg-to-pdf', [PNG]], ['pdf-to-jpg', [PDF]], ['txt-to-pdf', [TXT]],
    ['watermark', [PDF]], ['protect', [PDF]], ['remove', [PDF]], ['reverse', [PDF]],
    ['grayscale', [PDF]], ['pdf-to-txt', [PDF]], ['page-info', [PDF]], ['metadata', [PDF]],
  ];

const results = [];
for (const [tool, files] of TESTS) {
  try {
    await send('Page.navigate', { url: `http://localhost:3000/ilovetopdf/${tool}` });
    await sleep(1400);
    const doc = await send('DOM.getDocument');
    let fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input#modalFileInput' });
    if (!fi.result?.nodeId) fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
    if (!fi.result?.nodeId) { results.push(`${tool}: NO INPUT`); continue; }
    await send('DOM.setFileInputFiles', { files, nodeId: fi.result.nodeId });
    let wsReady = false;
    for (let i = 0; i < 15; i++) { await sleep(800); if ((await ev(`location.pathname`)).includes('workspace')) { wsReady = true; break; } }
    if (!wsReady) { results.push(`${tool}: workspace never opened (url=${await ev('location.pathname')})`); continue; }
    await sleep(1600);
    // broad action search: big buttons — w-full OR verb-labeled
    const clicked = await ev(`(()=>{
      const all=[...document.querySelectorAll('button')].filter(b=>!b.disabled);
      const verbs=/merge|split|compress|rotat|number|convert|add|apply|remove|protect|watermark|reverse|grayscale|extract|scan|sign|redact|crop|repair|ocr|flatten|analy|show|read|translate|summar|markdown|html|reverse|continue|process|start|generate|done|save|download/i;
      let b=all.find(x=>x.className.includes('w-full')&&(x.className.includes('py-4')||x.className.includes('py-3'))&&verbs.test(x.innerText))
        ||all.find(x=>x.className.includes('w-full')&&x.className.includes('py-4'))
        ||all.find(x=>verbs.test(x.innerText)&&x.innerText.trim().length<60);
      if(!b) return 'none|'+all.filter(x=>x.className.includes('w-full')).map(x=>x.innerText.trim().slice(0,25)).join(',');
      const label=b.innerText.trim().slice(0,50); b.click(); return label||'icon-btn';
    })()`);
    if (clicked.startsWith('none')) { results.push(`${tool}: no action — wfull=[${clicked.slice(5)}]`); continue; }
    let done = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const s = await ev(`({dl:document.querySelector('a[download]')?.getAttribute('download')||null,err:(document.body.innerText.match(/processing failed|something went wrong|invalid pdf|cannot process/i)||[])[0]||null})`);
      if (s?.dl) { results.push(`${tool}: OK → ${s.dl}${s.dl.toLowerCase().startsWith('ilovetopdf') ? '' : '  << NOT BRANDED'}`); done = true; break; }
      if (s?.err) { results.push(`${tool}: FAILED — ${s.err}`); done = true; break; }
    }
    if (!done) results.push(`${tool}: timeout (clicked "${clicked}")`);
  } catch (e) {
    results.push(`${tool}: EXC ${e.message?.split('\n')[0]}`);
  }
}
console.log(results.join('\n'));
console.log('\nERRORS:', errors.length ? [...new Set(errors)].slice(0, 8) : 'none');
process.exit(0);
