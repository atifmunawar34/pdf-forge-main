// QR & barcode tools + file tools.

const QR = (id, name, desc, def, extra = {}) => ({
  id, name, desc, engine: 'qr', def, keywords: [name.toLowerCase(), 'qr code', 'free online'], ...extra,
});
const FT = (id, name, desc, def, extra = {}) => ({
  id, name, desc, engine: 'file', def, keywords: [name.toLowerCase(), 'file tool', 'free online'], ...extra,
});

export const QR_TOOLS = [
  QR('qr-code-generator', 'QR Code Generator', 'Create custom QR codes for any text or link — size, color and margin controls.', { mode: 'qr', action: 'Generate QR' }, { featured: true, popular: true }),
  QR('qr-code-scanner', 'QR Code Scanner', 'Decode QR codes from an image upload — runs locally in your browser.', { mode: 'scan' }),
  QR('url-qr-code', 'URL QR Code', 'Turn any website link into a scannable QR code.', { mode: 'qr', fields: [{ key: 'url', label: 'URL', placeholder: 'https://example.com' }], action: 'Generate QR' }),
  QR('text-qr-code', 'Text QR Code', 'Encode plain text into a QR code — notes, coupons, Wi-Fi passwords.', { mode: 'qr', fields: [{ key: 'text', label: 'Text', placeholder: 'Any text…' }], action: 'Generate QR' }),
  QR('wifi-qr-code', 'Wi-Fi QR Code', 'Share Wi-Fi instantly — guests scan to connect, no typing passwords.', {
    mode: 'qr', action: 'Generate Wi-Fi QR',
    fields: [
      { key: 'ssid', label: 'Network name (SSID)', placeholder: 'MyWifi' },
      { key: 'pass', label: 'Password', placeholder: 'Wi-Fi password' },
      { key: 'enc', label: 'Encryption', placeholder: 'WPA' },
    ],
    build: (v) => `WIFI:T:${v.enc || 'WPA'};S:${v.ssid};P:${v.pass};;`,
  }, { popular: true }),
  QR('email-qr-code', 'Email QR Code', 'QR code that opens a pre-filled email — address, subject, body.', {
    mode: 'qr', action: 'Generate QR',
    fields: [
      { key: 'to', label: 'Email address', placeholder: 'you@example.com' },
      { key: 'subject', label: 'Subject', placeholder: 'Optional' },
      { key: 'body', label: 'Body', placeholder: 'Optional' },
    ],
    build: (v) => `mailto:${v.to}?subject=${encodeURIComponent(v.subject || '')}&body=${encodeURIComponent(v.body || '')}`,
  }),
  QR('phone-qr-code', 'Phone QR Code', 'QR code that dials a phone number when scanned.', {
    mode: 'qr', fields: [{ key: 'num', label: 'Phone number', placeholder: '+15551234567' }],
    build: (v) => `tel:${v.num}`, action: 'Generate QR',
  }),
  QR('sms-qr-code', 'SMS QR Code', 'QR code that opens a pre-written SMS to a number.', {
    mode: 'qr', action: 'Generate QR',
    fields: [
      { key: 'num', label: 'Phone number', placeholder: '+15551234567' },
      { key: 'msg', label: 'Message', placeholder: 'Hi!' },
    ],
    build: (v) => `sms:${v.num}?body=${encodeURIComponent(v.msg || '')}`,
  }),
  QR('whatsapp-qr-code', 'WhatsApp QR Code', 'Scan-to-chat QR code — opens a WhatsApp conversation instantly.', {
    mode: 'qr', fields: [{ key: 'num', label: 'WhatsApp number (with country code)', placeholder: '15551234567' }],
    build: (v) => `https://wa.me/${(v.num || '').replace(/\D/g, '')}`, action: 'Generate QR',
  }),
  QR('vcard-qr-code', 'vCard QR Code', 'Contact-card QR — scan to save name, phone, email, company.', {
    mode: 'qr', action: 'Generate vCard QR',
    fields: [
      { key: 'name', label: 'Full name' }, { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' }, { key: 'org', label: 'Company' },
    ],
    build: (v) => `BEGIN:VCARD\nVERSION:3.0\nFN:${v.name || ''}\nTEL:${v.phone || ''}\nEMAIL:${v.email || ''}\nORG:${v.org || ''}\nEND:VCARD`,
  }),
  QR('location-qr-code', 'Location QR Code', 'QR code that opens a map location — latitude and longitude.', {
    mode: 'qr', action: 'Generate QR',
    fields: [
      { key: 'lat', label: 'Latitude', placeholder: '40.7128' },
      { key: 'lng', label: 'Longitude', placeholder: '-74.0060' },
    ],
    build: (v) => `https://maps.google.com/?q=${v.lat},${v.lng}`,
  }),
  QR('event-qr-code', 'Event QR Code', 'Calendar-event QR code — title, date and location in one scan.', {
    mode: 'qr', action: 'Generate QR',
    fields: [
      { key: 'title', label: 'Event title' }, { key: 'date', label: 'Date (YYYYMMDD)' },
      { key: 'loc', label: 'Location' },
    ],
    build: (v) => `BEGIN:VEVENT\nSUMMARY:${v.title || ''}\nDTSTART:${(v.date || '').replace(/\D/g, '')}\nLOCATION:${v.loc || ''}\nEND:VEVENT`,
  }),
  QR('crypto-qr-code', 'Crypto QR Code', 'Payment QR for crypto wallets — address + optional amount.', {
    mode: 'qr', action: 'Generate QR',
    fields: [
      { key: 'addr', label: 'Wallet address' },
      { key: 'coin', label: 'Coin (btc/eth)', placeholder: 'bitcoin' },
      { key: 'amount', label: 'Amount (optional)' },
    ],
    build: (v) => `${(v.coin || 'bitcoin').toLowerCase()}:${v.addr}${v.amount ? `?amount=${v.amount}` : ''}`,
  }),
  QR('barcode-generator', 'Barcode Generator', 'Create CODE128/EAN-style barcodes as PNG — products, inventory, labels.', { mode: 'barcode', action: 'Generate Barcode' }, { popular: true }),
  QR('barcode-reader', 'Barcode Reader', 'Scan barcode images — uses the browser barcode detector when available.', { mode: 'scan' }),
];

export const FILE_TOOLS = [
  FT('file-compressor', 'File Compressor', 'Compress files into a ZIP archive — smaller, single download.', { op: 'zip', action: 'Compress to ZIP' }, { popular: true }),
  FT('zip-creator', 'ZIP Creator', 'Bundle multiple files into a .zip archive instantly in-browser.', { op: 'zip', action: 'Create ZIP' }),
  FT('zip-extractor', 'ZIP Extractor', 'List the contents of a ZIP file — see every entry and its size.', { op: 'unzip', action: 'Inspect ZIP' }),
  FT('file-merger', 'File Merger', 'Join multiple files into a single combined file.', { op: 'merge', action: 'Merge Files' }),
  FT('file-splitter', 'File Splitter', 'Split a large file into fixed-size parts — downloads a ZIP of parts.', { op: 'split', action: 'Split File' }),
  FT('file-renamer', 'File Renamer', 'Rename a file and download it under the new name.', { op: 'rename', action: 'Rename & Download' }),
  FT('file-metadata-viewer', 'File Metadata Viewer', 'View file metadata — name, size, MIME type, modified date.', { op: 'metadata', action: 'Read Metadata' }),
  FT('file-hash-checker', 'File Hash Checker', 'Compute the SHA-256 checksum of any file — verify integrity.', { op: 'hash', action: 'Compute Hash' }, { popular: true }),
  FT('mime-type-checker', 'MIME Type Checker', 'Identify a file\'s real type from its magic bytes, not just the extension.', { op: 'mime', action: 'Check Type' }),
  FT('file-size-analyzer', 'File Size Analyzer', 'Analyze file sizes — totals, averages and per-file breakdown.', { op: 'size', action: 'Analyze' }),
  FT('duplicate-file-finder', 'Duplicate File Finder', 'Find identical files by content hash — pick several files to compare.', { op: 'dupes', action: 'Find Duplicates' }),
  FT('folder-size-analyzer', 'Folder Size Analyzer', 'Pick a folder and see total size plus size by file type.', { op: 'folder', action: 'Analyze Folder' }),
  FT('batch-file-renamer', 'Batch File Renamer', 'Rename many files at once with a numbered pattern — downloads a ZIP.', { op: 'rename-batch', action: 'Rename All' }),
];
