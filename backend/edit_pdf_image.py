#!/usr/bin/env python3
"""Replace or delete an image in a PDF.

Usage:
    python edit_pdf_image.py <in.pdf> <out.pdf> <page> <xref> replace <img> [rect]
    python edit_pdf_image.py <in.pdf> <out.pdf> <page> <xref> delete  -     [rect]

xref > 0  -> shared image object: replace_image keeps placement/rotation
xref == 0 -> inline image: redact its rect then draw the new image there
"""
import sys
import json

import pymupdf as fitz  # PyMuPDF


def main():
    inp, outp = sys.argv[1], sys.argv[2]
    pno, xref, action = int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    rect = fitz.Rect(json.loads(sys.argv[7])) if len(sys.argv) > 7 else None

    doc = fitz.open(inp)
    page = doc[pno - 1]

    if action == "replace":
        if xref:
            # swap the image content in place — keeps original placement
            page.replace_image(xref, filename=sys.argv[6])
        elif rect is not None:
            # inline image: remove the old bitmap, draw the new one in its box
            page.add_redact_annot(rect, fill=False)
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE,
                                  graphics=fitz.PDF_REDACT_LINE_ART_NONE,
                                  text=fitz.PDF_REDACT_TEXT_NONE)
            page.insert_image(rect, filename=sys.argv[6])
    elif action == "delete":
        if xref:
            page.delete_image(xref)
        elif rect is not None:
            # no shared object — erase whatever pixels sit in that rect
            page.add_redact_annot(rect, fill=False)
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE,
                                  graphics=fitz.PDF_REDACT_LINE_ART_NONE,
                                  text=fitz.PDF_REDACT_TEXT_NONE)
    elif action == "move":
        # lift the image out of its old rect and redraw it at the new one
        new_rect = fitz.Rect(json.loads(sys.argv[8])) if len(sys.argv) > 8 else None
        if rect is None or new_rect is None:
            sys.exit("move needs old and new rect")
        if xref:
            # grab the embedded bytes BEFORE redacting (the object may be
            # garbage-collected once its only placement is removed)
            ext = doc.extract_image(xref)
            data = ext["image"]
        else:
            # inline image — capture the pixels in the box
            pix = page.get_pixmap(clip=rect, dpi=150)
            data = None
        page.add_redact_annot(rect, fill=False)
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE,
                                  graphics=fitz.PDF_REDACT_LINE_ART_NONE,
                                  text=fitz.PDF_REDACT_TEXT_NONE)
        if xref:
            page.insert_image(new_rect, stream=data)
        else:
            page.insert_image(new_rect, pixmap=pix)

    doc.save(outp, garbage=3, deflate=True)
    doc.close()


if __name__ == "__main__":
    main()
