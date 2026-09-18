// Template -> PDF generation, download and print.
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { W, ACCENTS } from './templatePdfWriter.js';
import { LAYOUTS } from './templatePdfLayouts.js';

export async function generateTemplatePdf(tpl, values) {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    reg: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    // serif set for classic/elegant themes
    sreg: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    sbold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    sitalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const w = new W(pdfDoc, fonts);
  w.theme = tpl.theme || 'modern';
  w.variant = tpl.variant;
  if (w.theme === 'classic' || w.theme === 'elegant') {
    w.f = { reg: fonts.sreg, bold: fonts.sbold, italic: fonts.sitalic };
  }

  // embed any uploaded images (logo fields)
  const images = {};
  for (const s of tpl.sections || []) {
    if (s.type !== 'fields') continue;
    for (const fd of s.fields) {
      if (fd.type !== 'image') continue;
      const dataUrl = values[s.key]?.[fd.key];
      if (!dataUrl || typeof dataUrl !== 'string') continue;
      try {
        const bytes = await (await fetch(dataUrl)).arrayBuffer();
        const img = dataUrl.includes('image/png')
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
        images[fd.key] = { img };
      } catch {
        /* skip unreadable image */
      }
    }
  }

  if (tpl.accent && ACCENTS[tpl.accent]) w.accent = ACCENTS[tpl.accent];
  const layout =
    (tpl.docType === 'cv' && tpl.layout === 'sidebar' ? LAYOUTS.cvSidebar
      : tpl.docType === 'cv' && tpl.layout === 'topband' ? LAYOUTS.cvTopband
      : LAYOUTS[tpl.docType]) || LAYOUTS.form;
  layout(w, tpl, values, images);
  return pdfDoc.save();
}

export function pdfBlobUrl(bytes) {
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export function downloadPdf(bytes, filename) {
  const url = pdfBlobUrl(bytes);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Print the generated PDF via a hidden iframe (print dialog on the PDF itself)
export function printPdf(bytes) {
  const url = pdfBlobUrl(bytes);
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      window.open(url, '_blank');
    }
  };
  document.body.appendChild(frame);
  setTimeout(() => {
    document.body.removeChild(frame);
    URL.revokeObjectURL(url);
  }, 60000);
}
