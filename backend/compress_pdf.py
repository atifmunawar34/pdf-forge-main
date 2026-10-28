#!/usr/bin/env python3
"""
Compress a PDF using PyMuPDF stream rewriting + Pillow image recompression.
Replaces the Ghostscript backend — no external binaries required.

Usage:
    python3 compress_pdf.py <input.pdf> <output.pdf> <level 10-90>
"""
import sys
import io

import pymupdf as fitz

try:
    from PIL import Image
except ImportError:
    Image = None


def all_image_xrefs(doc):
    """Every image xref in the doc — includes images nested inside form
    xobjects and annotations that page.get_images() can miss."""
    xrefs = set()
    for xref in range(1, doc.xref_length()):
        try:
            if doc.xref_get_key(xref, 'Subtype')[1] == '/Image':
                xrefs.add(xref)
        except Exception:
            continue
    return xrefs


def recompress_images(doc, max_dim, jpeg_quality):
    """Downscale and JPEG-reencode raster images in place."""
    if Image is None:
        return
    for xref in all_image_xrefs(doc):
        try:
            info = doc.extract_image(xref)
            raw = info['image']
            ext = info.get('ext', '').lower()
            if ext in ('jpx', 'jb2', 'jbig2'):
                continue  # leave specialized encodings alone
            im = Image.open(io.BytesIO(raw))
            if im.mode != 'RGB':
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
            im.save(buf, format='JPEG', quality=jpeg_quality, optimize=True,
                    progressive=True)
            jpeg_bytes = buf.getvalue()
            if len(jpeg_bytes) < len(raw):
                # page.replace_image works on any xref actually used by a page
                done = False
                for page in doc:
                    try:
                        if any(img[0] == xref for img in page.get_images(full=True)):
                            page.replace_image(xref, stream=jpeg_bytes)
                            done = True
                    except Exception:
                        continue
                if not done:
                    # image lives inside a form/annotation — rewrite the xref
                    # stream directly so the object itself shrinks
                    try:
                        doc.update_stream(xref, jpeg_bytes)
                        doc.xref_set_key(xref, 'Filter', '/DCTDecode')
                        doc.xref_set_key(xref, 'Width', str(im.size[0]))
                        doc.xref_set_key(xref, 'Height', str(im.size[1]))
                        doc.xref_set_key(xref, 'ColorSpace', '/DeviceRGB')
                        doc.xref_set_key(xref, 'BitsPerComponent', '8')
                    except Exception:
                        continue
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
    if level >= 80:
        recompress_images(doc, max_dim=600, jpeg_quality=38)
    elif level >= 65:
        recompress_images(doc, max_dim=800, jpeg_quality=50)
    elif level >= 45:
        recompress_images(doc, max_dim=1200, jpeg_quality=62)
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
