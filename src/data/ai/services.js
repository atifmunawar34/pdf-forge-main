/**
 * Company service catalog — the assistant reads this structured data.
 * Shape is admin-panel-ready: { id, name, category, desc, keywords,
 * inquiryFields[], active, featured, canQuote }
 * canQuote: false — the AI never invents prices; it collects requirements.
 */
export const SERVICES = [
  {
    id: 'website-dev', name: 'Website Development', category: 'Development', active: true, featured: true, canQuote: false,
    desc: 'Custom business websites — corporate sites, portfolios, landing pages, blogs.',
    keywords: ['website', 'web site', 'landing page', 'portfolio site', 'business site', 'web development', 'webpage', 'site for'],
    inquiryFields: [
      { q: 'What type of website do you need?', topic: 'website type', opts: ['Business website', 'Portfolio', 'Landing page', 'Blog'] },
      { q: 'What is your business or industry?', topic: 'business/industry', opts: null },
      { q: 'Roughly how many pages?', topic: 'page count', opts: ['1–5', '5–10', '10–20', '20+'] },
      { q: 'Do you need e-commerce or payments?', topic: 'payments', opts: ['Yes — online payments', 'Yes — full store', 'No', 'Not sure'] },
      { q: 'Do you need user accounts or an admin panel?', topic: 'accounts/admin', opts: ['Yes — accounts', 'Yes — admin panel', 'Both', 'No'] },
      { q: 'Do you already have branding, content and a domain?', topic: 'branding & domain', opts: ['Yes, all ready', 'Partially', 'No', 'Not sure'] },
      { q: 'What is your target launch timeline?', topic: 'timeline', opts: ['ASAP', '2–4 weeks', '1–3 months', 'Flexible'] },
    ],
  },
  {
    id: 'ecommerce', name: 'E-commerce Store', category: 'Development', active: true, featured: true, canQuote: false,
    desc: 'Online stores — product catalogs, cart, checkout, payments, order management.',
    keywords: ['ecommerce', 'e-commerce', 'online store', 'online shop', 'shopify', 'sell online', 'woocommerce', 'store'],
    inquiryFields: [
      { q: 'What products will you sell, and roughly how many?', topic: 'products & catalog size' },
      'Which payment methods do you need? (card, COD, bank transfer…)',
      { q: 'Do you need inventory and order management?', topic: 'inventory & orders' },
      { q: 'Do you need shipping/delivery tracking?', topic: 'shipping tracking' },
      { q: 'Any preferred platform? (Shopify, custom, WooCommerce)', topic: 'platform preference' },
      { q: 'What is your target launch timeline?', topic: 'timeline' },
    ],
  },
  {
    id: 'mobile-app', name: 'Mobile App Development', category: 'Development', active: true, featured: true, canQuote: false,
    desc: 'Android & iOS applications — business apps, ordering, booking, delivery.',
    keywords: ['android app', 'ios app', 'mobile app', 'app for', 'an app', 'need app', 'want app', 'application', 'apk', 'play store', 'app development'],
    inquiryFields: [
      { q: 'What should the app do? Describe the core features.', topic: 'core features' },
      { q: 'Android, iOS, or both?', topic: 'platforms' },
      { q: 'Do you need user accounts / login?', topic: 'user accounts' },
      { q: 'Do you need payments or online ordering?', topic: 'payments/ordering' },
      { q: 'Do you need an admin dashboard?', topic: 'admin dashboard' },
      { q: 'Any existing system or API to connect?', topic: 'integrations' },
      'What is your target timeline?',
    ],
  },
  {
    id: 'custom-software', name: 'Custom Software / SaaS', category: 'Development', active: true, canQuote: false,
    desc: 'Custom web applications, dashboards, internal tools and SaaS products.',
    keywords: ['custom software', 'saas', 'web app', 'web application', 'dashboard', 'internal tool', 'portal', 'management system'],
    inquiryFields: [
      { q: 'What problem should the software solve?', topic: 'problem to solve' },
      'Who will use it — how many users and what roles?',
      { q: 'What are the must-have features/modules?', topic: 'must-have modules' },
      { q: 'Web only, or mobile too?', topic: 'platforms' },
      { q: 'Any systems it must integrate with?', topic: 'integrations' },
      'What is your target timeline?',
    ],
  },
  {
    id: 'crm-erp', name: 'CRM / ERP Systems', category: 'Enterprise', active: true, canQuote: false,
    desc: 'Custom CRM and ERP systems — sales, HR, inventory, finance, operations.',
    keywords: ['crm', 'erp', 'customer management', 'inventory system', 'hr system', 'billing system', 'enterprise'],
    inquiryFields: [
      { q: 'What is your industry and company size?', topic: 'industry & size' },
      'Which modules do you need? (sales, HR, inventory, finance…)',
      { q: 'How many users and what roles/permissions?', topic: 'users & roles' },
      { q: 'Do you have an existing system to migrate from?', topic: 'migration' },
      'Any required integrations? (accounting, email, SMS…)',
      'What is your target timeline?',
    ],
  },
  {
    id: 'ai-dev', name: 'AI & Chatbot Development', category: 'AI', active: true, featured: true, canQuote: false,
    desc: 'Custom AI assistants, chatbots, AI agents and AI integrations for business.',
    keywords: ['ai chatbot', 'chatbot', 'ai assistant', 'ai agent', 'ai development', 'gpt', 'ai integration', 'automation ai'],
    inquiryFields: [
      { q: 'What should the AI/chatbot do for your customers or team?', topic: 'AI purpose' },
      'Where will it live? (website, WhatsApp, app…)',
      { q: 'What knowledge should it have? (FAQ, docs, product data)', topic: 'knowledge sources' },
      { q: 'Should it connect to any of your systems or APIs?', topic: 'system connections' },
      { q: 'Roughly how many users/conversations per month?', topic: 'expected volume' },
      'What is your target timeline?',
    ],
  },
  {
    id: 'automation', name: 'Business Automation & Integrations', category: 'Enterprise', active: true, canQuote: false,
    desc: 'Workflow automation, API integrations, data pipelines and process tools.',
    keywords: ['automation', 'api integration', 'integrate', 'workflow', 'zapier', 'data pipeline', 'sync', 'automate'],
    inquiryFields: [
      { q: 'What process do you want to automate?', topic: 'process to automate' },
      { q: 'Which tools/systems are involved?', topic: 'systems involved' },
      { q: 'How often should it run? (real-time, scheduled, manual)', topic: 'run frequency' },
      { q: 'What volume of data/records?', topic: 'data volume' },
      { q: 'Who needs access to manage it?', topic: 'admin access' },
    ],
  },
  {
    id: 'uiux', name: 'UI/UX Design', category: 'Design', active: true, canQuote: false,
    desc: 'Interface design, product design, branding and design systems.',
    keywords: ['ui ux', 'uiux', 'design', 'figma', 'branding', 'logo design', 'redesign', 'prototype'],
    inquiryFields: [
      'What are we designing? (app, website, brand…)',
      { q: 'Do you have existing branding or guidelines?', topic: 'existing branding' },
      { q: 'Any reference designs you like?', topic: 'reference designs' },
      { q: 'Deliverables needed? (mockups, prototype, design system)', topic: 'deliverables' },
      'What is your target timeline?',
    ],
  },
];

export const findService = (text) => {
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const s of SERVICES.filter((x) => x.active)) {
    let score = 0;
    for (const k of s.keywords) if (t.includes(k)) score += k.includes(' ') ? 3 : 1;
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return bestScore >= 1 ? best : null;
};
