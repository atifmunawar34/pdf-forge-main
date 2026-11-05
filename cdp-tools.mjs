import { connect, sleep } from './cdp-audit.mjs';
const { send, ev, errors } = await connect();
const TOOLS = ['merge','split','remove','extract','organize','scan','reverse','insert-blank','compress','repair','ocr','flatten','grayscale','jpg-to-pdf','word-to-pdf','powerpoint-to-pdf','excel-to-pdf','html-to-pdf','png-to-pdf','webp-to-pdf','txt-to-pdf','md-to-pdf','pdf-to-jpg','pdf-to-word','pdf-to-powerpoint','pdf-to-excel','pdf-to-pdfa','pdf-to-png','pdf-to-webp','pdf-to-txt','pdf-to-html','extract-images','extract-attachments','rotate','page-numbers','watermark','crop','edit','forms','metadata','page-info','unlock','protect','sign','redact','compare','remove-metadata','summarizer','translate','to-markdown'];
const fails = [];
for (const id of TOOLS) {
  await send('Page.navigate', { url: `http://localhost:3000/ilovetopdf/${id}` });
  await sleep(900);
  const state = await ev(`(()=>{
    const hasInput = !!document.querySelector('input[type=file]');
    const hasUploadUI = document.body.innerText.match(/Select|Choose|Drop|drag/i)!==null;
    const hasEditor = document.querySelector('canvas')!==null;
    const url = location.pathname;
    return JSON.stringify({hasInput,hasUploadUI,hasEditor,url});
  })()`);
  const s = JSON.parse(state || '{}');
  const good = s.hasInput && s.hasUploadUI;
  if (!good) fails.push(`${id}: input=${s.hasInput} uploadUI=${s.hasUploadUI} url=${s.url}`);
}
console.log(`\n${TOOLS.length - fails.length}/${TOOLS.length} tool routes OK`);
if (fails.length) { console.log('FAILURES:'); fails.forEach(f => console.log('  ' + f)); }
console.log('ERRORS:', errors.length ? [...new Set(errors)].slice(0, 6) : 'none');
process.exit(0);
