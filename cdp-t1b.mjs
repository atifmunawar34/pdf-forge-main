import { connect, sleep, ok } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/' });
await sleep(3000);

// count real tool cards (pf-press)
const allCount = await ev(`document.querySelectorAll('main button.pf-press').length`);
ok('all tool cards', allCount >= 50, `${allCount}`);

// Optimize pill
await ev(`[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.trim()==='Optimize')?.click()`);
await sleep(700);
const opt = await ev(`document.querySelectorAll('main button.pf-press').length`);
ok('Optimize pill filters', opt > 0 && opt < allCount, `${opt} cards (was ${allCount})`);
await ev(`[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.trim()==='All')?.click()`);
await sleep(500);
ok('All pill restores', (await ev(`document.querySelectorAll('main button.pf-press').length`)) === allCount);

// Language: find the footer lang trigger precisely (Globe icon button in footer)
const trigger = await ev(`(()=>{const b=[...document.querySelectorAll('footer button')].find(x=>x.querySelector('svg')&&x.innerText?.trim()?.match(/^[A-Z]/));return b?b.innerText.trim():'none'})()`);
console.log('lang trigger:', trigger);
await ev(`[...document.querySelectorAll('footer button')].find(x=>x.innerText?.trim()==='English')?.click()`);
await sleep(800);
const menuOpen = await ev(`[...document.querySelectorAll('footer .pf-menu button')].length`);
ok('lang menu opens', menuOpen >= 20, `${menuOpen} langs`);
await ev(`[...document.querySelectorAll('footer .pf-menu button')].find(b=>b.innerText?.trim()==='Español')?.click()`);
await sleep(1200);
ok('Spanish applies', await ev(`document.body.innerText.includes('UNIR PDF')||document.body.innerText.toLowerCase().includes('herramientas')`));
// back to English
await ev(`[...document.querySelectorAll('footer button')].find(x=>x.innerText?.trim()==='Español')?.click()`);
await sleep(600);
await ev(`[...document.querySelectorAll('footer .pf-menu button')].find(b=>b.innerText?.trim()==='English')?.click()`);
await sleep(800);
ok('back to English', await ev(`document.body.innerText.includes('MERGE PDF')`));

console.log('ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
process.exit(0);
