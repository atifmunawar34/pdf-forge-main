// Master registry of the new tool categories (kit tools).
// Existing PDF tools stay in pdfTools.js — both feed the global search.
import { IMAGE_TOOLS } from './imageTools';
import { DOC_TOOLS } from './docTools';
import { CALC_TOOLS } from './calcTools';
import { CONVERTER_TOOLS } from './converterTools';
import { QR_TOOLS, FILE_TOOLS } from './qrFileTools';
import { GEN_TOOLS } from './genTools';
import { MARKETING_TOOLS } from './marketingTools';
import { COLOR_TOOLS, SEO_TOOLS } from './colorSeoTools';
import { AI_TOOLS } from './aiTools';
import {
  Image, Type, Calculator, ArrowLeftRight, QrCode, FolderArchive,
  Zap, Megaphone, Palette, SearchCheck, Sparkles,
} from 'lucide-react';
import { PDF_CATEGORIES } from '../pdfTools';

export const KIT_CATEGORIES = [
  {
    slug: 'image-tools', name: 'Image Tools', icon: Image, chipBg: 'bg-sky-50', accent: 'text-sky-600',
    desc: 'Compress, resize, convert and edit images — free online image tools.',
    seoDesc: 'Free online image tools: image compressor, resizer, cropper, converter, background remover, watermark and more. No upload needed.',
    tools: IMAGE_TOOLS,
  },
  {
    slug: 'document-tools', name: 'Document Tools', icon: Type, chipBg: 'bg-amber-50', accent: 'text-amber-600',
    desc: 'Text utilities — counters, case converters, formatters, markdown and more.',
    seoDesc: 'Free text tools: word counter, character counter, case converter, find & replace, markdown tools, text to speech.',
    tools: DOC_TOOLS,
  },
  {
    slug: 'calculators', name: 'Calculators', icon: Calculator, chipBg: 'bg-emerald-50', accent: 'text-emerald-600',
    desc: 'Financial, health and everyday calculators — percentage, loan, BMI, salary and more.',
    seoDesc: 'Free online calculators: percentage, discount, loan, EMI, compound interest, salary, BMI, calorie and tip calculators.',
    tools: CALC_TOOLS,
  },
  {
    slug: 'converters', name: 'Unit Converters', icon: ArrowLeftRight, chipBg: 'bg-violet-50', accent: 'text-violet-600',
    desc: 'Convert length, weight, temperature, data, currency and more instantly.',
    seoDesc: 'Free unit converters: length, weight, temperature, speed, data storage, currency, volume and more.',
    tools: CONVERTER_TOOLS,
  },
  {
    slug: 'qr-tools', name: 'QR & Barcode', icon: QrCode, chipBg: 'bg-slate-100', accent: 'text-slate-700',
    desc: 'Generate QR codes for links, Wi-Fi, contacts and payments — plus barcodes.',
    seoDesc: 'Free QR code generator: URL, Wi-Fi, vCard, WhatsApp, crypto QR codes plus barcode generator and scanner.',
    tools: QR_TOOLS,
  },
  {
    slug: 'file-tools', name: 'File Tools', icon: FolderArchive, chipBg: 'bg-orange-50', accent: 'text-orange-600',
    desc: 'ZIP, hash, rename, split and inspect files — all processed locally.',
    seoDesc: 'Free file tools: ZIP creator, file compressor, hash checker, duplicate finder, batch renamer. Runs locally.',
    tools: FILE_TOOLS,
  },
  {
    slug: 'generators', name: 'Generators', icon: Zap, chipBg: 'bg-pink-50', accent: 'text-pink-600',
    desc: 'Passwords, UUIDs, names, lorem ipsum, SKUs and coupon codes.',
    seoDesc: 'Free generators: password, UUID, random number, username, lorem ipsum, SKU, coupon code generators.',
    tools: GEN_TOOLS,
  },
  {
    slug: 'marketing-tools', name: 'Marketing Tools', icon: Megaphone, chipBg: 'bg-red-50', accent: 'text-red-600',
    desc: 'UTM builders, ad copy, captions and marketing calculators.',
    seoDesc: 'Free marketing tools: UTM builder, hashtag generator, meta title generator, CPM, CPC, CTR and ROAS calculators.',
    tools: MARKETING_TOOLS,
  },
  {
    slug: 'color-tools', name: 'Color Tools', icon: Palette, chipBg: 'bg-indigo-50', accent: 'text-indigo-600',
    desc: 'Pick, convert and mix colors — palettes, contrast checks and shades.',
    seoDesc: 'Free color tools: color picker, HEX to RGB, contrast checker, palette generator, shades and tints.',
    tools: COLOR_TOOLS,
  },
  {
    slug: 'seo-tools', name: 'SEO Tools', icon: SearchCheck, chipBg: 'bg-teal-50', accent: 'text-teal-600',
    desc: 'Meta tags, schema markup, sitemaps, SERP previews and analyzers.',
    seoDesc: 'Free SEO tools: meta tag generator, schema markup, sitemap generator, robots.txt, keyword density, SERP preview.',
    tools: SEO_TOOLS,
  },
  {
    slug: 'ai-tools', name: 'AI Tools', icon: Sparkles, chipBg: 'bg-purple-50', accent: 'text-purple-600',
    desc: 'AI-powered writing helpers — summarize, rewrite, translate and generate.',
    seoDesc: 'Free AI tools: text summarizer, rewriter, grammar checker, translator, email writer and content generators.',
    tools: AI_TOOLS,
  },
];

export const findKitCategory = (slug) => KIT_CATEGORIES.find((c) => c.slug === slug);
export const findKitTool = (catSlug, toolSlug) => {
  const cat = findKitCategory(catSlug);
  return { cat, tool: cat?.tools.find((t) => t.id === toolSlug) };
};

// Unified search index — PDF tools + kit tools + templates label
export const ALL_SEARCHABLE = [
  ...PDF_CATEGORIES.flatMap((c) =>
    c.tools.map((t) => ({
      id: t.id, name: t.name, desc: t.desc || t.tagline || '',
      kind: 'PDF', path: `/${t.id}`, keywords: [t.name.toLowerCase(), c.title],
    }))
  ),
  ...KIT_CATEGORIES.flatMap((c) =>
    c.tools.map((t) => ({
      id: t.id, name: t.name, desc: t.desc,
      kind: c.name, path: `/${c.slug}/${t.id}`, keywords: t.keywords || [],
    }))
  ),
];

// Broad search terms — typing any of these surfaces every tool in the
// matching category ("photo" or "jpg" → the whole image toolset), not just
// tools with that literal word in the name.
export const CATEGORY_QUERY_TERMS = {
  'pdf-tools': ['pdf', 'pdfs'],
  'image-tools': ['image', 'images', 'img', 'photo', 'photos', 'picture', 'pictures', 'pic', 'pics', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'svg'],
  'document-tools': ['document', 'documents', 'doc', 'docs', 'text', 'word', 'markdown'],
  'calculators': ['calculator', 'calculators', 'calc'],
  'converters': ['converter', 'converters', 'convert', 'unit', 'units'],
  'qr-tools': ['qr', 'barcode', 'barcodes'],
  'file-tools': ['file', 'files', 'zip', 'archive', 'hash'],
  'generators': ['generator', 'generators', 'random'],
  'marketing-tools': ['marketing', 'utm', 'hashtag', 'hashtags'],
  'color-tools': ['color', 'colors', 'colour', 'colours', 'palette', 'hex', 'rgb'],
  'seo-tools': ['seo', 'sitemap', 'serp'],
  'ai-tools': ['ai'],
};

// PDF tools that double as image services (JPG↔PDF, Extract Images…)
const IMAGE_PDF_RE = /jpe?g|png|webp|image/i;

// Category slug whose broad terms appear in the query — as the whole query
// or a standalone word ("compress image" → image-tools). Else null.
export const broadSearchSlug = (query) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return null;
  const words = q.split(/\s+/);
  return Object.keys(CATEGORY_QUERY_TERMS).find((slug) =>
    CATEGORY_QUERY_TERMS[slug].some((term) => term === q || words.includes(term))
  ) || null;
};

// Shared scoring for the homepage results grid + header dropdown.
// Returns the full sorted match list — callers decide how many to show.
export const searchTools = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const broadSlug = broadSearchSlug(q);
  const score = (t) => {
    const n = t.name.toLowerCase();
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) return 1;
    // Multi-word queries: every word present in the name, any order
    if (words.length > 1 && words.every((w) => n.includes(w))) return 1.5;
    if ((t.keywords || []).some((k) => k.includes(q))) return 2;
    if (broadSlug && (t.kind === 'PDF'
      ? broadSlug === 'pdf-tools' || (broadSlug === 'image-tools' && IMAGE_PDF_RE.test(t.name))
      : t.path.startsWith(`/${broadSlug}/`))) return 3;
    if (t.desc.toLowerCase().includes(q)) return 4;
    return 9;
  };
  return ALL_SEARCHABLE.map((t) => ({ ...t, s: score(t) }))
    .filter((t) => t.s < 9)
    .sort((a, b) => a.s - b.s);
};
