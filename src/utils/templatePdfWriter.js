// Low-level PDF drawing primitives shared by all template layouts.
import { rgb } from 'pdf-lib';
import { money } from './templateValues.js';

// Replace characters WinAnsi (pdf-lib standard fonts) cannot encode.
const sanitizeForWinAnsi = (s) =>
  // WinAnsi-encodable specials (• – — quotes … €) pass through; others map to ASCII
  // eslint-disable-next-line no-control-regex
  s.replace(/[^\x00-\xFF\u2022\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u20AC]/g, (ch) => {
    const map = {
      '│': '|', '─': '-', '═': '=', '║': '|', '━': '-',
      '┌': '+', '┐': '+', '└': '+', '┘': '+', '├': '+', '┤': '+',
      '┬': '+', '┴': '+', '┼': '+', '╔': '+', '╗': '+', '╚': '+',
      '╝': '+', '╠': '+', '╣': '+', '╦': '+', '╩': '+', '╬': '+',
      '→': '->', '←': '<-', '↑': '^', '↓': 'v', '⇒': '=>',
      '✓': '[x]', '✔': '[x]', '✗': '[x]', '✘': '[x]', '⚠': '[!]',
      '×': 'x', '★': '*', '☆': '*', '·': '-', '–': '-', '—': '-',
      '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...',
    };
    return map[ch] ?? '?';
  });

export const MARGIN = 50;
export const PAGE_W = 595.28; // A4
export const PAGE_H = 841.89;

export const san = (s) => sanitizeForWinAnsi(String(s ?? ''));
const toNum = (x) => { const n = parseFloat(x); return Number.isFinite(n) ? n : 0; };

// Named accent themes — a template's `accent` field picks one.
export const ACCENTS = {
  rose: rgb(0.85, 0.22, 0.32),
  navy: rgb(0.1, 0.17, 0.33),
  teal: rgb(0.04, 0.5, 0.5),
  gold: rgb(0.7, 0.53, 0.2),
  emerald: rgb(0.05, 0.52, 0.34),
  slate: rgb(0.17, 0.24, 0.32),
  charcoal: rgb(0.12, 0.14, 0.18),
  blue: rgb(0.14, 0.33, 0.72),
  violet: rgb(0.49, 0.23, 0.93),
  indigo: rgb(0.26, 0.22, 0.79),
  crimson: rgb(0.75, 0.07, 0.24),
  orange: rgb(0.92, 0.35, 0.05),
  sky: rgb(0.01, 0.52, 0.78),
  plum: rgb(0.53, 0.1, 0.56),
  olive: rgb(0.3, 0.42, 0.1),
};

export class W {
  constructor(pdfDoc, fonts) {
    this.pdfDoc = pdfDoc;
    this.f = fonts; // {reg, bold, italic}
    this.accent = rgb(0.85, 0.22, 0.32);
    this.ink = rgb(0.12, 0.16, 0.22);
    this.gray = rgb(0.45, 0.5, 0.58);
    this.light = rgb(0.85, 0.87, 0.9);
    this.page = null;
    this.y = 0;
    this.col = null;    // {x, w} — active text column (sidebar layouts)
    this.onPage = null; // callback(page) after each new page (sidebar redraw)
    this.newPage();
  }

  newPage() {
    this.page = this.pdfDoc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
    if (this.onPage) this.onPage(this.page);
  }

  get w() { return this.col ? this.col.w : PAGE_W - MARGIN * 2; }
  get x() { return this.col ? this.col.x : MARGIN; }

  ensure(h) { if (this.y - h < MARGIN + 20) this.newPage(); }
  gap(h = 10) { this.y -= h; }

  wrap(str, size, font, maxW) {
    const words = san(str).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const test = cur ? `${cur} ${wd}` : wd;
      if (font.widthOfTextAtSize(test, size) <= maxW) cur = test;
      else { if (cur) lines.push(cur); cur = wd; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  text(str, { size = 10, font = this.f.reg, color = this.ink, x = this.x, maxW = this.w, lineH, align = 'left' } = {}) {
    const lh = lineH || size * 1.45;
    for (const ln of this.wrap(str, size, font, maxW)) {
      this.ensure(lh);
      let dx = x;
      const tw = font.widthOfTextAtSize(ln, size);
      if (align === 'right') dx = x + maxW - tw;
      else if (align === 'center') dx = x + (maxW - tw) / 2;
      this.page.drawText(ln, { x: dx, y: this.y - size, size, font, color });
      this.y -= lh;
    }
  }

  // Paragraph honoring manual line breaks
  para(str, opts = {}) {
    for (const part of san(str).split('\n')) this.text(part, opts);
  }

  rule(color = this.light, thickness = 0.7, x0 = this.x, x1 = this.x + this.w) {
    this.page.drawLine({ start: { x: x0, y: this.y }, end: { x: x1, y: this.y }, thickness, color });
  }

  sectionTitle(str, { gapBefore = 6 } = {}) {
    this.gap(gapBefore);
    this.ensure(24);
    const th = this.theme || 'modern';
    if (th === 'classic') {
      // centered serif + double rules
      const t = san(str.toUpperCase());
      const tw = this.f.bold.widthOfTextAtSize(t, 10.5);
      this.page.drawText(t, { x: this.x + (this.w - tw) / 2, y: this.y - 10, size: 10.5, font: this.f.bold, color: this.ink });
      this.y -= 14;
      this.rule(this.ink, 1);
      this.rule(this.ink, 0.4, this.x, this.x + this.w);
      this.y -= 2;
      this.gap(8);
    } else if (th === 'elegant') {
      // left-bar + letter-spaced small caps
      this.page.drawRectangle({ x: this.x, y: this.y - 11, width: 3, height: 12, color: this.accent });
      this.page.drawText(san(str).toUpperCase().split('').join(' '), { x: this.x + 10, y: this.y - 9, size: 9, font: this.f.bold, color: this.ink });
      this.y -= 16;
      this.gap(6);
    } else if (th === 'bold') {
      // dark chip
      const t = san(str.toUpperCase());
      const tw = this.f.bold.widthOfTextAtSize(t, 9.5) + 20;
      this.page.drawRectangle({ x: this.x, y: this.y - 14, width: tw, height: 17, color: this.ink });
      this.page.drawText(t, { x: this.x + 10, y: this.y - 9, size: 9.5, font: this.f.bold, color: rgb(1, 1, 1) });
      this.y -= 22;
      this.gap(4);
    } else {
      this.text(str.toUpperCase(), { size: 10, font: this.f.bold, color: this.accent });
      this.rule(this.accent, 0.8);
      this.gap(6);
    }
  }

  // Render a 'fields' section as label:value grid (span:2 = full width)
  fieldPairs(sec, vals) {
    const colW = (this.w - 14) / 2;
    let col = 0;
    for (const fd of sec.fields) {
      if (fd.type === 'image') continue;
      const v = vals?.[fd.key];
      const empty = v === '' || v == null || v === false;
      const x = col === 0 ? this.x : this.x + colW + 14;
      const maxW = colW;
      this.ensure(30);
      const valStr = fd.type === 'checkbox' ? (v ? 'Yes' : 'No')
        : fd.type === 'currency' ? (empty ? '—' : money(v))
        : empty ? '—' : String(v);
      this.page.drawText(san(fd.label).toUpperCase(), { x, y: this.y - 7, size: 6.5, font: this.f.bold, color: this.gray });
      let yy = this.y - 7;
      const lines = this.wrap(valStr, 10, this.f.reg, maxW);
      for (const ln of lines.slice(0, 8)) {
        yy -= 13;
        this.page.drawText(ln, { x, y: yy, size: 10, font: this.f.reg, color: this.ink });
      }
      if (fd.span === 2 || col === 1) {
        this.y = Math.min(this.y, yy) - 10;
        col = 0;
      } else {
        col = 1;
      }
    }
    if (col === 1) this.y -= 23; // finish half row
    this.gap(4);
  }

  // Table for a 'group' section. cols = field defs; adds computed 'amount' for money tables.
  table(sec, rows) {
    const hasQtyPrice = sec.fields.some((fd) => fd.key === 'qty') && sec.fields.some((fd) => fd.key === 'price');
    const cols = [...sec.fields];
    if (hasQtyPrice) cols.push({ key: '_amt', label: 'Amount', type: 'currency' });
    const weights = cols.map((c) => c.span === 2 ? 2 : 1);
    const totalW = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (w / totalW) * this.w);
    const xs = [this.x];
    for (const wd of widths) xs.push(xs[xs.length - 1] + wd);

    // header — style follows theme
    this.ensure(40);
    const th = this.theme || 'modern';
    const hdrY = this.y;
    const hdrFill = th === 'modern' ? this.accent : th === 'bold' ? this.ink : th === 'classic' ? rgb(0.93, 0.93, 0.95) : null;
    if (hdrFill) this.page.drawRectangle({ x: this.x, y: hdrY - 15, width: this.w, height: 17, color: hdrFill });
    const hdrColor = th === 'classic' || th === 'elegant' ? this.ink : rgb(1, 1, 1);
    cols.forEach((c, i) => {
      this.page.drawText(san(c.label).toUpperCase(), { x: xs[i] + 4, y: hdrY - 11, size: 7, font: this.f.bold, color: hdrColor });
    });
    if (th === 'elegant') {
      this.page.drawLine({ start: { x: this.x, y: hdrY - 15 }, end: { x: this.x + this.w, y: hdrY - 15 }, thickness: 1, color: this.ink });
      this.page.drawLine({ start: { x: this.x, y: hdrY - 17 }, end: { x: this.x + this.w, y: hdrY - 17 }, thickness: 0.4, color: this.ink });
    }
    this.y = hdrY - (th === 'elegant' ? 19 : 17);

    let rowIdx = 0;
    for (const r of rows) {
      // measure row height
      let rowH = 16;
      const cellLines = cols.map((c, i) => {
        let v = c.key === '_amt' ? money(toNum(r.qty || 1) * toNum(r.price ?? r.amount))
          : c.type === 'checkbox' ? (r[c.key] ? '[x]' : '[  ]')
          : c.type === 'currency' ? money(r[c.key])
          : san(r[c.key] ?? '');
        const ls = this.wrap(v, 9, this.f.reg, widths[i] - 8);
        rowH = Math.max(rowH, ls.length * 11 + 8);
        return ls;
      });
      this.ensure(rowH + 4);
      const top = this.y;
      if (rowIdx % 2 === 1) {
        this.page.drawRectangle({ x: this.x, y: top - rowH, width: this.w, height: rowH, color: rgb(0.97, 0.97, 0.98) });
      }
      cellLines.forEach((ls, i) => {
        ls.forEach((ln, li) => {
          this.page.drawText(ln, { x: xs[i] + 4, y: top - 12 - li * 11, size: 9, font: this.f.reg, color: this.ink });
        });
      });
      this.y = top - rowH;
      this.rule(this.light, 0.5);
      rowIdx++;
    }
    this.gap(4);
  }

  signatureBlock(sec) {
    this.ensure(50);
    this.gap(14);
    const n = sec.parties?.length || 1;
    const colW = (this.w - (n - 1) * 30) / n;
    const baseY = this.y;
    sec.parties.forEach((p, i) => {
      const x = this.x + i * (colW + 30);
      this.page.drawLine({ start: { x, y: baseY }, end: { x: x + colW * 0.8, y: baseY }, thickness: 0.7, color: this.ink });
      this.page.drawText(san(p), { x, y: baseY - 11, size: 8, font: this.f.reg, color: this.gray });
      this.page.drawText('Date:', { x, y: baseY - 24, size: 8, font: this.f.reg, color: this.gray });
      this.page.drawLine({ start: { x: x + 24, y: baseY - 24 }, end: { x: x + colW * 0.8, y: baseY - 24 }, thickness: 0.5, color: this.light });
    });
    this.y = baseY - 34;
  }

  disclaimer(text) {
    this.gap(8);
    this.text(text, { size: 7.5, color: this.gray, lineH: 10 });
  }
}
