"""
Extract embedded assets from a PDF into a ZIP archive.

Usage:
    python extract_assets.py <mode> <input.pdf> <output.zip>

Modes:
    images      -> every embedded image (deduplicated by xref), original format
    attachments -> embedded file attachments (docx, xlsx, xml, etc.)
"""
import sys
import zipfile
import fitz


def main():
    if len(sys.argv) < 4:
        print("Usage: extract_assets.py <images|attachments> <input.pdf> <output.zip>", file=sys.stderr)
        sys.exit(1)

    mode, input_pdf, output_zip = sys.argv[1], sys.argv[2], sys.argv[3]
    doc = fitz.open(input_pdf)
    count = 0

    try:
        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as z:
            if mode == "images":
                seen = set()
                for pno in range(len(doc)):
                    for img in doc.get_page_images(pno, full=True):
                        xref = img[0]
                        if xref in seen:
                            continue
                        seen.add(xref)
                        try:
                            info = doc.extract_image(xref)
                        except Exception:
                            continue
                        ext = info.get("ext", "bin")
                        data = info.get("image")
                        if data:
                            z.writestr(f"page{pno + 1}_img{xref}.{ext}", data)
                            count += 1
            elif mode == "attachments":
                for name in doc.embfile_names():
                    try:
                        data = doc.embfile_get(name)
                    except Exception:
                        continue
                    if data:
                        z.writestr(name, data)
                        count += 1
            else:
                print(f"Unknown mode: {mode}", file=sys.stderr)
                sys.exit(1)
    finally:
        doc.close()

    if count == 0:
        if mode == "images":
            print(
                "No embedded images found in this PDF. "
                "If you want to export the page visuals, use the PDF to PNG tool instead.",
                file=sys.stderr,
            )
        else:
            print("No embedded file attachments found in this PDF.", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
