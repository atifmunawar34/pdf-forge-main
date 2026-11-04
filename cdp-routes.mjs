import { connect, sleep, ok } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();

// deep links
for (const [path, expect] of [
  ['/ilovetopdf/templates', 'template'],
  ['/ilovetopdf/pdf-tools', 'PDF Tools'],
  ['/ilovetopdf/merge', 'Merge'],
  ['/ilovetopdf/', 'Every tool'],
]) {
  await send('Page.navigate', { url: `http://localhost:3000${path}` });
  await sleep(2200);
  ok(`GET ${path}`, await ev(`document.body.innerText.includes('${expect}')`));
}

// templates: list + open one
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/templates' });
await sleep(2500);
const tplCount = await ev(`document.querySelectorAll('button, a').length`);
const tplCards = await ev(`document.querySelectorAll('img[alt], .pf-card, [class*="template"]').length`);
ok('templates page has content', tplCards > 0, `${tplCards} elements`);
// click first template card
const tplOpened = await ev(`(()=>{const b=[...document.querySelectorAll('a,button')].find(x=>/resume|invoice|template/i.test(x.innerText)&&x.closest('main,section,div[class*="grid"]'));if(!b)return 'none';b.click();return b.innerText.trim().slice(0,40)})()`);
await sleep(1500);
console.log('  template click:', tplOpened, '→', await ev(`location.pathname`));

// back/forward: home -> pdf-tools -> back
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/' });
await sleep(2000);
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/pdf-tools' });
await sleep(2000);
await send('Page.navigate', { url: 'about:blank' }); await sleep(200);
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/' }); await sleep(1800);
await ev(`[...document.querySelectorAll('header button')].find(b=>b.innerText?.includes('ALL PDF TOOLS'))?.click()`);
await sleep(1200);
const fwd = await ev(`location.pathname`);
await ev(`history.back()`); await sleep(1200);
const back = await ev(`location.pathname`);
ok('back/forward', fwd.includes('pdf-tools') && back === '/ilovetopdf/', `fwd=${fwd} back=${back}`);

// junk URL normalization
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/some-junk-path/' });
await sleep(1800);
ok('junk path normalizes', (await ev(`location.pathname`)) === '/ilovetopdf/', await ev(`location.pathname`));

// continue-to chaining (merge -> split)
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/merge' });
await sleep(1200);
const doc = await send('DOM.getDocument');
const fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
await send('DOM.setFileInputFiles', { files: ['C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_multi.pdf', 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_src.pdf'], nodeId: fi.result.nodeId });
for (let i = 0; i < 15; i++) { await sleep(800); if ((await ev(`location.pathname`)).includes('workspace')) break; }
await sleep(1500);
await ev(`[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.className.includes('w-full')&&b.className.includes('py-4'))?.click()`);
for (let i = 0; i < 25; i++) { await sleep(1000); if (await ev(`!!document.querySelector('a[download]')`)) break; }
ok('merge result', await ev(`!!document.querySelector('a[download]')`));
// click "Split PDF" in Continue to...
const chained = await ev(`(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>x.innerText?.includes('Split PDF'));if(!b)return 'none';b.click();return 'ok'})()`);
await sleep(2000);
const chainOk = (await ev(`location.pathname`)).includes('split');
ok('continue-to → Split PDF', chainOk, `url=${await ev('location.pathname')} click=${chained}`);

console.log('ERRORS:', errors.length ? [...new Set(errors)].slice(0, 8) : 'none');
process.exit(0);
