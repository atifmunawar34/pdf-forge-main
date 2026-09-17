import sys
from docx import Document

def main():
    if len(sys.argv) < 3:
        print("usage: text_to_docx.py <input.txt> <output.docx>", file=sys.stderr)
        sys.exit(2)
    in_path, out_path = sys.argv[1], sys.argv[2]
    with open(in_path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    doc = Document()
    for line in text.split("\n"):
        doc.add_paragraph(line.rstrip())
    doc.save(out_path)

if __name__ == "__main__":
    main()
