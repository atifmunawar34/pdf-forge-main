// Marketing tools — UTM builders, text generators (template-based) + calculators.
const N = (v) => parseFloat(v) || 0;
const money = (n) => (isFinite(n) ? n.toFixed(2) : '0.00');
const pct = (n) => (isFinite(n) ? n.toFixed(2) : '0') + '%';

const T = (id, name, desc, engine, def, extra = {}) => ({
  id, name, desc, engine, def, keywords: [name.toLowerCase(), 'marketing tool', 'free online'], ...extra,
});

const txt = (id, name, desc, fields, run, extra = {}) =>
  T(id, name, desc, 'text', { allowEmpty: true, inputLabel: 'Details', placeholder: 'Optional notes…', options: fields, action: 'Generate', run: (t, o) => run({ ...o, notes: t }) }, extra);

export const MARKETING_TOOLS = [
  txt('utm-builder', 'UTM Builder', 'Build UTM-tagged campaign URLs — source, medium, campaign, term, content.', [
    { key: 'url', label: 'Website URL', type: 'text', placeholder: 'https://example.com/landing' },
    { key: 'source', label: 'utm_source', type: 'text', placeholder: 'e.g. facebook' },
    { key: 'medium', label: 'utm_medium', type: 'text', placeholder: 'e.g. cpc' },
    { key: 'campaign', label: 'utm_campaign', type: 'text', placeholder: 'e.g. summer-sale' },
    { key: 'term', label: 'utm_term (optional)', type: 'text' },
    { key: 'content', label: 'utm_content (optional)', type: 'text' },
  ], (v) => {
    if (!v.url) return 'Enter a website URL first.';
    const p = new URLSearchParams();
    ['source', 'medium', 'campaign', 'term', 'content'].forEach((k) => v[k] && p.set(`utm_${k}`, v[k]));
    return `${v.url}${v.url.includes('?') ? '&' : '?'}${p.toString()}`;
  }, { featured: true, popular: true }),
  txt('meta-title-generator', 'Meta Title Generator', 'SEO title tag ideas under 60 characters — multiple variations.', [
    { key: 'kw', label: 'Main keyword', type: 'text', placeholder: 'e.g. pdf tools' },
    { key: 'brand', label: 'Brand name', type: 'text', placeholder: 'e.g. PDF Forge' },
  ], (v) => {
    const k = v.kw || 'Your Topic', b = v.brand || 'Your Brand';
    return [
      `${k.charAt(0).toUpperCase() + k.slice(1)} | ${b}`,
      `Free ${k.charAt(0).toUpperCase() + k.slice(1)} — Fast & Easy | ${b}`,
      `${k.charAt(0).toUpperCase() + k.slice(1)} Online | ${b}`,
      `Best ${k.charAt(0).toUpperCase() + k.slice(1)} 2025 | ${b}`,
    ].join('\n');
  }),
  txt('meta-description-generator', 'Meta Description Generator', 'Compelling 155-char meta descriptions for SEO.', [
    { key: 'kw', label: 'Main keyword', type: 'text' },
    { key: 'cta', label: 'Call to action', type: 'text', placeholder: 'e.g. Try it free' },
  ], (v) => {
    const k = v.kw || 'your topic', c = v.cta || 'Get started now';
    return [
      `${k.charAt(0).toUpperCase() + k.slice(1)} — fast, free and easy to use online. No signup needed. ${c}.`,
      `Looking for ${k}? Our free tool makes it simple. ${c} today!`,
      `${k.charAt(0).toUpperCase() + k.slice(1)} made easy. Trusted by thousands. ${c} — completely free.`,
    ].join('\n');
  }),
  txt('hashtag-generator', 'Hashtag Generator', 'Hashtag suggestions for any topic — social media reach.', [
    { key: 'topic', label: 'Topic / keyword', type: 'text', placeholder: 'e.g. fitness' },
  ], (v) => {
    const k = (v.topic || 'topic').replace(/\s+/g, '');
    const cap = k.charAt(0).toUpperCase() + k.slice(1);
    return [
      `#${k}`, `#${k}life`, `#${k}lover`, `#${k}goals`, `#${k}daily`,
      `#${k}gram`, `#${k}community`, `#${k}time`, `#love${cap}`, `#${k}2025`,
      `#${k}addict`, `#insta${k}`, `#${k}world`, `#${k}vibes`, `#${cap}`,
    ].join(' ');
  }, { popular: true }),
  txt('social-bio-generator', 'Social Media Bio Generator', 'Short bio ideas for Instagram, Twitter/X and LinkedIn profiles.', [
    { key: 'what', label: 'What you do', type: 'text', placeholder: 'e.g. designer' },
    { key: 'extra', label: 'Extra (hobby/location)', type: 'text' },
  ], (v) => {
    const w = v.what || 'creator', e = v.extra || 'making things';
    return [
      `${w.charAt(0).toUpperCase() + w.slice(1)} ✦ ${e}\n📍 Turning ideas into reality\n👇 Links below`,
      `${w} | ${e}\nSharing what I learn along the way 🚀`,
      `Professional ${w}.\n${e}.\nDM for collabs 💌`,
    ].join('\n---\n');
  }),
  txt('caption-generator', 'Social Media Caption Generator', 'Caption starters for posts — hooks, questions and CTAs.', [
    { key: 'topic', label: 'Post topic', type: 'text' },
  ], (v) => {
    const k = v.topic || 'this';
    return [
      `POV: You just discovered ${k} 👀`,
      `Nobody talks about ${k} enough. Here's why it matters →`,
      `${k.charAt(0).toUpperCase() + k.slice(1)} — but make it look easy 😌`,
      `Save this if you care about ${k} 📌`,
      `Hot take on ${k} 🧵👇`,
    ].join('\n');
  }),
  txt('ad-copy-generator', 'Ad Copy Generator', 'Short ad copy variations — headline + body combos.', [
    { key: 'product', label: 'Product/service', type: 'text' },
    { key: 'benefit', label: 'Main benefit', type: 'text' },
  ], (v) => {
    const p = v.product || 'our product', b = v.benefit || 'save time';
    return [
      `${b.charAt(0).toUpperCase() + b.slice(1)} with ${p} — try it free today.`,
      `Stop struggling. ${p.charAt(0).toUpperCase() + p.slice(1)} helps you ${b}. Start now.`,
      `Join thousands who ${b} with ${p}. Free to start →`,
      `${p}: the easiest way to ${b}. See why users love it.`,
    ].join('\n');
  }),
  txt('email-subject-generator', 'Email Subject Generator', 'High-open-rate email subject line ideas.', [
    { key: 'topic', label: 'Email topic', type: 'text' },
  ], (v) => {
    const k = v.topic || 'your update';
    return [
      `Quick question about ${k}`,
      `${k.charAt(0).toUpperCase() + k.slice(1)} — here's what you missed`,
      `You asked, we built it: ${k}`,
      `[Inside] ${k} 👀`,
      `3 things about ${k} nobody tells you`,
    ].join('\n');
  }),
  txt('campaign-name-generator', 'Campaign Name Generator', 'Catchy marketing campaign name ideas.', [
    { key: 'brand', label: 'Brand/product', type: 'text' },
  ], (v) => {
    const b = v.brand || 'YourBrand';
    return [`${b} Season`, `Project ${b}`, `${b} Forward`, `The ${b} Effect`, `${b} Unlocked`, `${b} Rising`].join('\n');
  }),
  T('marketing-roi-calculator', 'Marketing ROI Calculator', 'Return on marketing spend — revenue vs campaign cost.', 'calc', {
    fields: [{ key: 'spend', label: 'Marketing spend', type: 'number' }, { key: 'revenue', label: 'Revenue generated', type: 'number' }],
    compute: (v) => [
      { label: 'ROI', value: pct((N(v.revenue) - N(v.spend)) / Math.max(1e-9, N(v.spend)) * 100) },
      { label: 'Net return', value: money(N(v.revenue) - N(v.spend)) },
    ],
  }),
  T('conversion-rate-calculator', 'Conversion Rate Calculator', 'Conversion rate from visitors and conversions.', 'calc', {
    fields: [{ key: 'visitors', label: 'Visitors', type: 'number' }, { key: 'conv', label: 'Conversions', type: 'number' }],
    compute: (v) => [{ label: 'Conversion rate', value: pct(N(v.conv) / Math.max(1e-9, N(v.visitors)) * 100) }],
  }),
  T('cpm-calculator', 'CPM Calculator', 'Cost per 1000 impressions — ad spend efficiency.', 'calc', {
    fields: [{ key: 'cost', label: 'Ad spend', type: 'number' }, { key: 'impr', label: 'Impressions', type: 'number' }],
    compute: (v) => [{ label: 'CPM', value: money(N(v.cost) / Math.max(1e-9, N(v.impr)) * 1000) }],
  }),
  T('cpc-calculator', 'CPC Calculator', 'Cost per click — total spend divided by clicks.', 'calc', {
    fields: [{ key: 'cost', label: 'Ad spend', type: 'number' }, { key: 'clicks', label: 'Clicks', type: 'number' }],
    compute: (v) => [{ label: 'CPC', value: money(N(v.cost) / Math.max(1e-9, N(v.clicks))) }],
  }),
  T('ctr-calculator', 'CTR Calculator', 'Click-through rate — clicks divided by impressions.', 'calc', {
    fields: [{ key: 'clicks', label: 'Clicks', type: 'number' }, { key: 'impr', label: 'Impressions', type: 'number' }],
    compute: (v) => [{ label: 'CTR', value: pct(N(v.clicks) / Math.max(1e-9, N(v.impr)) * 100) }],
  }),
  T('roas-calculator', 'ROAS Calculator', 'Return on ad spend — revenue per ad dollar.', 'calc', {
    fields: [{ key: 'revenue', label: 'Revenue from ads', type: 'number' }, { key: 'cost', label: 'Ad spend', type: 'number' }],
    compute: (v) => [
      { label: 'ROAS', value: `${(N(v.revenue) / Math.max(1e-9, N(v.cost))).toFixed(2)}×` },
      { label: 'Revenue/spend', value: money(N(v.revenue)) + ' / ' + money(N(v.cost)) },
    ],
  }),
  txt('url-campaign-builder', 'URL Campaign Builder', 'Full campaign URL builder with UTM parameters.', [
    { key: 'url', label: 'Base URL', type: 'text', placeholder: 'https://example.com' },
    { key: 'source', label: 'Source', type: 'text', placeholder: 'newsletter' },
    { key: 'medium', label: 'Medium', type: 'text', placeholder: 'email' },
    { key: 'campaign', label: 'Campaign', type: 'text', placeholder: 'launch-2025' },
  ], (v) => {
    if (!v.url) return 'Enter a base URL first.';
    const p = new URLSearchParams();
    ['source', 'medium', 'campaign'].forEach((k) => v[k] && p.set(`utm_${k}`, v[k]));
    return `${v.url}?${p.toString()}`;
  }),
];
