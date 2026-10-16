import { useRef, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  Plus, Trash2, ArrowUp, ArrowDown, Type, Heading1, Minus, ImagePlus,
  Download, PenLine, ChevronRight, Table2,
} from 'lucide-react';
import { Btn, Field, Input, NumInput, Select, TextArea } from './toolkit/bits';
import { download, useSeo } from './toolkit/utils';

const newBlock = (type) => ({
  id: crypto.randomUUID(), type,
  text: type === 'heading' ? 'Section heading' : type === 'text' ? 'Type your text…' : '',
  rows: type === 'table' ? [['Column 1', 'Column 2'], ['', '']] : undefined,
  img: null,
});

/**
 * Document Creator — block-based document editor, exports to PDF via pdf-lib.
 * Blocks: heading, text, image/logo, table, divider, signature line.
 * Page options: font, margins, header, footer, page numbers.
 */
export default function DocumentCreator({ onHome, onTemplates }) {
  useSeo({
    title: 'Document Creator — Build & Download PDFs | PDF Forge',
    description: 'Free online document creator: add text, images, tables and signatures, then download a polished PDF.',
    slug: 'document-creator',
  });

  const [blocks, setBlocks] = useState([newBlock('heading'), newBlock('text')]);
  const [title, setTitle] = useState('Untitled document');
  const [font, setFont] = useState('Helvetica');
  const [margin, setMargin] = useState(56);
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [pageNums, setPageNums] = useState(true);
  const [busy, setBusy] = useState(false);
  const imgInputRef = useRef(null);
  const imgTargetRef = useRef(null);

  const set = (id, patch) => setBlocks((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const del = (id) => setBlocks((b) => b.filter((x) => x.id !== id));
  const move = (id, d) => setBlocks((b) => {
    const i = b.findIndex((x) => x.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= b.length) return b;
    const nb = [...b];
    [nb[i], nb[j]] = [nb[j], nb[i]];
    return nb;
  });
  const add = (type) => setBlocks((b) => [...b, newBlock(type)]);
  const duplicate = (id) => setBlocks((b) => {
    const i = b.findIndex((x) => x.id === id);
    return [...b.slice(0, i + 1), { ...b[i], id: crypto.randomUUID() }, ...b.slice(i + 1)];
  });

  const pickImage = (id) => { imgTargetRef.current = id; imgInputRef.current?.click(); };
  const onImg = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => set(imgTargetRef.current, { img: rd.result, imgMime: f.type });
    rd.readAsDataURL(f);
    e.target.value = '';
  };

  /* ---------- PDF render ---------- */
  const exportPdf = async () => {
    setBusy(true);
    try {
      const doc = await PDFDocument.create();
      const fonts = {
        Helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
        'Times New Roman': [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
        Courier: [StandardFonts.Courier, StandardFonts.CourierBold],
      };
      const [reg, bold] = fonts[font] || fonts.Helvetica;
      const fReg = await doc.embedFont(reg);
      const fBold = await doc.embedFont(bold);
      const M = Math.max(30, Math.min(120, +margin || 56));
      let page = doc.addPage([595, 842]);
      let y = 842 - M;
      const width = 595 - M * 2;
      const ink = rgb(0.12, 0.15, 0.22);

      const ensure = (need) => {
        if (y - need < M) {
          if (footer) page.drawText(footer, { x: M, y: M / 2, size: 8, font: fReg, color: rgb(0.55, 0.55, 0.6) });
          page = doc.addPage([595, 842]);
          y = 842 - M;
          if (header) { page.drawText(header, { x: M, y: 842 - M / 2, size: 8, font: fReg, color: rgb(0.55, 0.55, 0.6) }); y -= 10; }
        }
      };
      if (header) { page.drawText(header, { x: M, y: 842 - M / 2, size: 8, font: fReg, color: rgb(0.55, 0.55, 0.6) }); y -= 10; }

      const wrap = (text, size, fnt) => {
        const lines = [];
        for (const para of String(text).split('\n')) {
          let line = '';
          for (const w of para.split(' ')) {
            const t = line ? `${line} ${w}` : w;
            if (fnt.widthOfTextAtSize(t, size) > width && line) { lines.push(line); line = w; }
            else line = t;
          }
          lines.push(line);
        }
        return lines;
      };

      for (const b of blocks) {
        if (b.type === 'heading') {
          const lines = wrap(b.text, 18, fBold);
          ensure(lines.length * 24 + 8);
          lines.forEach((l) => { page.drawText(l, { x: M, y, size: 18, font: fBold, color: ink }); y -= 24; });
          y -= 8;
        } else if (b.type === 'text') {
          const lines = wrap(b.text, 11, fReg);
          ensure(Math.min(lines.length, 3) * 16 + 6);
          lines.forEach((l) => { ensure(16); page.drawText(l, { x: M, y, size: 11, font: fReg, color: ink }); y -= 16; });
          y -= 6;
        } else if (b.type === 'divider') {
          ensure(20);
          page.drawLine({ start: { x: M, y }, end: { x: M + width, y }, thickness: 0.7, color: rgb(0.8, 0.82, 0.88) });
          y -= 20;
        } else if (b.type === 'image' && b.img) {
          try {
            const emb = b.imgMime === 'image/png' ? await doc.embedPng(b.img) : await doc.embedJpg(b.img);
            const maxW = width, maxH = 260;
            const sc = Math.min(maxW / emb.width, maxH / emb.height, 1);
            const w = emb.width * sc, h = emb.height * sc;
            ensure(h + 10);
            page.drawImage(emb, { x: M, y: y - h, width: w, height: h });
            y -= h + 12;
          } catch { /* skip unreadable image */ }
        } else if (b.type === 'table' && b.rows) {
          const cols = Math.max(...b.rows.map((r) => r.length));
          const cw = width / cols;
          for (const [ri, row] of b.rows.entries()) {
            ensure(22);
            for (let ci = 0; ci < cols; ci++) {
              const cell = String(row[ci] ?? '');
              const x = M + ci * cw;
              if (ri === 0) page.drawRectangle({ x, y: y - 6, width: cw, height: 20, color: rgb(0.96, 0.5, 0.58) });
              page.drawRectangle({ x, y: y - 6, width: cw, height: 20, borderColor: rgb(0.85, 0.85, 0.9), borderWidth: 0.5 });
              page.drawText(cell.slice(0, 40), { x: x + 5, y: y, size: 9, font: ri === 0 ? fBold : fReg, color: ri === 0 ? rgb(1, 1, 1) : ink });
            }
            y -= 20;
          }
          y -= 8;
        } else if (b.type === 'signature') {
          ensure(60);
          page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.8, color: ink });
          page.drawText(b.text || 'Signature', { x: M, y: y - 14, size: 9, font: fReg, color: rgb(0.5, 0.5, 0.55) });
          y -= 50;
        }
      }

      // footer + page numbers on every page
      const total = doc.getPageCount();
      doc.getPages().forEach((p, i) => {
        if (footer) p.drawText(footer, { x: M, y: M / 2, size: 8, font: fReg, color: rgb(0.55, 0.55, 0.6) });
        if (pageNums) p.drawText(`Page ${i + 1} of ${total}`, { x: 595 - M - 70, y: M / 2, size: 8, font: fReg, color: rgb(0.55, 0.55, 0.6) });
      });

      download(new Blob([await doc.save()], { type: 'application/pdf' }), `${title.replace(/[^\w-]+/g, '-') || 'document'}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const PALETTE = [
    { type: 'heading', icon: Heading1, label: 'Heading' },
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'image', icon: ImagePlus, label: 'Image / Logo' },
    { type: 'table', icon: Table2, label: 'Table' },
    { type: 'divider', icon: Minus, label: 'Divider' },
    { type: 'signature', icon: PenLine, label: 'Signature' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-6">
        <button onClick={onHome} className="hover:text-rose-500 transition cursor-pointer">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-600">Document Creator</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Document Creator</h1>
          <p className="mt-1 text-sm text-slate-500">Build a document block by block, then export as PDF.</p>
        </div>
        <div className="flex gap-2">
          {onTemplates && <Btn variant="secondary" onClick={onTemplates}>Use a template instead</Btn>}
          <Btn onClick={exportPdf} disabled={busy}>
            <span className="flex items-center gap-1.5"><Download className="w-4 h-4" /> {busy ? 'Building…' : 'Download PDF'}</span>
          </Btn>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6">
        {/* Blocks */}
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="font-bold text-base" />

          {blocks.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-4 group relative">
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => move(b.id, -1)} aria-label="Move up" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => move(b.id, 1)} aria-label="Move down" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => duplicate(b.id)} aria-label="Duplicate" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(b.id)} aria-label="Delete block" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-2">{b.type}</p>

              {b.type === 'heading' && (
                <Input value={b.text} onChange={(e) => set(b.id, { text: e.target.value })} className="font-bold" placeholder="Heading" />
              )}
              {b.type === 'text' && (
                <TextArea rows={3} value={b.text} onChange={(e) => set(b.id, { text: e.target.value })} placeholder="Paragraph text…" />
              )}
              {b.type === 'image' && (
                <div>
                  {b.img ? (
                    <img src={b.img} alt="Block" className="max-h-40 rounded-xl border border-slate-200" />
                  ) : (
                    <Btn variant="secondary" onClick={() => pickImage(b.id)}>
                      <span className="flex items-center gap-1.5"><ImagePlus className="w-4 h-4" /> Choose image</span>
                    </Btn>
                  )}
                </div>
              )}
              {b.type === 'table' && (
                <div className="space-y-1.5">
                  {b.rows.map((row, ri) => (
                    <div key={ri} className="flex gap-1.5">
                      {row.map((cell, ci) => (
                        <Input key={ci} value={cell} placeholder={ri === 0 ? `Header ${ci + 1}` : ''}
                          onChange={(e) => {
                            const rows = b.rows.map((r, i) => i === ri ? r.map((c, j) => (j === ci ? e.target.value : c)) : r);
                            set(b.id, { rows });
                          }} />
                      ))}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => set(b.id, { rows: [...b.rows, b.rows[0].map(() => '')] })} className="text-[11px] font-bold text-rose-500 cursor-pointer">+ Row</button>
                    <button onClick={() => set(b.id, { rows: b.rows.map((r) => [...r, '']) })} className="text-[11px] font-bold text-rose-500 cursor-pointer">+ Column</button>
                  </div>
                </div>
              )}
              {b.type === 'signature' && (
                <Input value={b.text} onChange={(e) => set(b.id, { text: e.target.value })} placeholder="Signature label (e.g. Authorized signature)" />
              )}
              {b.type === 'divider' && <div className="border-t border-slate-200 my-1" />}
            </div>
          ))}

          {/* Add block palette */}
          <div className="flex flex-wrap gap-2 pt-1">
            {PALETTE.map((p) => (
              <button key={p.type} onClick={() => add(p.type)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-xl px-3 py-2 transition cursor-pointer">
                <p.icon className="w-3.5 h-3.5" /> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Page settings */}
        <aside className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 sticky top-20">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page setup</p>
            <Field label="Font">
              <Select value={font} onChange={setFont} options={['Helvetica', 'Times New Roman', 'Courier']} />
            </Field>
            <Field label="Margins (px)"><NumInput value={margin} onChange={setMargin} min={30} max={120} /></Field>
            <Field label="Header text"><Input value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Optional header" /></Field>
            <Field label="Footer text"><Input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Optional footer" /></Field>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={pageNums} onChange={(e) => setPageNums(e.target.checked)} className="accent-rose-500 w-4 h-4" />
              Page numbers
            </label>
          </div>
        </aside>
      </div>

      <input ref={imgInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onImg} />
    </div>
  );
}
