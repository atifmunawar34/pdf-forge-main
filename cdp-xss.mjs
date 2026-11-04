import { connect, sleep, ok } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();

await send('Page.navigate', { url: 'http://localhost:3000/ilovetopdf/document-tools/markdown-previewer' });
await sleep(2500);
ok('previewer modal opens', await ev(`!!document.querySelector('textarea')`));

await ev(`(()=>{const t=document.querySelector('textarea');const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;set.call(t,'[click](javascript:alert(1)) [q]("onmouseover="alert(2)) [ok](https://aastack.com)');t.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
await sleep(500);
const clicked = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^run$|^preview/i.test(x.innerText.trim())&&!x.disabled);if(!b)return 'disabled';b.click();return 'ok'})()`);
await sleep(1200);
console.log('  run click:', clicked);
const res = await ev(`(()=>{const as=[...document.querySelectorAll('a')];const bad=as.filter(a=>a.getAttribute('href')?.includes('javascript')||[...a.attributes].some(at=>at.name.startsWith('on')));const good=as.find(a=>a.getAttribute('href')==='https://aastack.com');const bodyHas=document.body.innerHTML.includes('onmouseover=');return {bad:bad.length,good:!!good,bodyHas,anchors:as.length}})()`);
console.log('  result:', JSON.stringify(res));
ok('no malicious anchors', res.bad === 0 && !res.bodyHas);
ok('https link survives', res.good);
console.log('ERRORS:', errors.length ? [...new Set(errors)].slice(0, 4) : 'none');
process.exit(0);
