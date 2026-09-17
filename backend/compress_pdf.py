#!/usr/bin/env python3
"""
Compress a PDF using PyMuPDF stream rewriting + Pillow image recompression.
Replaces the Ghostscript backend — no external binaries required.

Usage:
    python3 compress_pdf.py <input.pdf> <output.pdf> <level 10-90>
"""
import sys
import io

import fitz

try:
    from PIL import Image
except ImportError:
    Image = None


def recompress_images(doc, max_dim, jpeg_quality):
    """Downscale and JPEG-reencode large raster images in place."""
    if Image is None:
        return
    seen = set()
    for page in doc:
        for img in page.get_images(full=True):
            xref = img[0]
            if xref in seen:
                continue
            seen.add(xref)
            try:
                info = doc.extract_image(xref)
                raw = info['image']
                ext = info.get('ext', '').lower()
                if ext in ('jpx', 'jb2', 'jbig2'):
                    continue  # leave specialized encodings alone
                im = Image.open(io.BytesIO(raw))
                if im.mode in ('P', 'LA', 'CMYK', 'RGBA'):
                    im = im.convert('RGB')
                elif im.mode != 'RGB':
                    im = im.convert('RGB')
                w, h = im.size
                if max(w, h) <= max_dim:
                    scale = 1.0
                else:
                    scale = max_dim / max(w, h)
                if scale < 1.0:
                    im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))),
                                   Image.LANCZOS)
                buf = io.BytesIO()
                im.save(buf, format='JPEG', quality=jpeg_quality, optimize=True)
                jpeg_bytes = buf.getvalue()
                if len(jpeg_bytes) < len(raw):
                    page.replace_image(xref, stream=jpeg_bytes)
            except Exception:
                continue


def main():
    if len(sys.argv) < 3:
        sys.stderr.write('Usage: compress_pdf.py <input.pdf> <output.pdf> [level]\n')
        sys.exit(2)
    src, out = sys.argv[1], sys.argv[2]
    level = int(sys.argv[3]) if len(sys.argv) > 3 else 45

    doc = fitz.open(src)
    if doc.is_encrypted or doc.needs_pass:
        sys.stderr.write('PDF is encrypted; cannot compress.\n')
        sys.exit(1)

    # Map the 10-90 slider to image quality tiers (mirrors gs /printer-/ebook-/screen)
    if level >= 65:
        recompress_images(doc, max_dim=800, jpeg_quality=50)
    elif level >= 30:
        recompress_images(doc, max_dim=1400, jpeg_quality=75)

    doc.save(
        out,
        garbage=4,
        deflate=True,
        clean=True,
        deflate_images=True,
        deflate_fonts=True,
    )
    doc.close()

    if not __import__('os').path.exists(out):
        sys.stderr.write('Compression produced no output.\n')
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
