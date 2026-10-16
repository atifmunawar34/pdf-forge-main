// Generator tools — powered by the 'generate' engine.
const CHARS = 'abcdefghijklmnopqrstuvwxyz';
const rand = (n) => crypto.getRandomValues(new Uint32Array(n));
const pick = (arr) => arr[rand(1)[0] % arr.length];
const chars = (n, set) => Array.from(rand(n), (v) => set[v % set.length]).join('');

const NAMES = ['Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Mason', 'Sophia', 'Ethan', 'Mia', 'Lucas', 'Amelia', 'James', 'Harper', 'Benjamin', 'Ella', 'Henry', 'Grace', 'Leo', 'Chloe', 'Owen'];
const SURNAMES = ['Smith', 'Khan', 'Garcia', 'Ali', 'Brown', 'Wilson', 'Ahmed', 'Lee', 'Patel', 'Kumar', 'Taylor', 'Davies', 'Hassan', 'Moore', 'Clark'];
const COMPANY = ['Nova', 'Apex', 'Prime', 'Vertex', 'Fusion', 'Bright', 'Summit', 'Core', 'Pulse', 'Atlas'];
const SUFFIX = ['Labs', 'Tech', 'Group', 'Works', 'Co', 'Studios', 'Digital', 'Solutions', 'Industries', 'Hub'];
const LOREM = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'.split(' ');

const T = (id, name, desc, def, extra = {}) => ({
  id, name, desc, engine: 'generate', def, keywords: [name.toLowerCase(), 'generator', 'free online'], ...extra,
});
const countOpt = { key: 'count', label: 'How many?', type: 'number', default: 5, min: 1, max: 100 };

export const GEN_TOOLS = [
  T('random-number-generator', 'Random Number Generator', 'Random numbers in any range — integers or decimals, secure RNG.', {
    action: 'Generate',
    options: [
      { key: 'min', label: 'Min', type: 'number', default: 1 },
      { key: 'max', label: 'Max', type: 'number', default: 100 },
      { key: 'decimals', label: 'Decimals', type: 'number', default: 0, min: 0, max: 6 },
      countOpt,
    ],
    run: (o) => {
      const min = +o.min || 0, max = +o.max || 100, d = +o.decimals || 0;
      return Array.from({ length: Math.min(100, +o.count || 5) }, () => (min + Math.random() * (max - min)).toFixed(d));
    },
  }, { popular: true }),
  T('random-string-generator', 'Random String Generator', 'Random strings of any length — letters, digits, symbols.', {
    action: 'Generate',
    options: [
      { key: 'len', label: 'Length', type: 'number', default: 12, min: 1, max: 128 },
      { key: 'digits', label: 'Include digits', type: 'checkbox', default: true },
      { key: 'symbols', label: 'Include symbols', type: 'checkbox' },
      countOpt,
    ],
    run: (o) => {
      const set = CHARS + CHARS.toUpperCase() + (o.digits ? '0123456789' : '') + (o.symbols ? '!@#$%^&*' : '');
      return Array.from({ length: Math.min(50, +o.count || 5) }, () => chars(+o.len || 12, set));
    },
  }),
  T('password-generator', 'Password Generator', 'Strong random passwords — length and character options.', {
    action: 'Generate',
    options: [
      { key: 'len', label: 'Length', type: 'number', default: 16, min: 6, max: 64 },
      { key: 'symbols', label: 'Include symbols', type: 'checkbox', default: true },
      countOpt,
    ],
    run: (o) => {
      const set = CHARS + CHARS.toUpperCase() + '0123456789' + (o.symbols ? '!@#$%^&*()-_=+[]{}' : '');
      return Array.from({ length: Math.min(20, +o.count || 5) }, () => chars(+o.len || 16, set));
    },
  }, { featured: true, popular: true }),
  T('username-generator', 'Username Generator', 'Unique username ideas — adjective + noun combos.', {
    action: 'Generate', options: [countOpt],
    run: (o) => Array.from({ length: Math.min(30, +o.count || 8) }, () =>
      `${pick(['swift', 'nova', 'dark', 'bright', 'silent', 'cosmic', 'rapid', 'pixel'])}${pick(NAMES)}${rand(1)[0] % 99}`.toLowerCase()),
  }),
  T('uuid-generator', 'UUID Generator', 'Generate v4 UUIDs — universally unique identifiers, crypto-random.', {
    action: 'Generate', options: [countOpt],
    run: (o) => Array.from({ length: Math.min(50, +o.count || 5) }, () => crypto.randomUUID()),
  }, { popular: true }),
  T('lorem-ipsum-generator', 'Lorem Ipsum Generator', 'Placeholder text for designs — paragraphs, sentences or words.', {
    action: 'Generate',
    options: [
      { key: 'unit', label: 'Unit', type: 'select', options: ['paragraphs', 'sentences', 'words'], default: 'paragraphs' },
      { key: 'count', label: 'Count', type: 'number', default: 3, min: 1, max: 50 },
    ],
    run: (o) => {
      const n = Math.min(50, +o.count || 3);
      const word = () => pick(LOREM);
      const sent = () => Array.from({ length: 6 + (rand(1)[0] % 8) }, word).join(' ') + '.';
      const para = () => Array.from({ length: 3 + (rand(1)[0] % 3) }, sent).join(' ');
      const s = (str) => str.charAt(0).toUpperCase() + str.slice(1);
      if (o.unit === 'words') return Array.from({ length: n }, word);
      if (o.unit === 'sentences') return Array.from({ length: n }, () => s(sent()));
      return Array.from({ length: n }, () => s(para()));
    },
  }),
  T('color-palette-generator', 'Color Palette Generator', 'Random 5-color palettes for design — click to copy HEX codes.', { mode: 'palette' }, { engine: 'color' }),
  T('gradient-generator', 'Gradient Generator', 'CSS gradient maker — pick colors and direction, copy the CSS.', { mode: 'mixer' }, { engine: 'color' }),
  T('fake-data-generator', 'Fake Data Generator', 'Random fake names, emails and phones for testing forms.', {
    action: 'Generate', options: [countOpt],
    run: (o) => Array.from({ length: Math.min(50, +o.count || 10) }, () => {
      const n = `${pick(NAMES)} ${pick(SURNAMES)}`;
      return `${n} | ${n.toLowerCase().replace(' ', '.')}@example.com | +1-555-${String(rand(1)[0] % 9000 + 1000)}`;
    }),
  }),
  T('name-generator', 'Name Generator', 'Random person names for characters, testing and placeholder data.', {
    action: 'Generate', options: [countOpt],
    run: (o) => Array.from({ length: Math.min(50, +o.count || 10) }, () => `${pick(NAMES)} ${pick(SURNAMES)}`),
  }),
  T('company-name-generator', 'Company Name Generator', 'Brandable business name ideas — modern two-word combos.', {
    action: 'Generate', options: [countOpt],
    run: (o) => Array.from({ length: Math.min(50, +o.count || 10) }, () => `${pick(COMPANY)}${pick(SUFFIX)}`),
  }),
  T('invoice-number-generator', 'Invoice Number Generator', 'Sequential invoice numbers with custom prefix and padding.', {
    action: 'Generate',
    options: [
      { key: 'prefix', label: 'Prefix', type: 'text', default: 'INV-' },
      { key: 'start', label: 'Start number', type: 'number', default: 1 },
      { key: 'pad', label: 'Digits', type: 'number', default: 4, min: 1, max: 10 },
      countOpt,
    ],
    run: (o) => Array.from({ length: Math.min(100, +o.count || 5) }, (_, i) =>
      `${o.prefix || 'INV-'}${String((+o.start || 1) + i).padStart(+o.pad || 4, '0')}`),
  }),
  T('sku-generator', 'SKU Generator', 'Product SKU codes — category prefix + random alphanumeric.', {
    action: 'Generate',
    options: [
      { key: 'prefix', label: 'Prefix', type: 'text', default: 'SKU' },
      countOpt,
    ],
    run: (o) => Array.from({ length: Math.min(50, +o.count || 10) }, () =>
      `${(o.prefix || 'SKU').toUpperCase()}-${chars(4, 'ABCDEFGHJKLMNPQRSTUVWXYZ')}-${chars(4, '0123456789')}`),
  }),
  T('coupon-code-generator', 'Coupon Code Generator', 'Random promo/coupon codes — custom prefix and length.', {
    action: 'Generate',
    options: [
      { key: 'prefix', label: 'Prefix', type: 'text', default: 'SAVE' },
      { key: 'len', label: 'Code length', type: 'number', default: 8, min: 4, max: 24 },
      countOpt,
    ],
    run: (o) => Array.from({ length: Math.min(100, +o.count || 10) }, () =>
      `${(o.prefix || 'SAVE').toUpperCase()}${chars(+o.len || 8, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}`),
  }),
  T('barcode-generator-2', 'Numeric Barcode Generator', 'Generate batches of numeric barcode values (EAN-length).', {
    action: 'Generate',
    options: [{ key: 'digits', label: 'Digits', type: 'number', default: 12, min: 6, max: 18 }, countOpt],
    run: (o) => Array.from({ length: Math.min(50, +o.count || 5) }, () => chars(+o.digits || 12, '0123456789')),
  }),
  T('strong-password-generator', 'Strong Password Generator', 'Maximum-strength passwords — 20+ chars with all symbol types.', {
    action: 'Generate',
    options: [{ key: 'len', label: 'Length', type: 'number', default: 24, min: 12, max: 64 }, countOpt],
    run: (o) => {
      const set = CHARS + CHARS.toUpperCase() + '0123456789!@#$%^&*()-_=+[]{}<>?';
      return Array.from({ length: Math.min(20, +o.count || 5) }, () => chars(Math.max(12, +o.len || 24), set));
    },
  }),
];
