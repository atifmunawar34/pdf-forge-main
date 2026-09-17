const express = require('express');
const cors = require('cors');
const multer = require('multer');
const libre = require('libreoffice-convert');
const util = require('util');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const PYTHON_COMMANDS = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

function runPython(args) {
  return new Promise((resolve, reject) => {
    const tryNext = (index, lastError) => {
      if (index >= PYTHON_COMMANDS.length) {
        reject(lastError || new Error('Python 3 is not installed.'));
        return;
      }

      const cmd = PYTHON_COMMANDS[index];
      const py = spawn(cmd, args, { windowsHide: true });
      let stderr = '';

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('error', (err) => {
        tryNext(index + 1, err);
      });

      py.on('close', (code) => {
        if (code === 0) {
          resolve();
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
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

//cors for local 
//app.use(cors());

//cors for production 
app.use(cors({
  origin: '*', // Or specify: ['https://your-app.vercel.app', 'https://<username>.github.io']
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['x-original-size', 'x-compressed-size', 'Content-Disposition']
}));

app.use(express.json());

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

// Ghostscript-based legacy converter (kept for reference — superseded by convertViaPython)
async function convertDocxToPdfLegacy(fileBuffer, originalFilename) {
  const tempId = `docx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `${tempId}_${originalFilename}`);
  const rawPdfPath = path.join(tempDir, `${tempId}_raw.pdf`);
  const finalPdfPath = path.join(tempDir, `${tempId}_final.pdf`);
  const userProfileDir = path.join(tempDir, `lo_profile_${tempId}`);

  await fs.writeFile(inputPath, fileBuffer);

  // 1. Convert via LibreOffice using native layout fidelity settings
  const loArgs = [
    `-env:UserInstallation=file://${userProfileDir}`,
    '--headless',
    '--invisible',
    '--nodefault',
    '--nofirststartwizard',
    '--nolockcheck',
    '--nologo',
    '--norestore',
    '--convert-to',
    'pdf:writer_pdf_Export:{"SelectPdfVersion":{"type":"long","value":"1"},"UseTaggedPDF":{"type":"boolean","value":"true"},"ExportNotes":{"type":"boolean","value":"false"}}',
    '--outdir',
    tempDir,
    inputPath,
  ];

  await new Promise((resolve) => {
    const lo = spawn('soffice', loArgs);
    lo.on('close', () => resolve());
    lo.on('error', () => resolve());
  });

  const generatedPdfName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
  const generatedPdfPath = path.join(tempDir, generatedPdfName);

  // Fallback if direct soffice fails
  if (!(await fs.stat(generatedPdfPath).catch(() => null))) {
    const fallbackBuffer = await libreConvert(fileBuffer, '.pdf', undefined);
    await fs.writeFile(generatedPdfPath, fallbackBuffer);
  }

  // 2. Universal Post-Processor: Reconcile DOCX intended pages vs generated PDF pages
  const pyReconcile = `
import sys
import os
import fitz
import docx

docx_file = sys.argv[1]
pdf_in = sys.argv[2]
pdf_out = sys.argv[3]

try:
    expected_pages = 0
    # Determine Word document target pagination from XML metadata & break markers
    if docx_file.lower().endswith('.docx'):
        doc = docx.Document(docx_file)
        # Check core properties (if Word cached the page count)
        try:
            core_props = doc.core_properties
            if hasattr(core_props, 'pages') and core_props.pages:
                expected_pages = int(core_props.pages)
        except Exception:
            expected_pages = 0

        # Count explicit hard page breaks and section breaks
        explicit_breaks = 1
        for p in doc.paragraphs:
            for r in p.runs:
                if 'w:br' in r._element.xml and 'type="page"' in r._element.xml:
                    explicit_breaks += 1
        for t in doc.tables:
            for r in t.rows:
                for c in r.cells:
                    for p in c.paragraphs:
                        for run in p.runs:
                            if 'w:br' in run._element.xml and 'type="page"' in run._element.xml:
                                explicit_breaks += 1

        expected_pages = max(expected_pages, explicit_breaks)

    # Inspect rendered PDF
    pdf_doc = fitz.open(pdf_in)
    actual_pages = len(pdf_doc)

    # If an extra blank/trailing overflow page was created at the very end with no real content
    if expected_pages > 0 and actual_pages > expected_pages:
        last_page = pdf_doc[-1]
        text_content = last_page.get_text().strip()
        drawings = last_page.get_drawings()
        images = last_page.get_images()

        # If last page contains only trailing whitespace, margins, or zero meaningful drawings
        if not text_content and len(drawings) == 0 and len(images) == 0:
            pdf_doc.delete_page(actual_pages - 1)

    pdf_doc.save(pdf_out, garbage=3, deflate=True)
    pdf_doc.close()
    sys.exit(0)
except Exception:
    import shutil
    shutil.copy(pdf_in, pdf_out)
    sys.exit(0)
`;

  try {
    await new Promise((resolve) => {
      const py = spawn('python3', ['-c', pyReconcile, inputPath, generatedPdfPath, finalPdfPath]);
      py.on('close', () => resolve());
      py.on('error', () => resolve());
    });
  } catch {
    // Proceed with generated PDF if post-processor has issues
  }

  const outputTarget = (await fs.stat(finalPdfPath).catch(() => null)) ? finalPdfPath : generatedPdfPath;
  const pdfBuffer = await fs.readFile(outputTarget);

  // Cleanup
  await fs.unlink(inputPath).catch(() => {});
  await fs.unlink(generatedPdfPath).catch(() => {});
  await fs.unlink(finalPdfPath).catch(() => {});
  await fs.rm(userProfileDir, { recursive: true, force: true }).catch(() => {});

  return pdfBuffer;
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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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
      ? req.file.originalname.replace(/\.[^/.]+$/, '')
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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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

    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');
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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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
      const py = spawn('python3', [pythonScriptPath, inputPdfPath, outputXlsxPath]);

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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_${mode}.zip"`);
    return res.send(zipBuffer);
  } catch (error) {
    console.error(`Extract ${mode} error:`, error);
    const msg = (error.message || '').replace(/python failed with code \d+:\s*/i, '').trim();
    return res.status(400).json({ error: msg || `Failed to extract ${mode}.` });
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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_${mode}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error(`page-ops ${mode} error:`, error);
    const msg = (error.message || '').replace(/python failed with code \d+:\s*/i, '').trim();
    return res.status(500).json({ error: msg || `Failed to run ${mode}.` });
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
    const msg = (error.message || '').replace(/python failed with code \d+:\s*/i, '').trim();
    return res.status(500).json({ error: msg || 'Failed to build the edited document.' });
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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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
      const py = spawn('python3', ['-c', pyScript, inputPath, outputPath, mode, password]);
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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}_unlocked.pdf"`);
    return res.send(unlockedBuffer);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to unlock PDF.' });
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
});

/**
 * Executes a PDF crop operation using Ghostscript.
 * It maps normalized client coordinates to page dimensions.
 */
async function executeGhostscriptCrop(inputBuffer, cropParams, originalFilename) {
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
    const gs = spawn('gs', gsArgs);
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
    const cropParams = JSON.parse(req.body.cropParams);

    // cropParams structure: { pages: 'all'|'current', currentPageNumber: number, x: percent, y: percent, width: percent, height: percent }

    const inputBuffer = req.file.buffer;
    const croppedBuffer = await executeGhostscriptCrop(
      inputBuffer,
      cropParams,
      req.file.originalname
    );

    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');
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
      const py = spawn('python3', [pythonScriptPath, inputPdfPath, outputMdPath]);

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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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
app.post('/api/edit-pdf-text', upload.single('file'), async (req, res) => {
  if (!req.file) {
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
    await fs.writeFile(inputPdfPath, req.file.buffer);
    await fs.writeFile(editsPath, editsJson);

    await new Promise((resolve, reject) => {
      const py = spawn('python3', [pythonScriptPath, inputPdfPath, outputPdfPath, editsPath]);

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
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Conversion server running on port ${PORT}`);
});