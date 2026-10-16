#!/usr/bin/env python3
"""
Apply text edits to a PDF while preserving the ORIGINAL embedded fonts.

Usage:
    python3 edit_pdf_text.py <input.pdf> <output.pdf> <edits.json>

edits.json structure:
{
  "pages": {
    "1": {
      "edits": [
        {"action": "replace", "rect": [x0,y0,x1,y1], "text": "...",
         "baseline": [x, y], "fontSize": 12, "maxWidth": 300,
         "color": [r,g,b], "lineHeight": 1.22},
        {"action": "whiteout",  "rect": [...]},
        {"action": "redact",    "rect": [...]},
        {"action": "highlight", "rects": [[...], ...]},
        {"action": "underline", "rects": [[...], ...]},
        {"action": "strikeout", "rects": [[...], ...]},
        {"action": "add", "baseline": [x,y], "text": "...",
         "fontSize": 12, "color": [r,g,b], "bold": false, "italic": false,
         "family": "Helvetica|Times New Roman|Courier New"},
        {"action": "draw", "segments": [[[x1,y1],[x2,y2]], ...],
         "color": [r,g,b], "width": 2}
      ]
    }
  }
}

All coordinates are in PDF user units with TOP-LEFT origin (PyMuPDF style):
x grows right, y grows downward.
"""
import sys
import os
import json
import re
import tempfile

import fitz  # PyMuPDF


def srgb(c):
    """Normalize a color: accept int sRGB or [r,g,b] in 0..1 or 0..255."""
    if isinstance(c, int):
        return ((c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255)
    if isinstance(c, (list, tuple)) and len(c) >= 3:
        vals = [float(v) for v in c[:3]]
        if max(vals) > 1.0:
            vals = [v / 255 for v in vals]
        return tuple(vals)
    return (0, 0, 0)


def dominant_bg(page, rect):
    """Sample the page background color under a rect via a rendered pixmap.

    Only the OUTER BORDER ring of the rect is considered — glyph pixels almost
    never reach the edges, so bold/large text can't be mistaken for background.
    Returns an (r,g,b) tuple in 0..1. Falls back to white."""
    try:
        pix = page.get_pixmap(clip=fitz.Rect(rect), matrix=fitz.Matrix(1, 1))
        n = pix.n
        data = pix.samples
        W, H = pix.width, pix.height
        border = max(1, round(min(W, H) * 0.18))
        counts = {}
        sums = {}
        step = max(1, (W * H) // 4000)
        rows = list(range(0, min(border, H), step)) + list(range(max(0, H - border), H, step))
        cols = list(range(0, min(border, W), step)) + list(range(max(0, W - border), W, step))
        for py in rows:
            for px in range(0, W, step):
                o = (py * W + px) * n
                key = (data[o] >> 5, data[o + 1] >> 5, data[o + 2] >> 5)
                counts[key] = counts.get(key, 0) + 1
                s = sums.get(key) or [0, 0, 0]
                s[0] += data[o]; s[1] += data[o + 1]; s[2] += data[o + 2]
                sums[key] = s
        for px in cols:
            for py in range(border, H - border, step):
                o = (py * W + px) * n
                key = (data[o] >> 5, data[o + 1] >> 5, data[o + 2] >> 5)
                counts[key] = counts.get(key, 0) + 1
                s = sums.get(key) or [0, 0, 0]
                s[0] += data[o]; s[1] += data[o + 1]; s[2] += data[o + 2]
                sums[key] = s
        if not counts:
            return (1, 1, 1)
        top = max(counts, key=counts.get)
        s = sums[top]
        c = counts[top]
        return (round(s[0] / c) / 255, round(s[1] / c) / 255, round(s[2] / c) / 255)
    except Exception:
        return (1, 1, 1)


def dominant_span(page, rect):
    """Return (font_name, size, color_int, origin) of the dominant span in rect."""
    best = None
    best_len = 0
    data = page.get_text("dict", clip=fitz.Rect(rect))
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                t = span.get("text", "")
                if len(t) > best_len:
                    best_len = len(t)
                    best = (span.get("font", ""), span.get("size", 11),
                            span.get("color", 0), span.get("origin"))
    return best


def extract_font_file(doc, page, span_font_name):
    """Find the embedded font file for a span font name. Returns path or None."""
    if not span_font_name:
        return None
    want = re.sub(r"[^a-z0-9]", "", (span_font_name or "").lower())
    for f in page.get_fonts(full=True):
        # tuple: (xref, ext, type, basefont, name, encoding, ...)
        xref, ext, basefont = f[0], f[1], f[3] or ""
        plain = basefont.split("+")[-1]
        base_n = re.sub(r"[^a-z0-9]", "", basefont.lower())
        plain_n = re.sub(r"[^a-z0-9]", "", plain.lower())
        if want and (want == base_n or want == plain_n or want in base_n
                     or base_n in want or plain_n in want or want in plain_n):
            try:
                _base, fext, _type, buf = doc.extract_font(xref)
                if buf:
                    fd, path = tempfile.mkstemp(suffix="." + (fext or "ttf"))
                    with os.fdopen(fd, "wb") as fh:
                        fh.write(buf)
                    return path
            except Exception:
                return None
    return None


def _norm_font_name(n):
    return re.sub(r"[^a-z0-9]", "", (n or "").split("+")[-1].lower())


_STYLE_RE = re.compile(r"bold|black|heavy|semibold|demi|italic|oblique|light|thin|regular|normal|roman|medium|bd|it|mt|ps|bld|\d+")


def find_system_font(span_font_name, bold=False, italic=False):
    """Locate a matching font file in the OS font directories.

    Used when the embedded font is a subset missing glyphs, or when the PDF
    references a non-embedded font. Returns a file path or None."""
    dirs = [r"C:\Windows\Fonts", "/usr/share/fonts", "/usr/local/share/fonts",
            "/Library/Fonts", os.path.expanduser("~/.fonts")]
    root = next((d for d in dirs if os.path.isdir(d)), None)
    if not root:
        return None
    want = _norm_font_name(span_font_name)
    if not want:
        return None
    core = _STYLE_RE.sub("", want)  # e.g. "arialboldmt" -> "arial"
    best, best_score = None, 0
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if not fn.lower().endswith((".ttf", ".otf", ".ttc")):
                continue
            stem = _norm_font_name(os.path.splitext(fn)[0])
            stem_core = _STYLE_RE.sub("", stem)
            if core and stem_core == core:
                score = 4
            elif core and len(core) >= 3 and (core in stem or (stem_core and stem_core in core)):
                score = 2
            elif want in stem or stem in want:
                score = 1
            else:
                continue
            s_bold = bool(re.search(r"bd|bold|black|heavy|semibold|demi|bld|bi$|b$|z$", stem))
            s_ital = bool(re.search(r"ital|oblique|obli|bi$|i$|z$|it$", stem))
            score += 1 if s_bold == bold else -1
            score += 1 if s_ital == italic else -1
            if score > best_score:
                best, best_score = os.path.join(dirpath, fn), score
    return best


def builtin_font_name(span_font_name, bold=False, italic=False):
    """Fallback PyMuPDF Base-14 font name."""
    n = (span_font_name or "").lower()
    if "cour" in n or "mono" in n:
        base = "co"
    elif ("serif" in n or "times" in n or "roman" in n or "georgia" in n
          or "palatino" in n or "book" in n) and "sans" not in n:
        base = "ti"
    else:
        base = "he"
    if bold and italic:
        return {"he": "hebi", "ti": "tibi", "co": "cobi"}[base]
    if bold:
        return {"he": "hebo", "ti": "tibo", "co": "cobo"}[base]
    if italic:
        return {"he": "heit", "ti": "tiit", "co": "coit"}[base]
    return {"he": "helv", "ti": "tiro", "co": "cour"}[base]


def wrap_lines(font, text, fontsize, max_width):
    """Greedy word-wrap using real font metrics."""
    out = []
    for para in text.split("\n"):
        cur = ""
        for w in para.split(" "):
            trial = (cur + " " + w).strip()
            if cur and font.text_length(trial, fontsize=fontsize) > max_width:
                out.append(cur)
                cur = w
            else:
                cur = trial
        out.append(cur)
    return out


def apply_replace(doc, page, e):
    """Whiteout original text then re-insert with the SAME embedded font."""
    rect = fitz.Rect(e["rect"])
    text = e.get("text", "")
    color = srgb(e.get("color", [0, 0, 0]))
    size = float(e.get("fontSize") or 0)
    max_w = float(e.get("maxWidth") or rect.width)

    # 1. discover original font BEFORE redacting — prefer the real font name
    #    detected in the browser (pdf.js FontFaceObject.name == PDF BaseFont)
    span = dominant_span(page, rect)
    span_font = e.get("font") or (span[0] if span else "")
    if not size:
        size = span[1] if span else 11
    if span and e.get("color") is None:
        color = srgb(span[2])

    fontfile = extract_font_file(doc, page, span_font)
    if not fontfile and span and span[0] and span[0] != span_font:
        # browser-detected name didn't match — try PyMuPDF's own span font name
        fontfile = extract_font_file(doc, page, span[0])
    n = " ".join(filter(None, [span_font, span[0] if span else ""])).lower()
    bold = bool(re.search(r"bold|black|heavy|semibold|demi", n))
    italic = bool(re.search(r"italic|oblique|slant", n))
    base_name = span_font or (span[0] if span else "")
    fontname = "F0" if fontfile else builtin_font_name(base_name, bold, italic)
    try:
        mfont = fitz.Font(fontfile=fontfile) if fontfile else fitz.Font(fontname)
    except Exception:
        mfont = fitz.Font("helv")
        fontfile = None
        fontname = "helv"

    need_system_font = False
    if fontfile and text.strip():
        # Embedded fonts are usually SUBSETS containing only the glyphs the
        # doc already used — new characters would render as blanks/boxes.
        need_system_font = any(ord(c) > 31 and not mfont.has_glyph(ord(c)) for c in text)
    elif not fontfile:
        # PDF referenced a non-embedded font — the OS likely has it installed.
        need_system_font = True

    if need_system_font and text.strip():
        sys_font = find_system_font(base_name, bold, italic)
        if sys_font:
            try:
                mfont = fitz.Font(fontfile=sys_font)
                fontfile = sys_font
                fontname = "F0"
            except Exception:
                sys_font = None
        if not sys_font:
            fontfile = None
            fontname = builtin_font_name(base_name, bold, italic)
            try:
                mfont = fitz.Font(fontname)
            except Exception:
                mfont = fitz.Font("helv")
                fontname = "helv"

    # 2. remove original text (text-only redaction, keep images/vector art)
    #    fill with the real background color — NOT always white (dark headers!)
    bg = srgb(e["bg"]) if e.get("bg") is not None else dominant_bg(page, rect)
    page.add_redact_annot(rect, fill=bg)
    page.apply_redactions(
        images=fitz.PDF_REDACT_IMAGE_NONE,
        graphics=fitz.PDF_REDACT_LINE_ART_NONE,
        text=fitz.PDF_REDACT_TEXT_REMOVE,
    )

    if not text.strip():
        return

    # 3. re-insert wrapped text with the original font
    bx, by = e.get("baseline", [rect.x0, rect.y0 + size * 0.8])
    lh = size * float(e.get("lineHeight") or 1.22)
    for i, ln in enumerate(wrap_lines(mfont, text, size, max_w)):
        kw = dict(fontsize=size, color=color, render_mode=0)
        if fontfile:
            kw.update(fontname=fontname, fontfile=fontfile)
        else:
            kw.update(fontname=fontname)
        page.insert_text((bx, by + i * lh), ln, **kw)


def apply_edit(doc, page, e):
    action = e.get("action")
    if action == "replace":
        apply_replace(doc, page, e)
        return

    if action in ("whiteout", "redact"):
        if action == "redact":
            fill = (0, 0, 0)
        else:
            fill = srgb(e["bg"]) if e.get("bg") is not None else dominant_bg(page, fitz.Rect(e["rect"]))
        page.add_redact_annot(fitz.Rect(e["rect"]), fill=fill)
        page.apply_redactions(
            images=fitz.PDF_REDACT_IMAGE_NONE,
            graphics=fitz.PDF_REDACT_LINE_ART_NONE,
            text=fitz.PDF_REDACT_TEXT_REMOVE,
        )
        return

    if action == "highlight":
        for r in e.get("rects", []):
            try:
                page.add_highlight_annot(fitz.Rect(r))
            except Exception:
                pass
        return

    if action == "underline":
        for r in e.get("rects", []):
            try:
                page.add_underline_annot(fitz.Rect(r))
            except Exception:
                pass
        return

    if action == "strikeout":
        for r in e.get("rects", []):
            try:
                page.add_strikeout_annot(fitz.Rect(r))
            except Exception:
                pass
        return

    if action == "add":
        bx, by = e["baseline"]
        size = float(e.get("fontSize") or 12)
        color = srgb(e.get("color", [0, 0, 0]))
        fname = builtin_font_name(e.get("family", "Helvetica"),
                                  e.get("bold"), e.get("italic"))
        page.insert_text((bx, by), e.get("text", ""),
                         fontname=fname, fontsize=size, color=color)
        return

    if action == "draw":
        color = srgb(e.get("color", [0.86, 0.15, 0.15]))
        width = float(e.get("width") or 1.5)
        shape = page.new_shape()
        for seg in e.get("segments", []):
            if len(seg) >= 2:
                shape.draw_line(fitz.Point(seg[0]), fitz.Point(seg[1]))
        shape.finish(color=color, width=width)
        shape.commit()
        return


def main():
    inp, outp, edits_path = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(edits_path) as fh:
        payload = json.load(fh)

    doc = fitz.open(inp)
    for page_key, pdata in (payload.get("pages") or {}).items():
        pno = int(page_key) - 1
        if pno < 0 or pno >= len(doc):
            continue
        page = doc[pno]
        for e in pdata.get("edits", []):
            try:
                apply_edit(doc, page, e)
            except Exception as ex:
                print(f"edit failed p{page_key}: {ex}", file=sys.stderr)

    doc.save(outp, garbage=3, deflate=True)
    doc.close()


if __name__ == "__main__":
    main()
