#!/usr/bin/env python3
"""List displayed images per page with their rects.

Uses page.get_image_info(xrefs=True) — finds images even when they are
nested inside Form XObjects (very common in catalogues/price lists).
xref == 0 means an INLINE image (no shared object) — still editable via
its rect.

Usage: python list_pdf_images.py <input.pdf>
Prints JSON to stdout: {"1": [{"xref": 12, "rect": [x0,y0,x1,y1], "w":..,"h":..}]}
Coordinates are PDF units with TOP-LEFT origin (y grows downward).
"""
import sys
import json

import pymupdf as fitz  # PyMuPDF


def main():
    doc = fitz.open(sys.argv[1])
    out = {}
    for pno in range(len(doc)):
        page = doc[pno]
        imgs = []
        seen = set()
        for info in page.get_image_info(xrefs=True):
            r = fitz.Rect(info["bbox"])
            if r.is_empty or r.width < 4 or r.height < 4:
                continue
            xref = info.get("xref", 0)
            key = (xref, round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1))
            if key in seen:
                continue
            seen.add(key)
            imgs.append({
                "xref": xref,
                "rect": [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)],
                "w": info.get("width", 0),
                "h": info.get("height", 0),
            })
        if imgs:
            out[str(pno + 1)] = imgs
    doc.close()
    print(json.dumps(out))


if __name__ == "__main__":
    main()
