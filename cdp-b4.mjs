import { connect, sleep } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
const PDF = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_multi.pdf';
const PNG = 'C:\\Users\\AL BARKAT ENTERPRISE\\Desktop\\pdf-forge-main\\test_img.png';

const load = async (tool, files, sel = 'input[type=file]') => {
  await send('Page.navigate', { url: `http://localhost:3000/ilovetopdf/${tool}` });
  await sleep(1400);
  const doc = await send('DOM.getDocument');
  const fi = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
  if (!fi.result?.nodeId) return 'NO INPUT';
  await send('DOM.setFileInputFiles', { files, nodeId: fi.result.nodeId });
  for (let i = 0; i < 15; i++) { await sleep(800); if ((await ev(`location.pathname`)).includes('workspace')) return 'OK'; }
  return 'NO WS: ' + (await ev(`location.pathname`));
};
const waitDl = async (s = 35) => {
  for (let i = 0; i < s; i++) {
    await sleep(1000);
    const r = await ev(`({dl:document.querySelector('a[download]')?.getAttribute('download')||null,err:(document.body.innerText.match(/(failed|went wrong|cannot|select|draw|add a|no redactions)[^\\n]*/i)||[])[0]||null})`);
    if (r?.dl || r?.err) return r;
  }
  return null;
};

// SCAN with image
console.log('scan:', await load('scan', [PNG]));
await sleep(1500);
const scanBtn = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>!x.disabled&&/create|download|convert|finish|save/i.test(x.innerText)&&x.className.includes('w-full'));if(!b)return 'none';const l=b.innerText.trim();b.click();return l})()`);
console.log('scan btn:', scanBtn);
console.log('scan result:', JSON.stringify(await waitDl()));

// SIGN: check what the Sign button needs
await load('sign', [PDF]);
await sleep(1500);
console.log('sign btn state:', await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/sign/i.test(x.innerText)&&x.className.includes('w-full'));return b?{t:b.innerText.trim().slice(0,40),d:b.disabled}:'none'})()`));
console.log('sign page hints:', await ev(`(()=>{return document.body.innerText.split('\\n').filter(l=>/sign|draw|type|upload|place/i.test(l)).slice(0,8).join(' | ')})()`));

// REDACT: check button state
await load('redact', [PDF]);
await sleep(1500);
console.log('redact btn:', await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/redact|apply/i.test(x.innerText));return b?{t:b.innerText.trim().slice(0,40),d:b.disabled,c:b.className.slice(0,60)}:'none'})()`));
console.log('redact hints:', await ev(`(()=>{return document.body.innerText.split('\\n').filter(l=>/redact|select|drag|draw|region|apply/i.test(l)).slice(0,8).join(' | ')})()`));
console.log('ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
process.exit(0);
