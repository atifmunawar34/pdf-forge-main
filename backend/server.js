const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const libre = require('libreoffice-convert');
const util = require('util');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const PYTHON_COMMANDS = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
// Max wall-clock time for one conversion subprocess (default 5 min, env-overridable).
const PYTHON_TIMEOUT_MS = Number(process.env.PYTHON_TIMEOUT_MS) || 5 * 60 * 1000;

function runPython(args) {
  return new Promise((resolve, reject) => {
    const tryNext = (index, lastError) => {
      if (index >= PYTHON_COMMANDS.length) {
        reject(lastError || new Error('Python 3 is not installed.'));
        return;
      }

      const cmd = PYTHON_COMMANDS[index];
      const py = spawn(cmd, args, { windowsHide: true });
      // Kill a hung subprocess rather than holding the request open forever.
      let timedOut = false;
      const killTimer = setTimeout(() => { timedOut = true; py.kill('SIGKILL'); }, PYTHON_TIMEOUT_MS);
      let stderr = '';
      let stdout = '';

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.on('error', (err) => {
        clearTimeout(killTimer);
        tryNext(index + 1, err);
      });

      py.on('close', (code) => {
        clearTimeout(killTimer);
        if (code === 0) {
          resolve(stdout);
          return;
        }
        if (timedOut) {
          reject(new Error('Conversion timed out.'));
          return;
        }

        const missingPython =
          code === 9009 ||
          /python was not found/i.test(stderr) ||
          /is not recognized/i.test(stderr);

        if (missingPython) {
          tryNext(index + 1, new Error(`${cmd} failed with code ${code}: ${stderr}`));
          return;
        }

        reject(new Error(`${cmd} failed with code ${code}: ${stderr}`));
      });
    };

    tryNext(0);
  });
}

const libreConvert = util.promisify(libre.convert);
// Spawn with the same kill-switch as runPython — a hung subprocess must
// not hold its worker slot open forever.
function spawnBounded(cmd, args) {
  const child = spawn(cmd, args, { windowsHide: true });
  const killTimer = setTimeout(() => child.kill('SIGKILL'), PYTHON_TIMEOUT_MS);
  child.on('close', () => clearTimeout(killTimer));
  return child;
}
const app = express();
app.disable('x-powered-by');
// Cap uploads — memoryStorage buffers the whole file in RAM, so an
// unbounded upload is a trivial memory-exhaustion DoS.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 10 }, // 100 MB
});

// A user-supplied filename goes straight into Content-Disposition — strip
// quotes, path separators and control chars so it can't break the header
// (or smuggle a path when echoed elsewhere).
const baseName = (originalname) =>
  String(originalname || 'file')
    .replace(/\.[^/.]+$/, '')
    .replace(/["\\\r\n]/g, '_')
    .replace(/\/+/g, '_')
    .trim() || 'file';

// Subprocess stderr can contain absolute paths, Python tracebacks and
// version fingerprints — never echo it verbatim to the client. Keep only
// the last meaningful line (e.g. "Incorrect password.") with paths defanged.
function clientErr(error, fallback) {
  const lines = String(error?.message || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\w./-]+ failed with code \d+:\s*/i, '').trim())
    .filter((l) => l && !/^(Traceback|File\s*"|~*\^+)/.test(l));
  const last = (lines[lines.length - 1] || '')
    .replace(/[A-Za-z]:[\\/][^\s"']*/g, '…')
    .replace(/\/(?:[\w+.-]+\/){2,}[\w+.-]*/g, '…')
    .slice(0, 300);
  return last || fallback;
}

// CORS — allowlist only. Production origins come from CORS_ORIGINS env
// (comma-separated, e.g. "https://ilovetopdf.com,https://www.ilovetopdf.com").
// Dev defaults cover localhost and private-LAN frontends on any port.
// Requests without an Origin header (curl, server-to-server) are not
// browser cross-origin calls and are always allowed.
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
);
const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const DEV_ORIGIN = new RegExp(
  `^https?://(localhost|127\\.0\\.0\\.1|\\[::1\\]|192\\.168\\.${OCTET}\\.${OCTET}|10\\.${OCTET}\\.${OCTET}\\.${OCTET}|172\\.(1[6-9]|2\\d|3[01])\\.${OCTET}\\.${OCTET})(:\\d+)?$`
);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.has(origin) || DEV_ORIGIN.test(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-key'],
  exposedHeaders: ['x-original-size', 'x-compressed-size', 'Content-Disposition']
}));

app.use(express.json({ limit: '1mb' }));

// API responses contain user documents — never let shared caches store them,
// and don't let browsers MIME-sniff downloads into active content.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

// ---- Rate limiting -----------------------------------------------------
// Conversions spawn Python/LibreOffice subprocesses — a single request can
// burn seconds of CPU, so the heavy endpoints get a tight per-IP budget.
const json429 = { error: 'Too many requests — please slow down and try again later.' };
const limiterOpts = { standardHeaders: true, legacyHeaders: false, message: json429 };

// Safety net for every /api call (generous — real limits live below).
app.use('/api', rateLimit({ ...limiterOpts, windowMs: 15 * 60 * 1000, max: 600 }));

// Heavy conversion/upload endpoints: 60 per 15 min per IP.
const HEAVY_ROUTES = [
  '/api/convert/', '/api/compress-pdf', '/api/extract-', '/api/page-ops',
  '/api/protect-pdf', '/api/unlock-pdf', '/api/crop-pdf', '/api/edit-pdf-',
  '/api/pdf-images', '/api/docx-from-text',
];
HEAVY_ROUTES.forEach((p) => app.use(p, rateLimit({ ...limiterOpts, windowMs: 15 * 60 * 1000, max: 60 })));

// AI proxy costs real money upstream — keep it tighter.
app.use('/api/ai', rateLimit({ ...limiterOpts, windowMs: 15 * 60 * 1000, max: 30 }));
// Inquiry form is a public write — cap it to stop spam-flooding the store.
app.use('/api/inquiries', rateLimit({ ...limiterOpts, windowMs: 60 * 60 * 1000, max: 20 }));

// Office/HTML to PDF via the PyMuPDF Story engine (office_to_pdf.py) — no LibreOffice needed
async function convertViaPython(fileBuffer, ext) {
  const tempId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPath = path.join(tempDir, `input${ext}`);
  const outputPath = path.join(tempDir, 'output.pdf');

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(inputPath, fileBuffer);
  try {
    await runPython([path.join(__dirname, 'office_to_pdf.py'), inputPath, outputPath]);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Word to PDF conversion engine
async function convertDocxToPdf(fileBuffer, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase() === '.doc' ? '.docx' : path.extname(originalFilename).toLowerCase() || '.docx';
  return convertViaPython(fileBuffer, ext === '.doc' ? '.docx' : ext);
}

// Word to PDF Route
app.post('/api/convert/word-to-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Inspect buffer for OLE EncryptedPackage
    const buffer = req.file.buffer;
    const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    if (isOle) {
      const headerText = buffer.slice(0, 4096).toString('binary');
      if (headerText.includes('EncryptedPackage') || headerText.includes('EncryptionInfo')) {
        return res.status(400).json({
          error: `"${req.file.originalname}" is password-protected and cannot be converted.`,
          isLocked: true,
        });
      }
    }

    const pdfBuffer = await convertDocxToPdf(buffer, req.file.originalname);
    const originalName = baseName(req.file.originalname);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Word conversion failed:', error);
    return res.status(500).json({ error: 'Failed to convert document with LibreOffice.' });
  }
});

app.post('/api/convert/powerpoint-to-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const buffer = req.file.buffer;

    // Check for OLE EncryptedPackage header
    const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    if (isOle) {
      const headerText = buffer.slice(0, 4096).toString('binary');
      if (
        headerText.includes('EncryptedPackage') ||
        headerText.includes('EncryptionInfo') ||
        headerText.includes('PowerPoint Document')
      ) {
        return res.status(400).json({
          error: `"${req.file.originalname}" is password-protected and cannot be converted.`,
          isLocked: true,
        });
      }
    }

    const ext = path.extname(req.file.originalname).toLowerCase() === '.ppt' ? '.pptx' : path.extname(req.file.originalname).toLowerCase() || '.pptx';
    const pdfBuffer = await convertViaPython(buffer, ext);
    const originalName = baseName(req.file.originalname);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('PowerPoint conversion failed:', error);
    return res.status(500).json({ error: 'Failed to convert presentation to PDF.' });
  }
});

app.post('/api/convert/html-to-pdf', upload.single('file'), async (req, res) => {
  try {
    let htmlBuffer;

    if (req.file) {
      htmlBuffer = req.file.buffer;
    } else if (req.body && req.body.html) {
      htmlBuffer = Buffer.from(req.body.html, 'utf-8');
    } else {
      return res.status(400).json({ error: 'No HTML file or content provided.' });
    }

    const pdfBuffer = await convertViaPython(htmlBuffer, '.html');
    const originalName = req.file
      ? baseName(req.file.originalname)
      : 'rendered_html';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('HTML conversion failed:', error);
    return res.status(500).json({ error: 'Failed to convert HTML to PDF.' });
  }
});

// 4. Excel to PDF
app.post('/api/convert/excel-to-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const buffer = req.file.buffer;

    // Check for OLE EncryptedPackage header
    const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    if (isOle) {
      const headerText = buffer.slice(0, 4096).toString('binary');
      if (
        headerText.includes('EncryptedPackage') ||
        headerText.includes('EncryptionInfo') ||
        headerText.includes('Workbook')
      ) {
        return res.status(400).json({
          error: `"${req.file.originalname}" is password-protected and cannot be converted.`,
          isLocked: true,
        });
      }
    }

    const ext = path.extname(req.file.originalname).toLowerCase() === '.xls' ? '.xlsx' : path.extname(req.file.originalname).toLowerCase() || '.xlsx';
    const pdfBuffer = await convertViaPython(buffer, ext);
    const originalName = baseName(req.file.originalname);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Excel conversion error:', error);
    return res.status(500).json({ error: 'Failed to convert Excel spreadsheet to PDF.' });
  }
});

// PDF compression via PyMuPDF + Pillow (compress_pdf.py) — no Ghostscript needed
async function compressWithEngine(inputBuffer, qualityLevel = 45) {
  const tempId = `compress_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPath = path.join(tempDir, 'input.pdf');
  const outputPath = path.join(tempDir, 'output.pdf');

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(inputPath, inputBuffer);
  try {
    await runPython([
      path.join(__dirname, 'compress_pdf.py'),
      inputPath,
      outputPath,
      String(qualityLevel),
    ]);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// 5. Compress PDF Endpoint
app.post('/api/compress-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const compressionPercent = parseInt(req.body.compressionPercent || '45', 10);
    const originalSize = req.file.buffer.length;

    const compressedBuffer = await compressWithEngine(req.file.buffer, compressionPercent);

    // Fallback if the file is already maximally compressed
    const finalBuffer = compressedBuffer.length < originalSize ? compressedBuffer : req.file.buffer;

    const originalName = baseName(req.file.originalname);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="compressed_${originalName}.pdf"`);
    res.setHeader('x-original-size', originalSize.toString());
    res.setHeader('x-compressed-size', finalBuffer.length.toString());

    return res.send(finalBuffer);
  } catch (error) {
    console.error('PDF compression error:', error);
    return res.status(500).json({ error: 'Failed to compress PDF.' });
  }
});

// PDF to Word (.docx) route
app.post('/api/convert/pdf-to-word', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const tempId = `pdf2docx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputDocxPath = path.join(tempDir, 'output.docx');
  const pythonScriptPath = path.join(__dirname, 'convert_pdf2docx.py'); // Uses native __dirname

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, req.file.buffer);

    await runPython([pythonScriptPath, inputPdfPath, outputDocxPath]);

    const docxBuffer = await fs.readFile(outputDocxPath);
    const originalName = baseName(req.file.originalname);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.docx"`);
    return res.send(docxBuffer);
  } catch (error) {
    console.error('PDF to DOCX conversion error:', error);
    return res.status(500).json({ error: 'Failed to convert PDF to Word document.' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// PDF to PowerPoint (.pptx)
app.post('/api/convert/pdf-to-powerpoint', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const tempId = `pdf2ppt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputPptxPath = path.join(tempDir, 'input.pptx');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, req.file.buffer);

    // PyMuPDF page render + python-pptx slide assembly (pdf_to_pptx.py)
    await runPython([
      path.join(__dirname, 'pdf_to_pptx.py'),
      inputPdfPath,
      outputPptxPath,
    ]);

    const pptxBuffer = await fs.readFile(outputPptxPath);
    const originalName = baseName(req.file.originalname);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.pptx"`);
    return res.send(pptxBuffer);
  } catch (error) {
    console.error('PDF to PowerPoint conversion error:', error);
    return res.status(500).json({ error: 'Failed to convert PDF to PowerPoint presentation.' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// PDF to Excel (.xlsx) using Python openpyxl engine
app.post('/api/convert/pdf-to-excel', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const tempId = `pdf2excel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputXlsxPath = path.join(tempDir, 'output.xlsx');
  const pythonScriptPath = path.join(__dirname, 'convert_pdf2excel.py');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, req.file.buffer);

    await new Promise((resolve, reject) => {
      const py = spawnBounded('python3', [pythonScriptPath, inputPdfPath, outputXlsxPath]);

      let stderr = '';
      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`convert_pdf2excel failed with code ${code}: ${stderr}`));
        }
      });

      py.on('error', (err) => reject(err));
    });

    const xlsxBuffer = await fs.readFile(outputXlsxPath);
    const originalName = baseName(req.file.originalname);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.xlsx"`);
    return res.send(xlsxBuffer);
  } catch (error) {
    console.error('PDF to Excel conversion error:', error);
    return res.status(500).json({ error: 'Failed to convert PDF to Excel spreadsheet.' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Extract embedded assets (images / attachments) via PyMuPDF -> ZIP
async function extractAssetsViaPython(req, res, mode) {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const tempId = `extract_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputZipPath = path.join(tempDir, 'output.zip');
  const pythonScriptPath = path.join(__dirname, 'extract_assets.py');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, req.file.buffer);
    await runPython([pythonScriptPath, mode, inputPdfPath, outputZipPath]);
    const zipBuffer = await fs.readFile(outputZipPath);
    const originalName = baseName(req.file.originalname);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_${mode}.zip"`);
    return res.send(zipBuffer);
  } catch (error) {
    console.error(`Extract ${mode} error:`, error);
    return res.status(400).json({ error: clientErr(error, `Failed to extract ${mode}.`) });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

app.post('/api/extract-images', upload.single('file'), (req, res) =>
  extractAssetsViaPython(req, res, 'images')
);
app.post('/api/extract-attachments', upload.single('file'), (req, res) =>
  extractAssetsViaPython(req, res, 'attachments')
);

// Fallback page/metadata ops via PyMuPDF (used when pdf-lib can't parse a file)
app.post('/api/page-ops', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }
  const mode = req.body.mode;
  const allowed = ['reverse', 'insert-blank', 'flatten', 'grayscale', 'remove-metadata', 'set-metadata'];
  if (!allowed.includes(mode)) {
    return res.status(400).json({ error: 'Invalid operation mode.' });
  }

  const tempId = `pageops_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputPdfPath = path.join(tempDir, 'output.pdf');
  const paramsPath = path.join(tempDir, 'params.json');
  const pythonScriptPath = path.join(__dirname, 'page_ops.py');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, req.file.buffer);
    await fs.writeFile(paramsPath, req.body.params || '{}');
    await runPython([pythonScriptPath, mode, inputPdfPath, outputPdfPath, paramsPath]);
    const pdfBuffer = await fs.readFile(outputPdfPath);
    const originalName = baseName(req.file.originalname);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_${mode}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error(`page-ops ${mode} error:`, error);
    return res.status(500).json({ error: clientErr(error, `Failed to run ${mode}.`) });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Rebuild a .docx from edited plain text (after docx preview editing)
app.post('/api/docx-from-text', async (req, res) => {
  const { text, filename } = req.body || {};
  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing document text.' });
  }
  const tempId = `docx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPath = path.join(tempDir, 'input.txt');
  const outputPath = path.join(tempDir, 'output.docx');
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPath, text, 'utf8');
    await runPython([path.join(__dirname, 'text_to_docx.py'), inputPath, outputPath]);
    const outBuffer = await fs.readFile(outputPath).catch(() => null);
    if (!outBuffer) {
      return res.status(500).json({ error: 'Failed to build the edited document.' });
    }
    const safeName = String(filename || 'edited.docx').replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName.endsWith('.docx') ? safeName : `${safeName}.docx`}"`);
    return res.send(outBuffer);
  } catch (error) {
    console.error('docx-from-text error:', error);
    return res.status(500).json({ error: clientErr(error, 'Failed to build the edited document.') });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Protect PDF with Password
app.post('/api/protect-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const password = req.body.password;
  if (!password) {
    return res.status(400).json({ error: 'Password is required to protect the PDF.' });
  }

  const tempId = `protect_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `${tempId}_in.pdf`);
  const outputPath = path.join(tempDir, `${tempId}_protected.pdf`);

  try {
    await fs.writeFile(inputPath, req.file.buffer);

    // pikepdf AES-256 password protection (protect_pdf.py)
    await runPython([
      path.join(__dirname, 'protect_pdf.py'),
      inputPath,
      outputPath,
      password,
    ]);

    const protectedBuffer = await fs.readFile(outputPath);
    const originalName = baseName(req.file.originalname);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_protected.pdf"`);
    return res.send(protectedBuffer);
  } catch (error) {
    console.error('PDF Protect error:', error);
    return res.status(500).json({ error: 'Failed to apply password protection.' });
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
});

// Multi-Tier PDF Unlock Engine
app.post('/api/unlock-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const mode = req.body.mode || 'with-password';
  const password = req.body.password || '';

  const tempId = `unlock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `${tempId}_locked.pdf`);
  const outputPath = path.join(tempDir, `${tempId}_unlocked.pdf`);

  try {
    await fs.writeFile(inputPath, req.file.buffer);

    const pyScript = `
import sys
import os
import fitz
import pikepdf

input_path = sys.argv[1]
output_path = sys.argv[2]
mode = sys.argv[3]
user_password = sys.argv[4] if len(sys.argv) > 4 else ""

# Tier 1: If user provided a password, authenticate directly
if mode == "with-password":
    try:
        with pikepdf.open(input_path, password=user_password) as pdf:
            pdf.save(output_path)
            sys.exit(0)
    except pikepdf.PasswordError:
        sys.stderr.write("Incorrect password. Please verify and try again.\\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Decryption error: {str(e)}\\n")
        sys.exit(1)

# Tier 2: Automatic Mode (No password supplied)
# 2A: Owner Password / Permissions Only (Empty string open key)
unlocked = False
try:
    with pikepdf.open(input_path, password="") as pdf:
        pdf.save(output_path)
        unlocked = True
except Exception:
    unlocked = False

# 2B: Fast Pattern & Common Default Dictionary Check
if not unlocked:
    common_defaults = [
        "1234", "0000", "123456", "1111", "password", "admin", "12345678",
        "pass", "test", "default", "9999", "owner", "user", "root", "pdf",
        "123", "2024", "2025", "2026"
    ]
    # Check 4-digit zero-padded numbers from 0000 to 9999 in steps
    for trial in common_defaults:
        try:
            with pikepdf.open(input_path, password=trial) as pdf:
                pdf.save(output_path)
                unlocked = True
                break
        except Exception:
            continue

# 2C: PyMuPDF Fallback Stream Cleaner
if not unlocked:
    try:
        doc = fitz.open(input_path)
        if doc.is_encrypted:
            if doc.authenticate(""):
                doc.save(output_path, encryption=fitz.PDF_ENCRYPT_NONE, deflate=True, garbage=3, clean=True)
                unlocked = True
        doc.close()
    except Exception:
        unlocked = False

# Tier 3: Strong AES User Password Encountered
if not unlocked or not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
    sys.stderr.write("STRONG_ENCRYPTION_DETECTED: This PDF is protected with a strong User-Open password. Please switch to 'I have the password' to enter the key.\\n")
    sys.exit(2)

sys.exit(0)
`;

    await new Promise((resolve, reject) => {
      const py = spawnBounded('python3', ['-c', pyScript, inputPath, outputPath, mode, password]);
      let stderr = '';
      py.stderr.on('data', (d) => (stderr += d.toString()));
      py.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else if (code === 2) {
          reject(new Error("This file has a strong User Open Password. Please select 'I have the password' and enter the password to decrypt it."));
        } else {
          reject(new Error(stderr.trim() || 'Failed to unlock PDF.'));
        }
      });
      py.on('error', (err) => reject(err));
    });

    const unlockedBuffer = await fs.readFile(outputPath);
    const originalName = baseName(req.file.originalname);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_unlocked.pdf"`);
    return res.send(unlockedBuffer);
  } catch (error) {
    return res.status(400).json({ error: clientErr(error, 'Failed to unlock PDF.') });
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
});

/**
 * Executes a PDF crop operation using Ghostscript.
 * It maps normalized client coordinates to page dimensions.
 */
async function executeGhostscriptCrop(inputBuffer, cropParams, _originalFilename) {
  const tempId = `crop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `${tempId}_in.pdf`);
  const outputPath = path.join(tempDir, `${tempId}_cropped.pdf`);

  await fs.writeFile(inputPath, inputBuffer);

  // cropParams: { pages, xPercent, yPercent, widthPercent, heightPercent }
  const { pages, x, y, width, height } = cropParams;

  const gsArgs = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    `-sOutputFile=${outputPath}`,
    '-q', // quiet mode
    '-dBATCH',
    '-dNOPAUSE',
    `-dFirstPage=${pages === 'current' ? cropParams.currentPageNumber : 1}`,
    `-dLastPage=${pages === 'current' ? cropParams.currentPageNumber : 9999}`,
    '-c',
    // Custom postscript to set the new CropBox/MediaBox for selected pages
    '[',
    '/pdfmark',
    `{ { ${x} 100 div PageWidth mul } { ${y} 100 div PageHeight mul } { ${width} 100 div PageWidth mul } { ${height} 100 div PageHeight mul } }`,
    '/SetPDFcrop',
    ']',
    '/pdfmark',
    '-f',
    inputPath,
  ];

  return new Promise((resolve, reject) => {
    const gs = spawnBounded('gs', gsArgs);
    let stderr = '';
    gs.stderr.on('data', (d) => (stderr += d.toString()));

    gs.on('close', async (code) => {
      try {
        if (code === 0) {
          const croppedBuffer = await fs.readFile(outputPath);
          resolve(croppedBuffer);
        } else {
          reject(new Error(`Ghostscript protection failed: ${stderr}`));
        }
      } catch (err) {
        reject(err);
      } finally {
        // Cleanup temp files immediately
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
      }
    });

    gs.on('error', (err) => {
      reject(err);
    });
  });
}

// ---------------------------------------------------------
// New Route: Crop PDF
// ---------------------------------------------------------
app.post('/api/crop-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // Parse the crop parameters from the multipart request
    let cropParams;
    try {
      cropParams = JSON.parse(req.body.cropParams || '{}');
    } catch {
      return res.status(400).json({ error: 'Invalid crop parameters.' });
    }

    // cropParams is interpolated into a Ghostscript -c PostScript program
    // further down — every field MUST be coerced to a bounded number here.
    // A string like "} } (file.ps) run [" would otherwise execute arbitrary
    // PostScript on the server (file read, command exec on old gs builds).
    const num = (v, lo, hi) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
    };
    const page = Number(cropParams.currentPageNumber);
    cropParams = {
      x: num(cropParams.x, 0, 100),
      y: num(cropParams.y, 0, 100),
      width: num(cropParams.width, 0.1, 100),
      height: num(cropParams.height, 0.1, 100),
      currentPageNumber: Number.isInteger(page) && page >= 1 ? page : 1,
      pages: cropParams.pages === 'current' ? 'current' : 'all',
    };
    if (Object.values(cropParams).includes(null)) {
      return res.status(400).json({ error: 'Invalid crop parameters.' });
    }

    const inputBuffer = req.file.buffer;
    const croppedBuffer = await executeGhostscriptCrop(
      inputBuffer,
      cropParams,
      req.file.originalname
    );

    const originalName = baseName(req.file.originalname);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cropped_${originalName}.pdf"`);
    res.setHeader('x-original-size', inputBuffer.length.toString());
    res.setHeader('x-compressed-size', croppedBuffer.length.toString());

    return res.send(croppedBuffer);
  } catch (error) {
    console.error('Ghostscript compression error:', error);
    return res.status(500).json({ error: 'Failed to compress PDF.' });
  }
});

// PDF to Markdown (.md) conversion route using PyMuPDF & table extraction
app.post('/api/convert/pdf-to-markdown', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const tempId = `pdf2md_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputMdPath = path.join(tempDir, 'output.md');
  const pythonScriptPath = path.join(__dirname, 'convert_pdf2md.py');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, req.file.buffer);

    await new Promise((resolve, reject) => {
      const py = spawnBounded('python3', [pythonScriptPath, inputPdfPath, outputMdPath]);

      let stderr = '';
      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`convert_pdf2md failed with code ${code}: ${stderr}`));
        }
      });

      py.on('error', (err) => reject(err));
    });

    const mdBuffer = await fs.readFile(outputMdPath);
    const originalName = baseName(req.file.originalname);

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}.md"`);
    return res.send(mdBuffer);
  } catch (error) {
    console.error('PDF to Markdown conversion error:', error);
    return res.status(500).json({ error: 'Failed to convert PDF to Markdown.' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Edit PDF text — preserves ORIGINAL embedded fonts via PyMuPDF
app.post('/api/edit-pdf-text', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'imgs', maxCount: 40 },
]), async (req, res) => {
  const pdfFile = req.files?.file?.[0];
  if (!pdfFile) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const editsJson = req.body.edits;
  if (!editsJson) {
    return res.status(400).json({ error: 'No edits payload provided.' });
  }

  const tempId = `edit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputPdfPath = path.join(tempDir, 'output.pdf');
  const editsPath = path.join(tempDir, 'edits.json');
  const pythonScriptPath = path.join(__dirname, 'edit_pdf_text.py');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, pdfFile.buffer);
    // replacement image files — map each imgIdx to a real path in the payload
    const imgFiles = req.files?.imgs || [];
    let payloadStr = editsJson;
    if (imgFiles.length) {
      const payload = JSON.parse(editsJson);
      const paths = [];
      for (let i = 0; i < imgFiles.length; i++) {
        const p = path.join(tempDir, `img_${i}${path.extname(imgFiles[i].originalname || '.png')}`);
        await fs.writeFile(p, imgFiles[i].buffer);
        paths.push(p);
      }
      for (const pdata of Object.values(payload.pages || {})) {
        for (const e of pdata.edits || []) {
          if (e.action === 'imgreplace' && Number.isInteger(e.imgIdx) && paths[e.imgIdx]) {
            e.imgPath = paths[e.imgIdx];
          }
          delete e.imgIdx;
        }
      }
      payloadStr = JSON.stringify(payload);
    }
    await fs.writeFile(editsPath, payloadStr);

    await new Promise((resolve, reject) => {
      const py = spawnBounded('python3', [pythonScriptPath, inputPdfPath, outputPdfPath, editsPath]);

      let stderr = '';
      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`edit_pdf_text failed with code ${code}: ${stderr}`));
        }
      });

      py.on('error', (err) => reject(err));
    });

    const pdfBuffer = await fs.readFile(outputPdfPath);
    const originalName = pdfFile.originalname.replace(/\.[^/.]+$/, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_edited.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF text edit error:', error);
    return res.status(500).json({ error: 'Failed to apply text edits to PDF.' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// List embedded images per page (for the editor's Image tool)
app.post('/api/pdf-images', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }
  const tempId = `imglist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const pythonScriptPath = path.join(__dirname, 'list_pdf_images.py');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, req.file.buffer);

    const json = await runPython([pythonScriptPath, inputPdfPath]);
    return res.json(JSON.parse(json || '{}'));
  } catch (error) {
    console.error('PDF image list error:', error);
    return res.status(500).json({ error: 'Failed to list PDF images.' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Replace or remove an embedded image (editor's Image tool)
app.post('/api/edit-pdf-image', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]), async (req, res) => {
  const pdfFile = req.files?.file?.[0];
  if (!pdfFile) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }
  const page = parseInt(req.body.page, 10);
  const xref = parseInt(req.body.xref, 10);
  const action = req.body.action; // 'replace' | 'delete' | 'move'
  const imgFile = req.files?.image?.[0];
  if (!Number.isFinite(page) || !Number.isFinite(xref) || !['replace', 'delete', 'move'].includes(action)) {
    return res.status(400).json({ error: 'Invalid image edit request.' });
  }
  if (action === 'replace' && !imgFile) {
    return res.status(400).json({ error: 'No replacement image uploaded.' });
  }

  const tempId = `imgedit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), tempId);
  const inputPdfPath = path.join(tempDir, 'input.pdf');
  const outputPdfPath = path.join(tempDir, 'output.pdf');
  const imgPath = imgFile ? path.join(tempDir, `new${path.extname(imgFile.originalname || '.png')}`) : null;
  const pythonScriptPath = path.join(__dirname, 'edit_pdf_image.py');

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(inputPdfPath, pdfFile.buffer);
    if (imgFile) await fs.writeFile(imgPath, imgFile.buffer);

    // rect/newRect are forwarded as argv — accept only [x0,y0,x1,y1] of
    // finite numbers so a malformed body can't reach fitz.Rect unvalidated.
    const rectOk = (v) => {
      try {
        const r = JSON.parse(v);
        return Array.isArray(r) && r.length === 4 && r.every((n) => Number.isFinite(n));
      } catch { return false; }
    };
    if ((req.body.rect && !rectOk(req.body.rect)) || (req.body.newRect && !rectOk(req.body.newRect))) {
      return res.status(400).json({ error: 'Invalid rect.' });
    }

    const args = [pythonScriptPath, inputPdfPath, outputPdfPath, String(page), String(xref), action];
    if (action === 'replace') args.push(imgPath); else args.push('-');
    if (req.body.rect) args.push(req.body.rect);
    if (req.body.newRect) args.push(req.body.newRect);

    await runPython(args);

    const pdfBuffer = await fs.readFile(outputPdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF image edit error:', error);
    return res.status(500).json({ error: 'Failed to edit PDF image.' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ==============================
//  TEMPLATES HUB
// ==============================

const TEMPLATES_PATH = path.join(__dirname, 'data', 'templates.json');
const TPL_USAGE_PATH = path.join(__dirname, 'data', 'template-usage.json');
const fsSync = require('fs');

let templatesData = { categories: [], templates: [] };
let templatesMtime = 0;
function getTemplatesData() {
  try {
    const { mtimeMs } = fsSync.statSync(TEMPLATES_PATH);
    if (mtimeMs !== templatesMtime) {
      templatesData = JSON.parse(fsSync.readFileSync(TEMPLATES_PATH, 'utf8'));
      templatesMtime = mtimeMs;
    }
  } catch (e) {
    if (!templatesMtime) console.warn('templates.json not loaded:', e.message);
  }
  return templatesData;
}
getTemplatesData();

let templateUsage = {};
try {
  templateUsage = JSON.parse(fsSync.readFileSync(TPL_USAGE_PATH, 'utf8'));
} catch { /* no saved usage counters yet */ }

app.get('/api/templates', (req, res) => {
  const data = getTemplatesData();
  const templates = data.templates.map((t) => ({
    ...t,
    usage: templateUsage[t.id] || {},
  }));
  res.json({ categories: data.categories, templates });
});

// Serialize read-modify-write cycles per JSON file — parallel requests
// otherwise lose updates when a stale snapshot's writeFile lands last.
const jsonFileQueues = new Map();
function queueJsonWrite(path, work) {
  const prev = jsonFileQueues.get(path) || Promise.resolve();
  const next = prev.catch(() => {}).then(work);
  jsonFileQueues.set(path, next);
  return next;
}

// Lightweight usage analytics: view | preview | use | download
app.post('/api/templates/:id/track', (req, res) => {
  const { type } = req.body || {};
  const id = req.params.id;
  // req.params.id is attacker-controlled. Writing templateUsage[id] with a
  // magic key like '__proto__' pollutes Object.prototype for the whole
  // process — only known template ids may be tracked, and magic keys are
  // refused outright as defense-in-depth.
  const isKnown = getTemplatesData().templates.some((t) => t.id === id);
  if (!isKnown || ['__proto__', 'prototype', 'constructor'].includes(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }
  if (!['view', 'preview', 'use', 'download'].includes(type)) {
    return res.status(400).json({ error: 'invalid type' });
  }
  const u = (templateUsage[id] = templateUsage[id] || {});
  u[type] = (u[type] || 0) + 1;
  queueJsonWrite(TPL_USAGE_PATH, () =>
    fs.writeFile(TPL_USAGE_PATH, JSON.stringify(templateUsage))
  ).catch(() => {});
  res.json({ ok: true });
});

// AI proxy — OpenAI-compatible endpoint. Keys live ONLY on the server:
//   set AI_API_KEY / AI_API_BASE / AI_MODEL in env (or .env) to enable.
// Without a key the endpoint returns 503 {offline:true} so the frontend
// can fall back to local behavior instead of erroring.
app.post('/api/ai', async (req, res) => {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const base = process.env.AI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  if (!key) return res.status(503).json({ offline: true, error: 'AI provider not configured on this server.' });

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 20000) {
    return res.status(400).json({ error: 'Invalid prompt.' });
  }
  try {
    // Bound the upstream call — a hung provider must not hold this request
    // (and its connection slot) open forever.
    const ctrl = new AbortController();
    const upstreamTimer = setTimeout(() => ctrl.abort(), 60 * 1000);
    let r;
    try {
      r = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1200,
          temperature: 0.5,
        }),
      });
    } finally {
      clearTimeout(upstreamTimer);
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'AI provider error.' });
    res.json({ result: data.choices?.[0]?.message?.content || '' });
  } catch {
    res.status(502).json({ error: 'AI provider unreachable.' });
  }
});

// AI Assistant project inquiries — validated, stored to JSON (CRM-ready).
const INQUIRIES_PATH = path.join(__dirname, 'data', 'inquiries.json');
app.post('/api/inquiries', async (req, res) => {
  const { serviceId, service, answers } = req.body || {};
  if (!serviceId || !Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ error: 'Invalid inquiry.' });
  }
  const clean = {
    serviceId: String(serviceId).slice(0, 60),
    service: String(service || '').slice(0, 120),
    answers: answers.slice(0, 30).map((a) => String(a).slice(0, 500)),
    createdAt: new Date().toISOString(),
  };
  try {
    await queueJsonWrite(INQUIRIES_PATH, async () => {
      let list = [];
      try { list = JSON.parse(await fs.readFile(INQUIRIES_PATH, 'utf8')); } catch { /* first inquiry */ }
      list.push(clean);
      await fs.writeFile(INQUIRIES_PATH, JSON.stringify(list, null, 2));
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not store inquiry.' });
  }
});
// Inquiry list contains customer data — never expose it without the admin key.
// Set ADMIN_KEY in env; without it the endpoint stays disabled entirely.
// Send it in the x-admin-key header (the ?key= query form still works, but
// headers don't leak into proxy/access logs).
app.get('/api/inquiries', async (req, res) => {
  const key = process.env.ADMIN_KEY;
  const supplied = req.get('x-admin-key') || req.query.key;
  if (!key || supplied !== key) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  try { res.json(JSON.parse(await fs.readFile(INQUIRIES_PATH, 'utf8'))); }
  catch { res.json([]); }
});

// Turn multer errors (oversized file, too many files, etc.) into clean JSON
// instead of Express's default HTML error page.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_PART_COUNT') {
      return res.status(413).json({ error: 'Upload exceeds the 100 MB / file-count limit.' });
    }
    return res.status(400).json({ error: `Upload rejected (${err.code}).` });
  }
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  next(err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Conversion server running on port ${PORT}`);
});