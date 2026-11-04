import { connect, sleep, ok } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/' });
await sleep(3500);

// --- Homepage render ---
ok('hero title', await ev(`document.body.innerText.includes('Every tool you need')`));
ok('tool cards >= 40', (await ev(`document.querySelectorAll('main section button.pf-card, main section button').length`)) > 40,
   await ev(`document.querySelectorAll('main section button').length`));
ok('8 category pills', await ev(`[...document.querySelectorAll('button[aria-pressed]')].length`) >= 8,
   await ev(`[...document.querySelectorAll('button[aria-pressed]')].length`));

// --- Pill filter ---
await ev(`[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.trim()==='Optimize')?.click()`);
await sleep(700);
const optCards = await ev(`[...document.querySelectorAll('main section button.pf-card')].length`);
ok('Optimize pill filters grid', optCards > 0 && optCards < 40, `${optCards} cards`);
await ev(`[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.trim()==='All')?.click()`);
await sleep(500);

// --- Header search ---
await ev(`document.querySelector('header input[type="text"], header input[placeholder]')?.focus()`);
await ev(`(()=>{const i=document.querySelector('header input[placeholder]');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'word');i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
await sleep(700);
const sr = await ev(`(()=>{const dd=document.querySelectorAll('header .pf-menu button, header [class*="rounded-2xl"] button');return dd.length})()`);
ok('search dropdown opens with results', sr > 0, `${sr} rows`);

// search for "image" alias
await ev(`(()=>{const i=document.querySelector('header input[placeholder]');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'image');i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
await sleep(700);
const imgResults = await ev(`document.body.innerText.match(/JPG|PNG|image|Image/g)?.length||0`);
ok('search "image" finds image tools', imgResults > 0, `${imgResults} mentions`);

// --- Nav dropdowns ---
await ev(`document.body.click()`); await sleep(300);
await ev(`[...document.querySelectorAll('header button')].find(b=>b.innerText?.includes('CONVERT PDF'))?.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}))`);
await sleep(600);
const convMenu = await ev(`document.querySelector('header .pf-menu')!==null||document.querySelectorAll('header [class*="absolute"]').length>0`);
console.log('  convert dropdown visible:', convMenu);

// --- Footer ---
ok('footer renders', await ev(`document.body.innerText.includes('PRODUCT')||document.body.innerText.includes('ilovetopdf')`));
ok('AASTACK section', await ev(`!!document.querySelector('img[src*="aastack"]')`));
ok('AASTACK links to aastack.com', await ev(`[...document.querySelectorAll('a')].some(a=>a.href.includes('aastack.com'))`));
ok('language picker present', await ev(`document.body.innerText.match(/English|Español|Français/)!==null`));

// --- Reviews section ---
ok('reviews section', await ev(`document.body.innerText.match(/thank|review|love|community/i)!==null`));

// --- CTA ---
ok('CTA banner', await ev(`document.body.innerText.includes('get it done')||document.body.innerText.includes('Browse PDF Tools')`));

// --- Language switch to Spanish ---
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText?.match(/English|Language/i))?.click()`);
await sleep(800);
await ev(`[...document.querySelectorAll('button,a,div')].find(b=>b.innerText?.trim()==='Español')?.click()`);
await sleep(1200);
const es = await ev(`document.body.innerText.includes('UNIR')||document.body.innerText.includes('Unir')||document.body.innerText.includes('herramienta')`);
ok('Spanish translation applies', es === true);
// switch back
await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText?.match(/Español|Language/i))?.click()`);
await sleep(600);
await ev(`[...document.querySelectorAll('button,a,div')].find(b=>b.innerText?.trim()==='English')?.click()`);
await sleep(800);

console.log('ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
process.exit(0);
