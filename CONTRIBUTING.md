# Contributing to PDF Forge

## Branch structure

| Branch | Purpose |
|--------|---------|
| `main` | Stable release — only merges from `dev` after review |
| `dev` | Shared integration branch — all work merges here first |
| `<name>` (e.g. `talha`) | Your personal working branch, based off `dev` |

## Workflow

1. **Clone the repo**
   ```bash
   git clone git@github.com:atifmunawar34/pdf-forge-main.git
   cd pdf-forge-main
   ```

2. **Switch to your personal branch** (created off `dev` — ask an admin if yours doesn't exist, or make one: `git checkout -b <your-name> origin/dev && git push -u origin <your-name>`)
   ```bash
   git checkout <your-name>
   git pull origin <your-name>
   ```

3. **Install & run**
   ```bash
   npm install
   cd backend && npm install && cd ..
   PORT=5100 npm run dev:server &   # backend on :5100
   npm run dev:client               # frontend on :5173
   ```
   Python engine (for conversions & text editing):
   ```bash
   pip3 install pymupdf python-docx pdfplumber openpyxl pikepdf
   ```

4. **Commit and push**
   ```bash
   git add -A
   git commit -m "describe what changed and why"
   git push origin <your-name>
   ```

5. **Merge your work**
   - Open a Pull Request on GitHub: `<your-name>` → `dev`
   - Get a review from a teammate, then merge
   - `main` is updated from `dev` after testing

## Rules

- Never push directly to `main` or `dev` — always use a Pull Request.
- Never commit `node_modules/`, `dist/`, `.env` files with secrets, or generated PDFs.
- Keep commits focused: one feature or fix per commit.
- Run `npm run lint` before pushing frontend changes.

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind CSS 4 + pdf.js + pdf-lib (`src/`)
- **Backend:** Express 5 + PyMuPDF/python scripts (`backend/`)
