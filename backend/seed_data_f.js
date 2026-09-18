// Template definitions: Modern designer layouts (sidebar CVs, modern invoice)
const B = require('./seed_fields');
const { fields, group, text, long, num, cur, date, email, phone, sel, img, addr, moneyDoc, cvSidebar, letter } = B;

const T = (slug, name, cat, doc, desc, sections, opts = {}) =>
  ({
    slug, name, category: cat, docType: doc, description: desc, sections,
    tags: opts.tags || [], featured: !!opts.featured, disclaimer: opts.disclaimer,
    layout: opts.layout, accent: opts.accent,
  });

module.exports = [

  // ---- Sidebar CV designs (Canva-style two-column) ----
  T('modern-sidebar-resume', 'Modern Sidebar Resume', 'career', 'cv',
    'Two-column resume with a dark sidebar for contact, skills and languages — a modern Canva-style design.',
    cvSidebar(), { tags: ['resume', 'cv', 'modern', 'sidebar', 'job'], featured: true, layout: 'sidebar', accent: 'slate' }),

  T('executive-resume', 'Executive Resume', 'career', 'cv',
    'Premium two-column resume with a deep navy sidebar — for senior and executive roles.',
    cvSidebar(), { tags: ['resume', 'cv', 'executive', 'professional', 'senior'], featured: true, layout: 'sidebar', accent: 'navy' }),

  T('creative-resume', 'Creative Resume', 'career', 'cv',
    'Bold two-column resume with a teal sidebar — for designers, marketers and creatives.',
    cvSidebar(), { tags: ['resume', 'cv', 'creative', 'design', 'marketing'], layout: 'sidebar', accent: 'teal' }),

  T('elegant-cv', 'Elegant CV', 'career', 'cv',
    'Refined two-column CV with a warm gold sidebar — elegant and distinctive.',
    cvSidebar(), { tags: ['cv', 'resume', 'elegant', 'premium'], layout: 'sidebar', accent: 'gold' }),

  T('minimal-sidebar-resume', 'Minimal Sidebar Resume', 'career', 'cv',
    'Clean two-column resume with a soft green sidebar — minimal and fresh.',
    cvSidebar(), { tags: ['resume', 'cv', 'minimal', 'clean', 'simple'], layout: 'sidebar', accent: 'emerald' }),

  T('professional-cv-dark', 'Professional CV (Dark)', 'career', 'cv',
    'Striking two-column CV with a charcoal sidebar — modern and confident.',
    cvSidebar(), { tags: ['resume', 'cv', 'professional', 'dark', 'modern'], layout: 'sidebar', accent: 'charcoal' }),

  // ---- Modern invoice ----
  T('modern-invoice', 'Modern Invoice', 'sales-invoicing', 'invoice',
    'Contemporary invoice with a bold navy accent — clean, corporate and confident.',
    moneyDoc({ meta: [text('no', 'Invoice No.', { required: true }), date('date', 'Invoice Date'), date('due', 'Due Date')] }),
    { tags: ['invoice', 'modern', 'billing', 'corporate'], featured: true, accent: 'navy' }),

  T('minimal-invoice', 'Minimal Invoice', 'sales-invoicing', 'invoice',
    'Understated minimal invoice with a soft green accent.',
    moneyDoc({ meta: [text('no', 'Invoice No.'), date(), date('due', 'Due Date')] }),
    { tags: ['invoice', 'minimal', 'clean', 'billing'], accent: 'emerald' }),

  // ---- Modern letter ----
  T('modern-cover-letter', 'Modern Cover Letter', 'career', 'letter',
    'Contemporary cover letter with a bold navy accent — stands out professionally.',
    letter({ subject: 'Application for [Position]', greeting: 'Dear Hiring Manager,' }),
    { tags: ['cover letter', 'modern', 'job', 'application'], accent: 'navy' }),
];
