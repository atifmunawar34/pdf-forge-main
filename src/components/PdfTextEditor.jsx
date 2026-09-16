import { useState, useEffect, useRef } from 'react';
import {
  MousePointer2, Type, Highlighter, Eraser, Save,
  ZoomIn, ZoomOut, Loader2, X, Bold, Italic, Underline, Strikethrough,
  ChevronLeft, ChevronRight, PenTool, Ban,
  Undo2, Redo2, FileText
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ---------- helpers ----------

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 }
    : { r: 0, g: 0, b: 0 };
};

// Map an embedded PDF font name (e.g. "ABCDEF+DejaVuSerif-Bold") to
// a CSS family for the preview + a pdf-lib standard family for saving.
const cssFor = (family) =>
  family === 'Times New Roman' ? "Georgia, 'Times New Roman', Times, serif"
  : family === 'Courier New' ? "'Courier New', Courier, monospace"
  : "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Is a FontFace registered in document.fonts under this family name?
const fontFaceLoaded = (family) => {
  if (!family) return false;
  try { return document.fonts.check(`12px "${family}"`); } catch { return false; }
};

// Resolve the REAL font behind a pdf.js text item.
// item.fontName is pdf.js's internal loadedName ("g_d0_f1"). The FontFaceObject
// in page.commonObjs exposes the true name, bold/italic flags and cssFontInfo
// (fontFamily + fontWeight + italicAngle) — styles[fontName].fontFamily is only
// the FALLBACK name and must not be used as the primary family.
const resolveFontInfo = (item, page, styles) => {
  const loadedName = item.fontName || '';
  const fallback = (styles[loadedName]?.fontFamily || 'sans-serif').replace(/^["']|["']$/g, '');
  let f = null;
  try { if (page?.commonObjs?.has(loadedName)) f = page.commonObjs.get(loadedName); } catch { /* font not resolved */ }

  const cssInfo = f?.cssFontInfo || null;
  const face = (cssInfo?.fontFamily || loadedName).replace(/^["']|["']$/g, '');
  const realName = f?.name || loadedName;
  // strip subset prefix ("ABCDEF+Georgia Bold" -> "Georgia Bold") for local-font matching
  const realFamily = realName.includes('+') ? realName.split('+').pop() : realName;
  const weight = cssInfo?.fontWeight != null ? parseFloat(cssInfo.fontWeight) : null;
  const angle = cssInfo?.italicAngle ? parseFloat(cssInfo.italicAngle) : 0;
  const nameFlags = realName.replace(/[+\-_.,]/g, ' ');
  const bold = !!f?.bold || (weight != null && weight >= 600) || /\b(bold|black|heavy|semibold|demi)\b/i.test(nameFlags);
  const italic = !!f?.italic || angle !== 0 || /(italic|oblique|slant)/i.test(nameFlags);
  const loaded = fontFaceLoaded(face) || fontFaceLoaded(loadedName);

  // embedded FontFace first, then the real family (if installed locally), then fallback
  const family = `"${face}", "${realFamily}", "${fallback}", sans-serif`;
  // If the embedded FontFace is loaded, its descriptors already carry the
  // weight/style — requesting extra weight would synthesize double-bold.
  const cssWeight = loaded ? (weight || 'normal') : (bold ? 'bold' : 'normal');
  const cssStyle = loaded ? (angle ? `oblique ${angle}deg` : 'normal') : (italic ? 'italic' : 'normal');
  return { family, face, realName, loaded, bold, italic, weight, angle, cssWeight, cssStyle };
};

const parseFontFlags = (fontName = '') => {
  const serif = /serif|roman|times|georgia|palatino|garamond|cambria|book|nimbus/i.test(fontName) && !/sans/i.test(fontName);
  const mono = /mono|courier|consol|typewriter/i.test(fontName);
  return {
    bold: /bold|black|heavy|semibold|demi/i.test(fontName),
    italic: /italic|oblique|slant/i.test(fontName),
    family: mono ? 'Courier New' : serif ? 'Georgia' : 'Helvetica',
    cssFamily: mono ? "'Courier New', Courier, monospace"
             : serif ? "Georgia, 'Times New Roman', Times, serif"
             : "'Helvetica Neue', Helvetica, Arial, sans-serif",
    pdfFamily: mono ? 'Courier New' : serif ? 'Times New Roman' : 'Helvetica',
  };
};

// shared measuring canvas — sizes the edit box so every original line fits
// on ONE visual line (no reflow vs the PDF's real line breaks)
let _measCtx = null;
const measureW = (t, fi, fsPx) => {
  if (!_measCtx) _measCtx = document.createElement('canvas').getContext('2d');
  _measCtx.font = `${fi?.cssStyle && fi.cssStyle !== 'normal' ? fi.cssStyle + ' ' : ''}` +
                  `${fi?.cssWeight && fi.cssWeight !== 'normal' ? fi.cssWeight + ' ' : ''}` +
                  `${fsPx}px ${fi?.family || 'sans-serif'}`;
  return _measCtx.measureText(t).width;
};

// Sample the dominant colors inside a canvas rect (device px = logical * dpr).
// Returns { bg:[r,g,b], fg:[r,g,b] } — bg = most common pixel color (the page
// background under the text), fg = most common color far from bg (the glyphs).
const sampleRectColors = (ctx, x, y, w, h, dpr = 1) => {
  const sx = Math.max(0, Math.round(x * dpr)), sy = Math.max(0, Math.round(y * dpr));
  const sw = Math.max(1, Math.round(w * dpr)), sh = Math.max(1, Math.round(h * dpr));
  let data;
  try { data = ctx.getImageData(sx, sy, sw, sh).data; } catch { return null; }
  const counts = new Map(), sums = new Map();
  const step = Math.max(4, Math.floor(data.length / 16000) * 4 || 4);
  for (let i = 0; i + 2 < data.length; i += step) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    const s = sums.get(key) || [0, 0, 0];
    s[0] += r; s[1] += g; s[2] += b; sums.set(key, s);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const avg = (key) => { const s = sums.get(key), c = counts.get(key); return [Math.round(s[0] / c), Math.round(s[1] / c), Math.round(s[2] / c)]; };
  const bg = avg(sorted[0][0]);
  let fg = null, bestDist = 90;
  for (const [key] of sorted.slice(1)) {
    const c = avg(key);
    const d = Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]);
    if (d > bestDist) { bestDist = d; fg = c; }
  }
  if (!fg) {
    const lum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
    fg = lum > 140 ? [0, 0, 0] : [255, 255, 255];
  }
  return { bg, fg };
};

const rgbCss = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const rgbToHex = (c) => '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

// Wrap text into lines that fit `maxWidth` PDF units at `size`
function wrapText(text, font, size, maxWidth) {
  const out = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(trial, size) > maxWidth) {
        out.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    out.push(line);
  }
  return out;
}

// Group raw pdf.js text items -> lines -> blocks (paragraphs)
function extractBlocks(textContent, viewport, page) {
  const styles = textContent.styles || {};
  const fontCache = new Map();
  const items = [];
  for (const item of textContent.items) {
    if (!item.str || !item.str.trim()) continue;
    // Convert PDF-space transform into viewport (canvas) space
    const vtx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const vFontH = Math.hypot(vtx[2], vtx[3]);      // font height in CSS px
    const vx = vtx[4];                               // left edge
    const baselineY = vtx[5];                        // baseline (top-left origin after flip)
    const vw = Math.max(2, item.width * viewport.scale);
    // resolve the REAL embedded font once per pdf.js loadedName
    let font = fontCache.get(item.fontName);
    if (!font) { font = resolveFontInfo(item, page, styles); fontCache.set(item.fontName, font); }
    items.push({
      str: item.str,
      vx, vy: baselineY - vFontH, vw, vh: vFontH * 1.15,
      baselineY,
      vFontH,
      pdfX: item.transform[4],
      pdfY: item.transform[5],                       // baseline in PDF space
      pdfFs: Math.max(4, Math.hypot(item.transform[2], item.transform[3]) || vFontH / viewport.scale),
      pdfW: item.width,
      fontName: item.fontName || '',
      font,
    });
  }

  // sort top-to-bottom, left-to-right
  items.sort((a, b) => a.baselineY - b.baselineY || a.vx - b.vx);

  // --- group into lines: same baseline (±45% font size) AND horizontally adjacent ---
  const lines = [];
  for (const it of items) {
    const line = lines.find(l =>
      Math.abs(l.baselineY - it.baselineY) < l.vFontH * 0.45 &&
      it.vx - (l.vx + l.vw) < it.vFontH * 1.6 &&
      it.vx + it.vw > l.vx - it.vFontH
    );
    if (line) {
      const gap = it.vx - (line.vx + line.vw);
      line.items.push(it);
      line.str += (gap > it.vFontH * 0.3 && !line.str.endsWith(' ') && !it.str.startsWith(' ')) ? ' ' + it.str : it.str;
      line.vx = Math.min(line.vx, it.vx);
      const right = Math.max(line.vx + line.vw, it.vx + it.vw);
      line.vw = right - line.vx;
      line.vh = Math.max(line.vh, it.vy + it.vh - line.vy);
      line.vFontH = Math.max(line.vFontH, it.vFontH);
      line.baselineY = Math.min(line.baselineY, it.baselineY);
      // widen PDF-space coverage
      line.pdfW = Math.max(line.pdfX + line.pdfW, it.pdfX + it.pdfW) - Math.min(line.pdfX, it.pdfX);
      line.pdfX = Math.min(line.pdfX, it.pdfX);
    } else {
      lines.push({ ...it, items: [it], id: `l-${lines.length}` });
    }
  }

  // --- merge lines into blocks (paragraphs): close vertically + overlapping x-range + similar font ---
  lines.sort((a, b) => a.vy - b.vy || a.vx - b.vx);
  const blocks = [];
  for (const ln of lines) {
    const blk = blocks.find(b => {
      const vGap = ln.vy - (b.vy + b.vh);
      const overlap = Math.min(b.vx + b.vw, ln.vx + ln.vw) - Math.max(b.vx, ln.vx);
      const overlapRatio = overlap / Math.max(1, Math.min(b.vw, ln.vw));
      return vGap > -2 && vGap < Math.min(b.vFontH, ln.vFontH) * 0.75 && overlapRatio > 0.35 &&
             Math.abs(b.vFontH - ln.vFontH) < 1.5 && b.fontName === ln.fontName;
    });
    if (blk) {
      blk.lines.push(ln);
      blk.str += '\n' + ln.str;
      const x0 = Math.min(blk.vx, ln.vx);
      const y0 = Math.min(blk.vy, ln.vy);
      const x1 = Math.max(blk.vx + blk.vw, ln.vx + ln.vw);
      const y1 = Math.max(blk.vy + blk.vh, ln.vy + ln.vh);
      blk.vx = x0; blk.vy = y0; blk.vw = x1 - x0; blk.vh = y1 - y0;
      blk.vFontH = Math.max(blk.vFontH, ln.vFontH);
      blk.pdfW = Math.max(blk.pdfW, ln.pdfW);
      blk.pdfFs = Math.max(blk.pdfFs, ln.pdfFs);
      // pdfX/pdfY keep first line anchor (topmost line, since sorted by vy)
      blk.pdfX = Math.min(blk.pdfX, ln.pdfX);
    } else {
      blocks.push({
        id: `b-${blocks.length}`,
        str: ln.str,
        lines: [ln],
        vx: ln.vx, vy: ln.vy, vw: ln.vw, vh: ln.vh,
        vFontH: ln.vFontH,
        pdfX: ln.pdfX,
        pdfY: ln.pdfY,
        pdfW: ln.pdfW,
        pdfFs: ln.pdfFs,
        fontName: ln.fontName,
        font: ln.font,
      });
    }
  }
  return blocks;
}

// ---------- component ----------

export default function PdfTextEditor({ file, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const drawState = useRef({ drawing: false, erasing: false, pts: [], start: null });

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.3);
  const [isRendering, setIsRendering] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState('edit'); // pointer|edit|add|redact|highlight|underline|strikeout|draw|erase
  const [pageData, setPageData] = useState({}); // pageNum -> { blocks, added, drawings, erasures, canvasW, canvasH }
  const [activeEdit, setActiveEdit] = useState(null); // { type:'block'|'add', id, page, draft }
  const [pendingAdd, setPendingAdd] = useState(null); // { vx, vy, pdfX, pdfY }
  const [addDraft, setAddDraft] = useState('');
  const [hoverId, setHoverId] = useState(null);
  const [eraseRect, setEraseRect] = useState(null); // live drag rect preview
  const [thumbs, setThumbs] = useState({}); // pageNum -> dataURL

  // undo/redo history of pageData snapshots
  const history = useRef({ past: [], future: [] });
  const [histLen, setHistLen] = useState({ past: 0, future: 0 });

  const [fmt, setFmt] = useState({ fontSize: 12, bold: false, italic: false, underline: false, color: '#000000', family: 'Helvetica', colorTouched: false });

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // ---------- PDF loading / rendering ----------

  const loadPdf = async () => {
    setIsRendering(true);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf, fontExtraProperties: true }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      await renderPage(1, pdf);
      // lazily render sidebar thumbnails
      renderThumbs(pdf);
    } catch (e) {
      console.error('PDF load failed:', e);
    } finally {
      setIsRendering(false);
    }
  };

  const renderThumbs = async (pdf) => {
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 0.18 });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        const url = c.toDataURL('image/jpeg', 0.7);
        setThumbs(t => ({ ...t, [i]: url }));
      } catch { /* thumbnail optional */ }
    }
  };

  const renderPage = async (pageNum, pdf = pdfDoc) => {
    if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return;
    setIsRendering(true);
    setActiveEdit(null);
    setPendingAdd(null);
    setEraseRect(null);
    try {
      const page = await pdf.getPage(pageNum);
      // Hi-DPI render: backing store at scale*dpr, CSS size at logical scale
      const renderVp = page.getViewport({ scale: scale * dpr });
      const logicalVp = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = renderVp.width;
      canvas.height = renderVp.height;
      canvas.style.width = `${logicalVp.width}px`;
      canvas.style.height = `${logicalVp.height}px`;
      await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
      // subsequent drawing ops use logical (CSS px) coordinates
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const textContent = await page.getTextContent();
      const blocks = extractBlocks(textContent, logicalVp, page);

      const old = pageData[pageNum];
      let mergedBlocks = blocks;
      let added = [];
      let drawings = [];
      let erasures = [];
      if (old) {
        // keep user edits across re-renders — match prior blocks by text + normalized position
        mergedBlocks = blocks.map(b => {
          const prior = old.blocks?.find(o =>
            (o.edited || o.hidden || o.hl || o.redact || o.uline || o.strike) &&
            o.str === b.str &&
            Math.abs((o.vx / (old.canvasW || 1)) - (b.vx / logicalVp.width)) < 0.03 &&
            Math.abs((o.vy / (old.canvasH || 1)) - (b.vy / logicalVp.height)) < 0.03
          );
          return prior
            ? { ...b, edited: prior.edited, text: prior.text, hidden: prior.hidden,
                hl: prior.hl, redact: prior.redact, uline: prior.uline, strike: prior.strike,
                color: prior.color, bgColor: prior.bgColor, textColor: prior.textColor }
            : b;
        });
        added = (old.added || []).map(a => ({
          ...a,
          vx: a.nx * logicalVp.width,
          vy: a.ny * logicalVp.height,
          vFontH: a.pdfFs * scale,
        }));
        drawings = old.drawings || [];
        erasures = old.erasures || [];
      }
      setPageData(prev => ({
        ...prev,
        [pageNum]: { blocks: mergedBlocks, added, drawings, erasures, canvasW: logicalVp.width, canvasH: logicalVp.height },
      }));
      replayCanvasEdits(ctx, mergedBlocks, added, drawings, erasures, logicalVp);
      setCurrentPage(pageNum);
    } catch (e) {
      console.error('Render failed:', e);
    } finally {
      setIsRendering(false);
    }
  };

  // ---------- canvas paint ops (logical px, dpr transform already applied) ----------

  const whiteoutBlockCanvas = (ctx, b) => {
    const pad = 1;
    ctx.fillStyle = b.bgColor ? rgbCss(b.bgColor) : '#ffffff';
    ctx.fillRect(b.vx - pad, b.vy - pad, b.vw + pad * 2, Math.max(b.vh, b.vhDrawn || 0) + pad * 2);
  };

  const drawBlockTextCanvas = (ctx, b, text) => {
    const fsPx = b.vFontH * 0.95;
    const lh = fsPx * 1.22;
    const fi = b.font || {};
    ctx.fillStyle = b.color || (b.textColor ? rgbCss(b.textColor) : '#000000');
    // real embedded font — weight/style live inside the FontFace itself
    ctx.font = `${fi.cssStyle && fi.cssStyle !== 'normal' ? fi.cssStyle + ' ' : ''}` +
               `${fi.cssWeight && fi.cssWeight !== 'normal' ? fi.cssWeight + ' ' : ''}` +
               `${fsPx}px ${fi.family || 'sans-serif'}`;
    ctx.textBaseline = 'top';
    const words = text.split(/\s+/);
    let line = '';
    let y = b.vy;
    let maxY = y;
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(trial).width > b.vw) {
        ctx.fillText(line, b.vx, y);
        y += lh; line = w;
      } else line = trial;
    }
    if (line) { ctx.fillText(line, b.vx, y); maxY = y + lh; }
    b.vhDrawn = maxY - b.vy;
  };

  const drawAddedTextCanvas = (ctx, a) => {
    ctx.fillStyle = a.color || '#000000';
    ctx.font = `${a.italic ? 'italic ' : ''}${a.bold ? 'bold ' : ''}${a.vFontH}px ${a.family || 'Helvetica'}`;
    ctx.textBaseline = 'top';
    ctx.fillText(a.text, a.vx, a.vy);
    if (a.underline) {
      const w = ctx.measureText(a.text).width;
      ctx.fillRect(a.vx, a.vy + a.vFontH * 1.02, w, Math.max(1, a.vFontH * 0.06));
    }
  };

  const paintBlockDecorations = (ctx, b) => {
    for (const ln of b.lines || []) {
      if (b.uline) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(ln.vx, ln.vy + ln.vh * 0.92, ln.vw, Math.max(1, ln.vFontH * 0.07));
      }
      if (b.strike) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(ln.vx, ln.vy + ln.vh * 0.45, ln.vw, Math.max(1, ln.vFontH * 0.07));
      }
    }
  };

  const drawStroke = (ctx, s, logicalVp) => {
    if (!s.pts || s.pts.length < 2) return;
    ctx.strokeStyle = s.color || '#dc2626';
    ctx.lineWidth = s.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.pts.forEach((p, i) => {
      const x = p.nx * logicalVp.width, y = p.ny * logicalVp.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  // Redraw all committed edits on a freshly rendered canvas
  const replayCanvasEdits = (ctx, blocks, added, drawings, erasures, logicalVp) => {
    for (const e of erasures) {
      ctx.fillStyle = e.bg ? rgbCss(e.bg) : '#ffffff';
      ctx.fillRect(e.nx * logicalVp.width, e.ny * logicalVp.height, e.nw * logicalVp.width, e.nh * logicalVp.height);
    }
    for (const b of blocks) {
      if (b.hidden) { whiteoutBlockCanvas(ctx, b); continue; }
      if (b.redact) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(b.vx, b.vy, b.vw, b.vh);
        continue;
      }
      if (b.edited) {
        whiteoutBlockCanvas(ctx, b);
        if (b.text?.trim()) drawBlockTextCanvas(ctx, b, b.text);
      }
      if (b.hl) {
        ctx.fillStyle = 'rgba(255, 235, 59, 0.45)';
        ctx.fillRect(b.vx, b.vy, b.vw, Math.max(b.vh, b.vhDrawn || 0));
      }
      paintBlockDecorations(ctx, b);
    }
    for (const a of added) drawAddedTextCanvas(ctx, a);
    for (const s of drawings) drawStroke(ctx, s, logicalVp);
  };

  // ---------- history ----------

  const syncHist = () => setHistLen({ past: history.current.past.length, future: history.current.future.length });

  const snapshot = () => {
    history.current.past.push(JSON.stringify(pageData));
    if (history.current.past.length > 40) history.current.past.shift();
    history.current.future = [];
    syncHist();
  };

  const undo = async () => {
    const prev = history.current.past.pop();
    if (prev == null) return;
    history.current.future.push(JSON.stringify(pageData));
    syncHist();
    setPageData(JSON.parse(prev));
    await renderPage(currentPage);
  };

  const redo = async () => {
    const next = history.current.future.pop();
    if (next == null) return;
    history.current.past.push(JSON.stringify(pageData));
    syncHist();
    setPageData(JSON.parse(next));
    await renderPage(currentPage);
  };

  // ---------- interactions ----------

  const getCur = () => pageData[currentPage] || { blocks: [], added: [], drawings: [], erasures: [] };

  const updateBlock = (id, patch) => {
    setPageData(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        blocks: prev[currentPage].blocks.map(b => b.id === id ? { ...b, ...patch } : b),
      },
    }));
  };

  const handleBlockClick = (e, b) => {
    e.stopPropagation();
    const ctx = canvasRef.current.getContext('2d');
    if (mode === 'edit') {
      setActiveEdit({ type: 'block', id: b.id, page: currentPage, draft: b.edited ? b.text : b.str });
      // sample the real background + text colors under the block (works on
      // dark/colored pages — whiteing out would paint a glaring white box)
      const ctx = canvasRef.current.getContext('2d');
      if (!b.bgColor) {
        const c = sampleRectColors(ctx, b.vx - 1, b.vy - 1, b.vw + 2, Math.max(b.vh, b.vhDrawn || 0) + 2, dpr);
        if (c) { b.bgColor = c.bg; b.textColor = c.fg; }
      }
      setFmt(f => ({ ...f, fontSize: Math.round(b.pdfFs), color: b.color || (b.textColor ? rgbToHex(b.textColor) : '#000000'), colorTouched: !!b.color }));
      // whiteout the original text on canvas so it doesn't ghost behind the editor
      whiteoutBlockCanvas(ctx, b);
    } else if (mode === 'highlight' || mode === 'redact' || mode === 'underline' || mode === 'strikeout') {
      snapshot();
      const patch = mode === 'highlight' ? { hl: !b.hl }
                  : mode === 'redact' ? { redact: !b.redact }
                  : mode === 'underline' ? { uline: !b.uline }
                  : { strike: !b.strike };
      updateBlock(b.id, patch);
      // re-render whole page to keep layering simple
      setTimeout(() => renderPage(currentPage), 0);
    } else if (mode === 'erase') {
      snapshot();
      if (!b.bgColor) {
        const c = sampleRectColors(ctx, b.vx - 1, b.vy - 1, b.vw + 2, b.vh + 2, dpr);
        if (c) { b.bgColor = c.bg; b.textColor = c.fg; }
      }
      updateBlock(b.id, { hidden: true, edited: false, bgColor: b.bgColor, textColor: b.textColor });
      whiteoutBlockCanvas(ctx, b);
    }
  };

  // cancel an edit — restore the whited-out original by re-rendering the page
  const cancelEdit = () => {
    if (activeEdit?.type === 'block') renderPage(currentPage);
    setActiveEdit(null);
    setPendingAdd(null);
  };

  const commitBlockEdit = () => {
    if (!activeEdit || activeEdit.type !== 'block') return;
    const { id, draft } = activeEdit;
    const b = getCur().blocks.find(x => x.id === id);
    if (!b) { setActiveEdit(null); return; }
    snapshot();
    const ctx = canvasRef.current.getContext('2d');
    const color = fmt.colorTouched ? fmt.color : b.color;
    const nb = { ...b, edited: true, text: draft, color };
    whiteoutBlockCanvas(ctx, nb);
    if (draft.trim()) drawBlockTextCanvas(ctx, nb, draft);
    updateBlock(id, { edited: true, text: draft, color, vhDrawn: nb.vhDrawn });
    setActiveEdit(null);
  };

  const canvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const pd = getCur();
    const x = (e.clientX - rect.left) * (pd.canvasW / rect.width);
    const y = (e.clientY - rect.top) * (pd.canvasH / rect.height);
    return { x, y };
  };

  const toPdf = (x, y) => {
    const pd = getCur();
    return { x: x / scale, y: (pd.canvasH - y) / scale };
  };

  const handleCanvasClick = (e) => {
    if (mode !== 'add') { if (mode !== 'draw' && mode !== 'erase') cancelEdit(); return; }
    const { x, y } = canvasPos(e);
    const p = toPdf(x, y);
    setPendingAdd({ vx: x, vy: y, pdfX: p.x, pdfY: p.y - fmt.fontSize * 0.8 });
    setAddDraft('');
    setActiveEdit({ type: 'add' });
  };

  const commitAddText = () => {
    if (!pendingAdd || !addDraft.trim()) { setPendingAdd(null); setActiveEdit(null); return; }
    snapshot();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const a = {
      id: `a-${(getCur().added?.length || 0) + 1}`, text: addDraft,
      vx: pendingAdd.vx, vy: pendingAdd.vy,
      nx: pendingAdd.vx / getCur().canvasW,
      ny: pendingAdd.vy / getCur().canvasH,
      pdfX: pendingAdd.pdfX, pdfY: pendingAdd.pdfY,
      vFontH: fmt.fontSize * scale, pdfFs: fmt.fontSize,
      bold: fmt.bold, italic: fmt.italic, underline: fmt.underline,
      color: fmt.color, family: fmt.family,
    };
    drawAddedTextCanvas(ctx, a);
    setPageData(prev => ({
      ...prev,
      [currentPage]: { ...prev[currentPage], added: [...(prev[currentPage].added || []), a] },
    }));
    setPendingAdd(null);
    setAddDraft('');
    setActiveEdit(null);
  };

  // pointer handlers for draw / erase-rect on the overlay layer
  const onOverlayDown = (e) => {
    if (mode === 'draw') {
      drawState.current = { drawing: true, pts: [] };
      const { x, y } = canvasPos(e);
      const pd = getCur();
      drawState.current.pts.push({ nx: x / pd.canvasW, ny: y / pd.canvasH });
    } else if (mode === 'erase') {
      drawState.current = { erasing: true, start: canvasPos(e) };
      setEraseRect(null);
    }
  };

  const onOverlayMove = (e) => {
    const ds = drawState.current;
    const pd = getCur();
    const { x, y } = canvasPos(e);
    if (ds.drawing) {
      ds.pts.push({ nx: x / pd.canvasW, ny: y / pd.canvasH });
      const ctx = canvasRef.current.getContext('2d');
      const n = ds.pts.length;
      if (n >= 2) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ds.pts[n - 2].nx * pd.canvasW, ds.pts[n - 2].ny * pd.canvasH);
        ctx.lineTo(ds.pts[n - 1].nx * pd.canvasW, ds.pts[n - 1].ny * pd.canvasH);
        ctx.stroke();
      }
    } else if (ds.erasing) {
      setEraseRect({
        x: Math.min(ds.start.x, x), y: Math.min(ds.start.y, y),
        w: Math.abs(x - ds.start.x), h: Math.abs(y - ds.start.y),
      });
    }
  };

  const onOverlayUp = () => {
    const ds = drawState.current;
    if (ds.drawing && ds.pts.length > 1) {
      snapshot();
      const stroke = { pts: ds.pts, color: '#dc2626', width: 2 };
      setPageData(prev => ({
        ...prev,
        [currentPage]: { ...prev[currentPage], drawings: [...(prev[currentPage].drawings || []), stroke] },
      }));
    } else if (ds.erasing && eraseRect && eraseRect.w > 4 && eraseRect.h > 4) {
      snapshot();
      const pd = getCur();
      const ctx = canvasRef.current.getContext('2d');
      const c = sampleRectColors(ctx, eraseRect.x, eraseRect.y, eraseRect.w, eraseRect.h, dpr);
      const er = { nx: eraseRect.x / pd.canvasW, ny: eraseRect.y / pd.canvasH, nw: eraseRect.w / pd.canvasW, nh: eraseRect.h / pd.canvasH, bg: c?.bg };
      ctx.fillStyle = er.bg ? rgbCss(er.bg) : '#ffffff';
      ctx.fillRect(eraseRect.x, eraseRect.y, eraseRect.w, eraseRect.h);
      setPageData(prev => ({
        ...prev,
        [currentPage]: { ...prev[currentPage], erasures: [...(prev[currentPage].erasures || []), er] },
      }));
    }
    drawState.current = { drawing: false, erasing: false, pts: [], start: null };
    setEraseRect(null);
  };

  // ---------- save ----------
  // Build the edits payload — all coords converted to PDF units with
  // TOP-LEFT origin (viewport px / scale == PyMuPDF coordinates).
  const buildEditsPayload = () => {
    const pages = {};
    const c255 = (hex) => { const c = hexToRgb(hex); return [c.r, c.g, c.b]; };

    for (const [pno, pd] of Object.entries(pageData)) {
      const edits = [];
      for (const b of pd.blocks || []) {
        const bh = Math.max(b.vh, b.vhDrawn || 0);
        const rect = [b.vx / scale, b.vy / scale, (b.vx + b.vw) / scale, (b.vy + bh) / scale];
        const bg255 = b.bgColor ? [b.bgColor[0] / 255, b.bgColor[1] / 255, b.bgColor[2] / 255] : null;
        // only send a color the user explicitly picked — otherwise the backend
        // reuses the EXACT original span color from the PDF
        const fg255 = b.color ? c255(b.color) : null;
        if (b.redact) { edits.push({ action: 'redact', rect }); continue; }
        if (b.hidden) { edits.push({ action: 'whiteout', rect, bg: bg255 }); continue; }
        if (b.edited) {
          const l0 = b.lines[0] || b;
          edits.push({
            action: 'replace', rect, text: b.text ?? '',
            baseline: [l0.vx / scale, l0.baselineY / scale],
            fontSize: b.pdfFs, maxWidth: b.vw / scale,
            font: b.font?.realName || '',
            bg: bg255,
            color: fg255, lineHeight: 1.22,
          });
        }
        const lineRects = (b.lines || []).map(l =>
          [l.vx / scale, l.vy / scale, (l.vx + l.vw) / scale, (l.vy + l.vh) / scale]);
        if (b.hl) edits.push({ action: 'highlight', rects: lineRects });
        if (b.uline) edits.push({ action: 'underline', rects: lineRects });
        if (b.strike) edits.push({ action: 'strikeout', rects: lineRects });
      }
      for (const e of pd.erasures || []) {
        edits.push({
          action: 'whiteout',
          rect: [e.nx * pd.canvasW / scale, e.ny * pd.canvasH / scale,
                 (e.nx + e.nw) * pd.canvasW / scale, (e.ny + e.nh) * pd.canvasH / scale],
          bg: e.bg ? [e.bg[0] / 255, e.bg[1] / 255, e.bg[2] / 255] : null,
        });
      }
      for (const a of pd.added || []) {
        edits.push({
          action: 'add',
          baseline: [a.vx / scale, (a.vy + a.vFontH * 0.8) / scale],
          text: a.text, fontSize: a.pdfFs,
          color: c255(a.color || '#000000'),
          bold: a.bold, italic: a.italic, family: a.family,
        });
      }
      for (const s of pd.drawings || []) {
        const segments = [];
        for (let i = 1; i < s.pts.length; i++) {
          segments.push([
            [s.pts[i - 1].nx * pd.canvasW / scale, s.pts[i - 1].ny * pd.canvasH / scale],
            [s.pts[i].nx * pd.canvasW / scale, s.pts[i].ny * pd.canvasH / scale],
          ]);
        }
        edits.push({ action: 'draw', segments, color: c255(s.color || '#dc2626'), width: (s.width || 2) / scale });
      }
      if (edits.length) pages[pno] = { edits };
    }
    return { pages };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('edits', JSON.stringify(buildEditsPayload()));
      const res = await fetch('/api/edit-pdf-text', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Backend edit failed');
      }
      const blob = await res.blob();
      onSave?.(blob, `edited_${file.name}`);
    } catch (e) {
      console.error('Backend save failed, falling back to client-side save:', e);
      try { await saveWithPdfLib(); } catch (e2) { console.error('Save failed:', e2); }
    } finally {
      setSaving(false);
    }
  };

  // Fallback: client-side save via pdf-lib (standard fonts only)
  const saveWithPdfLib = async () => {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    const fonts = {
      'Helvetica': await doc.embedFont(StandardFonts.Helvetica),
      'Helvetica-bold': await doc.embedFont(StandardFonts.HelveticaBold),
      'Helvetica-italic': await doc.embedFont(StandardFonts.HelveticaOblique),
      'Helvetica-bolditalic': await doc.embedFont(StandardFonts.HelveticaBoldOblique),
      'Times New Roman': await doc.embedFont(StandardFonts.TimesRoman),
      'Times New Roman-bold': await doc.embedFont(StandardFonts.TimesRomanBold),
      'Times New Roman-italic': await doc.embedFont(StandardFonts.TimesRomanItalic),
      'Times New Roman-bolditalic': await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
      'Courier New': await doc.embedFont(StandardFonts.Courier),
      'Courier New-bold': await doc.embedFont(StandardFonts.CourierBold),
      'Courier New-italic': await doc.embedFont(StandardFonts.CourierOblique),
      'Courier New-bolditalic': await doc.embedFont(StandardFonts.CourierBoldOblique),
    };
    const pick = (bold, italic, family) =>
      fonts[`${family || 'Helvetica'}${bold ? '-bold' : ''}${italic ? '-italic' : ''}`] || fonts['Helvetica'];

    const pages = doc.getPages();

    for (const [pageNumStr, pd] of Object.entries(pageData)) {
      const pageNum = parseInt(pageNumStr, 10);
      const page = pages[pageNum - 1];
      if (!page) continue;
      const { width, height } = page.getSize();

      for (const e of pd.erasures || []) {
        page.drawRectangle({
          x: e.nx * width, y: height - (e.ny + e.nh) * height,
          width: e.nw * width, height: e.nh * height,
          color: rgb(1, 1, 1),
        });
      }

      for (const b of pd.blocks || []) {
        const topPdf = height - b.vy / scale;
        if (b.redact) {
          page.drawRectangle({
            x: b.vx / scale, y: topPdf - b.vh / scale,
            width: b.vw / scale, height: b.vh / scale,
            color: rgb(0, 0, 0),
          });
          continue;
        }
        if (b.hidden) {
          page.drawRectangle({
            x: b.vx / scale - 1, y: topPdf - b.vh / scale - 1,
            width: b.vw / scale + 2, height: b.vh / scale + 2,
            color: rgb(1, 1, 1),
          });
          continue;
        }
        if (b.edited) {
          page.drawRectangle({
            x: b.vx / scale - 1, y: topPdf - Math.max(b.vh, b.vhDrawn || 0) / scale - 1,
            width: b.vw / scale + 2, height: Math.max(b.vh, b.vhDrawn || 0) / scale + 2,
            color: rgb(1, 1, 1),
          });
          if (b.text?.trim()) {
            const flags = parseFontFlags(b.font?.realName || '');
            const font = pick(b.font?.bold ?? flags.bold, b.font?.italic ?? flags.italic, flags.pdfFamily);
            const fs = b.pdfFs;
            const lh = fs * 1.22;
            const wrapped = wrapText(b.text, font, fs, b.vw / scale);
            const c = hexToRgb(b.color || '#000000');
            wrapped.forEach((ln, i) => {
              page.drawText(ln, {
                x: b.pdfX, y: b.pdfY - i * lh,
                size: fs, font, color: rgb(c.r, c.g, c.b),
              });
            });
          }
        }
        if (b.hl) {
          page.drawRectangle({
            x: b.vx / scale, y: topPdf - Math.max(b.vh, b.vhDrawn || 0) / scale,
            width: b.vw / scale, height: Math.max(b.vh, b.vhDrawn || 0) / scale,
            color: rgb(1, 0.92, 0.23), opacity: 0.45,
          });
        }
        for (const ln of b.lines || []) {
          const c = hexToRgb('#000000');
          if (b.uline) {
            page.drawLine({
              start: { x: ln.pdfX, y: ln.pdfY - ln.pdfFs * 0.12 },
              end: { x: ln.pdfX + ln.pdfW, y: ln.pdfY - ln.pdfFs * 0.12 },
              thickness: Math.max(0.4, ln.pdfFs * 0.05), color: rgb(c.r, c.g, c.b),
            });
          }
          if (b.strike) {
            page.drawLine({
              start: { x: ln.pdfX, y: ln.pdfY + ln.pdfFs * 0.3 },
              end: { x: ln.pdfX + ln.pdfW, y: ln.pdfY + ln.pdfFs * 0.3 },
              thickness: Math.max(0.4, ln.pdfFs * 0.05), color: rgb(c.r, c.g, c.b),
            });
          }
        }
      }

      for (const a of pd.added || []) {
        const font = pick(a.bold, a.italic, a.family);
        const c = hexToRgb(a.color || '#000000');
        page.drawText(a.text, {
          x: a.pdfX, y: a.pdfY, size: a.pdfFs, font,
          color: rgb(c.r, c.g, c.b),
        });
        if (a.underline) {
          const w = font.widthOfTextAtSize(a.text, a.pdfFs);
          page.drawLine({
            start: { x: a.pdfX, y: a.pdfY - 1.5 },
            end: { x: a.pdfX + w, y: a.pdfY - 1.5 },
            thickness: Math.max(0.5, a.pdfFs * 0.06),
            color: rgb(c.r, c.g, c.b),
          });
        }
      }

      for (const s of pd.drawings || []) {
        const c = hexToRgb(s.color || '#dc2626');
        for (let i = 1; i < s.pts.length; i++) {
          page.drawLine({
            start: { x: s.pts[i - 1].nx * width, y: height - s.pts[i - 1].ny * height },
            end: { x: s.pts[i].nx * width, y: height - s.pts[i].ny * height },
            thickness: (s.width || 2) / scale,
            color: rgb(c.r, c.g, c.b), opacity: 0.9,
          });
        }
      }
    }

    const bytes = await doc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    onSave?.(blob, `edited_${file.name}`);
  };

  // ---------- effects ----------
  const firstScale = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(loadPdf, 0); return () => clearTimeout(t); }, [file]);

  // re-render page when zoom changes (skip initial mount)
  useEffect(() => {
    if (firstScale.current) { firstScale.current = false; return; }
    renderPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // ---------- UI ----------

  const cur = getCur();
  const activeBlock = activeEdit?.type === 'block' ? cur.blocks.find(b => b.id === activeEdit.id) : null;

  // Edit box geometry — wide enough that every original line fits on one
  // visual line (no reflow), tall enough for the wrapped result
  let taW = 140, taH = 24;
  if (activeBlock) {
    const fi = activeBlock.font || {};
    const fs = activeBlock.vFontH;
    const pad = 14;
    const lines = (activeEdit.draft || '').split('\n');
    const longest = Math.max(activeBlock.vw, ...lines.map(l => measureW(l || ' ', fi, fs)));
    taW = longest + pad;
    const contentW = taW - 10; // textarea padding + border allowance
    const dispLines = lines.reduce((n, l) =>
      n + Math.max(1, Math.ceil(measureW(l || ' ', fi, fs) / Math.max(1, contentW))), 0);
    taH = Math.max(activeBlock.vh + 6, dispLines * fs * 1.22 + 8);
  }

  const toolBtn = (id, Icon, label) => (
    <button
      key={id}
      onClick={() => { cancelEdit(); setMode(id); }}
      className={`flex flex-col items-center justify-center px-2.5 py-1.5 rounded-md transition cursor-pointer min-w-[52px] ${
        mode === id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[9px] font-semibold mt-0.5 whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#e8eaee]">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-3 h-11 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer" title="Close editor">
            <X className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-black text-slate-800">PDF Forge Editor</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button onClick={undo} disabled={!histLen.past} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer" title="Undo">
            <Undo2 className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={redo} disabled={!histLen.future} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer" title="Redo">
            <Redo2 className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-2 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>SAVE &amp; DOWNLOAD</span>
          </button>
        </div>
      </div>

      {/* Tool ribbon — pdfsimpli style */}
      <div className="bg-white border-b border-slate-200 px-3 py-1 flex items-center space-x-0.5 shrink-0 overflow-x-auto">
        {toolBtn('pointer', MousePointer2, 'Pointer')}
        {toolBtn('edit', Type, 'Edit Text')}
        {toolBtn('add', Type, 'Add Text')}
        {toolBtn('redact', Ban, 'Redact')}
        {toolBtn('highlight', Highlighter, 'Highlight')}
        {toolBtn('underline', Underline, 'Underline')}
        {toolBtn('strikeout', Strikethrough, 'Strikeout')}
        {toolBtn('draw', PenTool, 'Drawing')}
        {toolBtn('erase', Eraser, 'Eraser')}

        <div className="flex-1" />

        <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.15))} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-[11px] font-bold text-slate-600 w-11 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.15))} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><ZoomIn className="w-4 h-4" /></button>
          <div className="h-5 w-px bg-slate-300 mx-1" />
          <button onClick={() => renderPage(currentPage - 1)} disabled={currentPage <= 1} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">{currentPage} / {totalPages}</span>
          <button onClick={() => renderPage(currentPage + 1)} disabled={currentPage >= totalPages} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Formatting mini-toolbar (visible when editing) */}
      {activeEdit && (
        <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex items-center space-x-3 shrink-0 shadow-sm text-xs">
          {activeEdit.type === 'add' ? (
            <>
              <select
                value={fmt.family}
                onChange={(e) => setFmt(f => ({ ...f, family: e.target.value }))}
                className="px-2 py-1 border border-slate-300 rounded font-medium"
              >
                <option>Helvetica</option>
                <option>Times New Roman</option>
                <option>Courier New</option>
              </select>
              <input
                type="number" min={6} max={96} value={fmt.fontSize}
                onChange={(e) => setFmt(f => ({ ...f, fontSize: parseInt(e.target.value) || 12 }))}
                className="w-14 px-2 py-1 border border-slate-300 rounded text-center font-medium"
              />
              <button onClick={() => setFmt(f => ({ ...f, bold: !f.bold }))} className={`p-1.5 rounded cursor-pointer ${fmt.bold ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => setFmt(f => ({ ...f, italic: !f.italic }))} className={`p-1.5 rounded cursor-pointer ${fmt.italic ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => setFmt(f => ({ ...f, underline: !f.underline }))} className={`p-1.5 rounded cursor-pointer ${fmt.underline ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}><Underline className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <span className="text-slate-500 font-medium">
              Font: <span className="text-slate-800 font-bold">{activeBlock?.font?.realName || 'embedded'}</span>
              {activeBlock?.font?.bold && <span className="ml-1.5 px-1 py-0.5 bg-slate-800 text-white rounded text-[9px]">BOLD</span>}
              {activeBlock?.font?.italic && <span className="ml-1 px-1 py-0.5 bg-slate-800 text-white rounded text-[9px]">ITALIC</span>}
            </span>
          )}
          <input type="color" value={fmt.color} onChange={(e) => setFmt(f => ({ ...f, color: e.target.value, colorTouched: true }))} className="w-7 h-7 rounded border border-slate-300 cursor-pointer" title="Text color" />
          <div className="h-5 w-px bg-slate-300" />
          <button onClick={activeEdit.type === 'add' ? commitAddText : commitBlockEdit} className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded cursor-pointer">OK</button>
          <button onClick={cancelEdit} className="px-3 py-1 border border-slate-300 hover:bg-slate-100 font-bold rounded cursor-pointer">Cancel</button>
        </div>
      )}

      {/* Main area: canvas + thumbnail sidebar */}
      <div className="flex-1 min-h-0 flex">
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 flex items-start justify-center">
          <div className="relative bg-white shadow-xl">
            {isRendering && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="block"
              onClick={handleCanvasClick}
              style={{ cursor: mode === 'add' ? 'text' : mode === 'pointer' ? 'default' : 'pointer' }}
            />

            {/* Overlay layer */}
            <div
              className="absolute inset-0"
              onMouseDown={mode === 'draw' || mode === 'erase' ? onOverlayDown : undefined}
              onMouseMove={mode === 'draw' || mode === 'erase' ? onOverlayMove : undefined}
              onMouseUp={mode === 'draw' || mode === 'erase' ? onOverlayUp : undefined}
              style={{ pointerEvents: mode === 'draw' || mode === 'erase' ? 'auto' : 'none' }}
            >
              {/* block hotspots */}
              {cur.blocks.map(b => {
                if (b.hidden) return null;
                const isActive = activeEdit?.id === b.id;
                const hovered = hoverId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={(e) => handleBlockClick(e, b)}
                    onMouseEnter={() => setHoverId(b.id)}
                    onMouseLeave={() => setHoverId(null)}
                    className={`absolute transition-colors ${
                      ['edit', 'highlight', 'redact', 'underline', 'strikeout'].includes(mode) ? 'cursor-pointer' : 'cursor-default'
                    } ${isActive ? 'outline-2 outline-rose-500 bg-rose-100/20' : hovered && !['pointer', 'add', 'draw', 'erase'].includes(mode) ? 'outline-1 outline-dashed outline-blue-400 bg-blue-50/20' : ''}`}
                    style={{
                      left: b.vx, top: b.vy, width: b.vw,
                      height: Math.max(b.vh, b.vhDrawn || 0),
                      pointerEvents: 'auto',
                    }}
                  />
                );
              })}

              {/* erase drag preview */}
              {eraseRect && (
                <div
                  className="absolute border-2 border-dashed border-red-400 bg-white/60"
                  style={{ left: eraseRect.x, top: eraseRect.y, width: eraseRect.w, height: eraseRect.h, pointerEvents: 'none' }}
                />
              )}

              {/* Active block editor */}
              {activeBlock && (
                <textarea
                  autoFocus
                  spellCheck={false}
                  value={activeEdit.draft}
                  onChange={(e) => setActiveEdit(a => ({ ...a, draft: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                  className="absolute z-30 border-2 border-rose-500 rounded-sm px-0.5 py-0 outline-none resize-none overflow-hidden"
                  style={{
                    left: activeBlock.vx, top: activeBlock.vy,
                    width: taW,
                    height: taH,
                    backgroundColor: activeBlock.bgColor ? rgbCss(activeBlock.bgColor) : '#ffffff',
                    fontSize: activeBlock.vFontH,
                    lineHeight: 1.22,
                    // real embedded font — bold/italic are inside the font itself
                    fontFamily: activeBlock.font?.family || cssFor(fmt.family),
                    fontWeight: activeBlock.font?.cssWeight || 'normal',
                    fontStyle: activeBlock.font?.cssStyle || 'normal',
                    textDecoration: 'none',
                    color: fmt.color,
                    pointerEvents: 'auto',
                  }}
                />
              )}

              {/* Add-text input */}
              {pendingAdd && activeEdit?.type === 'add' && (
                <input
                  autoFocus
                  value={addDraft}
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitAddText(); if (e.key === 'Escape') { setPendingAdd(null); setActiveEdit(null); } }}
                  placeholder="Type here..."
                  className="absolute z-30 bg-white/95 border-2 border-emerald-500 rounded px-1 outline-none"
                  style={{
                    left: pendingAdd.vx, top: pendingAdd.vy,
                    minWidth: 160,
                    fontSize: fmt.fontSize * scale,
                    fontFamily: fmt.family,
                    fontWeight: fmt.bold ? 'bold' : 'normal',
                    fontStyle: fmt.italic ? 'italic' : 'normal',
                    textDecoration: fmt.underline ? 'underline' : 'none',
                    color: fmt.color,
                    pointerEvents: 'auto',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar: page thumbnails (pdfsimpli style) */}
        <div className="w-24 bg-[#dfe2e8] border-l border-slate-300 overflow-y-auto shrink-0 py-3 flex flex-col items-center space-y-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => renderPage(n)}
              className={`relative rounded border-2 transition cursor-pointer overflow-hidden bg-white ${
                currentPage === n ? 'border-orange-500 shadow-md' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              {thumbs[n] ? (
                <img src={thumbs[n]} alt={`Page ${n}`} className="w-16 block" />
              ) : (
                <div className="w-16 h-20 flex items-center justify-center">
                  <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                </div>
              )}
              <span className="block text-center text-[10px] font-bold text-slate-500 py-0.5">{n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
