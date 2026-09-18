// Builds backend/data/templates.json from the seed definition files.
// Run once:  node backend/seed_templates.js
// To add templates later, edit data/templates.json directly (no code changes needed).
const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  ['career', 'Career & Jobs'],
  ['business', 'Business'],
  ['sales-invoicing', 'Sales & Invoicing'],
  ['freelance', 'Freelancers & Agencies'],
  ['hr', 'HR & Employees'],
  ['finance', 'Finance'],
  ['education', 'Education'],
  ['personal', 'Personal'],
  ['real-estate', 'Real Estate'],
  ['legal', 'Legal & Agreements'],
  ['marketing', 'Marketing'],
  ['project', 'Project Management'],
  ['ecommerce', 'E-commerce'],
  ['import-export', 'Import & Export'],
  ['healthcare', 'Healthcare / Clinics'],
  ['construction', 'Construction'],
  ['food', 'Restaurants & Food'],
  ['travel-events', 'Travel & Events'],
  ['nonprofit', 'Nonprofit / Organizations'],
];

const LEGAL_DISCLAIMER =
  'Template provided for general informational and document-preparation purposes. ' +
  'It is not legal advice. Consider consulting a qualified professional for your specific situation.';

const data = [
  ...require('./seed_data_a'),
  ...require('./seed_data_b'),
  ...require('./seed_data_c'),
  ...require('./seed_data_d'),
  ...require('./seed_data_e'),
  ...require('./seed_data_f'),
  ...require('./seed_data_g'),
];

// Every template gets a unique design combo: theme × accent × header variant.
// Combos rotate per docType, so no two templates of the same kind look alike.
const THEMES = ['modern', 'classic', 'bold', 'elegant'];
const ACCENT_POOL = [
  'rose', 'navy', 'teal', 'gold', 'emerald', 'slate', 'charcoal', 'blue',
  'violet', 'indigo', 'crimson', 'orange', 'sky', 'plum', 'olive',
];
const VARIANTS = {
  modern: ['band', 'rail', 'boxed'],
  classic: ['center', 'left'],
  bold: ['band', 'block'],
  elegant: ['hairline', 'center'],
};
const comboCounter = {};

const seen = new Set();
const templates = data.map((t, i) => {
  if (seen.has(t.slug)) throw new Error(`duplicate slug: ${t.slug}`);
  seen.add(t.slug);
  const cat = CATEGORIES.find((c) => c[0] === t.category);
  if (!cat) throw new Error(`unknown category: ${t.category} (${t.slug})`);
  // fixed-layout CVs (sidebar/topband) manage their own design
  const fixed = t.docType === 'cv' && (t.layout === 'sidebar' || t.layout === 'topband');
  const c = i; // global index — spreads combos across all docTypes too
  const theme = t.theme || (fixed ? undefined : THEMES[c % THEMES.length]);
  const variant = t.variant || (fixed ? undefined : VARIANTS[theme][c % VARIANTS[theme].length]);
  const accent = t.accent || ACCENT_POOL[c % ACCENT_POOL.length];
  return {
    id: `tpl-${String(i + 1).padStart(3, '0')}`,
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    categoryName: cat[1],
    docType: t.docType,
    tags: t.tags,
    sections: t.sections,
    disclaimer: t.disclaimer ? LEGAL_DISCLAIMER : undefined,
    layout: t.layout,
    theme,
    variant,
    accent,
    status: 'published',
    featured: t.featured || false,
    seoTitle: `Free ${t.name} Template — Fill & Download PDF | PDF Forge`,
    seoDescription: `Create a professional ${t.name.toLowerCase()} in minutes. Fill in the fields, preview, then download as PDF or print — free.`,
    faqs: [
      { q: `Is this ${t.name} template free?`, a: 'Yes. Fill it in online, preview the result and download it as a PDF for free.' },
      { q: `Can I edit the ${t.name} before downloading?`, a: 'Yes. Open the template editor, fill the fields, add or remove rows and sections, then generate your document.' },
      { q: 'What formats can I download?', a: 'Your finished document downloads as a PDF. You can also print it directly from the browser.' },
    ],
    createdAt: '2026-01-01',
  };
});

const out = { categories: CATEGORIES.map(([slug, name]) => ({ slug, name })), templates };
const file = path.join(__dirname, 'data', 'templates.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`Wrote ${templates.length} templates in ${CATEGORIES.length} categories -> ${file}`);
