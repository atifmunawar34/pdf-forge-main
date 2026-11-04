import { useState, useEffect, useRef } from 'react';
import {
  MousePointer2, Type, Highlighter, Eraser, Save,
  ZoomIn, ZoomOut, Loader2, X, Bold, Italic, Underline, Strikethrough,
  ChevronLeft, ChevronRight, PenTool, Ban,
  Undo2, Redo2, Image as ImageIcon
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import Logo from './Logo';

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
  // camel-split too — "TimesNewRomanPS-BoldMT" -> "... Bold MT", otherwise
  // \b(bold)\b never matches inside "BoldMT" and bold fonts go undetected
  const nameFlags = realName.replace(/[+\-_.,]/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const bold = !!f?.bold || (weight != null && weight >= 600) || /(bold|black|heavy|semibold|demi)/i.test(nameFlags);
  const italic = !!f?.italic || angle !== 0 || /(italic|oblique|slant)/i.test(nameFlags);
  const loaded = fontFaceLoaded(face) || fontFaceLoaded(loadedName);

  // Turn PostScript names into real CSS families — "TimesNewRomanPS-BoldMT"
  // isn't a valid family, so camel-split it and strip style/foundry suffixes:
  // -> "Times New Roman". Without this the browser drops to sans-serif.
  const pretty = realFamily
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b(PS|MT|BT|ITC|LT|Std|Pro|OS|Bold|Ital(ic)?|Oblique|Regular|Normal|Medium|Black|Heavy|Semi?bold|Demi|Light|Thin)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const serifGuess = /serif|roman|times|georgia|palatino|antiqua|garamond|cambria|book|nimbus|baskerville|century|minion|didot|bodoni/i.test(realName) && !/sans/i.test(realName);
  const generic = serifGuess ? 'serif' : 'sans-serif';

  // embedded FontFace first, then the real family (if installed locally), then fallback
  const family = [...new Set([face, loadedName, realFamily, pretty, fallback].filter(Boolean))]
    .map((f) => `"${f}"`)
    .join(', ') + `, ${generic}`;
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
  const bgCounts = new Map(), bgSums = new Map();
  const step = Math.max(4, Math.floor(data.length / 16000) * 4 || 4);
  const mx = sw * 0.14, my = sh * 0.16;
  for (let i = 0; i + 2 < data.length; i += step) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    const s = sums.get(key) || [0, 0, 0];
    s[0] += r; s[1] += g; s[2] += b; sums.set(key, s);
    // edge ring only → the page paper color; keeps dark glyphs/borders
    // inside the rect from ever being mistaken for the background
    const px = (i / 4) % sw, py = Math.floor(i / 4 / sw);
    if (px < mx || px > sw - mx || py < my || py > sh - my) {
      bgCounts.set(key, (bgCounts.get(key) || 0) + 1);
      const es = bgSums.get(key) || [0, 0, 0];
      es[0] += r; es[1] += g; es[2] += b; bgSums.set(key, es);
    }
  }
  const bgMap = bgCounts.size ? bgCounts : counts;
  const bgSumMap = bgCounts.size ? bgSums : sums;
  const sorted = [...bgMap.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const avg = (key, m = bgSumMap, cMap = bgMap) => { const s = m.get(key), c = cMap.get(key); return [Math.round(s[0] / c), Math.round(s[1] / c), Math.round(s[2] / c)]; };
  const avgAll = (key) => { const s = sums.get(key), c = counts.get(key); return [Math.round(s[0] / c), Math.round(s[1] / c), Math.round(s[2] / c)]; };
  const bg = avg(sorted[0][0]);
  let fg = null, bestDist = 90;
  for (const [key] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    const c = avgAll(key);
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
const hexToRgbaCss = (hex, a) => {
  const c = hexToRgb(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
};
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
      it.vx - (l.vx + l.vw) < it.vFontH * 1.0 &&   // don't merge across cell-size gaps
      it.vx + it.vw > l.vx - it.vFontH
    );
    if (line) {
      const gap = it.vx - (line.vx + line.vw);
      line.items.push(it);
      // preserve wide gaps as proportional space runs (justified text,
      // tab-like indents, right-aligned dates on resumes)
      const spaceW = Math.max(1, it.vFontH * 0.28);
      const nSpaces = Math.max(1, Math.round(gap / spaceW));
      line.str += (gap > it.vFontH * 0.3 && !line.str.endsWith(' ') && !it.str.startsWith(' '))
        ? ' '.repeat(nSpaces) + it.str
        : it.str;
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
  // measure each block's real line spacing (leading) from baseline gaps —
  // fixed 1.22 collapses the space between lines while editing
  for (const b of blocks) {
    const ys = b.lines.map(l => l.baselineY).sort((a, z) => a - z);
    const gaps = [];
    for (let i = 1; i < ys.length; i++) {
      const g = ys[i] - ys[i - 1];
      if (g > 1) gaps.push(g);
    }
    b.lineH = gaps.length
      ? gaps.sort((a, z) => a - z)[Math.floor(gaps.length / 2)]
      : b.vFontH * 1.22;
  }
  return blocks;
}

// ---------- component ----------

export default function PdfTextEditor({ file, onSave, onCancel }) {
  // working copy of the uploaded file — image edits are previewed on canvas
  // and applied at Save, so the file itself never changes mid-edit
  const [curFile] = useState(file);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const drawState = useRef({ drawing: false, erasing: false, pts: [], start: null });
  // pixel snapshot of the region under the active edit — restored instantly
  // on cancel so the page never has to re-render (no blink)
  const editSnap = useRef(null);
  // per-block region snapshots for instant decoration toggles (highlight,
  // underline, strikeout, redact) — keyed by block id, cleared on re-render
  const decSnap = useRef(new Map());

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.9);
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
  const [pageImgs, setPageImgs] = useState({}); // pageNum -> [{xref, rect:[x0,y0,x1,y1]}]
  const [activeImg, setActiveImg] = useState(null); // {xref, rect, vx, vy} — clicked image
  const [imgGhost, setImgGhost] = useState(null); // {im, dx, dy} — live drag outline
  // previewed image edits — applied on the canvas instantly, written to the
  // PDF only when the user hits Save & Download. A mirrored ref is updated
  // SYNCHRONOUSLY — rapid keypresses must see prior moves or they'd
  // re-capture pixels from an already-erased spot (image goes blank).
  const imgEditsRef = useRef({}); // pageNum -> [{key,xref,rect,curRect,kind,bmp,bg,file,imgEl}]
  const [imgEdits, setImgEdits] = useState(imgEditsRef.current);
  const imgInputRef = useRef(null); // hidden picker for the replacement image
  const imgDrag = useRef(null);     // {im, sx, sy, dx, dy} — drag state
  const imgOpRef = useRef(null);    // latest imageAction for window listeners
  const imgKb = useRef({ dx: 0, dy: 0, im: null, t: null }); // pending arrow-key nudge
  const repImgFiles = useRef([]); // replacement image files collected at payload build
  const pageSnaps = useRef({});   // pageNum -> canvas snapshot taken before img edits

  // undo/redo history of pageData snapshots
  const history = useRef({ past: [], future: [] });
  const [histLen, setHistLen] = useState({ past: 0, future: 0 });

  const [fmt, setFmt] = useState({ fontSize: 12, bold: false, italic: false, underline: false, color: '#000000', family: 'Helvetica', colorTouched: false, fontTouched: false, sizeTouched: false });
  // per-tool colors — pickable in the ribbon when the tool is active
  const [toolColors, setToolColors] = useState({
    highlight: '#ffeb3b', underline: '#1d4ed8', strikeout: '#dc2626',
    redact: '#000000', draw: '#dc2626',
  });
  // macOS system fonts for Add Text — list expanded for variety
  const fontOptions = [
    'Helvetica', 'Arial', 'Arial Black', 'Arial Narrow',
    'Times New Roman', 'Georgia', 'Palatino', 'Garamond',
    'Courier New', 'Courier', 'Monaco', 'Menlo',
    'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
    'Optima', 'Futura', 'Baskerville', 'Hoefler Text',
    'Didot', 'American Typewriter', 'Rockwell', 'Charcoal',
  ];

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // ---------- PDF loading / rendering ----------

  const loadPdf = async () => {
    setIsRendering(true);
    try {
      const buf = await curFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf, fontExtraProperties: true }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      await renderPage(1, pdf);
      // lazily render sidebar thumbnails
      renderThumbs(pdf);
      // image hotspots are detected per-page from pdf.js's OWN operator list
      // in renderPage — those rects are exactly what the canvas painted
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

  const renderPage = async (pageNum, pdf = pdfDoc, dataOverride = null) => {
    if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return;
    setIsRendering(true);
    setActiveEdit(null);
    setPendingAdd(null);
    setEraseRect(null);
    editSnap.current = null; // clear snapshot on page nav
    decSnap.current.clear();
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

      const old = (dataOverride || pageData)[pageNum];
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
                color: prior.color, bgColor: prior.bgColor, textColor: prior.textColor,
                fontOverride: prior.fontOverride, sizeOverride: prior.sizeOverride,
                cBold: prior.cBold, cItalic: prior.cItalic,
                hlColor: prior.hlColor, ulColor: prior.ulColor,
                strikeColor: prior.strikeColor, redactColor: prior.redactColor,
                roomH: prior.roomH, drawnLines: prior.drawnLines }
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
      replayCanvasEdits(ctx, mergedBlocks, drawings, erasures, logicalVp);
      // re-apply previewed image edits so moves/replaces survive re-renders
      for (const e of (imgEditsRef.current[pageNum] || [])) replayImgEdit(ctx, e);
      // detect image hotspots from the renderer's own op list (once per page)
      if (!pageImgs[pageNum]) {
        extractImgRects(page, logicalVp.height / scale).then(imgs => {
          if (imgs.length) setPageImgs(prev => ({ ...prev, [pageNum]: imgs }));
        });
      }
      setCurrentPage(pageNum);
    } catch (e) {
      console.error('Render failed:', e);
    } finally {
      setIsRendering(false);
    }
  };

  // ---------- canvas paint ops (logical px, dpr transform already applied) ----------

  // Cover glyphs with bg-coloured fills — per-ITEM rects (each pdf.js text
  // chunk) so coverage hugs the text and never paints a slab across the gap
  // / border between cells
  const whiteoutBlockCanvas = (ctx, b) => {
    ctx.fillStyle = b.bgColor ? rgbCss(b.bgColor) : '#ffffff';
    for (const ln of (b.lines?.length ? b.lines : [b])) {
      const items = ln.items?.length ? ln.items : [ln];
      for (const it of items) {
        const fh = it.vFontH || ln.vFontH || b.vFontH;
        const padX = Math.max(1, fh * 0.06);
        const padTop = Math.max(1, fh * 0.05);
        // vy is the em-box top; baseline sits at vy + fh — cover only down to
        // just under the baseline (deeper only for real descenders) so cell
        // borders/underlines below the text stay intact
        const hasDesc = /[gjpqy,;()[\]{}]/.test(it.str);
        const bottom = it.vy + fh * (hasDesc ? 1.28 : 1.06);
        ctx.fillRect(it.vx - padX, it.vy - padTop, it.vw + padX * 2, bottom - (it.vy - padTop));
      }
    }
    // also erase where a previously committed replacement was drawn
    if (b.edited && b.drawnLines?.length) {
      for (const r of b.drawnLines) ctx.fillRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
    } else if (b.edited && b.vhDrawn) {
      ctx.fillRect(b.vx - 1.5, b.vy - 1.5, b.vw + 3, b.vhDrawn + 3);
    }
  };

  const drawBlockTextCanvas = (ctx, b, text) => {
    const fsPx = (b.sizeOverride ? b.sizeOverride * scale : b.vFontH) * 0.95;
    const fi = b.font || {};
    ctx.fillStyle = b.color || (b.textColor ? rgbCss(b.textColor) : '#000000');
    // real embedded font — weight/style live inside the FontFace itself;
    // fontOverride switches to a chosen CSS family; cBold/cItalic are
    // explicit toolbar toggles that win over the detected font style.
    // Detection from the font NAME is authoritative — cssFontInfo weight can
    // report 400 for subset fonts that are intrinsically bold.
    const effW = b.cBold === undefined ? (fi.bold ? 'bold' : (fi.cssWeight || 'normal')) : (b.cBold ? 'bold' : 'normal');
    const effS = b.cItalic === undefined ? (fi.italic ? 'italic' : (fi.cssStyle || 'normal')) : (b.cItalic ? 'italic' : 'normal');
    ctx.font = b.fontOverride
      ? `${effS === 'italic' ? 'italic ' : ''}${effW === 'bold' ? 'bold ' : ''}${fsPx}px "${b.fontOverride}", sans-serif`
      : `${effS && effS !== 'normal' ? effS + ' ' : ''}` +
        `${effW && effW !== 'normal' ? effW + ' ' : ''}` +
        `${fsPx}px ${fi.family || 'sans-serif'}`;
    const draftLines = text.split('\n');
    const origLines = b.lines || [];
    // same line count → draw each line at its ORIGINAL position so
    // indentation, right-aligned text and wide gaps are preserved
    if (origLines.length > 1 && draftLines.length === origLines.length) {
      ctx.textBaseline = 'alphabetic';
      let maxY = 0;
      const drawn = [];
      draftLines.forEach((ln, i) => {
        const ol = origLines[i];
        ctx.fillText(ln, ol.vx, ol.baselineY);
        drawn.push({ x: ol.vx, y: ol.baselineY - (ol.vFontH || fsPx), w: ctx.measureText(ln).width, h: (ol.vFontH || fsPx) * 1.2 });
        maxY = Math.max(maxY, ol.vy + ol.vh);
      });
      b.drawnLines = drawn;
      b.vhDrawn = Math.max(0, maxY - b.vy);
      return;
    }
    ctx.textBaseline = 'top';
    const lhRatio = b.lineH && b.vFontH ? b.lineH / b.vFontH : 1.22;
    // free vertical room inside the cell — space down to the next block
    const room = b.roomH || b.vh * 1.2;
    const origFsPx = fsPx;
    let fitFs = fsPx;
    let fitLh;
    const setFont = () => {
      const w = b.cBold === undefined ? (fi.bold ? 'bold' : (fi.cssWeight || 'normal')) : (b.cBold ? 'bold' : 'normal');
      const s = b.cItalic === undefined ? (fi.italic ? 'italic' : (fi.cssStyle || 'normal')) : (b.cItalic ? 'italic' : 'normal');
      ctx.font = b.fontOverride
        ? `${s === 'italic' ? 'italic ' : ''}${w === 'bold' ? 'bold ' : ''}${fitFs}px "${b.fontOverride}", sans-serif`
        : `${s && s !== 'normal' ? s + ' ' : ''}` +
          `${w && w !== 'normal' ? w + ' ' : ''}` +
          `${fitFs}px ${fi.family || 'sans-serif'}`;
    };
    const wrapLines = () => {
      const words = text.split(/\s+/).flatMap((w) => {
        // hard-break single words wider than the box — no sideways spill
        if (ctx.measureText(w).width <= b.vw) return [w];
        const parts = [];
        let cur = '';
        for (const ch of w) {
          if (cur && ctx.measureText(cur + ch).width > b.vw) { parts.push(cur); cur = ch; }
          else cur += ch;
        }
        if (cur) parts.push(cur);
        return parts;
      });
      const out = [];
      let line = '';
      for (const w of words) {
        const trial = line ? `${line} ${w}` : w;
        if (line && ctx.measureText(trial).width > b.vw) { out.push(line); line = w; }
        else line = trial;
      }
      if (line) out.push(line);
      return out;
    };
    // FIT the cell: prefer shrinking so the draft stays on ONE line; only
    // when a single line would be too small (<50%) do we wrap — then keep
    // shrinking until the wrapped lines fit inside the cell's free room,
    // so nothing lands on the border or the box below
    let lines;
    for (;;) {
      setFont();
      fitLh = fitFs * lhRatio;
      lines = wrapLines();
      if (lines.length === 1) break;
      if (!text.includes('\n') && fitFs > origFsPx * 0.5) { fitFs *= 0.93; continue; }
      if (lines.length * fitLh <= room || fitFs <= origFsPx * 0.35) break;
      fitFs *= 0.9;
    }
    // draw from the ORIGINAL top position — lines grow downward inside the
    // cell's room (already shrunk to fit) and can never slide into the
    // row below
    const drawn = [];
    let y = b.vy;
    let maxY = y;
    for (const ln of lines) {
      ctx.fillText(ln, b.vx, y);
      drawn.push({ x: b.vx, y, w: ctx.measureText(ln).width, h: fitLh });
      y += fitLh; maxY = y;
    }
    b.drawnLines = drawn;
    b.vhDrawn = maxY - b.vy;
  };

  const paintBlockDecorations = (ctx, b) => {
    for (const ln of b.lines || []) {
      if (b.uline) {
        ctx.fillStyle = b.ulColor || '#000000';
        ctx.fillRect(ln.vx, ln.vy + ln.vh * 0.92, ln.vw, Math.max(1, ln.vFontH * 0.07));
      }
      if (b.strike) {
        ctx.fillStyle = b.strikeColor || '#000000';
        ctx.fillRect(ln.vx, ln.vy + ln.vh * 0.61, ln.vw, Math.max(1, ln.vFontH * 0.07));
      }
    }
  };

  // snapshot a block's canvas region once (before any decoration is painted)
  // so toggles can restore + repaint instantly without a full page re-render
  const ensureDecSnap = (ctx, b) => {
    if (decSnap.current.has(b.id)) return;
    const pad = 3;
    const canvas = canvasRef.current;
    const sx = Math.max(0, Math.round((b.vx - pad) * dpr));
    const sy = Math.max(0, Math.round((b.vy - pad) * dpr));
    const sw = Math.min(canvas.width - sx, Math.round((b.vw + pad * 2) * dpr));
    const sh = Math.min(canvas.height - sy, Math.round((Math.max(b.vh, b.vhDrawn || 0) + pad * 2) * dpr));
    try { decSnap.current.set(b.id, { img: ctx.getImageData(sx, sy, sw, sh), sx, sy }); } catch { /* noop */ }
  };

  // restore the region and repaint the block's current decorations — instant,
  // no re-render, no blink
  const repaintBlockRegion = (ctx, b) => {
    const snap = decSnap.current.get(b.id);
    if (snap) {
      ctx.putImageData(snap.img, snap.sx, snap.sy);
    } else {
      // no snapshot — repaint what's gone is impossible, just paint over
    }
    if (b.redact) {
      ctx.fillStyle = b.redactColor || '#000000';
      ctx.fillRect(b.vx, b.vy, b.vw, Math.max(b.vh, b.vhDrawn || 0));
      return;
    }
    if (b.hl) {
      ctx.fillStyle = b.hlColor ? hexToRgbaCss(b.hlColor, 0.45) : 'rgba(255, 235, 59, 0.45)';
      for (const ln of b.lines || [b]) ctx.fillRect(ln.vx, ln.vy, ln.vw, ln.vh);
    }
    paintBlockDecorations(ctx, b);
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
  const replayCanvasEdits = (ctx, blocks, drawings, erasures, logicalVp) => {
    for (const e of erasures) {
      ctx.fillStyle = e.bg ? rgbCss(e.bg) : '#ffffff';
      ctx.fillRect(e.nx * logicalVp.width, e.ny * logicalVp.height, e.nw * logicalVp.width, e.nh * logicalVp.height);
    }
    for (const b of blocks) {
      if (b.hidden) { whiteoutBlockCanvas(ctx, b); continue; }
      if (b.redact) {
        ctx.fillStyle = b.redactColor || '#000000';
        ctx.fillRect(b.vx, b.vy, b.vw, b.vh);
        continue;
      }
      const paintHl = () => {
        ctx.fillStyle = b.hlColor ? hexToRgbaCss(b.hlColor, 0.45) : 'rgba(255, 235, 59, 0.45)';
        // paint per-line — tight to the text, not the whole block box
        for (const ln of b.lines || [b]) ctx.fillRect(ln.vx, ln.vy, ln.vw, ln.vh);
      };
      if (b.edited) {
        whiteoutBlockCanvas(ctx, b);
        if (b.hl) paintHl(); // highlight under the re-drawn text
        if (b.text?.trim()) drawBlockTextCanvas(ctx, b, b.text);
      } else if (b.hl) {
        paintHl();
      }
      paintBlockDecorations(ctx, b);
    }
    // added text is rendered as DOM elements (draggable) — not drawn on canvas
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
    const restored = JSON.parse(prev);
    setPageData(restored);
    editSnap.current = null;
    // pass the restored data — pageData state hasn't flushed yet
    await renderPage(currentPage, pdfDoc, restored);
  };

  const redo = async () => {
    const next = history.current.future.pop();
    if (next == null) return;
    history.current.past.push(JSON.stringify(pageData));
    syncHist();
    const restored = JSON.parse(next);
    setPageData(restored);
    editSnap.current = null;
    await renderPage(currentPage, pdfDoc, restored);
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
      // restore a previous in-progress edit's snapshot before switching blocks
      if (editSnap.current && activeEdit?.id && activeEdit.id !== b.id) {
        const ctx0 = canvasRef.current.getContext('2d');
        ctx0.putImageData(editSnap.current.img, editSnap.current.sx, editSnap.current.sy);
        editSnap.current = null;
      }
      setActiveEdit({ type: 'block', id: b.id, page: currentPage, draft: b.edited ? b.text : b.str });
      // sample the real background + text colors under the block (works on
      // dark/colored pages — whiteing out would paint a glaring white box)
      const ctx = canvasRef.current.getContext('2d');
      if (!b.bgColor) {
        const c = sampleRectColors(ctx, b.vx - 1, b.vy - 1, b.vw + 2, Math.max(b.vh, b.vhDrawn || 0) + 2, dpr);
        if (c) { b.bgColor = c.bg; b.textColor = c.fg; }
      }
      setFmt(f => ({
        ...f,
        fontSize: Math.round(b.sizeOverride || b.pdfFs),
        family: b.fontOverride || b.font?.realName?.replace(/^[A-Z]+\+/, '') || f.family,
        bold: b.font?.bold || false, italic: b.font?.italic || false, underline: false,
        color: b.color || (b.textColor ? rgbToHex(b.textColor) : '#000000'),
        colorTouched: !!b.color, fontTouched: !!b.fontOverride, sizeTouched: !!b.sizeOverride,
        boldTouched: b.cBold !== undefined, italicTouched: b.cItalic !== undefined,
      }));
      // snapshot the pixels BEFORE whiting out — cancel restores them instantly
      const pad = 2;
      const canvas = canvasRef.current;
      const sx = Math.max(0, Math.round((b.vx - pad) * dpr));
      const sy = Math.max(0, Math.round((b.vy - pad) * dpr));
      const sw = Math.min(canvas.width - sx, Math.round((b.vw + pad * 2) * dpr));
      const sh = Math.min(canvas.height - sy, Math.round((Math.max(b.vh, b.vhDrawn || 0) + pad * 2) * dpr));
      try { editSnap.current = { img: ctx.getImageData(sx, sy, sw, sh), sx, sy }; } catch { editSnap.current = null; }
      // whiteout the original text on canvas so it doesn't ghost behind the editor
      whiteoutBlockCanvas(ctx, b);
    } else if (mode === 'highlight' || mode === 'redact' || mode === 'underline' || mode === 'strikeout') {
      snapshot();
      const patch = mode === 'highlight' ? { hl: !b.hl, hlColor: toolColors.highlight }
                  : mode === 'redact' ? { redact: !b.redact, redactColor: toolColors.redact }
                  : mode === 'underline' ? { uline: !b.uline, ulColor: toolColors.underline }
                  : { strike: !b.strike, strikeColor: toolColors.strikeout };
      const patched = { ...b, ...patch };
      // snapshot the region, then repaint instantly — no re-render, no blink
      ensureDecSnap(ctx, b);
      repaintBlockRegion(ctx, patched);
      setPageData(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          blocks: prev[currentPage].blocks.map(x => x.id === b.id ? patched : x),
        },
      }));
    } else if (mode === 'erase') {
      snapshot();
      decSnap.current.delete(b.id); // region content changes — drop snapshot
      if (!b.bgColor) {
        const c = sampleRectColors(ctx, b.vx - 1, b.vy - 1, b.vw + 2, b.vh + 2, dpr);
        if (c) { b.bgColor = c.bg; b.textColor = c.fg; }
      }
      updateBlock(b.id, { hidden: true, edited: false, bgColor: b.bgColor, textColor: b.textColor });
      whiteoutBlockCanvas(ctx, b);
    }
  };

  // cancel an edit — restore the whited-out original pixels instantly
  // (no full page re-render → no blink)
  const cancelEdit = () => {
    if (activeEdit?.type === 'block') {
      if (editSnap.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.putImageData(editSnap.current.img, editSnap.current.sx, editSnap.current.sy);
        editSnap.current = null;
      } else {
        renderPage(currentPage); // fallback only if snapshot failed
      }
    }
    setActiveEdit(null);
    setPendingAdd(null);
  };

  const commitBlockEdit = () => {
    if (!activeEdit || activeEdit.type !== 'block') return;
    const { id, draft } = activeEdit;
    const b = getCur().blocks.find(x => x.id === id);
    if (!b) { setActiveEdit(null); return; }
    snapshot();
    editSnap.current = null; // edit committed — discard the restore snapshot
    decSnap.current.delete(id); // region content changed — stale snapshot must go
    const ctx = canvasRef.current.getContext('2d');
    const color = fmt.colorTouched ? fmt.color : b.color;
    const fontOverride = fmt.fontTouched ? fmt.family : b.fontOverride;
    const sizeOverride = fmt.sizeTouched ? fmt.fontSize : b.sizeOverride;
    const cBold = fmt.boldTouched ? fmt.bold : b.cBold;
    const cItalic = fmt.italicTouched ? fmt.italic : b.cItalic;
    // measure the free vertical room inside the cell — space from the text
    // down to the next block below it — so wrapped replacement text stays
    // inside its own box and never lands on the cell under it
    const pd = getCur();
    let belowTop = Infinity;
    for (const ob of pd.blocks) {
      if (ob.id === id) continue;
      const overlap = Math.min(b.vx + b.vw, ob.vx + ob.vw) - Math.max(b.vx, ob.vx);
      if (ob.vy > b.vy + b.vFontH * 0.4 && overlap > b.vw * 0.3) belowTop = Math.min(belowTop, ob.vy);
    }
    const roomH = belowTop === Infinity ? b.vh * 1.2 : Math.max(b.vh, belowTop - b.vy - 2);
    const nb = { ...b, edited: true, text: draft, color, fontOverride, sizeOverride, cBold, cItalic, roomH };
    whiteoutBlockCanvas(ctx, nb);
    if (draft.trim()) drawBlockTextCanvas(ctx, nb, draft);
    updateBlock(id, { edited: true, text: draft, color, fontOverride, sizeOverride, cBold, cItalic, roomH, drawnLines: nb.drawnLines, vhDrawn: nb.vhDrawn });
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
    if (mode === 'image') { setActiveImg(null); return; }
    if (mode !== 'add') { if (mode !== 'draw' && mode !== 'erase') { setActiveImg(null); cancelEdit(); } return; }
    const { x, y } = canvasPos(e);
    const p = toPdf(x, y);
    setPendingAdd({ vx: x, vy: y, pdfX: p.x, pdfY: p.y - fmt.fontSize * 0.8 });
    setAddDraft('');
    setActiveEdit({ type: 'add' });
  };

  const commitAddText = () => {
    if (!pendingAdd || !addDraft.trim()) { setPendingAdd(null); setActiveEdit(null); return; }
    snapshot();
    const a = {
      id: `a-${++addedSeq.current}`, text: addDraft,
      vx: pendingAdd.vx, vy: pendingAdd.vy,
      nx: pendingAdd.vx / getCur().canvasW,
      ny: pendingAdd.vy / getCur().canvasH,
      pdfX: pendingAdd.pdfX, pdfY: pendingAdd.pdfY,
      vFontH: fmt.fontSize * scale, pdfFs: fmt.fontSize,
      bold: fmt.bold, italic: fmt.italic, underline: fmt.underline,
      color: fmt.color, family: fmt.family,
    };
    // added text renders as a draggable DOM element (not baked into canvas)
    setPageData(prev => ({
      ...prev,
      [currentPage]: { ...prev[currentPage], added: [...(prev[currentPage].added || []), a] },
    }));
    setPendingAdd(null);
    setAddDraft('');
    setActiveEdit(null);
  };

  // ---------- added-text drag & drop ----------
  const dragAdded = useRef(null);
  const addedSeq = useRef(0);

  const startDragAdded = (e, a) => {
    if (mode === 'draw' || mode === 'erase') return;
    e.stopPropagation();
    e.preventDefault();
    snapshot(); // drag is undoable
    dragAdded.current = { id: a.id, startX: e.clientX, startY: e.clientY, vx: a.vx, vy: a.vy };
    const onMove = (ev) => {
      const d = dragAdded.current;
      if (!d) return;
      const nvx = d.vx + (ev.clientX - d.startX);
      const nvy = d.vy + (ev.clientY - d.startY);
      setPageData(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          added: (prev[currentPage].added || []).map(x =>
            x.id === d.id ? { ...x, vx: nvx, vy: nvy, nx: nvx / (prev[currentPage].canvasW || 1), ny: nvy / (prev[currentPage].canvasH || 1) } : x),
        },
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dragAdded.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const deleteAdded = (a) => {
    snapshot();
    setPageData(prev => ({
      ...prev,
      [currentPage]: { ...prev[currentPage], added: (prev[currentPage].added || []).filter(x => x.id !== a.id) },
    }));
  };

  // double-click → put it back into the input for re-editing
  const reEditAdded = (a) => {
    if (mode === 'draw' || mode === 'erase') return;
    snapshot();
    setPendingAdd({ vx: a.vx, vy: a.vy, pdfX: a.pdfX, pdfY: a.pdfY });
    setAddDraft(a.text);
    setFmt(f => ({ ...f, fontSize: a.pdfFs, family: a.family, bold: a.bold, italic: a.italic, underline: a.underline, color: a.color || '#000000', colorTouched: true }));
    setActiveEdit({ type: 'add', page: currentPage });
    setPageData(prev => ({
      ...prev,
      [currentPage]: { ...prev[currentPage], added: (prev[currentPage].added || []).filter(x => x.id !== a.id) },
    }));
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
        ctx.strokeStyle = toolColors.draw;
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
      const stroke = { pts: ds.pts, color: toolColors.draw, width: 2 };
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

  // ---------- image editing ----------
  // Detect where each image is ACTUALLY painted by walking pdf.js's operator
  // list — the exact transform the renderer used. This matches the canvas
  // pixel-for-pixel (backend get_image_info rects don't, which caused
  // slivers/mis-sized boxes). Y is flipped to our top-left convention.
  const extractImgRects = async (page, pdfH) => {
    try {
      const OPS = pdfjsLib.OPS;
      const ops = await page.getOperatorList();
      const paintOps = [OPS.paintImageXObject, OPS.paintJpegXObject, OPS.paintInlineImageXObject,
        OPS.paintImageXObjectRepeat, OPS.paintImageMaskXObject, OPS.paintImageMaskXObjectGroup];
      let ctm = [1, 0, 0, 1, 0, 0];
      const stack = [];
      const mul = (a, b) => [
        a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
      const imgs = [];
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i];
        if (fn === OPS.save) stack.push([...ctm]);
        else if (fn === OPS.restore) ctm = stack.pop() || ctm;
        else if (fn === OPS.transform) ctm = mul(ctm, args);
        else if (paintOps.includes(fn)) {
          // unit square through the CTM = the painted rect (pdf units, y-up)
          const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => [
            x * ctm[0] + y * ctm[2] + ctm[4], x * ctm[1] + y * ctm[3] + ctm[5]]);
          const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
          const x0 = Math.min(...xs), x1 = Math.max(...xs);
          const y0 = pdfH - Math.max(...ys), y1 = pdfH - Math.min(...ys);
          if (x1 - x0 >= 4 && y1 - y0 >= 4) imgs.push({ xref: 0, rect: [x0, y0, x1, y1], objId: args?.[0] });
        }
      }
      return imgs;
    } catch { return []; }
  };
  // Preview ops: instant canvas changes (no server round-trip). The records
  // are sent with the normal edits payload at Save & Download time.
  const imgKey = (im) => `${im.xref}:${im.rect.map(v => Math.round(v)).join(',')}`;

  // products drawn as stacked images (overlapping rects) become ONE hotspot —
  // rects now come from the renderer itself so they cover the whole picture;
  // no proximity guessing that could chain-merge a column
  const groupImgs = (list) => {
    const groups = [];
    for (const im of list) {
      const g = groups.find(gr => {
        const a = gr.rect, b = im.rect;
        const iw = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
        const ih = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
        const inter = iw * ih;
        if (!inter) return false;
        const areaA = (a[2] - a[0]) * (a[3] - a[1]);
        const areaB = (b[2] - b[0]) * (b[3] - b[1]);
        return inter > 0.3 * Math.min(areaA, areaB);
      });
      if (g) {
        g.rect = [Math.min(g.rect[0], im.rect[0]), Math.min(g.rect[1], im.rect[1]),
          Math.max(g.rect[2], im.rect[2]), Math.max(g.rect[3], im.rect[3])];
        g.imgs.push(im);
      } else {
        groups.push({ rect: [...im.rect], imgs: [im] });
      }
    }
    return groups;
  };

  // full-page snapshot (device px) taken before the first image edit —
  // restoring a region from it brings back table lines/text under the image
  const ensurePageSnap = () => {
    const canvas = canvasRef.current;
    const s = pageSnaps.current[currentPage];
    if (s && s.width === canvas.width && s.height === canvas.height) return s;
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    c.getContext('2d').drawImage(canvas, 0, 0);
    pageSnaps.current[currentPage] = c;
    return c;
  };

  // split a captured box into product pixels vs straight border-line pixels.
  // A row/column that is ≥65% non-background is a table line — those are
  // NEVER moved or erased.
  //   prodBmp  = product only (bg + line px transparent) — drawn at new spot
  //   keepMask = line px only, everything else transparent — painted AFTER a
  //              solid fill to put borders back exactly
  const analyzeBmp = (bmp, bg) => {
    const w = bmp.width, h = bmp.height;
    const [r, g, b] = bg;
    const src = bmp.getContext('2d').getImageData(0, 0, w, h);
    const prod = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const dr = src.data[o] - r, dg = src.data[o + 1] - g, db = src.data[o + 2] - b;
      prod[i] = (dr * dr + dg * dg + db * db > 676) ? 1 : 0;
    }
    const rowLine = new Uint8Array(h), colLine = new Uint8Array(w);
    for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) n += prod[y * w + x]; if (n > w * 0.65) rowLine[y] = 1; }
    for (let x = 0; x < w; x++) { let n = 0; for (let y = 0; y < h; y++) n += prod[y * w + x]; if (n > h * 0.65) colLine[x] = 1; }

    const prodBmp = document.createElement('canvas');
    prodBmp.width = w; prodBmp.height = h;
    const pc = prodBmp.getContext('2d');
    pc.drawImage(bmp, 0, 0);
    const pd = pc.getImageData(0, 0, w, h);
    const km = document.createElement('canvas');
    km.width = w; km.height = h;
    const kc = km.getContext('2d');
    const kd = kc.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, o = i * 4;
        const isLine = rowLine[y] || colLine[x];
        if (!prod[i] || isLine) pd.data[o + 3] = 0;   // prodBmp: product only
        if (prod[i] && isLine) {                       // keepMask: lines only
          kd.data[o] = src.data[o]; kd.data[o + 1] = src.data[o + 1];
          kd.data[o + 2] = src.data[o + 2]; kd.data[o + 3] = 255;
        }
      }
    }
    pc.putImageData(pd, 0, 0);
    kc.putImageData(kd, 0, 0);
    return { prodBmp, keepMask: km };
  };

  // grab a rect out of the page snapshot as its own offscreen canvas
  const snapRegion = (snap, rectPdf) => {
    const w = Math.max(1, Math.round((rectPdf[2] - rectPdf[0]) * scale * dpr));
    const h = Math.max(1, Math.round((rectPdf[3] - rectPdf[1]) * scale * dpr));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(snap,
      Math.round(rectPdf[0] * scale * dpr), Math.round(rectPdf[1] * scale * dpr), w, h, 0, 0, w, h);
    return c;
  };

  // erase an image box WITHOUT touching borders/text:
  // 1) solid bg fill — nothing can ghost
  // 2) paint back ONLY the detected line pixels from the snapshot
  const eraseImgBox = (ctx, snap, rectPdf, bg) => {
    const [x0, y0, x1, y1] = rectPdf;
    ctx.fillStyle = rgbCss(bg);
    ctx.fillRect(x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale);
    const km = analyzeBmp(snapRegion(snap, rectPdf), bg).keepMask;
    ctx.drawImage(km, x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale);
  };

  // apply a live image edit on the canvas and record it for save
  const previewImgEdit = (kind, im, extra = {}) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const list = imgEditsRef.current[currentPage] || [];
    const prior = list.find(e => e.key === imgKey(im));
    const curRect = prior?.curRect || im.rect;
    const snap = ensurePageSnap();
    // images often render outside their reported bbox — start with a small
    // pad and EXPAND the capture until no product pixel touches the edge
    // (up to ~48u), otherwise slivers get left behind
    const padRect = (r, p) => [r[0] - p, r[1] - p, r[2] + p, r[3] + p];

    let bmp = prior?.bmp;
    let bmpRect = prior?.bmpRect;
    let bg = prior?.bg;
    if (!bmp) {
      // rect comes straight from the renderer — the box IS the whole image;
      // a 2-unit pad covers antialiased edges only
      bmpRect = padRect(im.rect, 2);
      bg = sampleRectColors(ctx, im.rect[0] * scale - 2, im.rect[1] * scale - 2,
        (im.rect[2] - im.rect[0]) * scale + 4, (im.rect[3] - im.rect[1]) * scale + 4, dpr)?.bg || [255, 255, 255];
      bmp = analyzeBmp(snapRegion(snap, bmpRect), bg).prodBmp;
    }
    bg = bg || [255, 255, 255];
    const fullRect = bmpRect || padRect(im.rect, 2);

    // erase: solid fill + border repaint over the FULL product area at both
    // the original spot and the currently-occupied spot — no ghosts/slivers
    eraseImgBox(ctx, snap, padRect(fullRect, 2), bg);
    if (curRect !== im.rect) eraseImgBox(ctx, snap, padRect(curRect, 6), bg);

    const rec = { ...(prior || { key: imgKey(im), xref: im.xref, rect: im.rect, members: im.imgs }), bmp, bg, bmpRect, ...extra };
    // 'del' always wins; a moved 'rep' stays a replace at the new spot;
    // a moved 'del' stays deleted
    rec.kind = kind === 'del' ? 'del' : (prior?.kind === 'rep' || prior?.kind === 'del' ? prior.kind : kind);
    if (kind === 'move' && extra.newRect) {
      rec.curRect = extra.newRect;
      const [x0, y0, x1, y1] = extra.newRect;
      // bmp was captured at bmpRect (padded/expanded) — draw it shifted by
      // that offset so the product lands exactly where the outline sits
      const ox = (bmpRect ? bmpRect[0] - im.rect[0] : 0) * scale;
      const oy = (bmpRect ? bmpRect[1] - im.rect[1] : 0) * scale;
      // bmp was captured at bmpRect — draw at the new spot plus that offset
      const dw = bmpRect ? (bmpRect[2] - bmpRect[0]) * scale : (x1 - x0) * scale;
      const dh = bmpRect ? (bmpRect[3] - bmpRect[1]) * scale : (y1 - y0) * scale;
      ctx.drawImage(rec.imgEl || bmp, x0 * scale + ox, y0 * scale + oy, dw, dh);
    } else if (kind === 'rep' && extra.imgEl) {
      ctx.drawImage(extra.imgEl, curRect[0] * scale, curRect[1] * scale,
        (curRect[2] - curRect[0]) * scale, (curRect[3] - curRect[1]) * scale);
    }
    // 'del' = erase only
    const upd = (prev) => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []).filter(e => e.key !== rec.key), rec],
    });
    imgEditsRef.current = upd(imgEditsRef.current);
    setImgEdits(upd);
  };

  // re-apply a previewed image edit after a full page re-render
  const replayImgEdit = (ctx, e) => {
    const snap = ensurePageSnap();
    const padRect = (r, p) => [r[0] - p, r[1] - p, r[2] + p, r[3] + p];
    eraseImgBox(ctx, snap, padRect(e.bmpRect || e.rect, 2), e.bg || [255, 255, 255]);
    if (e.curRect && e.curRect !== e.rect) eraseImgBox(ctx, snap, padRect(e.curRect, 6), e.bg || [255, 255, 255]);
    if (e.kind === 'rep' && e.imgEl) {
      const [cx0, cy0, cx1, cy1] = e.curRect || e.rect;
      ctx.drawImage(e.imgEl, cx0 * scale, cy0 * scale, (cx1 - cx0) * scale, (cy1 - cy0) * scale);
    } else if (e.kind === 'move' && e.curRect && e.bmp) {
      const [cx0, cy0] = e.curRect;
      const ox = (e.bmpRect ? e.bmpRect[0] - e.rect[0] : 0) * scale;
      const oy = (e.bmpRect ? e.bmpRect[1] - e.rect[1] : 0) * scale;
      const dw = e.bmpRect ? (e.bmpRect[2] - e.bmpRect[0]) * scale : (e.rect[2] - e.rect[0]) * scale;
      const dh = e.bmpRect ? (e.bmpRect[3] - e.bmpRect[1]) * scale : (e.rect[3] - e.rect[1]) * scale;
      ctx.drawImage(e.bmp, cx0 * scale + ox, cy0 * scale + oy, dw, dh);
    }
  };

  // keep latest preview helper reachable from global drag listeners
  imgOpRef.current = previewImgEdit;

  // image drag — window-level listeners so the drag survives pointer leaving
  // the hotspot; ghost outline follows the mouse, real move happens on release
  useEffect(() => {
    const mv = (e) => {
      const d = imgDrag.current;
      if (!d) return;
      d.dx = e.clientX - d.sx;
      d.dy = e.clientY - d.sy;
      setImgGhost({ im: d.im, dx: d.dx, dy: d.dy });
    };
    const up = () => {
      const d = imgDrag.current;
      imgDrag.current = null;
      setImgGhost(null);
      if (d && (Math.abs(d.dx) > 3 || Math.abs(d.dy) > 3)) {
        const [x0, y0, x1, y1] = d.im.rect;
        imgOpRef.current?.('move', d.im, {
          newRect: [x0 + d.dx / scale, y0 + d.dy / scale, x1 + d.dx / scale, y1 + d.dy / scale],
        });
      }
    };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [scale]);

  // ---------- keyboard shortcuts ----------
  // ← → ↑ ↓ : nudge selected image (hold Shift for 10× step) — ghost moves
  //           live, one backend call after the presses settle
  // ← →     : previous / next page (when no image is selected)
  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y : undo / redo
  // Ctrl+S : save & download
  // Enter in an edit box : apply (Shift+Enter = newline), Esc : cancel
  // P E T I H R U S D X : Pointer / Edit / Add text / Image / Highlight /
  //                       Redact / Underline / Strikeout / Draw / Eraser
  // + -   : zoom in / out,  Delete/Backspace : remove selected image
  useEffect(() => {
    const onKey = (e) => {
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

      // arrow-key nudge for the selected image — the pixels move on EVERY
      // press (pure canvas op, instant); holding the key slides it
      if (!inField && activeImg && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const kb = imgKb.current;
        if (kb.im !== activeImg) { kb.im = activeImg; kb.dx = kb.dy = 0; }
        const step = (e.shiftKey ? 10 : 1) / scale; // pdf units
        if (e.key === 'ArrowLeft') kb.dx -= step;
        else if (e.key === 'ArrowRight') kb.dx += step;
        else if (e.key === 'ArrowUp') kb.dy -= step;
        else kb.dy += step;
        const [x0, y0, x1, y1] = kb.im.rect;
        previewImgEdit('move', kb.im, {
          newRect: [x0 + kb.dx, y0 + kb.dy, x1 + kb.dx, y1 + kb.dy],
        });
        return;
      }

      if (inField) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && !e.shiftKey && k === 'z') { e.preventDefault(); undo(); }
      else if (mod && (k === 'y' || (e.shiftKey && k === 'z'))) { e.preventDefault(); redo(); }
      else if (mod && k === 's') { e.preventDefault(); handleSave(); }
      else if (mod || e.altKey) { return; }
      else if (k === 'arrowleft' || e.key === 'PageUp') { e.preventDefault(); renderPage(currentPage - 1); }
      else if (k === 'arrowright' || e.key === 'PageDown') { e.preventDefault(); renderPage(currentPage + 1); }
      else if ((k === 'delete' || k === 'backspace') && activeImg) { e.preventDefault(); previewImgEdit('del', activeImg); setActiveImg(null); }
      else if (k === '+' || k === '=') setScale(s => Math.min(3, s + 0.15));
      else if (k === '-') setScale(s => Math.max(0.5, s - 0.15));
      else {
        const toolMap = {
          p: 'pointer', e: 'edit', t: 'add', i: 'image', h: 'highlight',
          r: 'redact', u: 'underline', s: 'strikeout', d: 'draw', x: 'erase',
        };
        if (toolMap[k]) handleModeChange(toolMap[k]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImg, currentPage, scale]);

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
        if (b.redact) { edits.push({ action: 'redact', rect, color: c255(b.redactColor || '#000000') }); continue; }
        if (b.hidden) { edits.push({ action: 'whiteout', rect, bg: bg255 }); continue; }
        if (b.edited) {
          const l0 = b.lines[0] || b;
          edits.push({
            action: 'replace', rect, text: b.text ?? '',
            baseline: [l0.vx / scale, l0.baselineY / scale],
            // original per-line positions — backend draws each line at its own
            // x/baseline when line count matches (keeps indents & alignment)
            lines: (b.lines || []).map(l => [l.vx / scale, l.baselineY / scale]),
            fontSize: b.sizeOverride || b.pdfFs, maxWidth: b.vw / scale,
            // free room inside the cell — backend shrinks wrapped text to fit
            maxH: b.roomH ? b.roomH / scale : null,
            font: b.font?.realName || '',
            family: b.fontOverride || null,
            bold: b.cBold ?? null,
            italic: b.cItalic ?? null,
            bg: bg255,
            color: fg255,
            lineHeight: (b.lineH || b.vFontH * 1.22) / (scale * b.pdfFs),
          });
        }
        const lineRects = (b.lines || []).map(l =>
          [l.vx / scale, l.vy / scale, (l.vx + l.vw) / scale, (l.vy + l.vh) / scale]);
        if (b.hl) edits.push({ action: 'highlight', rects: lineRects, color: c255(b.hlColor || '#ffeb3b') });
        if (b.uline) edits.push({ action: 'underline', rects: lineRects, color: c255(b.ulColor || '#000000') });
        if (b.strike) {
          // send a band centered on the strike position (~x-height middle,
          // same spot as the canvas preview + pdf-lib path) so viewers draw
          // the annot's line mid-rect at the right height
          const strikeRects = (b.lines || []).map(l => {
            const cy = (l.vy + l.vh * 0.61) / scale;
            const half = (l.vh * 0.3) / scale;
            return [l.vx / scale, cy - half, (l.vx + l.vw) / scale, cy + half];
          });
          edits.push({ action: 'strikeout', rects: strikeRects, color: c255(b.strikeColor || '#000000') });
        }
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
      // previewed image edits — go with the same payload; replacement files
      // travel as separate form fields (imgIdx indexes into them)
      for (const e of (imgEdits[parseInt(pno, 10)] || [])) {
        if (e.kind === 'move') {
          // grouped products move member-by-member — same shift for all
          const dx = e.curRect[0] - e.rect[0], dy = e.curRect[1] - e.rect[1];
          const members = e.members?.length ? e.members : [{ xref: e.xref, rect: e.rect }];
          for (const m of members) {
            edits.push({
              action: 'imgmove', xref: m.xref, rect: m.rect,
              new: [m.rect[0] + dx, m.rect[1] + dy, m.rect[2] + dx, m.rect[3] + dy],
            });
          }
        } else if (e.kind === 'del') {
          edits.push({ action: 'imgdel', xref: e.xref, rect: e.rect });
        } else if (e.kind === 'rep' && e.file) {
          repImgFiles.current.push(e.file);
          edits.push({ action: 'imgreplace', xref: e.xref, rect: e.curRect || e.rect, imgIdx: repImgFiles.current.length - 1 });
        }
      }
      if (edits.length) pages[pno] = { edits };
    }
    return { pages };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      repImgFiles.current = [];
      const payload = buildEditsPayload();
      const fd = new FormData();
      fd.append('file', curFile);
      fd.append('edits', JSON.stringify(payload));
      repImgFiles.current.forEach(f => fd.append('imgs', f));
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
    const buf = await curFile.arrayBuffer();
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
          const rc = hexToRgb(b.redactColor || '#000000');
          page.drawRectangle({
            x: b.vx / scale, y: topPdf - b.vh / scale,
            width: b.vw / scale, height: b.vh / scale,
            color: rgb(rc.r, rc.g, rc.b),
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
            const font = pick(b.cBold ?? b.font?.bold ?? flags.bold, b.cItalic ?? b.font?.italic ?? flags.italic, flags.pdfFamily);
            let fs = b.sizeOverride || b.pdfFs;
            let lh = b.lineH ? b.lineH / scale : fs * 1.22;
            let wrapped = wrapText(b.text, font, fs, b.vw / scale);
            // shrink so the wrapped text stays inside the cell's free room
            const room = b.roomH ? b.roomH / scale : null;
            while (room && wrapped.length * lh > room && fs > (b.sizeOverride || b.pdfFs) * 0.35) {
              fs *= 0.9; lh = b.lineH ? fs * (b.lineH / (scale * b.pdfFs)) : fs * 1.22;
              wrapped = wrapText(b.text, font, fs, b.vw / scale);
            }
            const c = hexToRgb(b.color || '#000000');
            const draftLines = b.text.split('\n');
            if (b.lines?.length > 1 && draftLines.length === b.lines.length) {
              // draw each line at its original position (keeps indents/alignment)
              draftLines.forEach((ln, i) => {
                if (ln.trim()) page.drawText(ln, { x: b.lines[i].pdfX, y: b.lines[i].pdfY, size: fs, font, color: rgb(c.r, c.g, c.b) });
              });
            } else {
              wrapped.forEach((ln, i) => {
                page.drawText(ln, {
                  x: b.pdfX, y: b.pdfY - i * lh,
                  size: fs, font, color: rgb(c.r, c.g, c.b),
                });
              });
            }
          }
        }
        if (b.hl) {
          const hc = hexToRgb(b.hlColor || '#ffeb3b');
          page.drawRectangle({
            x: b.vx / scale, y: topPdf - Math.max(b.vh, b.vhDrawn || 0) / scale,
            width: b.vw / scale, height: Math.max(b.vh, b.vhDrawn || 0) / scale,
            color: rgb(hc.r, hc.g, hc.b), opacity: 0.45,
          });
        }
        for (const ln of b.lines || []) {
          if (b.uline) {
            const uc = hexToRgb(b.ulColor || '#000000');
            page.drawLine({
              start: { x: ln.pdfX, y: ln.pdfY - ln.pdfFs * 0.12 },
              end: { x: ln.pdfX + ln.pdfW, y: ln.pdfY - ln.pdfFs * 0.12 },
              thickness: Math.max(0.4, ln.pdfFs * 0.05), color: rgb(uc.r, uc.g, uc.b),
            });
          }
          if (b.strike) {
            const sc = hexToRgb(b.strikeColor || '#000000');
            page.drawLine({
              start: { x: ln.pdfX, y: ln.pdfY + ln.pdfFs * 0.3 },
              end: { x: ln.pdfX + ln.pdfW, y: ln.pdfY + ln.pdfFs * 0.3 },
              thickness: Math.max(0.4, ln.pdfFs * 0.05), color: rgb(sc.r, sc.g, sc.b),
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
  useEffect(() => { const t = setTimeout(loadPdf, 0); return () => clearTimeout(t); }, [curFile]);

  // keyboard shortcuts: Cmd/Ctrl+Z undo, Cmd+Shift+Z / Ctrl+Y redo
  useEffect(() => {
    const onKey = (e) => {
      // don't hijack undo while typing in the edit box
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault(); redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData, currentPage]);

  // re-render page when zoom changes (skip initial mount)
  useEffect(() => {
    if (firstScale.current) { firstScale.current = false; return; }
    editSnap.current = null; // clear snapshot on zoom
    decSnap.current.clear();
    renderPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // ---------- UI ----------

  const cur = getCur();
  const activeBlock = activeEdit?.type === 'block' ? cur.blocks.find(b => b.id === activeEdit.id) : null;

  // Edit box geometry — pinned to the original cell width so the box never
  // grows past the cell edge / gets clipped under the container side;
  // the draft wraps inside (wordBreak). The font shrinks the same way the
  // committed render does so a long draft stays INSIDE the cell's free room
  // instead of the box crossing the line into the row below
  let taW = 140, taH = 24, taFs = 12, taLh = 15;
  if (activeBlock) {
    const fi = activeBlock.font || {};
    const baseFs = fmt.sizeTouched ? fmt.fontSize * scale : activeBlock.vFontH;
    taW = activeBlock.vw + 10;
    const contentW = taW - 10; // textarea padding + border allowance
    // free vertical room inside the cell — space down to the next block
    let belowTop = Infinity;
    for (const ob of cur.blocks) {
      if (ob.id === activeBlock.id) continue;
      const ov = Math.min(activeBlock.vx + activeBlock.vw, ob.vx + ob.vw) - Math.max(activeBlock.vx, ob.vx);
      if (ob.vy > activeBlock.vy + activeBlock.vFontH * 0.4 && ov > activeBlock.vw * 0.3) belowTop = Math.min(belowTop, ob.vy);
    }
    const room = belowTop === Infinity ? activeBlock.vh * 1.2 : Math.max(activeBlock.vh, belowTop - activeBlock.vy - 2);
    const lhRatio = activeBlock.lineH && activeBlock.vFontH ? activeBlock.lineH / activeBlock.vFontH : 1.22;
    const draft = activeEdit.draft || '';
    const fullFs = baseFs * 0.95;
    let fsPx = fullFs;
    const countLines = (fp) => {
      const words = draft.split(/\s+/).flatMap((w) => {
        if (measureW(w, fi, fp) <= contentW) return [w];
        const parts = [];
        let cur = '';
        for (const ch of w) {
          if (cur && measureW(cur + ch, fi, fp) > contentW) { parts.push(cur); cur = ch; }
          else cur += ch;
        }
        if (cur) parts.push(cur);
        return parts;
      });
      let n = 0, line = '';
      for (const w of words) {
        const trial = line ? `${line} ${w}` : w;
        if (line && measureW(trial, fi, fp) > contentW) { n++; line = w; }
        else line = trial;
      }
      return Math.max(n + (line ? 1 : 0), 1);
    };
    let n = countLines(fsPx);
    while (n > 1 && fsPx > fullFs * 0.35) {
      // prefer keeping it on one line; once wrapping is unavoidable keep
      // shrinking until the wrapped lines fit inside the cell's room
      if (!draft.includes('\n') && fsPx > fullFs * 0.5) { fsPx *= 0.93; }
      else if (n * fsPx * lhRatio > room) { fsPx *= 0.9; }
      else break;
      n = countLines(fsPx);
    }
    taFs = fsPx / 0.95;
    taLh = fsPx * lhRatio;
    taH = Math.min(Math.max(activeBlock.vh + 6, n * taLh + 8), room + 12);
  }

  const handleModeChange = (id) => {
    cancelEdit();
    editSnap.current = null; // clear snapshot when mode changes
    setActiveImg(null);
    setMode(id);
  };

  const toolBtn = (id, Icon, label) => (
    <button
      key={id}
      onClick={() => handleModeChange(id)}
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
            <Logo iconSize={22} textClass="text-sm font-black" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Editor</span>
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
            className="ml-2 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
        {toolBtn('image', ImageIcon, 'Image')}
        {toolBtn('redact', Ban, 'Redact')}
        {toolBtn('highlight', Highlighter, 'Highlight')}
        {toolBtn('underline', Underline, 'Underline')}
        {toolBtn('strikeout', Strikethrough, 'Strikeout')}
        {toolBtn('draw', PenTool, 'Drawing')}
        {toolBtn('erase', Eraser, 'Eraser')}

        {/* per-tool color picker — visible when a color-capable tool is active */}
        {toolColors[mode] && (
          <div className="flex items-center space-x-1.5 pl-2 ml-1 border-l border-slate-200">
            <input
              type="color"
              value={toolColors[mode]}
              onChange={(e) => setToolColors(c => ({ ...c, [mode]: e.target.value }))}
              className="w-6 h-6 rounded border border-slate-300 cursor-pointer"
              title={`${mode} color`}
            />
            <span className="text-[9px] font-semibold text-slate-500 uppercase">{mode} color</span>
          </div>
        )}

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

      {/* Formatting mini-toolbar is rendered as a floating bar above the
          active edit box — see the overlay layer below */}

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
                    } ${isActive ? '' : hovered && !['pointer', 'add', 'draw', 'erase'].includes(mode) ? 'outline-1 outline-dashed outline-blue-400 bg-blue-50/20' : ''}`}
                    style={{
                      left: b.vx, top: b.vy, width: b.vw,
                      height: Math.max(b.vh, b.vhDrawn || 0),
                      pointerEvents: 'auto',
                    }}
                  />
                );
              })}

              {/* draggable added text — DOM elements so they can be moved,
                  double-clicked to re-edit, or deleted */}
              {(cur.added || []).map(a => (
                <div
                  key={a.id}
                  onMouseDown={(e) => startDragAdded(e, a)}
                  onDoubleClick={(e) => { e.stopPropagation(); reEditAdded(a); }}
                  className="absolute group select-none"
                  style={{
                    left: a.vx, top: a.vy,
                    color: a.color || '#000000',
                    fontFamily: cssFor(a.family),
                    fontSize: a.vFontH,
                    fontWeight: a.bold ? 'bold' : 'normal',
                    fontStyle: a.italic ? 'italic' : 'normal',
                    textDecoration: a.underline ? 'underline' : 'none',
                    lineHeight: 1.2, whiteSpace: 'pre',
                    cursor: ['draw', 'erase'].includes(mode) ? 'default' : 'move',
                    pointerEvents: ['draw', 'erase'].includes(mode) ? 'none' : 'auto',
                    zIndex: 15,
                  }}
                >
                  {a.text}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAdded(a); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="hidden group-hover:flex absolute -top-2.5 -right-2.5 w-4 h-4 items-center justify-center bg-red-500 text-white rounded-full cursor-pointer"
                    title="Delete"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* image hotspots — clickable in Image tool AND Pointer mode so
                  pictures are always editable without switching tools first */}
              {(mode === 'image' || mode === 'pointer') && groupImgs(pageImgs[currentPage] || []).map((im) => {
                const [x0, y0, x1, y1] = (imgEdits[currentPage] || []).find(e => e.key === imgKey(im))?.curRect || im.rect;
                const ghost = imgGhost && imgGhost.im === im ? imgGhost : null;
                const vx = x0 * scale + (ghost ? ghost.dx : 0);
                const vy = y0 * scale + (ghost ? ghost.dy : 0);
                const isSel = activeImg && activeImg.xref === im.xref && String(activeImg.rect) === String(im.rect);
                return (
                  <div
                    key={`${im.xref}-${x0}-${y0}`}
                    onClick={(e) => { e.stopPropagation(); setActiveImg({ ...im, vx, vy }); }}
                    onMouseDown={(e) => {
                      e.stopPropagation(); e.preventDefault();
                      imgDrag.current = { im, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 };
                      setActiveImg({ ...im, vx, vy });
                    }}
                    title="Drag to move · click for Replace/Remove"
                    className={`absolute cursor-move transition-colors ${
                      ghost ? 'outline-2 outline-dashed outline-rose-500' :
                      isSel ? 'outline-2 outline-rose-500' : 'hover:outline-1 hover:outline-dashed hover:outline-blue-400'
                    }`}
                    style={{ left: vx, top: vy, width: (x1 - x0) * scale, height: (y1 - y0) * scale, pointerEvents: 'auto' }}
                  />
                );
              })}

              {/* image action popup — Replace / Remove (follows the image as it moves) */}
              {(mode === 'image' || mode === 'pointer') && activeImg && (() => {
                const [px0, py0] = (imgEdits[currentPage] || []).find(e => e.key === imgKey(activeImg))?.curRect || activeImg.rect;
                return (
                <div
                  className="absolute z-40 bg-white rounded-lg shadow-lg border border-slate-200 px-1 py-1 flex items-center space-x-1 text-xs font-bold whitespace-nowrap"
                  style={{ left: px0 * scale, top: Math.max(4, py0 * scale - 42), pointerEvents: 'auto' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => imgInputRef.current?.click()}
                    className="px-2.5 py-1.5 hover:bg-slate-100 rounded cursor-pointer text-slate-700"
                  >Replace…</button>
                  <button
                    onClick={() => { previewImgEdit('del', activeImg); setActiveImg(null); }}
                    className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >Remove</button>
                  <button
                    onClick={() => setActiveImg(null)}
                    className="px-1.5 py-1.5 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                  >✕</button>
                </div>
                );
              })()}

              {/* erase drag preview */}
              {eraseRect && (
                <div
                  className="absolute border-2 border-dashed border-red-400 bg-white/60"
                  style={{ left: eraseRect.x, top: eraseRect.y, width: eraseRect.w, height: eraseRect.h, pointerEvents: 'none' }}
                />
              )}

              {/* Floating format bar — pdfsimpli style, right above the box */}
              {activeBlock && (
                <div
                  className="absolute z-40 flex items-center space-x-1.5 bg-white rounded-lg shadow-lg border border-slate-200 px-2 py-1"
                  style={{
                    left: Math.max(4, activeBlock.vx),
                    top: activeBlock.vy > 52 ? activeBlock.vy - 46 : activeBlock.vy + taH + 8,
                    pointerEvents: 'auto',
                  }}
                >
                  <select
                    value={fmt.family}
                    onChange={(e) => setFmt(f => ({ ...f, family: e.target.value, fontTouched: true }))}
                    className="px-1.5 py-1 border border-slate-300 rounded text-[11px] font-medium max-w-[140px] cursor-pointer"
                  >
                    {!fontOptions.includes(fmt.family) && <option>{fmt.family}</option>}
                    {fontOptions.map(f => <option key={f}>{f}</option>)}
                  </select>
                  <input
                    type="number" min={6} max={96} value={fmt.fontSize}
                    onChange={(e) => setFmt(f => ({ ...f, fontSize: parseInt(e.target.value) || 12, sizeTouched: true }))}
                    className="w-12 px-1.5 py-1 border border-slate-300 rounded text-center text-[11px] font-medium"
                  />
                  <button onClick={() => setFmt(f => ({ ...f, bold: !f.bold, boldTouched: true }))} className={`p-1 rounded cursor-pointer ${fmt.bold ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`} title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setFmt(f => ({ ...f, italic: !f.italic, italicTouched: true }))} className={`p-1 rounded cursor-pointer ${fmt.italic ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`} title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setFmt(f => ({ ...f, underline: !f.underline }))} className={`p-1 rounded cursor-pointer ${fmt.underline ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`} title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                  <input type="color" value={fmt.color} onChange={(e) => setFmt(f => ({ ...f, color: e.target.value, colorTouched: true }))} className="w-6 h-6 rounded border border-slate-300 cursor-pointer" title="Text color" />
                  <div className="h-4 w-px bg-slate-300" />
                  <button onClick={commitBlockEdit} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded cursor-pointer">OK</button>
                  <button onClick={cancelEdit} className="px-2 py-1 border border-slate-300 hover:bg-slate-100 text-[11px] font-bold rounded cursor-pointer">Cancel</button>
                </div>
              )}

              {/* hidden picker for the replacement image */}
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && activeImg) {
                    const imgEl = new Image();
                    imgEl.onload = () => previewImgEdit('rep', activeImg, { file: f, imgEl });
                    imgEl.src = URL.createObjectURL(f);
                  }
                  e.target.value = '';
                }}
              />

              {/* Active block editor */}
              {activeBlock && (
                <textarea
                  autoFocus
                  spellCheck={false}
                  value={activeEdit.draft}
                  onChange={(e) => setActiveEdit(a => ({ ...a, draft: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEdit();
                    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitBlockEdit(); }
                  }}
                  className="absolute z-30 border-2 border-rose-500 rounded-sm px-0.5 py-0 outline-none resize-none overflow-hidden"
                  style={{
                    left: activeBlock.vx, top: activeBlock.vy,
                    width: taW,
                    height: taH,
                    backgroundColor: activeBlock.bgColor ? rgbCss(activeBlock.bgColor) : '#ffffff',
                    fontSize: taFs,
                    lineHeight: `${taLh}px`,
                    // real embedded font — bold/italic are inside the font itself
                    fontFamily: fmt.fontTouched ? `"${fmt.family}", sans-serif` : (activeBlock.font?.family || cssFor(fmt.family)),
                    fontWeight: (fmt.boldTouched ? fmt.bold : activeBlock.cBold ?? activeBlock.font?.bold) ? 'bold' : 'normal',
                    fontStyle: (fmt.italicTouched ? fmt.italic : activeBlock.cItalic ?? activeBlock.font?.italic) ? 'italic' : 'normal',
                    textDecoration: 'none',
                    color: fmt.color,
                    caretColor: fmt.color,
                    // wrap long words inside the cell-width box instead of
                    // growing past the edge
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    pointerEvents: 'auto',
                  }}
                />
              )}

              {/* Floating format bar for Add Text */}
              {pendingAdd && activeEdit?.type === 'add' && (
                <div
                  className="absolute z-40 flex items-center space-x-1.5 bg-white rounded-lg shadow-lg border border-slate-200 px-2 py-1"
                  style={{
                    left: Math.max(4, pendingAdd.vx),
                    top: pendingAdd.vy > 52 ? pendingAdd.vy - 46 : pendingAdd.vy + 34,
                    pointerEvents: 'auto',
                  }}
                >
                  <select
                    value={fmt.family}
                    onChange={(e) => setFmt(f => ({ ...f, family: e.target.value }))}
                    className="px-1.5 py-1 border border-slate-300 rounded text-[11px] font-medium max-w-[140px] cursor-pointer"
                  >
                    {fontOptions.map(f => <option key={f}>{f}</option>)}
                  </select>
                  <input
                    type="number" min={6} max={96} value={fmt.fontSize}
                    onChange={(e) => setFmt(f => ({ ...f, fontSize: parseInt(e.target.value) || 12 }))}
                    className="w-12 px-1.5 py-1 border border-slate-300 rounded text-center text-[11px] font-medium"
                  />
                  <button onClick={() => setFmt(f => ({ ...f, bold: !f.bold }))} className={`p-1 rounded cursor-pointer ${fmt.bold ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`} title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setFmt(f => ({ ...f, italic: !f.italic }))} className={`p-1 rounded cursor-pointer ${fmt.italic ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`} title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setFmt(f => ({ ...f, underline: !f.underline }))} className={`p-1 rounded cursor-pointer ${fmt.underline ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`} title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                  <input type="color" value={fmt.color} onChange={(e) => setFmt(f => ({ ...f, color: e.target.value, colorTouched: true }))} className="w-6 h-6 rounded border border-slate-300 cursor-pointer" title="Text color" />
                  <div className="h-4 w-px bg-slate-300" />
                  <button onClick={commitAddText} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded cursor-pointer">OK</button>
                  <button onClick={() => { setPendingAdd(null); setActiveEdit(null); }} className="px-2 py-1 border border-slate-300 hover:bg-slate-100 text-[11px] font-bold rounded cursor-pointer">Cancel</button>
                </div>
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
