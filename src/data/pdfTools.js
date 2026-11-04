import {
  Layers,
  Scissors,
  Trash2,
  FolderInput,
  FolderSync,
  Scan,
  Minimize2,
  Wrench,
  ScanText,
  FileImage,
  FileText,
  Presentation,
  Sheet,
  FileCode,
  Image,
  FileSpreadsheet,
  FileCheck,
  RotateCw,
  Hash,
  Stamp,
  Crop,
  Edit3,
  FormInput,
  Unlock,
  ShieldCheck,
  PenTool,
  EyeOff,
  GitCompare,
  Sparkles,
  Languages,
  FileDown,
  ArrowUpDown,
  FilePlus2,
  Combine,
  Contrast,
  FileType,
  Images,
  Paperclip,
  Eraser,
  FileCog,
  Info,
} from 'lucide-react';

export const PDF_CATEGORIES = [
  {
    title: 'Organize PDF',
    tools: [
      { id: 'merge', name: 'Merge PDF', desc: 'Merge PDF files online — combine multiple PDFs into one unified file.', icon: Layers, color: 'text-rose-500', bg: 'bg-rose-50' },
      { id: 'split', name: 'Split PDF', desc: 'Split PDF online — separate pages or extract specific page ranges.', icon: Scissors, color: 'text-orange-500', bg: 'bg-orange-50' },
      { id: 'remove', name: 'Remove pages', desc: 'Remove pages from PDF — delete unwanted pages from your document.', icon: Trash2, color: 'text-red-500', bg: 'bg-red-50' },
      { id: 'extract', name: 'Extract pages', desc: 'Extract PDF pages — pull specific pages into a new PDF file.', icon: FolderInput, color: 'text-amber-500', bg: 'bg-amber-50' },
      { id: 'organize', name: 'Organize PDF', desc: 'Organize PDF online — sort, rearrange and rotate PDF pages.', icon: FolderSync, color: 'text-amber-600', bg: 'bg-amber-50' },
      { id: 'scan', name: 'Scan to PDF', desc: 'Scan to PDF — capture documents directly via camera or scanner.', icon: Scan, color: 'text-red-600', bg: 'bg-red-50' },
      { id: 'reverse', name: 'Reverse Pages', desc: 'Rearrange PDF pages — flip the document into reverse order.', icon: ArrowUpDown, color: 'text-orange-600', bg: 'bg-orange-50' },
      { id: 'insert-blank', name: 'Insert Blank Pages', desc: 'Insert blank pages — add empty pages at start, end, or after each page.', icon: FilePlus2, color: 'text-amber-500', bg: 'bg-amber-50' },
    ],
  },
  {
    title: 'Optimize PDF',
    tools: [
      { id: 'compress', name: 'Compress PDF', desc: 'Compress PDF online free — reduce PDF file size without losing quality.', icon: Minimize2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { id: 'repair', name: 'Repair PDF', desc: 'Repair PDF — recover damaged or corrupted PDF files online.', icon: Wrench, color: 'text-green-600', bg: 'bg-green-50' },
      { id: 'ocr', name: 'OCR PDF', desc: 'OCR PDF online — convert scanned PDFs into searchable, selectable text.', icon: ScanText, color: 'text-teal-600', bg: 'bg-teal-50' },
      { id: 'flatten', name: 'Flatten PDF', desc: 'Flatten PDF — bake form fields and annotations into static content.', icon: Combine, color: 'text-teal-500', bg: 'bg-teal-50' },
      { id: 'grayscale', name: 'Grayscale PDF', desc: 'Convert PDF to grayscale — black & white pages for printing.', icon: Contrast, color: 'text-slate-600', bg: 'bg-slate-50' },
    ],
  },
  {
    title: 'Convert to PDF',
    tools: [
      { id: 'jpg-to-pdf', name: 'JPG to PDF', desc: 'JPG to PDF — convert JPG, PNG and WebP images into PDF documents.', icon: FileImage, color: 'text-yellow-500', bg: 'bg-yellow-50' },
      { id: 'word-to-pdf', name: 'WORD to PDF', desc: 'Word to PDF — convert DOCX files directly to PDF online.', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'powerpoint-to-pdf', name: 'POWERPOINT to PDF', desc: 'PowerPoint to PDF — turn PPTX presentations into PDF slides.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
      { id: 'excel-to-pdf', name: 'EXCEL to PDF', desc: 'Excel to PDF — convert spreadsheets into formatted PDF tables.', icon: Sheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { id: 'html-to-pdf', name: 'HTML to PDF', desc: 'HTML to PDF — render web pages and HTML strings to PDF.', icon: FileCode, color: 'text-amber-500', bg: 'bg-amber-50' },
      { id: 'png-to-pdf', name: 'PNG to PDF', desc: 'PNG to PDF — convert PNG images into a PDF document.', icon: FileImage, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { id: 'webp-to-pdf', name: 'WebP to PDF', desc: 'WebP to PDF — convert WebP images into a PDF document.', icon: Image, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { id: 'txt-to-pdf', name: 'TXT to PDF', desc: 'Text to PDF — convert plain text files into PDF documents.', icon: FileType, color: 'text-slate-600', bg: 'bg-slate-50' },
      { id: 'md-to-pdf', name: 'Markdown to PDF', desc: 'Markdown to PDF — render Markdown files into formatted PDF.', icon: FileCode, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    ],
  },
  {
    title: 'Convert from PDF',
    tools: [
      { id: 'pdf-to-jpg', name: 'PDF to JPG', desc: 'PDF to JPG — convert PDF pages to high-resolution JPG images.', icon: Image, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { id: 'pdf-to-word', name: 'PDF to WORD', desc: 'PDF to Word — convert PDFs into editable Word documents.', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'pdf-to-powerpoint', name: 'PDF to POWERPOINT', desc: 'PDF to PowerPoint — convert PDF files into editable PPTX slides.', icon: Presentation, color: 'text-orange-600', bg: 'bg-orange-50' },
      { id: 'pdf-to-excel', name: 'PDF to EXCEL', desc: 'PDF to Excel — convert PDF data into editable Excel sheets.', icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' },
      { id: 'pdf-to-pdfa', name: 'PDF to PDF/A', desc: 'PDF to PDF/A — convert to ISO-compliant archive format.', icon: FileCheck, color: 'text-slate-600', bg: 'bg-slate-50' },
      { id: 'pdf-to-png', name: 'PDF to PNG', desc: 'PDF to PNG — convert PDF pages to high-quality PNG images.', icon: Image, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { id: 'pdf-to-webp', name: 'PDF to WebP', desc: 'PDF to WebP — convert PDF pages to compact WebP images.', icon: FileImage, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { id: 'pdf-to-txt', name: 'PDF to TXT', desc: 'PDF to text — extract all text content into a plain text file.', icon: FileType, color: 'text-slate-600', bg: 'bg-slate-50' },
      { id: 'pdf-to-html', name: 'PDF to HTML', desc: 'PDF to HTML — convert PDF documents into a standalone webpage.', icon: FileCode, color: 'text-amber-600', bg: 'bg-amber-50' },
      { id: 'extract-images', name: 'Extract Images', desc: 'Extract images from PDF — save every embedded image as a ZIP.', icon: Images, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { id: 'extract-attachments', name: 'Extract Attachments', desc: 'Extract file attachments from PDF — download them as a ZIP.', icon: Paperclip, color: 'text-violet-600', bg: 'bg-violet-50' },
    ],
  },
  {
    title: 'Edit PDF',
    tools: [
      { id: 'rotate', name: 'Rotate PDF', desc: 'Rotate PDF online — rotate PDF pages individually or the whole document.', icon: RotateCw, color: 'text-purple-500', bg: 'bg-purple-50' },
      { id: 'page-numbers', name: 'Add page numbers', desc: 'Add page numbers to PDF — customizable numbering headers and footers.', icon: Hash, color: 'text-purple-600', bg: 'bg-purple-50' },
      { id: 'watermark', name: 'Add watermark', desc: 'Add watermark to PDF — stamp text or image watermarks on pages.', icon: Stamp, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
      { id: 'crop', name: 'Crop PDF', desc: 'Crop PDF — trim margins and modify the visible page area.', icon: Crop, color: 'text-pink-500', bg: 'bg-pink-50' },
      { id: 'edit', name: 'Edit PDF', desc: 'Edit PDF online — edit PDF text, add images, shapes and annotations.', icon: Edit3, color: 'text-rose-600', bg: 'bg-rose-50' },
      { id: 'forms', name: 'PDF Forms', desc: 'Fill PDF forms online — complete interactive fields and checkboxes.', icon: FormInput, color: 'text-violet-600', bg: 'bg-violet-50' },
      { id: 'metadata', name: 'Edit Metadata', desc: 'Edit PDF metadata — title, author, subject and keywords.', icon: FileCog, color: 'text-cyan-600', bg: 'bg-cyan-50' },
      { id: 'page-info', name: 'PDF Inspector', desc: 'PDF inspector — view page count, dimensions, version and metadata.', icon: Info, color: 'text-sky-600', bg: 'bg-sky-50' },
    ],
  },
  {
    title: 'PDF Security',
    tools: [
      { id: 'unlock', name: 'Unlock PDF', desc: 'Unlock PDF online — remove PDF passwords and restrictions.', icon: Unlock, color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'protect', name: 'Protect PDF', desc: 'Protect PDF with password — encrypt files with strong AES protection.', icon: ShieldCheck, color: 'text-sky-600', bg: 'bg-sky-50' },
      { id: 'sign', name: 'Sign PDF', desc: 'Sign PDF online — create digital signatures and sign agreements.', icon: PenTool, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { id: 'redact', name: 'Redact PDF', desc: 'Redact PDF — permanently black out sensitive information.', icon: EyeOff, color: 'text-slate-700', bg: 'bg-slate-50' },
      { id: 'compare', name: 'Compare PDF', desc: 'Compare PDF files — side-by-side visual and text diff.', icon: GitCompare, color: 'text-cyan-600', bg: 'bg-cyan-50' },
      { id: 'remove-metadata', name: 'Remove Metadata', desc: 'Remove PDF metadata — strip hidden document information.', icon: Eraser, color: 'text-slate-600', bg: 'bg-slate-50' },
    ],
  },
  {
    title: 'PDF Intelligence',
    tools: [
      { id: 'summarizer', name: 'AI Summarizer', desc: 'AI PDF summarizer — summarize PDF online for key insights instantly.', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50' },
      { id: 'translate', name: 'Translate PDF', desc: 'Translate PDF online — AI PDF translator in 50+ languages.', icon: Languages, color: 'text-violet-500', bg: 'bg-violet-50' },
      { id: 'to-markdown', name: 'PDF to Markdown', desc: 'PDF to Markdown — convert PDFs to clean structured Markdown.', icon: FileDown, color: 'text-blue-500', bg: 'bg-blue-50' },
    ],
  },
];

// Per-route SEO metadata — unique title + meta description for each tool page.
// Kept as a map (not inline) so tool objects stay untouched.
export const TOOL_SEO = {
  'merge': {
    title: 'Merge PDF — Combine Multiple PDF Files into One | ilovetopdf',
    desc: 'Merge PDF files online free. Combine multiple PDF files into one document — fast, no signup, no watermark.',
  },
  'split': {
    title: 'Split PDF Online — Split PDF Pages into Separate Files | ilovetopdf',
    desc: 'Split PDF online free. Split PDF into individual pages or extract specific page ranges — no software needed.',
  },
  'remove': {
    title: 'Remove Pages from PDF Online — Delete PDF Pages | ilovetopdf',
    desc: 'Remove pages from PDF online free. Delete unwanted PDF pages and download a clean document instantly.',
  },
  'extract': {
    title: 'Extract PDF Pages Online — Save Pages as a New PDF | ilovetopdf',
    desc: 'Extract PDF pages online free. Pull specific pages from a PDF into a new file in seconds.',
  },
  'organize': {
    title: 'Organize PDF Online — Rearrange, Sort & Rotate Pages | ilovetopdf',
    desc: 'Organize PDF online free. Rearrange PDF pages, sort order and rotate pages in a visual editor.',
  },
  'scan': {
    title: 'Scan to PDF — Capture Documents via Camera | ilovetopdf',
    desc: 'Scan documents to PDF online. Capture pages via camera, enhance them and download a clean PDF.',
  },
  'reverse': {
    title: 'Reverse PDF Pages Online — Flip Page Order | ilovetopdf',
    desc: 'Reverse the page order of a PDF online free. Flip all pages from last to first in one click.',
  },
  'insert-blank': {
    title: 'Insert Blank Pages into PDF Online | ilovetopdf',
    desc: 'Add blank pages to a PDF online — insert empty pages at the start, end, or after every page.',
  },
  'compress': {
    title: 'Compress PDF Online — Reduce PDF File Size Free | ilovetopdf',
    desc: 'Compress PDF online free. Reduce PDF file size without losing quality — compress PDF to 100KB, 200KB or less.',
  },
  'repair': {
    title: 'Repair PDF Online — Fix Corrupted PDF Files | ilovetopdf',
    desc: 'Repair damaged or corrupted PDF files online free. Recover broken documents in seconds.',
  },
  'ocr': {
    title: 'OCR PDF Online — Convert Scanned PDF to Text Free | ilovetopdf',
    desc: 'OCR PDF online free. Convert scanned PDF to searchable, selectable text — extract text from scanned PDFs.',
  },
  'flatten': {
    title: 'Flatten PDF Online — Merge Form Fields & Annotations | ilovetopdf',
    desc: 'Flatten PDF online free. Bake form fields, comments and annotations into static page content.',
  },
  'grayscale': {
    title: 'Convert PDF to Grayscale Online — Black & White PDF | ilovetopdf',
    desc: 'Convert PDF to grayscale online free. Turn all pages black & white for print-friendly output.',
  },
  'jpg-to-pdf': {
    title: 'JPG to PDF — Convert Multiple JPG Images to PDF | ilovetopdf',
    desc: 'Convert JPG to PDF online free. Turn multiple JPG, PNG and WebP images into a single PDF document.',
  },
  'word-to-pdf': {
    title: 'Word to PDF Converter — Convert Word Documents to PDF | ilovetopdf',
    desc: 'Convert Word documents to PDF online free. DOCX to PDF with formatting preserved — no software needed.',
  },
  'powerpoint-to-pdf': {
    title: 'PowerPoint to PDF — Convert PPTX Slides to PDF | ilovetopdf',
    desc: 'Convert PowerPoint to PDF online free. Turn PPT and PPTX presentations into shareable PDF slides.',
  },
  'excel-to-pdf': {
    title: 'Excel to PDF — Convert Spreadsheets to PDF | ilovetopdf',
    desc: 'Convert Excel to PDF online free. Turn XLSX spreadsheets into cleanly formatted PDF tables.',
  },
  'html-to-pdf': {
    title: 'HTML to PDF — Convert Web Pages & HTML to PDF | ilovetopdf',
    desc: 'Convert HTML to PDF online free. Render web pages, HTML files and markup into PDF documents.',
  },
  'png-to-pdf': {
    title: 'PNG to PDF — Convert PNG Images to PDF | ilovetopdf',
    desc: 'Convert PNG to PDF online free. Turn PNG images into a single PDF document in seconds.',
  },
  'webp-to-pdf': {
    title: 'WebP to PDF — Convert WebP Images to PDF | ilovetopdf',
    desc: 'Convert WebP images to PDF online free. Package modern WebP graphics into a PDF document.',
  },
  'txt-to-pdf': {
    title: 'Text to PDF — Convert TXT Files to PDF Online | ilovetopdf',
    desc: 'Convert text to PDF online free. Turn plain TXT files into formatted PDF documents instantly.',
  },
  'md-to-pdf': {
    title: 'Markdown to PDF — Convert MD Files to PDF Online | ilovetopdf',
    desc: 'Convert Markdown to PDF online free. Render .md files into clean, formatted PDF documents.',
  },
  'pdf-to-jpg': {
    title: 'PDF to JPG Converter — Convert PDF Pages to JPG | ilovetopdf',
    desc: 'Convert PDF to JPG online free. Export every PDF page as a high-resolution JPG image.',
  },
  'pdf-to-word': {
    title: 'PDF to Word Converter — Convert PDF to Editable Word | ilovetopdf',
    desc: 'Convert PDF to Word online free. Turn PDFs into editable DOCX documents without losing formatting.',
  },
  'pdf-to-powerpoint': {
    title: 'PDF to PowerPoint — Convert PDF to Editable PPTX | ilovetopdf',
    desc: 'Convert PDF to PowerPoint online free. Turn PDF pages into editable PPTX presentation slides.',
  },
  'pdf-to-excel': {
    title: 'PDF to Excel — Convert PDF to Editable XLSX Sheets | ilovetopdf',
    desc: 'Convert PDF to Excel online free. Extract PDF tables into editable XLSX spreadsheets.',
  },
  'pdf-to-pdfa': {
    title: 'PDF to PDF/A — Convert PDF to Archive Format | ilovetopdf',
    desc: 'Convert PDF to PDF/A online free. Produce ISO-compliant archival PDF/A documents.',
  },
  'pdf-to-png': {
    title: 'PDF to PNG — Convert PDF Pages to PNG Images | ilovetopdf',
    desc: 'Convert PDF to PNG online free. Export PDF pages as high-quality PNG images.',
  },
  'pdf-to-webp': {
    title: 'PDF to WebP — Convert PDF Pages to WebP Images | ilovetopdf',
    desc: 'Convert PDF to WebP online free. Export pages as compact, modern WebP images.',
  },
  'pdf-to-txt': {
    title: 'PDF to Text — Extract Text from PDF Online | ilovetopdf',
    desc: 'Convert PDF to text online free. Extract all text content from a PDF into a plain TXT file.',
  },
  'pdf-to-html': {
    title: 'PDF to HTML — Convert PDF to a Webpage Online | ilovetopdf',
    desc: 'Convert PDF to HTML online free. Turn PDF documents into standalone, shareable webpages.',
  },
  'extract-images': {
    title: 'Extract Images from PDF Online — Save as ZIP | ilovetopdf',
    desc: 'Extract images from PDF online free. Download every embedded image from a PDF as a ZIP archive.',
  },
  'extract-attachments': {
    title: 'Extract PDF Attachments Online — Download as ZIP | ilovetopdf',
    desc: 'Extract file attachments from PDF online free. Download all embedded files as a ZIP archive.',
  },
  'rotate': {
    title: 'Rotate PDF Online — Rotate PDF Pages Free | ilovetopdf',
    desc: 'Rotate PDF online free. Rotate PDF pages individually or the whole document — save the result instantly.',
  },
  'page-numbers': {
    title: 'Add Page Numbers to PDF Online Free | ilovetopdf',
    desc: 'Add page numbers to PDF online free. Customize position, format and style of page numbering.',
  },
  'watermark': {
    title: 'Add Watermark to PDF Online — Text & Image Stamps | ilovetopdf',
    desc: 'Add watermark to PDF online free. Stamp text or image watermarks across selected pages.',
  },
  'crop': {
    title: 'Crop PDF Online — Trim PDF Margins Free | ilovetopdf',
    desc: 'Crop PDF online free. Trim margins and adjust the visible page area of any PDF.',
  },
  'edit': {
    title: 'Edit PDF Online Free — PDF Editor for Text & Images | ilovetopdf',
    desc: 'Edit PDF online free. Edit PDF text, add images, shapes and annotations — full PDF editor in the browser.',
  },
  'forms': {
    title: 'Fill PDF Forms Online — Complete Interactive Forms | ilovetopdf',
    desc: 'Fill PDF forms online free. Complete interactive form fields and checkboxes, then download.',
  },
  'metadata': {
    title: 'Edit PDF Metadata Online — Title, Author & More | ilovetopdf',
    desc: 'Edit PDF metadata online free. Update title, author, subject and keywords of any PDF.',
  },
  'page-info': {
    title: 'PDF Inspector — View PDF Info & Metadata Online | ilovetopdf',
    desc: 'Inspect a PDF online free. View page count, dimensions, PDF version and document metadata.',
  },
  'unlock': {
    title: 'Unlock PDF Online — Remove PDF Password Free | ilovetopdf',
    desc: 'Unlock PDF online free. Remove PDF password and print/edit restrictions in seconds.',
  },
  'protect': {
    title: 'Protect PDF with Password Online Free | ilovetopdf',
    desc: 'Password protect PDF online free. Encrypt PDF documents with strong AES protection instantly.',
  },
  'sign': {
    title: 'Sign PDF Online — Create Digital Signatures Free | ilovetopdf',
    desc: 'Sign PDF online free. Draw, type or upload a digital signature and sign agreements instantly.',
  },
  'redact': {
    title: 'Redact PDF Online — Black Out Sensitive Text | ilovetopdf',
    desc: 'Redact PDF online free. Permanently black out sensitive information and confidential text.',
  },
  'compare': {
    title: 'Compare PDF Files Online — Visual Diff Tool | ilovetopdf',
    desc: 'Compare PDF files online free. Spot differences between two document versions side by side.',
  },
  'remove-metadata': {
    title: 'Remove PDF Metadata Online — Strip Hidden Data | ilovetopdf',
    desc: 'Remove PDF metadata online free. Strip hidden author, creation and editing data for privacy.',
  },
  'summarizer': {
    title: 'AI PDF Summarizer — Summarize PDF Online Free | ilovetopdf',
    desc: 'Summarize PDF online free with AI. Get key points and actionable insights from long documents instantly.',
  },
  'translate': {
    title: 'Translate PDF Online — AI PDF Translator | ilovetopdf',
    desc: 'Translate PDF online free. AI-powered PDF translator supporting 50+ languages.',
  },
  'to-markdown': {
    title: 'PDF to Markdown — Convert PDF to Clean MD | ilovetopdf',
    desc: 'Convert PDF to Markdown online free. Turn PDF documents into clean, structured Markdown files.',
  },
};
