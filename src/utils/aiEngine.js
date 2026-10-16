import { KIT_CATEGORIES } from '../data/kit';
import { PDF_CATEGORIES } from '../data/pdfTools';
import { findService } from '../data/ai/services';

/**
 * AI Assistant capability engine.
 * Turns a natural-language request into a plan:
 *   { type, message, tools[], calc, service, followups[] }
 * - tools are the EXISTING engines/registry — never duplicates.
 * - deterministic math is computed here, never guessed by a model.
 */

/* ---------- capability index ---------- */
const ALIASES = {
  merge: ['combine', 'join', 'put together', 'merge pdf', 'one pdf'],
  compress: ['smaller', 'reduce size', 'shrink', 'reduce file', 'compress pdf', 'smaller file'],
  'jpg-to-pdf': ['images to pdf', 'photos to pdf', 'picture to pdf', 'jpg to pdf'],
  'pdf-to-word': ['pdf to word', 'pdf to doc', 'editable word'],
  'word-to-pdf': ['word to pdf', 'docx to pdf', 'doc to pdf'],
  unlock: ['remove password', 'unlock pdf', 'decrypt'],
  protect: ['password protect', 'lock pdf', 'protect pdf', 'lock my', 'lock the', 'encrypt pdf', 'secure pdf'],
  'rotate': ['rotate pdf', 'turn pages'],
  'image-compressor': ['compress image', 'smaller image', 'reduce image', 'optimize image'],
  'image-resizer': ['resize image', 'resize photo', 'change image size', '1500x1500', '1200x1200'],
  'image-converter': ['convert image', 'image to webp', 'image to png', 'image format'],
  'background-remover': ['remove background', 'transparent background', 'cut out', 'remove bg', 'bg remove', 'remove the background'],
  'image-watermark': ['watermark', 'add watermark'],
  'image-cropper': ['crop image', 'crop photo', 'crop picture', 'crop my', 'crop the', 'crop it', 'crop this', 'crop a'],
  'metadata-remover': ['remove metadata', 'strip metadata', 'remove exif'],
  'passport-photo-maker': ['passport photo', 'passport size', 'id photo', 'visa photo'],
  'word-counter': ['count words', 'word count', 'how many words'],
  'character-counter': ['count characters', 'character count'],
  'case-converter': ['uppercase', 'lowercase', 'title case', 'change case', 'capital letters'],
  'find-replace': ['find and replace', 'replace text', 'find & replace'],
  'text-diff': ['compare text', 'compare texts', 'two texts', 'text difference', 'diff', 'compare documents'],
  'qr-code-generator': ['qr code', 'qr for', 'generate qr', 'make qr'],
  'wifi-qr-code': ['wifi qr', 'wi-fi qr'],
  'whatsapp-qr-code': ['whatsapp qr'],
  'barcode-generator': ['barcode', 'generate barcode'],
  'password-generator': ['strong password', 'random password', 'generate password', 'new password', 'create password'],
  'uuid-generator': ['uuid'],
  'lorem-ipsum': ['lorem', 'placeholder text', 'dummy text'],
  'percentage-calculator': ['percentage', 'percent of', 'what percent'],
  'discount-calculator': ['discount', 'sale price', 'price after discount'],
  'sales-tax-calculator': ['sales tax', 'tax on'],
  'vat-calculator': ['vat'],
  'gst-calculator': ['gst'],
  'loan-calculator': ['loan', 'monthly payment', 'mortgage payment'],
  'emi-calculator': ['emi', 'installment'],
  'compound-interest-calculator': ['compound interest'],
  'tip-calculator': ['tip'],
  'bmi-calculator': ['bmi', 'body mass'],
  'age-calculator': ['how old', 'age from', 'my age'],
  'currency-converter': ['currency', 'exchange rate', 'dollars to', 'usd to'],
  'temperature-converter': ['celsius', 'fahrenheit', 'temperature'],
  'length-converter': ['cm to', 'inches to', 'meters to', 'feet to', 'km to', 'miles to'],
  'weight-converter': ['kg to', 'pounds to', 'grams to', 'lbs'],
  'hex-to-rgb': ['hex to rgb'],
  'color-picker': ['pick a color', 'color picker', 'hex code'],
  'contrast-checker': ['contrast', 'wcag', 'readable color'],
  'ai-summarizer': ['summarize', 'summary of', 'tldr', 'shorten this'],
  'ai-rewriter': ['rewrite', 'rephrase', 'paraphrase', 'reword', 'professional tone', 'make it professional'],
  'ai-grammar-checker': ['grammar', 'fix grammar', 'check grammar', 'spelling'],
  'ai-translator': ['translate', 'translation', 'in urdu', 'in arabic', 'in spanish', 'in french'],
  'ai-email-writer': ['write email', 'professional email', 'email to', 'draft email'],
  'meta-tag-generator': ['meta tags', 'meta description'],
  'keyword-density': ['keyword density', 'keyword stuffing'],
  'utm-builder': ['utm', 'tracking link', 'utm link'],
  'hashtag-generator': ['hashtags', 'hashtag'],
  'zip-creator': ['zip', 'zip files', 'create zip', 'archive files'],
  'file-hash-checker': ['checksum', 'hash', 'hash file', 'sha256', 'verify file'],
  'batch-file-renamer': ['rename files', 'batch rename'],
  'file-merger': ['merge files', 'combine files'],
};

// goal → template flow (documents are made via the Templates hub / Document Creator)
const TEMPLATE_GOALS = [
  { match: ['invoice', 'bill'], label: 'invoice', view: 'templates' },
  { match: ['quotation', 'quote', 'price offer', 'estimate', 'proforma'], label: 'quotation', view: 'templates' },
  { match: ['cv', 'resume', 'cover letter'], label: 'resume/CV', view: 'templates' },
  { match: ['proposal', 'business proposal'], label: 'proposal', view: 'templates' },
  { match: ['receipt'], label: 'receipt', view: 'templates' },
  { match: ['letter', 'application letter', 'resignation'], label: 'letter', view: 'templates' },
  { match: ['catalog', 'product catalog', 'brochure'], label: 'catalog/brochure', view: 'templates' },
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9%\s]/g, ' ').replace(/\s+/g, ' ').trim();

// build the searchable tool index once
const INDEX = (() => {
  const items = [];
  for (const c of PDF_CATEGORIES) {
    for (const t of c.tools) {
      items.push({ kind: 'pdf', id: t.id, name: t.name, desc: t.desc, category: 'pdf-tools', tool: t,
        text: norm(`${t.name} ${t.desc} ${(ALIASES[t.id] || []).join(' ')}`) });
    }
  }
  for (const c of KIT_CATEGORIES) {
    for (const t of c.tools) {
      items.push({ kind: 'kit', id: t.id, name: t.name, desc: t.desc, category: c.slug, tool: t,
        text: norm(`${t.name} ${t.desc} ${(t.keywords || []).join(' ')} ${(ALIASES[t.id] || []).join(' ')}`) });
    }
  }
  return items;
})();

const STOP = new Set('the a an and or to for of in on my me i it this that with from by is are be make do get use using want need need to please can you how what which file files document documents pdf image images photo photos'.split(' '));

const scoreTool = (item, queryText, tokens) => {
  let s = 0;
  const name = norm(item.name);
  if (queryText.includes(name)) s += 10;
  // all name words present (any order) → strong hit: "compress this pdf" = "Compress PDF"
  const stem = (w) => w.replace(/s$/, '');
  if (name.split(' ').every((w) => tokens.some((t) => t === w || stem(t) === w || (t.length >= 4 && w.startsWith(t))))) s += 8;
  for (const alias of ALIASES[item.id] || []) if (queryText.includes(alias)) s += 6;
  for (const tok of tokens) {
    if (tok.length < 3 || STOP.has(tok)) continue;
    if (name.includes(tok)) s += 3;
    else if (item.text.includes(tok)) s += 1;
  }
  return s;
};

/* ---------- deterministic inline math (never model-guessed) ---------- */
const fmtMoney = (n, cur) =>
  cur ? `${cur}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

function tryCalc(text) {
  const t = text.toLowerCase();
  const cur = (t.match(/\$|usd|eur|pkr|aed|sar|gbp|inr/) || [])[0]?.replace(/usd|eur|pkr|aed|sar|gbp|inr/, (m) => ({ usd: '$', eur: '€', gbp: '£', pkr: 'PKR ', aed: 'AED ', sar: 'SAR ', inr: '₹' }[m])) || (t.includes('$') ? '$' : '');
  const nums = [...t.matchAll(/([\d,]+(?:\.\d+)?)\s*(%)?/g)].map((m) => ({ v: parseFloat(m[1].replace(/,/g, '')), pct: !!m[2], raw: m[0] }));
  if (!nums.length) return null;

  const pcts = nums.filter((n) => n.pct);
  const amounts = nums.filter((n) => !n.pct);

  // "X% discount and Y% tax on Z" (+ optional shipping)
  const disc = /discount|off/.test(t) ? pcts[0] : null;
  const tax = /tax|vat|gst/.test(t) ? (pcts[disc ? 1 : 0] || pcts[0]) : null;
  const wantsCalc = /discount|tax|vat|gst|total|price|cost|subtotal/.test(t);
  if (wantsCalc && amounts.length && pcts.length) {
    const base = Math.max(...amounts.map((a) => a.v));
    const lines = [{ label: 'Subtotal', value: fmtMoney(base, cur) }];
    let amt = base;
    if (disc) {
      const d = base * (disc.v / 100);
      amt -= d;
      lines.push({ label: `Discount (${disc.v}%)`, value: `−${fmtMoney(d, cur)}` });
      lines.push({ label: 'After discount', value: fmtMoney(amt, cur) });
    }
    if (tax) {
      const tx = amt * (tax.v / 100);
      lines.push({ label: `Tax (${tax.v}%)`, value: `+${fmtMoney(tx, cur)}` });
      amt += tx;
    }
    const ship = amounts.find((a) => a.v !== base && /ship|delivery|freight/.test(t));
    if (ship) { lines.push({ label: 'Shipping', value: `+${fmtMoney(ship.v, cur)}` }); amt += ship.v; }
    lines.push({ label: 'Total', value: fmtMoney(amt, cur), strong: true });
    return { lines, note: 'Calculated deterministically — open a calculator tool to adjust.' };
  }

  // plain arithmetic: "5 + 3", "what is 12 * 8", "100 / 4", "square of 9"
  const sq = t.match(/square (?:of )?([\d.]+)|([\d.]+)\s*(?:squared|\^\s*2)/);
  if (sq) {
    const n = parseFloat(sq[1] || sq[2]);
    return { lines: [{ label: `${n}²`, value: fmtMoney(n * n, cur), strong: true }], note: 'Computed deterministically.' };
  }
  const arith = t.match(/(-?[\d,]+(?:\.\d+)?)\s*([+\-*/x×÷^])\s*(-?[\d,]+(?:\.\d+)?)/);
  if (arith) {
    const a = parseFloat(arith[1].replace(/,/g, ''));
    const b = parseFloat(arith[3].replace(/,/g, ''));
    const op = arith[2];
    const v = { '+': a + b, '-': a - b, '*': a * b, x: a * b, '×': a * b, '/': b !== 0 ? a / b : null, '÷': b !== 0 ? a / b : null, '^': Math.pow(a, b) }[op];
    if (v === null || v === undefined || !isFinite(v)) return { lines: [{ label: `${a} ${op} ${b}`, value: 'Cannot divide by zero', strong: true }], note: '' };
    return { lines: [{ label: `${a} ${op === '*' || op === 'x' || op === '×' ? '×' : op === '/' || op === '÷' ? '÷' : op} ${b}`, value: fmtMoney(v, cur), strong: true }], note: 'Computed deterministically.' };
  }

  // "X% of Y" / "X% increase/decrease of Y"
  const of = t.match(/([\d,]+(?:\.\d+)?)\s*%\s*of\s*([\d,]+(?:\.\d+)?)/);
  if (of) {
    const p = parseFloat(of[1]), y = parseFloat(of[2].replace(/,/g, ''));
    const v = (p / 100) * y;
    const res = /increase|raise/.test(t) ? y + v : /decrease|reduce|off|less/.test(t) ? y - v : v;
    return { lines: [{ label: `${p}% of ${fmtMoney(y, cur)}`, value: fmtMoney(res, cur), strong: true }], note: 'Computed deterministically.' };
  }
  return null;
}

/* ---------- plan builder ---------- */
export function planRequest(raw) {
  const text = raw.trim();
  const q = norm(text);
  const tokens = q.split(' ');
  const plan = { type: 'chat', message: '', tools: [], calc: null, service: null, template: null, qr: null, followups: [] };

  // greetings & small talk — instant local replies, no provider needed
  if (/^(hi|hello|hey|salam|salaam|aoa|yo|good (morning|afternoon|evening))\b/.test(q) && q.split(' ').length < 6) {
    plan.type = 'reply';
    plan.message = "Hello. I'm the PDF Forge assistant — I can complete tasks across the entire platform: PDF editing and conversion, image processing, calculations, QR codes, document generation, and more.\n\nDescribe what you need in plain language and I'll take care of it.";
    return plan;
  }
  if (/\b(thanks|thank you|thx|shukria|shukriya)\b/.test(q) && q.split(' ').length < 8) {
    plan.type = 'reply';
    plan.message = "You're welcome. Let me know if there's anything else you need.";
    return plan;
  }
  if (/how are you|how's it going|hows it going/.test(q) && q.split(' ').length < 7) {
    plan.type = 'reply';
    plan.message = "I'm doing well, thank you. What can I help you with today?";
    return plan;
  }
  if (/what can you do|who are you|help me|what do you do/.test(q) && q.split(' ').length < 10 || q === 'help') {
    plan.type = 'reply';
    plan.message = "I can complete tasks across the whole platform:\n\n• **PDF tools** — merge, split, compress, convert, protect, sign, OCR\n• **Image tools** — resize, convert, remove backgrounds, passport photos\n• **Documents** — invoices, CVs, proposals and receipts via templates\n• **Calculations** — discounts, tax, loans, unit conversions\n• **Generators** — QR codes, barcodes, passwords, UUIDs\n• **Writing & SEO** — rewriting, grammar, translation, meta tags\n• **Custom projects** — websites, apps, CRM/ERP, AI chatbots (via our team)\n\nJust describe what you need in plain language.";
    return plan;
  }

  // score tools first — service only wins when no strong tool match
  const scored = INDEX.map((it) => ({ it, s: scoreTool(it, q, tokens) }))
    .filter((x) => x.s >= 6)
    .sort((a, b) => b.s - a.s);
  const seen = new Set();
  plan.tools = scored.map((x) => x.it).filter((it) => {
    const key = `${it.kind}:${it.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);

  // conversion direction: "pdf to word" / "pdf into word" → keep pdf-to-word only
  const dir = q.match(/([a-z]+)\s*(?:to|into)\s*([a-z]+)/);
  if (dir) {
    const want = `${dir[1]}-to-${dir[2]}`;
    const inverse = `${dir[2]}-to-${dir[1]}`;
    if (plan.tools.some((t) => t.id === inverse)) plan.tools = plan.tools.filter((t) => t.id !== inverse);
    const wanted = INDEX.find((it) => it.id === want);
    if (wanted && !plan.tools.some((t) => t.id === want)) plan.tools.unshift(wanted);
  }

  // custom service? ("i need a website/app/crm…" — build intent, not a tool job)
  const service = findService(text);
  const wantsBuild = /\b(need|want|build|create|make|develop|looking for|get|custom|start|open|launch|set up|hire)\b/.test(q);
  const strongToolHit = plan.tools.length && (scored[0]?.s >= 8 || plan.tools.some((t) => dir?.[1] && t.id === `${dir[1]}-to-${dir[2]}`));

  // template goals (invoice/cv/quotation → templates hub)
  const tpl = TEMPLATE_GOALS.find((g) => g.match.some((m) => q.includes(m)));
  if (tpl) plan.template = tpl;

  // deterministic calculation
  plan.calc = tryCalc(text);

  // QR with a supplied link/text → generate directly, no tool needed
  const urlMatch = text.match(/https?:\/\/[^\s]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|app|co|pk|ai|me|xyz|site|store|shop|info)(?:\/[^\s]*)?/i);
  const qrTool = plan.tools.find((t) => t.tool?.engine === 'qr');
  if (qrTool && urlMatch && !/whatsapp|wifi|email|phone|sms|vcard|crypto|location|event/.test(q)) {
    plan.qr = { text: urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}` };
    plan.tools = plan.tools.filter((t) => t !== qrTool);
  }

  if (service && wantsBuild && !strongToolHit) {
    plan.type = 'service';
    plan.service = service;
    plan.message = `That's a custom **${service.name}** project — handled as a service rather than an instant tool. ${service.desc}\n\nI'll prepare a requirement brief for our team. A few short questions — select an option or type your own answer.\n\n**${normField(service.inquiryFields[0]).q}**`;
    return plan;
  }

  if (plan.calc && !plan.tools.length) {
    plan.type = 'calc';
    plan.message = 'Here\'s the calculation:';
    plan.followups = [
      { label: 'Open Discount Calculator', act: 'tool', cat: 'calculators', tool: 'discount-calculator' },
      { label: 'Open Tax Calculator', act: 'tool', cat: 'calculators', tool: 'sales-tax-calculator' },
    ];
    return plan;
  }

  if (plan.qr && !plan.tools.length) {
    plan.type = 'tools';
    plan.message = `Done — your QR code for **${plan.qr.text}** is ready below. Download it directly, or open the full QR tool to adjust colors and size.`;
    plan.followups.push({ label: 'Customize in QR Generator', act: 'tool', cat: 'qr-tools', tool: 'qr-code-generator' });
    return plan;
  }

  if (plan.tools.length) {
    plan.type = 'tools';
    const first = plan.tools[0];
    plan.message = plan.tools.length === 1
      ? `Here's the **${first.name}** tool — you can work with it directly below.${first.kind === 'pdf' ? ' Attach or drop your file to begin.' : ''}`
      : `This requires ${plan.tools.length} steps — I've prepared each tool below in order.`;
    if (plan.template) {
      plan.message += `\n\nFor the **${plan.template.label}** itself, the Templates hub offers ready-made professional designs.`;
      plan.followups.push({ label: `Open ${plan.template.label} templates`, act: 'templates' });
    }
    if (plan.calc) plan.message += "\n\nI've also run the figures for you below.";
    return plan;
  }

  if (plan.template) {
    plan.type = 'template';
    plan.message = `The quickest route is our **${plan.template.label} templates** — professional designs you fill in and export as PDF. Open the template library, or build one from scratch in the Document Creator.`;
    plan.followups = [
      { label: `Open ${plan.template.label} templates`, act: 'templates' },
      { label: 'Open Document Creator', act: 'creator' },
    ];
    return plan;
  }

  if (plan.calc) {
    plan.type = 'calc';
    plan.message = 'Here\'s the calculation:';
    return plan;
  }

  // no tool matched → freeform AI chat, but keep close-miss tools as suggestions
  plan.type = 'chat';
  plan.suggest = INDEX.map((it) => ({ it, s: scoreTool(it, q, tokens) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.it);
  return plan;
}

/* ---------- service field helpers ---------- */
// normalize {q, topic, opts} — tolerates legacy plain-string fields
export const normField = (f) => {
  if (typeof f === 'string') return { q: f, topic: f.split('?')[0].toLowerCase().slice(0, 40), opts: null };
  return f;
};

// quick-reply chips — explicit opts, or inferred from topic/question for EVERY field
export const fieldOptions = (f) => {
  const nf = normField(f);
  if (nf.opts) return nf.opts;
  const t = nf.topic.toLowerCase();
  const q = nf.q.toLowerCase();
  if (/industry|business/.test(t)) return ['Retail / Shop', 'Food & Restaurant', 'Services', 'Tech / SaaS', 'Healthcare', 'Education', 'Real Estate', 'Other'];
  if (/platform preference/.test(t) || /preferred platform/.test(q)) return ['Shopify', 'Custom-built', 'WooCommerce', 'Not sure'];
  if (/platform/.test(t)) return /android|ios|app/.test(q) ? ['Android', 'iOS', 'Both'] : ['Web only', 'Mobile too', 'Both'];
  if (/where will it live|channel/.test(q) || /channel/.test(t)) return ['Website', 'WhatsApp', 'Mobile app', 'All of these'];
  if (/what are we designing|design/.test(q)) return ['Website', 'Mobile app', 'Brand / Logo', 'Other'];
  if (/modules/.test(t)) return ['Sales', 'HR', 'Inventory', 'Finance', 'All of these'];
  if (/users|volume/.test(t)) return ['1–10', '10–50', '50–200', '200+'];
  if (/products|catalog/.test(t)) return ['Under 20', '20–100', '100–500', '500+'];
  if (/knowledge/.test(t)) return ['FAQs', 'Product data', 'Documents', 'All of these'];
  if (/frequency/.test(t)) return ['Real-time', 'Scheduled', 'Manual'];
  if (/payment methods/.test(t)) return ['Card', 'Cash on delivery', 'Bank transfer', 'All'];
  if (/deliverables/.test(t)) return ['Mockups', 'Prototype', 'Design system', 'All'];
  if (/features|problem|purpose|process|scope/.test(t)) return ['Standard setup', 'Custom — I will describe', 'Not sure yet'];
  if (/timeline|when/.test(t) || /timeline|how long|when/i.test(q)) return ['ASAP', '2–4 weeks', '1–3 months', 'Flexible'];
  if (/integrations|systems|connections|migration|access|branding|designs/.test(t)) return ['Yes', 'No', 'Not sure'];
  if (/^(do you|any |should it|does it|will it|who needs)/i.test(q.trim())) return ['Yes', 'No', 'Not sure'];
  return ['Custom — I will describe', 'Not sure'];
};

/* ---------- project brief ---------- */
export function buildBrief(service, answers) {
  // answers: [{topic, q, a}] → structured brief the team can actually use
  const get = (topicPart) => answers.find((x) => x.topic.toLowerCase().includes(topicPart))?.a;
  const projectName = `${get('industry') || get('business') || 'Custom'} ${service.name}`.replace(/\s+/g, ' ').trim();
  return {
    service: service.name,
    serviceId: service.id,
    projectName,
    summary: `Customer needs ${service.name.toLowerCase()} — ${answers.map((a) => `${a.topic}: ${a.a}`).join('; ')}.`,
    answers,
    missing: answers.filter((a) => /^(no|not|none|skip|n\/a|not sure)/i.test(a.a.trim())).map((a) => a.topic),
    createdAt: new Date().toISOString(),
    status: 'draft',
  };
}

/* ---------- conversational acknowledgment for service Q&A ---------- */
export const acknowledge = (topic, answer) => {
  const a = answer.trim();
  const neg = /^(no|nope|not|none|n\/a|na|skip|not needed|don't need|no need)/i.test(a);
  const unsure = /^(not sure|idk|maybe|dunno|don't know)/i.test(a);
  if (neg) return `Understood — no ${topic} required.`;
  if (unsure) return `Noted — we'll treat ${topic} as open and cover it during the review.`;
  return `Noted — ${topic}: **${a.length > 80 ? a.slice(0, 80) + '…' : a}**.`;
};
