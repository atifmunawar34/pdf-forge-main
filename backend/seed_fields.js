// Shared field & section factories for the template seed.
// A template = { slug, name, category, docType, description, sections, tags, disclaimer?, featured? }
// Sections drive BOTH the editor form and the PDF/print renderer (docType layout).

const f = (key, label, type, extra = {}) => ({ key, label, type, ...extra });
const text = (key, label, extra = {}) => f(key, label, 'text', extra);
const long = (key, label, extra = {}) => f(key, label, 'longtext', extra);
const num = (key, label, extra = {}) => f(key, label, 'number', extra);
const cur = (key, label, extra = {}) => f(key, label, 'currency', extra);
const date = (key = 'date', label = 'Date', extra = {}) => f(key, label, 'date', extra);
const email = (key = 'email', label = 'Email') => f(key, label, 'email');
const phone = (key = 'phone', label = 'Phone') => f(key, label, 'phone');
const sel = (key, label, options, extra = {}) => f(key, label, 'select', { options, ...extra });
const img = (key = 'logo', label = 'Logo / Image') => f(key, label, 'image');
const check = (key, label, extra = {}) => f(key, label, 'checkbox', extra);
const addr = (key = 'address', label = 'Address') => f(key, label, 'address');

// ---- section builders ----
const fields = (key, title, list) => ({ key, title, type: 'fields', fields: list });
const group = (key, title, list, extra = {}) => ({
  key, title, type: 'group', repeat: true,
  addLabel: extra.addLabel || 'Add row', min: extra.min ?? 1, fields: list,
});
const signBlock = (parties = ['Signature']) => ({ key: 'sign', title: 'Signatures', type: 'signature', parties });

// ---- reusable blocks ----
const sender = (title = 'Your Details') =>
  fields('sender', title, [text('name', 'Name / Company', { required: true }), addr(), email(), phone()]);

const party = (key, title) =>
  fields(key, title, [text('name', 'Name', { required: true }), text('company', 'Company'), addr(), email(), phone()]);

const moneyItems = (title = 'Items') =>
  group('items', title, [
    text('desc', 'Description', { span: 2, required: true }),
    num('qty', 'Qty', { default: 1 }),
    cur('price', 'Unit Price', { default: 0 }),
    num('tax', 'Tax %', { default: 0 }),
  ], { addLabel: 'Add item' });

const notesTerms = () =>
  fields('extra', 'Notes & Terms', [long('notes', 'Notes', { span: 2 }), long('terms', 'Terms & Conditions', { span: 2 })]);

const docMeta = (list) => fields('meta', 'Details', list);

// ---- doc-type section presets ----
const moneyDoc = ({ company = 'Your Company', client = 'Bill To', meta = [] } = {}) => [
  fields('company', company, [text('name', 'Company Name', { required: true }), img(), addr(), email(), phone()]),
  fields('client', client, [text('name', 'Name', { required: true }), text('company', 'Company'), addr(), email(), phone()]),
  docMeta(meta.length ? meta : [text('no', 'Document No.'), date(), date('due', 'Due / Valid Until')]),
  moneyItems(),
  notesTerms(),
  signBlock(),
];

const letter = ({ subject = '', bodyLabel = 'Letter body', greeting = 'Dear Sir/Madam,' } = {}) => [
  sender(),
  fields('doc', 'Letter Details', [date(), text('ref', 'Reference / Subject', { default: subject })]),
  party('recipient', 'Recipient'),
  fields('body', 'Message', [
    text('greeting', 'Salutation', { default: greeting }),
    long('body', bodyLabel, { span: 2, required: true }),
    text('closing', 'Closing', { default: 'Sincerely,' }),
    text('signName', 'Your name (signature)'),
  ]),
];

const form = (key, title, list, withSign = true) => {
  const s = [fields(key, title, list)];
  if (withSign) s.push(signBlock());
  return s;
};

const cv = () => [
  fields('profile', 'Personal Information', [
    text('name', 'Full Name', { required: true }), text('title', 'Job Title'),
    email(), phone(), text('location', 'Location'), text('website', 'Website / LinkedIn'),
  ]),
  fields('summary', 'Professional Summary', [long('summary', 'Summary', { span: 2 })]),
  group('experience', 'Work Experience', [
    text('company', 'Company', { required: true }), text('position', 'Position'),
    text('start', 'Start'), text('end', 'End'), long('desc', 'Description', { span: 2 }),
  ], { addLabel: 'Add experience' }),
  group('education', 'Education', [
    text('school', 'Institution'), text('degree', 'Degree'), text('start', 'Start'), text('end', 'End'),
  ], { addLabel: 'Add education' }),
  fields('skills', 'Skills', [long('skills', 'Skills (comma separated)', { span: 2 })]),
  fields('extra', 'Languages & Certifications', [long('languages', 'Languages'), long('certs', 'Certifications')]),
];

// Two-column CV: sidebar gets contact/skills/languages, main column gets summary/experience.
const cvSidebar = () => [
  fields('profile', 'Personal Information', [
    text('name', 'Full Name', { required: true }), text('title', 'Job Title'),
    email(), phone(), text('location', 'Location'), text('website', 'Website / LinkedIn'),
    img('photo', 'Photo (optional)'),
  ]),
  fields('summary', 'Profile', [long('summary', 'Profile / About me', { span: 2 })]),
  group('experience', 'Work Experience', [
    text('position', 'Position', { required: true }), text('company', 'Company'),
    text('start', 'Start'), text('end', 'End'), long('desc', 'Description / Achievements', { span: 2 }),
  ], { addLabel: 'Add experience', min: 3 }),
  group('education', 'Education', [
    text('degree', 'Degree', { required: true }), text('school', 'Institution'), text('start', 'Start'), text('end', 'End'),
  ], { addLabel: 'Add education', min: 2 }),
  fields('skills', 'Skills', [long('skills', 'Skills (one per line or comma separated)', { span: 2 })]),
  fields('extra', 'Languages & Certifications', [
    long('languages', 'Languages (one per line or comma separated)'),
    long('certs', 'Certifications'),
  ]),
  fields('reference', 'Reference (optional)', [
    text('refName', 'Name'), text('refTitle', 'Title / Company'), phone('refPhone', 'Phone'), email('refEmail', 'Email'),
  ]),
];

// Top-band CV: photo + name header on top, sidebar holds contact/education/skills/
// languages, main column holds profile + experience + references.
const cvTopband = () => [
  fields('profile', 'Personal Information', [
    text('name', 'Full Name', { required: true }), text('title', 'Job Title'),
    email(), phone(), text('location', 'Location'), text('website', 'Website / LinkedIn'),
    img('photo', 'Photo'),
  ]),
  fields('summary', 'Profile', [long('summary', 'Profile / About me', { span: 2 })]),
  group('experience', 'Work Experience', [
    text('company', 'Company', { required: true }), text('position', 'Position'),
    text('start', 'Start'), text('end', 'End'), long('desc', 'Description / Achievements', { span: 2 }),
  ], { addLabel: 'Add experience', min: 3 }),
  group('education', 'Education', [
    text('degree', 'Degree', { required: true }), text('school', 'Institution'), text('gpa', 'GPA / Notes'), text('start', 'Start'), text('end', 'End'),
  ], { addLabel: 'Add education', min: 2 }),
  fields('skills', 'Skills', [long('skills', 'Skills (one per line or comma separated)', { span: 2 })]),
  fields('extra', 'Languages', [long('languages', 'Languages (one per line or comma separated)', { span: 2 })]),
  group('reference', 'References', [
    text('refName', 'Name', { required: true }), text('refTitle', 'Title / Company'),
    phone('refPhone', 'Phone'), email('refEmail', 'Email'),
  ], { addLabel: 'Add reference', min: 1 }),
];

const agreement = ({ a = 'First Party', b = 'Second Party', details = [] } = {}) => [
  party('partyA', a),
  party('partyB', b),
  docMeta(details.length ? details : [date('date', 'Agreement Date'), text('ref', 'Reference No.'), text('term', 'Term / Duration'), cur('amount', 'Consideration / Amount')]),
  group('clauses', 'Terms & Clauses', [text('title', 'Clause title'), long('text', 'Clause text', { span: 2 })], { addLabel: 'Add clause', min: 3 }),
  signBlock([`${a} Signature`, `${b} Signature`]),
];

const checklist = (title = 'Checklist') => [
  group('items', title, [text('item', 'Item', { span: 2 }), text('note', 'Note')], { addLabel: 'Add item', min: 8 }),
  fields('extra', 'Notes', [long('notes', 'Notes', { span: 2 })]),
];

const planner = (title = 'Schedule', cols) => [
  group('rows', title, cols || [text('time', 'Time'), text('task', 'Task / Activity', { span: 2 }), text('note', 'Notes')], { addLabel: 'Add row', min: 8 }),
  fields('extra', 'Notes', [long('notes', 'Notes', { span: 2 })]),
];

const report = ({ meta = [] } = {}) => [
  docMeta(meta.length ? meta : [text('title', 'Title', { required: true }), text('author', 'Prepared By'), date()]),
  group('sections', 'Sections', [text('heading', 'Heading', { required: true }), long('content', 'Content', { span: 2 })], { addLabel: 'Add section', min: 3 }),
];

const table = (title, cols) => [
  docMeta([text('title', 'Title'), text('author', 'Prepared By'), date()]),
  group('rows', title, cols, { addLabel: 'Add row', min: 8 }),
];

const receiptDoc = () => [
  fields('company', 'Issued By', [text('name', 'Name / Organization', { required: true }), addr(), phone()]),
  docMeta([text('no', 'Receipt No.'), date(), text('received', 'Received From', { required: true })]),
  group('items', 'Payment Details', [text('desc', 'For / Description', { span: 2 }), cur('price', 'Amount')], { addLabel: 'Add line', min: 1 }),
  fields('extra', 'Payment', [sel('method', 'Payment Method', ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Other']), text('ref', 'Transaction Ref')]),
  signBlock(['Authorized Signature']),
];

module.exports = {
  f, text, long, num, cur, date, email, phone, sel, img, check, addr,
  fields, group, signBlock, sender, party, moneyItems, notesTerms, docMeta,
  moneyDoc, letter, form, cv, cvSidebar, cvTopband, agreement, checklist, planner, report, table, receiptDoc,
};
