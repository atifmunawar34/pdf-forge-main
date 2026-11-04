import { connect, sleep, ok } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();

// template flow: list -> preview -> use
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/templates' });
await sleep(3000);
const cards = await ev(`document.querySelectorAll('.pf-card[role="button"]').length`);
ok('template cards rendered', cards > 10, `${cards} cards`);
await ev(`document.querySelectorAll('.pf-card[role="button"]')[0]?.click()`);
await sleep(1500);
const path1 = await ev(`location.pathname`);
ok('template preview opens', path1.includes('/templates/'), path1);
// click Use/Download if present
const used = await ev(`(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/use|download|edit|customize/i.test(x.innerText)&&!x.disabled);if(!b)return 'none';const l=b.innerText.trim().slice(0,30);b.click();return l})()`);
await sleep(1500);
console.log('  use click:', used, '→', await ev(`location.pathname`));

// real back/forward: / -> /pdf-tools -> /merge -> back twice
await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/' });
await sleep(1800);
await ev(`location.assign('/ilovetopdf/pdf-tools')`); await sleep(1800);
await ev(`location.assign('/ilovetopdf/merge')`); await sleep(1800);
console.log('  at:', await ev(`location.pathname`));
await ev(`history.back()`); await sleep(1200);
const b1 = await ev(`location.pathname`);
await ev(`history.back()`); await sleep(1200);
const b2 = await ev(`location.pathname`);
await ev(`history.forward()`); await sleep(1200);
const f1 = await ev(`location.pathname`);
ok('back x2 + forward', b1 === '/ilovetopdf/pdf-tools' && b2 === '/ilovetopdf/' && f1 === '/ilovetopdf/pdf-tools', `b1=${b1} b2=${b2} f1=${f1}`);

console.log('ERRORS:', errors.length ? [...new Set(errors)].slice(0, 6) : 'none');
process.exit(0);
