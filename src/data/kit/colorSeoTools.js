// Color tools + SEO tools.

const C = (id, name, desc, mode, extra = {}) => ({
  id, name, desc, engine: 'color', def: { mode }, keywords: [name.toLowerCase(), 'color tool', 'free online'], ...extra,
});
const S = (id, name, desc, def, extra = {}) => ({
  id, name, desc, engine: 'seo', def, keywords: [name.toLowerCase(), 'seo tool', 'free online'], ...extra,
});

export const COLOR_TOOLS = [
  C('color-picker', 'Color Picker', 'Pick any color and get HEX, RGB, HSL and CSS formats instantly.', 'convert', { featured: true, popular: true }),
  C('hex-to-rgb', 'HEX to RGB', 'Convert HEX color codes to RGB values — paste or pick.', 'convert'),
  C('rgb-to-hex', 'RGB to HEX', 'Convert rgb(r,g,b) values to HEX color codes.', 'convert'),
  C('hex-to-hsl', 'HEX to HSL', 'Convert HEX colors to HSL (hue, saturation, lightness).', 'convert'),
  C('hsl-to-hex', 'HSL to HEX', 'Convert hsl(h,s%,l%) values back to HEX.', 'convert'),
  C('rgb-to-hsl', 'RGB to HSL', 'Convert RGB values to HSL color format.', 'convert'),
  C('hsl-to-rgb', 'HSL to RGB', 'Convert HSL values to RGB.', 'convert'),
  C('color-palette-gen', 'Color Palette Generator', 'Generate harmonious color palettes — complementary, analogous, triadic.', 'palette', { featured: true }),
  C('gradient-generator', 'Gradient Generator', 'Blend two colors and copy the result — CSS-ready.', 'mixer'),
  C('contrast-checker', 'Contrast Checker', 'WCAG contrast ratio between two colors — accessibility check.', 'contrast', { popular: true }),
  C('contrast-calculator', 'Color Contrast Calculator', 'Calculate exact contrast ratio for text/background pairs.', 'contrast'),
  C('random-color-generator', 'Random Color Generator', 'Generate random colors with one click — HEX code included.', 'random'),
  C('color-shades-generator', 'Color Shades Generator', 'Generate dark-to-light shades of any color.', 'shades'),
  C('color-tints-generator', 'Color Tints Generator', 'Generate lighter tints by mixing a color toward white.', 'tints'),
  C('color-mixer', 'Color Mixer', 'Blend two colors at any ratio — see the mixed result.', 'mixer'),
];

const esc = (s) => (s || '').replace(/"/g, '&quot;');
const jsonLd = (obj) => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;

export const SEO_TOOLS = [
  S('meta-tag-generator', 'Meta Tag Generator', 'Generate complete HTML meta tags — title, description, keywords, author.', {
    mode: 'generate', action: 'Generate Tags', filename: 'meta-tags.html',
    fields: [
      { key: 'title', label: 'Page title' }, { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { key: 'keywords', label: 'Keywords (comma-separated)' }, { key: 'author', label: 'Author' },
    ],
    build: (v) => [
      `<title>${esc(v.title)}</title>`,
      `<meta name="description" content="${esc(v.description)}">`,
      v.keywords && `<meta name="keywords" content="${esc(v.keywords)}">`,
      v.author && `<meta name="author" content="${esc(v.author)}">`,
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    ].filter(Boolean).join('\n'),
  }, { featured: true, popular: true }),
  S('meta-tag-analyzer', 'Meta Tag Analyzer', 'Paste HTML to audit title, description, OG tags and headings.', {
    mode: 'analyze', action: 'Analyze',
    fields: [{ key: 'input', label: 'Paste page HTML', type: 'textarea', rows: 8, placeholder: '<html>…' }],
    analyze: (html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const get = (sel) => doc.querySelector(sel)?.getAttribute('content') || doc.querySelector(sel)?.textContent;
      const title = doc.querySelector('title')?.textContent || '';
      const desc = get('meta[name="description"]') || '';
      const h1s = doc.querySelectorAll('h1').length;
      const imgs = doc.querySelectorAll('img');
      const noAlt = [...imgs].filter((i) => !i.getAttribute('alt')).length;
      return {
        stats: [
          ['Title', `${title.length} chars`], ['Description', `${desc.length} chars`],
          ['H1 tags', h1s], ['Images w/o alt', noAlt], ['Links', doc.querySelectorAll('a').length],
        ],
        rows: [
          ['Check', 'Result'],
          ['Title length', title.length === 0 ? 'Missing!' : title.length <= 60 ? 'OK' : 'Too long (>60)'],
          ['Description', desc.length === 0 ? 'Missing!' : desc.length <= 158 ? 'OK' : 'Too long (>158)'],
          ['OG title', get('meta[property="og:title"]') ? 'Present' : 'Missing'],
          ['Canonical', doc.querySelector('link[rel="canonical"]') ? 'Present' : 'Missing'],
          ['H1 count', h1s === 1 ? 'OK (exactly 1)' : h1s === 0 ? 'Missing!' : `${h1s} — should be 1`],
        ],
      };
    },
  }, { popular: true }),
  S('keyword-density-checker', 'Keyword Density Checker', 'Word frequency and density analysis for SEO content.', {
    mode: 'analyze', action: 'Analyze',
    fields: [{ key: 'input', label: 'Paste your content', type: 'textarea', rows: 8 }],
    analyze: (text) => {
      const words = text.toLowerCase().match(/[a-z']+/g) || [];
      const freq = {};
      words.forEach((w) => { if (w.length > 2) freq[w] = (freq[w] || 0) + 1; });
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15);
      return {
        stats: [['Total words', words.length], ['Unique words', Object.keys(freq).length]],
        rows: [['Keyword', 'Count · Density'], ...top.map(([w, c]) => [w, `${c} · ${(c / words.length * 100).toFixed(1)}%`])],
      };
    },
  }),
  S('sitemap-generator', 'Sitemap Generator', 'Generate a valid XML sitemap from a list of URLs.', {
    mode: 'generate', action: 'Generate Sitemap', filename: 'sitemap.xml', mime: 'application/xml',
    fields: [{ key: 'urls', label: 'URLs (one per line)', type: 'textarea', rows: 6, placeholder: 'https://example.com/\nhttps://example.com/about' }],
    build: (v) => {
      const urls = (v.urls || '').split('\n').map((u) => u.trim()).filter(Boolean);
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}\n</urlset>`;
    },
  }),
  S('robots-txt-generator', 'Robots.txt Generator', 'Generate a robots.txt file — allow/disallow rules and sitemap.', {
    mode: 'generate', action: 'Generate robots.txt', filename: 'robots.txt',
    fields: [
      { key: 'ua', label: 'User-agent', placeholder: '*' },
      { key: 'disallow', label: 'Disallow paths (comma-separated)', placeholder: '/admin, /private' },
      { key: 'sitemap', label: 'Sitemap URL', placeholder: 'https://example.com/sitemap.xml' },
    ],
    build: (v) => [
      `User-agent: ${v.ua || '*'}`,
      ...(v.disallow || '').split(',').map((d) => d.trim()).filter(Boolean).map((d) => `Disallow: ${d}`),
      'Allow: /',
      v.sitemap && `\nSitemap: ${v.sitemap}`,
    ].join('\n'),
  }),
  S('open-graph-generator', 'Open Graph Generator', 'Generate og: meta tags for Facebook/LinkedIn link previews.', {
    mode: 'generate', action: 'Generate OG Tags', filename: 'og-tags.html',
    fields: [
      { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { key: 'url', label: 'Page URL' }, { key: 'image', label: 'Image URL' }, { key: 'type', label: 'Type', placeholder: 'website' },
    ],
    build: (v) => [
      `<meta property="og:title" content="${esc(v.title)}">`,
      `<meta property="og:description" content="${esc(v.description)}">`,
      `<meta property="og:url" content="${esc(v.url)}">`,
      `<meta property="og:type" content="${esc(v.type || 'website')}">`,
      v.image && `<meta property="og:image" content="${esc(v.image)}">`,
      '<meta property="og:site_name" content="' + esc(v.title) + '">',
    ].filter(Boolean).join('\n'),
  }),
  S('twitter-card-generator', 'Twitter Card Generator', 'Generate twitter: meta tags for X link cards.', {
    mode: 'generate', action: 'Generate Tags', filename: 'twitter-card.html',
    fields: [
      { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { key: 'image', label: 'Image URL' }, { key: 'site', label: '@username', placeholder: '@yourhandle' },
    ],
    build: (v) => [
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${esc(v.title)}">`,
      `<meta name="twitter:description" content="${esc(v.description)}">`,
      v.image && `<meta name="twitter:image" content="${esc(v.image)}">`,
      v.site && `<meta name="twitter:site" content="${esc(v.site)}">`,
    ].filter(Boolean).join('\n'),
  }),
  S('canonical-url-generator', 'Canonical URL Generator', 'Generate a canonical link tag to prevent duplicate content.', {
    mode: 'generate', action: 'Generate',
    fields: [{ key: 'url', label: 'Canonical URL', placeholder: 'https://example.com/page' }],
    build: (v) => `<link rel="canonical" href="${esc(v.url)}">`,
  }),
  S('schema-markup-generator', 'Schema Markup Generator', 'JSON-LD structured data — Website + Organization schema.', {
    mode: 'generate', action: 'Generate Schema', filename: 'schema.html', mime: 'text/html',
    fields: [
      { key: 'name', label: 'Site name' }, { key: 'url', label: 'Site URL' },
      { key: 'desc', label: 'Description', type: 'textarea', rows: 2 },
    ],
    build: (v) => jsonLd({
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: v.name, url: v.url, description: v.desc,
    }),
  }, { popular: true }),
  S('faq-schema-generator', 'FAQ Schema Generator', 'JSON-LD FAQ schema — paste Q&A pairs, get rich-result markup.', {
    mode: 'generate', action: 'Generate FAQ Schema', filename: 'faq-schema.html', mime: 'text/html',
    fields: [{ key: 'faqs', label: 'Q&A (one per line: Question | Answer)', type: 'textarea', rows: 6, placeholder: 'Is it free? | Yes, completely free.' }],
    build: (v) => {
      const faqs = (v.faqs || '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p[0] && p[1]);
      return jsonLd({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      });
    },
  }),
  S('local-business-schema', 'Local Business Schema Generator', 'JSON-LD LocalBusiness schema — address, hours, phone.', {
    mode: 'generate', action: 'Generate Schema', filename: 'business-schema.html', mime: 'text/html',
    fields: [
      { key: 'name', label: 'Business name' }, { key: 'phone', label: 'Phone' },
      { key: 'street', label: 'Street address' }, { key: 'city', label: 'City' },
      { key: 'hours', label: 'Opening hours', placeholder: 'Mo-Fr 09:00-17:00' },
    ],
    build: (v) => jsonLd({
      '@context': 'https://schema.org', '@type': 'LocalBusiness',
      name: v.name, telephone: v.phone, openingHours: v.hours,
      address: { '@type': 'PostalAddress', streetAddress: v.street, addressLocality: v.city },
    }),
  }),
  S('article-schema-generator', 'Article Schema Generator', 'JSON-LD Article schema for blog posts — headline, author, dates.', {
    mode: 'generate', action: 'Generate Schema', filename: 'article-schema.html', mime: 'text/html',
    fields: [
      { key: 'headline', label: 'Headline' }, { key: 'author', label: 'Author' },
      { key: 'date', label: 'Publish date', placeholder: '2025-01-15' }, { key: 'image', label: 'Image URL' },
    ],
    build: (v) => jsonLd({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: v.headline, datePublished: v.date,
      author: { '@type': 'Person', name: v.author },
      image: v.image,
    }),
  }),
  S('url-slug-generator', 'URL Slug Generator', 'Convert titles to clean SEO-friendly URL slugs.', {
    mode: 'generate', action: 'Generate Slug',
    fields: [{ key: 'title', label: 'Title', placeholder: 'My Great Blog Post!' }],
    build: (v) => (v.title || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
  }),
  S('serp-preview', 'SERP Preview', 'Preview how your page looks in Google search results.', {
    mode: 'preview', action: 'Update Preview',
    fields: [
      { key: 'title', label: 'Title tag', placeholder: 'Your page title' },
      { key: 'description', label: 'Meta description', type: 'textarea', rows: 2 },
      { key: 'url', label: 'URL', placeholder: 'https://example.com/page' },
    ],
    build: () => '',
  }),
  S('heading-analyzer', 'Heading Analyzer', 'Audit H1–H6 structure in pasted HTML — hierarchy and counts.', {
    mode: 'analyze', action: 'Analyze',
    fields: [{ key: 'input', label: 'Paste HTML', type: 'textarea', rows: 8 }],
    analyze: (html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const counts = [1, 2, 3, 4, 5, 6].map((n) => [`H${n}`, doc.querySelectorAll(`h${n}`).length]);
      const h1s = [...doc.querySelectorAll('h1')].map((h) => h.textContent.trim()).filter(Boolean);
      return {
        stats: counts,
        rows: [['H1 headings', ''], ...(h1s.length ? h1s.map((t) => [t, '']) : [['(none found)', '']])],
      };
    },
  }),
  S('link-analyzer', 'Link Analyzer', 'Count internal vs external links in pasted HTML.', {
    mode: 'analyze', action: 'Analyze',
    fields: [
      { key: 'input', label: 'Paste HTML', type: 'textarea', rows: 8 },
      { key: 'domain', label: 'Your domain', placeholder: 'example.com' },
    ],
    analyze: (html, vals) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const links = [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      const dom = (vals?.domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const internal = links.filter((h) => !/^https?:/i.test(h) || (dom && h.includes(dom)));
      const external = links.filter((h) => /^https?:/i.test(h) && !(dom && h.includes(dom)));
      const nofollow = [...doc.querySelectorAll('a[rel*="nofollow"]')].length;
      return {
        stats: [['Total links', links.length], ['Internal', internal.length], ['External', external.length], ['Nofollow', nofollow]],
        rows: [['External links', ''], ...external.slice(0, 20).map((h) => [h, ''])],
      };
    },
  }),
];
