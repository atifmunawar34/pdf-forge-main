// Template definitions: Top-band CVs (photo header + colored sidebar)
const B = require('./seed_fields');
const { cvTopband } = B;

const T = (slug, name, cat, doc, desc, sections, opts = {}) =>
  ({
    slug, name, category: cat, docType: doc, description: desc, sections,
    tags: opts.tags || [], featured: !!opts.featured,
    layout: opts.layout, accent: opts.accent,
  });

module.exports = [
  T('topband-resume', 'Top-Band Resume', 'career', 'cv',
    'Modern resume with photo header and a bold blue sidebar for contact, education and skills — a polished Canva-style design.',
    cvTopband(), { tags: ['resume', 'cv', 'modern', 'photo', 'sidebar', 'job'], featured: true, layout: 'topband', accent: 'blue' }),

  T('topband-teal-resume', 'Top-Band Resume (Teal)', 'career', 'cv',
    'Photo-header resume with a teal sidebar — modern and fresh for marketing, design and creative roles.',
    cvTopband(), { tags: ['resume', 'cv', 'teal', 'photo', 'creative'], layout: 'topband', accent: 'teal' }),

  T('topband-slate-resume', 'Top-Band Resume (Slate)', 'career', 'cv',
    'Photo-header resume with a dark slate sidebar — professional and executive.',
    cvTopband(), { tags: ['resume', 'cv', 'professional', 'photo', 'executive'], layout: 'topband', accent: 'slate' }),
];
