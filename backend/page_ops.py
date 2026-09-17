"""
Fallback page/metadata operations for PDF Forge — used when pdf-lib
cannot parse a file (broken xref, linearized, hybrid streams, etc.).

Usage:
    python page_ops.py <mode> <input.pdf> <output.pdf> [params.json]

Modes:
    reverse          -> reverse page order
    insert-blank     -> params: {"count": n, "position": "end|start|after-each"}
    flatten          -> delete annotations + widgets (static content)
    grayscale        -> re-render each page as grayscale image
    remove-metadata  -> clear all document metadata
    set-metadata     -> params: {"title","author","subject","keywords","creator"}
"""
import sys
import json
import fitz


def main():
    if len(sys.argv) < 4:
        print("Usage: page_ops.py <mode> <input.pdf> <output.pdf> [params.json]", file=sys.stderr)
        sys.exit(1)

    mode, input_pdf, output_pdf = sys.argv[1], sys.argv[2], sys.argv[3]
    params = {}
    if len(sys.argv) > 4:
        try:
            with open(sys.argv[4], "r", encoding="utf-8") as f:
                params = json.load(f)
        except Exception:
            params = {}

    doc = fitz.open(input_pdf)
    try:
        if mode == "reverse":
            doc.select(list(range(len(doc) - 1, -1, -1)))

        elif mode == "insert-blank":
            count = max(1, int(params.get("count", 1)))
            position = params.get("position", "end")
            after_page = int(params.get("afterPage", 0))
            w, h = (595.0, 842.0)
            if len(doc):
                r = doc[0].rect
                w, h = r.width, r.height
            if position == "start":
                for _ in range(count):
                    doc.new_page(0, w, h)
            elif position == "after-each":
                n = len(doc)
                for i in range(n - 1, -1, -1):
                    doc.new_page(i + 1, w, h)
            elif position == "after-page":
                idx = max(0, min(len(doc), after_page))
                for _ in range(count):
                    doc.new_page(idx, w, h)
                    idx += 1
            else:
                for _ in range(count):
                    doc.new_page(-1, w, h)

        elif mode == "flatten":
            for page in doc:
                # Remove widgets (form fields) and annotations
                for w in list(page.widgets() or []):
                    try:
                        page.delete_widget(w)
                    except Exception:
                        pass
                for a in list(page.annots() or []):
                    try:
                        page.delete_annot(a)
                    except Exception:
                        pass

        elif mode == "grayscale":
            new = fitz.open()
            for page in doc:
                pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
                gray = fitz.Pixmap(fitz.csGRAY, pix)
                np = new.new_page(width=page.rect.width, height=page.rect.height)
                np.insert_image(np.rect, pixmap=gray)
            new.save(output_pdf, deflate=True)
            new.close()
            return

        elif mode == "remove-metadata":
            doc.set_metadata({})

        elif mode == "set-metadata":
            meta = {k: v for k, v in params.items() if v}
            doc.set_metadata(meta)

        else:
            print(f"Unknown mode: {mode}", file=sys.stderr)
            sys.exit(1)

        doc.save(output_pdf, deflate=True, garbage=3)
    finally:
        doc.close()


if __name__ == "__main__":
    main()
