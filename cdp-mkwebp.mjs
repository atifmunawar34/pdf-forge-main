import { connect, sleep } from './cdp-audit.mjs';
import { writeFileSync } from 'fs';
const { send, ev } = await connect();
// draw something + export webp in-browser
const b64 = await ev(`(()=>{const c=document.createElement('canvas');c.width=300;c.height=200;const x=c.getContext('2d');x.fillStyle='#e5322d';x.fillRect(0,0,300,200);x.fillStyle='#fff';x.font='30px sans-serif';x.fillText('WEBP TEST',40,100);return c.toDataURL('image/webp').split(',')[1]})()`);
writeFileSync('test_img.webp', Buffer.from(b64, 'base64'));
console.log('webp written');
process.exit(0);
