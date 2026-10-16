// Central popup configuration — content, limits, related tools, announcements.
// Toggle/update popups here without touching page code.

// Client-side file size guard (MB). The backend stores uploads in memory —
// this keeps browsers from choking on huge files before upload.
export const MAX_FILE_MB = 100;

// ---------- Welcome popup (first-time visitors only) ----------
export const WELCOME_POPUP = {
  enabled: true,
  key: 'welcome',
  title: 'All Your PDF Tools in One Place',
  description:
    'Merge, split, compress, convert, edit, protect, and manage your PDF files quickly and easily — free, secure, no signup.',
  primaryLabel: 'Explore PDF Tools',
  secondaryLabel: 'Browse Templates',
};

// ---------- Announcement popup (set enabled:false to hide) ----------
// Supports: title, description, image (optional), primaryLabel/primaryAction,
// secondaryLabel, and scheduling via startDate/endDate (ISO strings).
export const ANNOUNCEMENT_POPUP = {
  enabled: false,
  key: 'announce-1',
  title: '',
  description: '',
  image: '',
  primaryLabel: '',
  secondaryLabel: 'Dismiss',
  startDate: '',
  endDate: '',
};

// ---------- Per-tool intro popup ----------
// Shown the first time a user opens a tool. `formats` = human-readable list.
export const TOOL_INTRO_DEFAULT = {
  formats: ['PDF'],
  action: 'Get Started',
};

export const TOOL_INTROS = {
  merge: { desc: 'Combine multiple PDF files into one document in the order you choose.', formats: ['PDF'], action: 'Start Merging' },
  split: { desc: 'Extract pages or split one PDF into multiple smaller files.', formats: ['PDF'], action: 'Start Splitting' },
  compress: { desc: 'Reduce PDF file size while keeping the document readable and useful.', formats: ['PDF'], action: 'Start Compressing' },
  'pdf-to-word': { desc: 'Convert your PDF into an editable Word document.', formats: ['PDF'], action: 'Start Converting' },
  'word-to-pdf': { desc: 'Convert DOCX files directly to clean, shareable PDFs.', formats: ['DOCX', 'DOC'], action: 'Start Converting' },
  'jpg-to-pdf': { desc: 'Turn images into a single PDF document.', formats: ['JPG', 'PNG', 'WEBP'], action: 'Start Converting' },
  'pdf-to-jpg': { desc: 'Extract PDF pages as high-resolution JPG images.', formats: ['PDF'], action: 'Start Converting' },
  ocr: { desc: 'Recognize text in scanned PDFs so it can be searched and copied.', formats: ['PDF'], action: 'Start OCR' },
  protect: { desc: 'Add password protection to keep your PDF private.', formats: ['PDF'], action: 'Protect a PDF' },
  unlock: { desc: 'Remove a known password from a PDF you own.', formats: ['PDF'], action: 'Unlock a PDF' },
  rotate: { desc: 'Rotate pages left or right and save a corrected PDF.', formats: ['PDF'], action: 'Start Rotating' },
  watermark: { desc: 'Stamp custom text or an image watermark onto every page.', formats: ['PDF'], action: 'Add a Watermark' },
  sign: { desc: 'Draw or place your signature and sign the PDF.', formats: ['PDF'], action: 'Sign a PDF' },
  edit: { desc: 'Edit text, add notes and annotations directly on your PDF pages.', formats: ['PDF'], action: 'Start Editing' },
  'html-to-pdf': { desc: 'Render web pages or HTML code into a PDF document.', formats: ['HTML', 'HTM'], action: 'Start Converting' },
  scan: { desc: 'Turn photos or camera captures into a clean scanned PDF.', formats: ['JPG', 'PNG', 'WEBP'], action: 'Start Scanning' },
};

// ---------- Related tools (shown after a successful operation) ----------
export const RELATED_TOOLS = {
  'pdf-to-word': ['pdf-to-jpg', 'compress', 'merge', 'edit'],
  'pdf-to-jpg': ['pdf-to-word', 'compress', 'extract-images', 'merge'],
  'pdf-to-excel': ['pdf-to-word', 'compress', 'extract-attachments', 'pdf-to-txt'],
  'pdf-to-powerpoint': ['pdf-to-word', 'pdf-to-jpg', 'compress', 'merge'],
  'word-to-pdf': ['compress', 'merge', 'protect', 'pdf-to-word'],
  merge: ['split', 'compress', 'organize', 'protect'],
  split: ['merge', 'extract', 'remove', 'compress'],
  compress: ['merge', 'split', 'pdf-to-word', 'protect'],
  protect: ['unlock', 'watermark', 'sign', 'redact'],
  unlock: ['protect', 'compress', 'merge', 'split'],
  edit: ['sign', 'watermark', 'compress', 'forms'],
  sign: ['edit', 'protect', 'watermark', 'merge'],
  ocr: ['summarizer', 'translate', 'pdf-to-word', 'edit'],
  default: ['merge', 'compress', 'pdf-to-word', 'split'],
};

// ---------- Supported-format labels per tool (for error popups) ----------
export const TOOL_FORMATS = {
  'jpg-to-pdf': ['JPG', 'PNG', 'WEBP'],
  'scan': ['JPG', 'PNG', 'WEBP'],
  'png-to-pdf': ['PNG'],
  'webp-to-pdf': ['WEBP'],
  'txt-to-pdf': ['TXT'],
  'md-to-pdf': ['MD', 'TXT'],
  'word-to-pdf': ['DOCX', 'DOC'],
  'powerpoint-to-pdf': ['PPTX', 'PPT'],
  'excel-to-pdf': ['XLSX', 'XLS'],
  'html-to-pdf': ['HTML', 'HTM'],
  default: ['PDF'],
};

export const MAX_FILES = {
  compare: { max: 2, exact: 2 },
  merge: { max: 24 },
};
