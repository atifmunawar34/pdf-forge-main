// Doc-type layouts: how each template kind is rendered to the PDF page.
import { rgb } from 'pdf-lib';
import { calcTotals, money } from './templateValues.js';
import { PAGE_W, PAGE_H, MARGIN, san } from './templatePdfWriter.js';

const sec = (tpl, key) => (tpl.sections || []).find((s) => s.key === key);
const secs = (tpl, type) => (tpl.sections || []).filter((s) => s.type === type);

// Doc title — style follows theme + variant (each template combo looks different).
const titleBand = (w, title, sub) => {
  const th = w.theme || 'modern';
  const va = w.variant;
  const T = san(String(title).toUpperCase());
  const cx = (str, size, font) => w.x + (w.w - font.widthOfTextAtSize(str, size)) / 2;
  const rx = (str, size, font) => w.x + w.w - font.widthOfTextAtSize(str, size);

  if (th === 'classic') {
    if (va === 'left') {
      // left-aligned serif title + italic sub + single rule
      w.page.drawText(T, { x: w.x, y: w.y - 16, size: 16, font: w.f.bold, color: w.ink });
      if (sub) {
        const s = san(sub);
        w.page.drawText(s, { x: rx(s, 9, w.f.italic), y: w.y - 13, size: 9, font: w.f.italic, color: w.gray });
      }
      w.y -= 26;
      w.rule(w.ink, 0.9);
      w.y -= 14;
      return;
    }
    // center — centered serif, no color — like traditional print forms
    w.page.drawText(T, { x: cx(T, 16, w.f.bold), y: w.y - 16, size: 16, font: w.f.bold, color: w.ink });
    w.y -= 22;
    if (sub) {
      const s = san(sub);
      w.page.drawText(s, { x: cx(s, 9, w.f.italic), y: w.y - 9, size: 9, font: w.f.italic, color: w.gray });
      w.y -= 12;
    }
    w.rule(w.ink, 1.2);
    w.y -= 3;
    w.rule(w.ink, 0.4);
    w.y -= 14;
    return;
  }
  if (th === 'elegant') {
    if (va === 'center') {
      // large serif title between two hairlines
      w.rule(w.ink, 0.8);
      w.y -= 10;
      w.page.drawText(T, { x: cx(T, 15, w.f.bold), y: w.y - 15, size: 15, font: w.f.bold, color: w.ink });
      w.y -= 20;
      if (sub) {
        const s = san(sub);
        w.page.drawText(s, { x: cx(s, 9, w.f.italic), y: w.y - 9, size: 9, font: w.f.italic, color: w.gray });
        w.y -= 12;
      }
      w.rule(w.ink, 0.8);
      w.y -= 16;
      return;
    }
    // hairline — spaced small caps + accent hairline
    const spaced = T.split('').join(' ');
    w.page.drawText(spaced, { x: cx(spaced, 12, w.f.bold), y: w.y - 12, size: 12, font: w.f.bold, color: w.ink });
    w.y -= 18;
    w.rule(w.accent, 0.6, w.x + w.w / 2 - 80, w.x + w.w / 2 + 80);
    w.y -= 8;
    if (sub) {
      const s = san(sub);
      w.page.drawText(s, { x: cx(s, 8.5, w.f.italic), y: w.y - 8, size: 8.5, font: w.f.italic, color: w.gray });
      w.y -= 12;
    }
    w.y -= 12;
    return;
  }
  if (th === 'bold') {
    if (va === 'block') {
      // tall dark block, big title inside
      w.page.drawRectangle({ x: w.x - 8, y: w.y - 64, width: w.w + 16, height: 70, color: w.ink });
      w.page.drawRectangle({ x: w.x - 8, y: w.y - 64, width: w.w + 16, height: 5, color: w.accent });
      w.page.drawText(T, { x: w.x + 16, y: w.y - 40, size: 19, font: w.f.bold, color: rgb(1, 1, 1) });
      if (sub) {
        const s = san(sub);
        w.page.drawText(s, { x: w.x + 16, y: w.y - 56, size: 8.5, font: w.f.reg, color: rgb(0.8, 0.82, 0.86) });
      }
      w.y -= 88;
      return;
    }
    // band — near-black band + accent strip
    w.page.drawRectangle({ x: w.x - 8, y: w.y - 40, width: w.w + 16, height: 46, color: w.ink });
    w.page.drawRectangle({ x: w.x - 8, y: w.y - 40, width: w.w + 16, height: 4, color: w.accent });
    w.page.drawText(T, { x: w.x + 14, y: w.y - 30, size: 15, font: w.f.bold, color: rgb(1, 1, 1) });
    if (sub) {
      const s = san(sub);
      w.page.drawText(s, { x: rx(s, 8, w.f.reg) - 12, y: w.y - 28, size: 8, font: w.f.reg, color: rgb(0.8, 0.82, 0.86) });
    }
    w.y -= 60;
    return;
  }
  // modern
  if (va === 'rail') {
    // thick left rail + plain title, no fill
    w.page.drawRectangle({ x: w.x - 8, y: w.y - 34, width: 14, height: 38, color: w.accent });
    w.page.drawText(T, { x: w.x + 12, y: w.y - 22, size: 15, font: w.f.bold, color: w.accent });
    if (sub) {
      const s = san(sub);
      w.page.drawText(s, { x: rx(s, 8, w.f.reg), y: w.y - 20, size: 8, font: w.f.reg, color: w.gray });
    }
    w.y -= 38;
    w.rule(w.accent, 1);
    w.y -= 16;
    return;
  }
  if (va === 'boxed') {
    // title inside accent-bordered box
    w.page.drawRectangle({ x: w.x - 4, y: w.y - 34, width: w.w + 8, height: 38, borderWidth: 1.4, borderColor: w.accent });
    w.page.drawRectangle({ x: w.x - 4, y: w.y - 34, width: w.w + 8, height: 5, color: w.accent });
    w.page.drawText(T, { x: cx(T, 14, w.f.bold), y: w.y - 24, size: 14, font: w.f.bold, color: w.ink });
    w.y -= 50;
    if (sub) {
      const s = san(sub);
      w.page.drawText(s, { x: rx(s, 8, w.f.reg), y: w.y - 8, size: 8, font: w.f.reg, color: w.gray });
      w.y -= 10;
    }
    w.y -= 8;
    return;
  }
  // modern band — accent band
  w.page.drawRectangle({ x: w.x - 8, y: w.y - 36, width: w.w + 16, height: 42, color: w.accent });
  w.page.drawText(T, {
    x: w.x + 14, y: w.y - 24, size: 14, font: w.f.bold, color: rgb(1, 1, 1),
  });
  if (sub) {
    const s = san(sub);
    w.page.drawText(s, {
      x: rx(s, 8, w.f.reg) - 12, y: w.y - 22, size: 8, font: w.f.reg, color: rgb(0.88, 0.9, 0.94),
    });
  }
  w.y -= 54;
};

// ---------- INVOICE / QUOTE / ORDER (modern accent design) ----------
export function invoice(w, tpl, v, images) {
  const comp = sec(tpl, 'company');
  const compV = v.company || {};
  const acc = w.accent;
  const th = w.theme || 'modern';

  if (th === 'modern' || th === 'bold') {
    const va = w.variant;
    if (th === 'modern' && va === 'rail') {
      // tall left accent rail instead of a top band
      w.page.drawRectangle({ x: 0, y: PAGE_H - 150, width: 12, height: 150, color: acc });
      w.y = PAGE_H - 40;
    } else if (th === 'modern' && va === 'boxed') {
      // double thin strip
      w.page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: acc });
      w.page.drawRectangle({ x: 0, y: PAGE_H - 12, width: PAGE_W, height: 2.5, color: rgb(0.8, 0.82, 0.86) });
      w.y = PAGE_H - 40;
    } else {
      // full-width accent/dark band
      w.page.drawRectangle({ x: 0, y: PAGE_H - 14, width: PAGE_W, height: 14, color: th === 'bold' ? w.ink : acc });
      w.y = PAGE_H - 44;
    }
  }

  // company block (left) + logo (right)
  w.text(compV.name || 'Your Company', { size: 18, font: w.f.bold, maxW: w.w - 150 });
  for (const fd of comp?.fields || []) {
    if (['name', 'logo', 'image'].includes(fd.key)) continue;
    const val = compV[fd.key];
    if (val) w.text(val, { size: 8.5, color: w.gray, maxW: w.w - 150 });
  }
  const logo = images?.logo || images?.image;
  if (logo) {
    const img = logo.img;
    const sc = Math.min(80 / img.width, 55 / img.height);
    w.page.drawImage(img, { x: w.x + w.w - img.width * sc, y: w.y + 26, width: img.width * sc, height: img.height * sc });
  }

  // big title + meta box on the right
  w.gap(6);
  const topY = w.y;
  const titleColor = th === 'classic' || th === 'elegant' ? w.ink : acc;
  w.text(tpl.name.toUpperCase(), { size: 24, font: w.f.bold, color: titleColor, maxW: w.w - 220 });
  const meta = sec(tpl, 'meta');
  if (meta) {
    const mv = v.meta || {};
    const rows = meta.fields.filter((fd) => mv[fd.key]).map((fd) => [fd.label, String(mv[fd.key])]);
    if (rows.length) {
      const bw = 205, bh = rows.length * 15 + 14;
      const bx = w.x + w.w - bw, by = topY + 4;
      w.page.drawRectangle({ x: bx, y: by - bh, width: bw, height: bh, color: rgb(0.96, 0.97, 0.98) });
      w.page.drawRectangle({ x: bx, y: by - bh, width: 3, height: bh, color: acc });
      let my = by - 16;
      rows.forEach(([l, val]) => {
        const vs = san(val);
        w.page.drawText(san(l).toUpperCase(), { x: bx + 12, y: my, size: 6.5, font: w.f.bold, color: w.gray });
        w.page.drawText(vs, { x: bx + bw - 10 - w.f.bold.widthOfTextAtSize(vs, 9.5), y: my - 1, size: 9.5, font: w.f.bold, color: w.ink });
        my -= 15;
      });
      w.y = Math.min(w.y, by - bh - 14);
    }
  }

  const client = sec(tpl, 'client');
  if (client) { w.sectionTitle(client.title || 'Bill To'); w.fieldPairs(client, v[client.key]); }

  for (const s of tpl.sections) {
    if (s.type === 'group' && v[s.key]?.length) {
      w.sectionTitle(s.title || 'Items');
      w.table(s, v[s.key]);
    }
  }

  // totals box — accent TOTAL bar
  const totals = calcTotals(tpl, v);
  if (totals) {
    w.ensure(70);
    const bw = 200, bx = w.x + w.w - bw;
    const line = (label, val) => {
      const vs = money(val);
      w.page.drawText(label, { x: bx + 12, y: w.y - 11, size: 9.5, font: w.f.reg, color: w.gray });
      w.page.drawText(vs, { x: bx + bw - 10 - w.f.reg.widthOfTextAtSize(vs, 9.5), y: w.y - 11, size: 9.5, font: w.f.reg, color: w.ink });
      w.y -= 17;
    };
    line('Subtotal', totals.subtotal);
    if (totals.tax) line('Tax', totals.tax);
    const ty = w.y;
    w.page.drawRectangle({ x: bx, y: ty - 22, width: bw, height: 24, color: acc });
    const tv = money(totals.total);
    w.page.drawText('TOTAL', { x: bx + 12, y: ty - 15, size: 11, font: w.f.bold, color: rgb(1, 1, 1) });
    w.page.drawText(tv, { x: bx + bw - 10 - w.f.bold.widthOfTextAtSize(tv, 11), y: ty - 15, size: 11, font: w.f.bold, color: rgb(1, 1, 1) });
    w.y = ty - 34;
  }

  const extra = sec(tpl, 'extra');
  if (extra) { w.sectionTitle(extra.title || 'Notes'); w.fieldPairs(extra, v.extra); }
  const sign = sec(tpl, 'sign');
  if (sign) w.signatureBlock(sign);

  // footer
  w.ensure(40);
  w.gap(8);
  w.page.drawRectangle({ x: w.x, y: w.y, width: w.w, height: 1.2, color: acc });
  w.gap(10);
  w.text('Thank you for your business!', { size: 9, color: w.gray, align: 'center' });
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- RECEIPT (accent header band) ----------
export function receipt(w, tpl, v) {
  const acc = w.accent;
  const th = w.theme || 'modern';
  const issuer = v.company?.name || '';
  if (th === 'modern' || th === 'bold') {
    const va = w.variant;
    const bandColor = th === 'bold' ? w.ink : acc;
    if (th === 'modern' && va === 'boxed') {
      // bordered title box instead of a filled band
      w.page.drawRectangle({ x: w.x - 8, y: PAGE_H - 108, width: w.w + 16, height: 64, borderWidth: 1.6, borderColor: acc });
      w.page.drawRectangle({ x: w.x - 8, y: PAGE_H - 108, width: w.w + 16, height: 5, color: acc });
      const t1 = san(tpl.name.toUpperCase());
      w.page.drawText(t1, {
        x: w.x + (w.w - w.f.bold.widthOfTextAtSize(t1, 20)) / 2, y: PAGE_H - 78,
        size: 20, font: w.f.bold, color: acc,
      });
      if (issuer) {
        const t2 = san(issuer);
        w.page.drawText(t2, {
          x: w.x + (w.w - w.f.reg.widthOfTextAtSize(t2, 10)) / 2, y: PAGE_H - 96,
          size: 10, font: w.f.reg, color: w.gray,
        });
      }
      w.y = PAGE_H - 130;
    } else {
      // colored header band with title + company
      w.page.drawRectangle({ x: w.x - 8, y: PAGE_H - 108, width: w.w + 16, height: 64, color: bandColor });
    const t1 = san(tpl.name.toUpperCase());
    w.page.drawText(t1, {
      x: w.x + (w.w - w.f.bold.widthOfTextAtSize(t1, 20)) / 2, y: PAGE_H - 78,
      size: 20, font: w.f.bold, color: rgb(1, 1, 1),
    });
    if (issuer) {
      const t2 = san(issuer);
      w.page.drawText(t2, {
        x: w.x + (w.w - w.f.reg.widthOfTextAtSize(t2, 10)) / 2, y: PAGE_H - 96,
        size: 10, font: w.f.reg, color: rgb(1, 1, 1),
      });
    }
    w.y = PAGE_H - 130;
    }
  } else {
    // classic/elegant — serif title, company under, double rules
    titleBand(w, tpl.name, issuer || tpl.categoryName);
  }

  for (const s of tpl.sections) {
    if (s.key === 'company') continue; // already in the header band
    if (s.type === 'fields') { w.sectionTitle(s.title, { gapBefore: 4 }); w.fieldPairs(s, v[s.key]); }
    else if (s.type === 'group' && v[s.key]?.length) { w.sectionTitle(s.title); w.table(s, v[s.key]); }
    else if (s.type === 'signature') w.signatureBlock(s);
  }
  const t = calcTotals(tpl, v);
  if (t) {
    w.ensure(36);
    const bx = w.x + w.w - 220;
    w.page.drawRectangle({ x: bx, y: w.y - 24, width: 220, height: 26, color: rgb(0.96, 0.97, 0.98) });
    w.page.drawRectangle({ x: bx, y: w.y - 24, width: 3, height: 26, color: acc });
    w.page.drawText('TOTAL RECEIVED', { x: bx + 12, y: w.y - 16, size: 9, font: w.f.bold, color: w.ink });
    const tv = money(t.subtotal);
    w.page.drawText(tv, { x: bx + 220 - 12 - w.f.bold.widthOfTextAtSize(tv, 11), y: w.y - 16, size: 11, font: w.f.bold, color: acc });
    w.y -= 36;
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- LETTER (letterhead) ----------
export function letter(w, tpl, v) {
  const snd = sec(tpl, 'sender');
  if (snd) {
    const sv = v.sender || {};
    // letterhead: accent name + contact line + rule
    w.text(sv.name || '', { size: 16, font: w.f.bold, color: w.accent });
    const contact = snd.fields.filter((fd) => fd.key !== 'name' && sv[fd.key]).map((fd) => sv[fd.key]);
    if (contact.length) w.text(contact.join('   |   '), { size: 8.5, color: w.gray });
    w.gap(6); w.rule(w.accent, 1.6); w.gap(16);
  }
  const doc = sec(tpl, 'doc');
  if (doc) {
    const dv = v.doc || {};
    for (const fd of doc.fields) {
      if (!dv[fd.key]) continue;
      const isSubj = fd.key === 'ref';
      if (fd.type === 'date') {
        w.text(`${fd.label}:  ${dv[fd.key]}`, { size: 10, font: w.f.reg, align: 'right', color: w.gray });
      } else {
        w.text(`${fd.label}:  ${dv[fd.key]}`, { size: 10, font: isSubj ? w.f.bold : w.f.reg });
      }
    }
    w.gap(12);
  }
  const rec = sec(tpl, 'recipient');
  if (rec) {
    const rv = v.recipient || {};
    for (const fd of rec.fields) {
      if (rv[fd.key]) w.text(rv[fd.key], { size: 10, font: fd.key === 'name' ? w.f.bold : w.f.reg });
    }
    w.gap(14);
  }
  const body = sec(tpl, 'body');
  if (body) {
    const bv = v.body || {};
    if (bv.greeting) { w.text(bv.greeting, { size: 10.5 }); w.gap(8); }
    if (bv.body) w.para(bv.body, { size: 10.5, lineH: 16 });
    w.gap(16);
    if (bv.closing) { w.text(bv.closing, { size: 10.5 }); w.gap(18); }
    if (bv.signName) w.text(bv.signName, { size: 10.5, font: w.f.bold });
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- FORM (accent title band) ----------
export function form(w, tpl, v) {
  titleBand(w, tpl.name, tpl.categoryName);
  for (const s of tpl.sections) {
    if (s.type === 'fields') { w.sectionTitle(s.title); w.fieldPairs(s, v[s.key]); }
    else if (s.type === 'group' && v[s.key]?.length) { w.sectionTitle(s.title); w.table(s, v[s.key]); }
    else if (s.type === 'signature') { w.gap(10); w.signatureBlock(s); }
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- CV / RESUME ----------
export function cv(w, tpl, v) {
  const prof = sec(tpl, 'profile');
  if (prof) {
    const pv = v.profile || {};
    w.text(pv.name || 'Your Name', { size: 22, font: w.f.bold });
    if (pv.title) w.text(pv.title, { size: 12, color: w.accent });
    const contact = [pv.email, pv.phone, pv.location, pv.website].filter(Boolean).join('   ·   ');
    if (contact) w.text(contact, { size: 8.5, color: w.gray });
    w.gap(6); w.rule(w.accent, 1.2); w.gap(8);
  }
  const sum = sec(tpl, 'summary');
  if (sum && v.summary?.summary) {
    w.sectionTitle('Professional Summary', { gapBefore: 0 });
    w.para(v.summary.summary, { size: 10, lineH: 14 });
  }
  for (const s of tpl.sections) {
    if (s.type !== 'group') continue;
    const rows = (v[s.key] || []).filter((r) => Object.values(r).some((x) => x !== '' && x != null));
    if (!rows.length) continue;
    w.sectionTitle(s.title);
    for (const r of rows) {
      w.ensure(40);
      const head = [r.position || r.degree || r.title, r.company || r.school].filter(Boolean).join(' — ');
      const dates = [r.start, r.end].filter(Boolean).join(' – ');
      if (dates) {
        w.text(dates, { size: 8.5, color: w.gray, align: 'right', x: w.x + w.w - 160, maxW: 160 });
        w.y += 12; // draw heading on same band
      }
      if (head) w.text(head, { size: 11, font: w.f.bold, maxW: w.w - 170 });
      if (r.desc) w.para(r.desc, { size: 9.5, color: w.ink, lineH: 13 });
      w.gap(6);
    }
  }
  for (const k of ['skills', 'extra']) {
    const s = sec(tpl, k);
    if (!s) continue;
    const sv = v[k] || {};
    const has = s.fields.some((fd) => sv[fd.key]);
    if (!has) continue;
    w.sectionTitle(s.title);
    for (const fd of s.fields) {
      if (sv[fd.key]) w.para(sv[fd.key], { size: 10, lineH: 14 });
    }
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- AGREEMENT (boxed parties + accent clauses) ----------
export function agreement(w, tpl, v) {
  const acc = w.accent;

  // centered title between accent rules
  w.text(tpl.name.toUpperCase(), { size: 17, font: w.f.bold, align: 'center' });
  w.gap(2);
  const rl = w.x + w.w / 2 - 60;
  w.page.drawRectangle({ x: rl, y: w.y, width: 120, height: 2, color: acc });
  w.gap(14);

  const meta = sec(tpl, 'meta');
  const dv = v.meta || {};
  w.text(`This ${tpl.name} ("Agreement") is entered into on ${dv.date || '________'} by and between:`, { size: 10 });
  w.gap(8);

  // two boxed party cards side by side
  const pa = sec(tpl, 'partyA'), pb = sec(tpl, 'partyB');
  const parties = [[pa, 'partyA'], [pb, 'partyB']].filter(([s]) => s);
  if (parties.length) {
    const bw = (w.w - 16) / 2;
    const boxTops = w.y;
    let maxH = 0;
    const drawn = parties.map(([s, k], i) => {
      const pv = v[k] || {};
      const lines = s.fields.map((fd) => pv[fd.key]).filter(Boolean);
      const bx = w.x + i * (bw + 16);
      const linesWrapped = [];
      const parts = lines.join(',  ') || '____________________';
      for (const ln of w.wrap(parts, 9, w.f.reg, bw - 20)) linesWrapped.push(ln);
      const h = 26 + linesWrapped.length * 12 + 8;
      maxH = Math.max(maxH, h);
      return { s, bx, title: s.title, linesWrapped, h };
    });
    for (const d of drawn) {
      w.page.drawRectangle({ x: d.bx, y: boxTops - d.h, width: bw, height: d.h, color: rgb(0.97, 0.97, 0.98) });
      w.page.drawRectangle({ x: d.bx, y: boxTops - d.h, width: bw, height: 3, color: acc });
      w.page.drawText(san(d.title.toUpperCase()), { x: d.bx + 10, y: boxTops - 18, size: 7.5, font: w.f.bold, color: acc });
      let ly = boxTops - 32;
      for (const ln of d.linesWrapped) {
        w.page.drawText(ln, { x: d.bx + 10, y: ly, size: 9, font: w.f.reg, color: w.ink });
        ly -= 12;
      }
    }
    w.y = boxTops - maxH - 12;
  }

  if (meta) {
    const other = meta.fields.filter((fd) => fd.key !== 'date' && dv[fd.key]);
    if (other.length) { w.gap(4); w.fieldPairs(meta, v.meta); }
  }

  // clauses — accent number + bold title + indented text
  const cl = sec(tpl, 'clauses');
  if (cl && v.clauses?.length) {
    w.sectionTitle('Terms');
    v.clauses.forEach((r, i) => {
      w.ensure(32);
      if (r.title) {
        const num = `${i + 1}.`;
        w.page.drawText(num, { x: w.x, y: w.y - 10, size: 10, font: w.f.bold, color: acc });
        w.text(r.title, { size: 10, font: w.f.bold, x: w.x + 20, maxW: w.w - 20 });
      }
      if (r.text) w.para(r.text, { size: 9.5, x: w.x + 20, maxW: w.w - 20, lineH: 13 });
      w.gap(5);
    });
  }

  w.gap(4);
  w.text('IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.', { size: 9.5, color: w.gray });
  const sign = sec(tpl, 'sign');
  if (sign) w.signatureBlock(sign);
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- CHECKLIST (accent band + checkboxes) ----------
export function checklist(w, tpl, v) {
  titleBand(w, tpl.name, tpl.categoryName);
  for (const s of tpl.sections) {
    if (s.type === 'fields') { w.sectionTitle(s.title); w.fieldPairs(s, v[s.key]); }
    else if (s.type === 'group') {
      w.sectionTitle(s.title);
      for (const r of v[s.key] || []) {
        w.ensure(20);
        w.page.drawRectangle({ x: w.x, y: w.y - 10, width: 9, height: 9, borderWidth: 1, borderColor: w.accent, color: rgb(1, 1, 1) });
        const label = r.item || r.task || Object.values(r).find((x) => typeof x === 'string' && x) || '';
        const rest = Object.entries(r).filter(([k, val]) => val && k !== 'item' && k !== 'task').map(([, val]) => val).join('   ');
        w.text(`${label}${rest ? `   —  ${rest}` : ''}`, { size: 10, x: w.x + 16, maxW: w.w - 16 });
      }
    }
    else if (s.type === 'signature') w.signatureBlock(s);
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- PLANNER (accent title band) ----------
export function planner(w, tpl, v) {
  titleBand(w, tpl.name, tpl.categoryName);
  for (const s of tpl.sections) {
    if (s.type === 'fields') { w.sectionTitle(s.title); w.fieldPairs(s, v[s.key]); }
    else if (s.type === 'group') { w.sectionTitle(s.title); w.table(s, v[s.key] || []); }
    else if (s.type === 'signature') w.signatureBlock(s);
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- REPORT (cover-style header) ----------
export function report(w, tpl, v) {
  const meta = sec(tpl, 'meta');
  const mv = v.meta || {};
  const acc = w.accent;

  // header card: accent label + big title + meta line + thick rule
  w.page.drawRectangle({ x: w.x, y: w.y - 8, width: 4, height: 46, color: acc });
  const tx = w.x + 16;
  w.text(tpl.name.toUpperCase(), { size: 8.5, font: w.f.bold, color: acc, x: tx, maxW: w.w - 16 });
  w.text(mv.title || tpl.name, { size: 19, font: w.f.bold, x: tx, maxW: w.w - 16 });
  const sub = [mv.author, mv.client, mv.period, mv.date].filter(Boolean).join('   ·   ');
  if (sub) w.text(sub, { size: 9, color: w.gray, x: tx, maxW: w.w - 16 });
  const others = (meta?.fields || []).filter((fd) => !['title', 'author', 'client', 'period', 'date'].includes(fd.key) && mv[fd.key]);
  for (const fd of others) w.text(`${fd.label}:  ${mv[fd.key]}`, { size: 9, color: w.gray });
  w.y = Math.min(w.y, w.y - 2);
  w.gap(8); w.rule(acc, 1.6); w.gap(10);

  const grp = secs(tpl, 'group')[0];
  if (grp) {
    (v[grp.key] || []).forEach((r, i) => {
      if (!r.heading && !r.content) return;
      w.ensure(40);
      w.text(`${i + 1}.  ${r.heading || 'Section'}`, { size: 12, font: w.f.bold, color: w.accent });
      if (r.content) w.para(r.content, { size: 10, lineH: 15 });
      w.gap(8);
    });
  }
  for (const s of tpl.sections) {
    if (s.type === 'fields' && s.key !== 'meta') { w.sectionTitle(s.title); w.fieldPairs(s, v[s.key]); }
    else if (s.type === 'signature') w.signatureBlock(s);
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- TABLE / SHEET (accent title band) ----------
export function tableDoc(w, tpl, v) {
  const mv = v.meta || {};
  titleBand(w, mv.title || tpl.name, [mv.author, mv.date].filter(Boolean).join('   ·   '));
  for (const s of tpl.sections) {
    if (s.type === 'group') w.table(s, v[s.key] || []);
    else if (s.type === 'fields' && s.key !== 'meta') { w.sectionTitle(s.title); w.fieldPairs(s, v[s.key]); }
    else if (s.type === 'signature') w.signatureBlock(s);
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- CV SIDEBAR (two-column, Canva-style dark rail) ----------
export function cvSidebar(w, tpl, v, images) {
  const SIDE = 190;
  const sideColor = w.accent;
  const drawSide = (page) => {
    page.drawRectangle({ x: 0, y: 0, width: SIDE, height: PAGE_H, color: sideColor });
  };
  w.onPage = drawSide;
  drawSide(w.page);
  w.col = { x: SIDE + 28, w: PAGE_W - SIDE - 28 - 40 };

  const white = rgb(0.96, 0.97, 0.98);
  const dim = rgb(0.78, 0.82, 0.88);
  const sx = 22, sw = SIDE - 38;
  let sy = PAGE_H - 44;
  const st = (str, { size = 8.5, font = w.f.reg, color = dim, maxW = sw, x = sx } = {}) => {
    if (sy < 60) return;
    for (const ln of w.wrap(str, size, font, maxW)) {
      if (sy < 50) return;
      w.page.drawText(ln, { x, y: sy - size, size, font, color });
      sy -= size * 1.5;
    }
  };
  const stitle = (str) => {
    sy -= 16;
    if (sy < 90) return;
    st(str.toUpperCase(), { size: 9.5, font: w.f.bold, color: white });
    w.page.drawLine({ start: { x: sx, y: sy + 4 }, end: { x: sx + 34, y: sy + 4 }, thickness: 1.2, color: white });
    sy -= 10;
  };
  const list = (str) =>
    String(str || '').split(/[,\n;•]+/).map((s) => s.trim()).filter(Boolean);

  const pv = v.profile || {};
  // photo or initials circle
  const photo = images?.photo?.img;
  if (photo) {
    const sc = Math.min(96 / photo.width, 96 / photo.height);
    w.page.drawImage(photo, { x: sx + (sw - photo.width * sc) / 2, y: sy - 96, width: photo.width * sc, height: photo.height * sc });
    sy -= 112;
  } else {
    const cx = sx + sw / 2, cy = sy - 44;
    w.page.drawCircle({ x: cx, y: cy, size: 42, color: rgb(1, 1, 1) });
    const initials = (pv.name || 'YN').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
    const iw = w.f.bold.widthOfTextAtSize(initials, 26);
    w.page.drawText(initials, { x: cx - iw / 2, y: cy - 9, size: 26, font: w.f.bold, color: sideColor });
    sy -= 100;
  }

  // sidebar blocks
  const contact = [pv.phone, pv.email, pv.location, pv.website].filter(Boolean);
  if (contact.length) {
    stitle('Contact');
    for (const c of contact) st(c);
  }
  if (v.skills?.skills) {
    stitle('Skills');
    for (const s of list(v.skills.skills)) st(`•  ${s}`);
  }
  if (v.extra?.languages) {
    stitle('Languages');
    for (const s of list(v.extra.languages)) st(`•  ${s}`);
  }
  if (v.extra?.certs) {
    stitle('Certifications');
    for (const s of list(v.extra.certs)) st(`•  ${s}`);
  }
  const rf = v.reference || {};
  if (rf.refName || rf.refTitle || rf.refPhone || rf.refEmail) {
    stitle('Reference');
    if (rf.refName) st(rf.refName, { font: w.f.bold, color: white });
    if (rf.refTitle) st(rf.refTitle);
    if (rf.refPhone) st(`Phone: ${rf.refPhone}`);
    if (rf.refEmail) st(`Email: ${rf.refEmail}`);
  }

  // main column
  w.gap(4);
  w.text(pv.name || 'Your Name', { size: 25, font: w.f.bold });
  if (pv.title) { w.text(pv.title, { size: 12.5, color: w.accent }); w.gap(2); }
  if (v.summary?.summary) {
    w.sectionTitle('Profile', { gapBefore: 4 });
    w.para(v.summary.summary, { size: 9.5, lineH: 13 });
  }
  const expRows = (v.experience || []).filter((r) => Object.values(r).some((x) => x !== '' && x != null));
  if (expRows.length) {
    w.sectionTitle('Work Experience');
    for (const r of expRows) {
      w.ensure(46);
      const dates = [r.start, r.end].filter(Boolean).join('  -  ');
      if (dates) {
        w.page.drawText(dates, { x: w.x, y: w.y - 9, size: 8.5, font: w.f.bold, color: w.accent });
        w.y -= 14;
      }
      const head = [r.position, r.company].filter(Boolean).join('  |  ');
      if (head) w.text(head, { size: 11, font: w.f.bold });
      if (r.desc) w.para(r.desc, { size: 9, color: w.ink, lineH: 12.5 });
      w.gap(7);
    }
  }
  const eduRows = (v.education || []).filter((r) => Object.values(r).some((x) => x !== '' && x != null));
  if (eduRows.length) {
    w.sectionTitle('Education');
    for (const r of eduRows) {
      w.ensure(34);
      const dates = [r.start, r.end].filter(Boolean).join('  -  ');
      if (dates) {
        w.page.drawText(dates, { x: w.x, y: w.y - 9, size: 8.5, font: w.f.bold, color: w.accent });
        w.y -= 14;
      }
      const head = [r.degree, r.school].filter(Boolean).join('  |  ');
      if (head) w.text(head, { size: 11, font: w.f.bold });
      w.gap(5);
    }
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

// ---------- CV TOP-BAND (accent bar + photo header + colored sidebar) ----------
export function cvTopband(w, tpl, v, images) {
  const pv = v.profile || {};
  const acc = w.accent;
  const white = rgb(0.96, 0.97, 0.98);
  const dim = rgb(0.82, 0.86, 0.92);

  // top accent bar + header
  w.page.drawRectangle({ x: 0, y: PAGE_H - 10, width: PAGE_W, height: 10, color: acc });
  const HEADER_H = 118;
  const sideTop = PAGE_H - 10 - HEADER_H;
  const SIDE = 168;

  // photo box (left of header)
  const photo = images?.photo?.img;
  if (photo) {
    const bw = 86, bh = 100;
    const bx = w.x + 6, by = sideTop + (HEADER_H - bh) / 2 - 4;
    const sc = Math.min(bw / photo.width, bh / photo.height);
    const iw = photo.width * sc, ih = photo.height * sc;
    w.page.drawImage(photo, { x: bx + (bw - iw) / 2, y: by + (bh - ih) / 2, width: iw, height: ih });
  }
  // name + title (right of photo)
  const nx = w.x + (photo ? 108 : 6);
  let ny = sideTop + HEADER_H - 42;
  for (const ln of w.wrap(pv.name || 'Your Name', 22, w.f.bold, w.x + w.w - nx)) {
    w.page.drawText(ln, { x: nx, y: ny, size: 22, font: w.f.bold, color: w.ink });
    ny -= 26;
  }
  ny += 2;
  for (const ln of w.wrap(pv.title || '', 12, w.f.reg, w.x + w.w - nx)) {
    w.page.drawText(ln, { x: nx, y: ny, size: 12, font: w.f.reg, color: acc });
    ny -= 16;
  }

  // sidebar (drawn below the header on page 1, full height on later pages)
  const drawSide = (page, top) => {
    page.drawRectangle({ x: MARGIN - 8, y: 34, width: SIDE, height: top - 34, color: acc });
  };
  w.onPage = (page) => drawSide(page, PAGE_H - MARGIN);
  drawSide(w.page, sideTop);
  w.col = { x: MARGIN - 8 + SIDE + 24, w: PAGE_W - (MARGIN - 8 + SIDE + 24) - 42 };

  // sidebar painter
  const sx = MARGIN + 4, sw = SIDE - 26;
  let sy = sideTop - 18;
  const st = (str, { size = 8, font = w.f.reg, color = dim, maxW = sw, x = sx } = {}) => {
    if (sy < 60) return;
    for (const ln of w.wrap(str, size, font, maxW)) {
      if (sy < 50) return;
      w.page.drawText(ln, { x, y: sy - size, size, font, color });
      sy -= size * 1.5;
    }
  };
  const stitle = (str) => {
    sy -= 15;
    if (sy < 90) return;
    st(str.toUpperCase(), { size: 9.5, font: w.f.bold, color: white });
    w.page.drawLine({ start: { x: sx, y: sy + 3 }, end: { x: sx + sw, y: sy + 3 }, thickness: 0.7, color: white });
    sy -= 9;
  };
  const list = (str) => String(str || '').split(/[,\n;•]+/).map((s) => s.trim()).filter(Boolean);

  const contact = [pv.phone, pv.email, pv.location, pv.website].filter(Boolean);
  if (contact.length) {
    stitle('Contact');
    for (const c of contact) st(c);
  }
  const eduRows = (v.education || []).filter((r) => Object.values(r).some((x) => x !== '' && x != null));
  if (eduRows.length) {
    stitle('Education');
    for (const r of eduRows) {
      const dates = [r.start, r.end].filter(Boolean).join(' - ');
      if (dates) st(dates, { font: w.f.bold, color: white });
      if (r.school) st(r.school, { font: w.f.bold, color: white });
      if (r.degree) st(`• ${r.degree}`);
      if (r.gpa) st(`• ${r.gpa}`);
      sy -= 6;
    }
  }
  if (v.skills?.skills) {
    stitle('Skills');
    for (const s of list(v.skills.skills)) st(`• ${s}`);
  }
  if (v.extra?.languages) {
    stitle('Languages');
    for (const s of list(v.extra.languages)) st(`• ${s}`);
  }

  // main column
  w.y = sideTop - 20;
  if (v.summary?.summary) {
    w.sectionTitle('Profile', { gapBefore: 0 });
    w.para(v.summary.summary, { size: 9.5, lineH: 13 });
  }
  const expRows = (v.experience || []).filter((r) => Object.values(r).some((x) => x !== '' && x != null));
  if (expRows.length) {
    w.sectionTitle('Work Experience');
    for (const r of expRows) {
      w.ensure(50);
      const dates = [r.start, r.end].filter(Boolean).join(' - ');
      // left bullet marker
      w.page.drawRectangle({ x: w.x, y: w.y - 8, width: 4, height: 4, color: acc });
      if (dates) {
        const dw = w.f.bold.widthOfTextAtSize(dates, 8.5);
        w.page.drawText(dates, { x: w.x + w.w - dw, y: w.y - 8.5, size: 8.5, font: w.f.bold, color: acc });
      }
      if (r.company) w.text(r.company, { size: 10.5, font: w.f.bold, x: w.x + 12, maxW: w.w - 12 - 110 });
      if (r.position) w.text(r.position, { size: 9, font: w.f.italic, color: w.gray, x: w.x + 12, maxW: w.w - 12 });
      if (r.desc) {
        for (const line of list(r.desc)) {
          w.para(`• ${line}`, { size: 8.5, x: w.x + 22, maxW: w.w - 22, lineH: 12 });
        }
      }
      w.gap(8);
    }
  }
  const refRows = (v.reference || []).filter((r) => r.refName || r.refTitle || r.refPhone || r.refEmail);
  if (refRows.length) {
    w.sectionTitle('Reference');
    w.gap(2);
    const colW = (w.w - 20) / 2;
    refRows.forEach((r, i) => {
      const rx = w.x + (i % 2) * (colW + 20);
      if (i % 2 === 0) w.ensure(48);
      let ry = w.y;
      const put = (str, size, font, color) => {
        for (const ln of w.wrap(str, size, font, colW)) {
          w.page.drawText(ln, { x: rx, y: ry, size, font, color });
          ry -= size * 1.4;
        }
      };
      if (r.refName) put(r.refName, 10, w.f.bold, w.ink);
      if (r.refTitle) put(r.refTitle, 8.5, w.f.reg, w.ink);
      if (r.refPhone) put(`Phone:  ${r.refPhone}`, 7.5, w.f.reg, w.gray);
      if (r.refEmail) put(`Email:  ${r.refEmail}`, 7.5, w.f.reg, w.gray);
      if (i % 2 === 1 || i === refRows.length - 1) w.y = Math.min(w.y, ry - 8);
    });
  }
  if (tpl.disclaimer) w.disclaimer(tpl.disclaimer);
}

export const LAYOUTS = {
  invoice, receipt, letter, form, cv, cvSidebar, cvTopband, agreement, checklist, planner, report,
  table: tableDoc,
};
