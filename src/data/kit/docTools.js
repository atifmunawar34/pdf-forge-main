// Document/text tools — all powered by the 'text' engine.

const words = (t) => (t.trim().match(/\S+/g) || []).length;
const sentences = (t) => (t.match(/[^.!?]+[.!?]+/g) || (t.trim() ? [t.trim()] : [])).length;
const paragraphs = (t) => t.split(/\n\s*\n/).filter((p) => p.trim()).length;
const lines = (t) => t.split(/\r?\n/).filter((l) => l.trim()).length;

const stats = (t) => ({
  stats: [
    { label: 'Words', value: words(t) },
    { label: 'Characters', value: t.length },
    { label: 'Characters (no spaces)', value: t.replace(/\s/g, '').length },
    { label: 'Sentences', value: sentences(t) },
    { label: 'Paragraphs', value: paragraphs(t) },
    { label: 'Lines', value: lines(t) },
  ],
});

const toTitleCase = (t) =>
  t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(a|an|and|as|at|but|by|for|in|of|on|or|the|to|with)\b/g, (w, _, off) => (off === 0 ? w : w))
    .replace(/(^|[.!?]\s+|\n)([a-z])/g, (_, p, c) => p + c.toUpperCase());

const toSentenceCase = (t) =>
  t.toLowerCase().replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase());

const mdToHtml = (md) =>
  md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^###### (.*)$/gm, '<h6>$1</h6>').replace(/^##### (.*)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.*)$/gm, '<h4>$1</h4>').replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^(?!<[hul]|<li)(.+)$/gm, '<p>$1</p>');

const T = (id, name, desc, def, extra = {}) => ({
  id, name, desc, engine: 'text', def, keywords: [name.toLowerCase(), 'free online tool', 'text tool'], ...extra,
});

export const DOC_TOOLS = [
  T('word-counter', 'Word Counter', 'Count words, characters, sentences and paragraphs in any text instantly.', { run: (t) => stats(t), action: 'Count', acceptFile: true }, { featured: true, popular: true }),
  T('character-counter', 'Character Counter', 'Count characters with and without spaces — ideal for tweets and meta text.', {
    run: (t) => ({ stats: [{ label: 'Characters', value: t.length }, { label: 'No spaces', value: t.replace(/\s/g, '').length }, { label: 'Words', value: words(t) }] }),
    action: 'Count', acceptFile: true,
  }, { popular: true }),
  T('sentence-counter', 'Sentence Counter', 'Count how many sentences are in your text.', { run: (t) => ({ stats: [{ label: 'Sentences', value: sentences(t) }, { label: 'Words', value: words(t) }] }), action: 'Count', acceptFile: true }),
  T('paragraph-counter', 'Paragraph Counter', 'Count paragraphs in pasted text instantly.', { run: (t) => ({ stats: [{ label: 'Paragraphs', value: paragraphs(t) }, { label: 'Words', value: words(t) }] }), action: 'Count', acceptFile: true }),
  T('case-converter', 'Case Converter', 'Convert text between UPPERCASE, lowercase, Title Case and Sentence case.', {
    options: [{ key: 'mode', label: 'Convert to', type: 'select', options: [
      { value: 'upper', label: 'UPPERCASE' }, { value: 'lower', label: 'lowercase' },
      { value: 'title', label: 'Title Case' }, { value: 'sentence', label: 'Sentence case' },
      { value: 'toggle', label: 'tOGGLE cASE' }, { value: 'camel', label: 'camelCase' },
    ], default: 'upper' }],
    action: 'Convert',
    run: (t, o) => ({
      upper: t.toUpperCase(), lower: t.toLowerCase(), title: toTitleCase(t), sentence: toSentenceCase(t),
      toggle: [...t].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
      camel: t.toLowerCase().replace(/[\s_-]+(.)/g, (_, c) => c.toUpperCase()),
    }[o.mode] ?? t),
  }, { featured: true, popular: true }),
  T('uppercase-converter', 'Uppercase Converter', 'Convert any text to ALL CAPITAL LETTERS.', { run: (t) => t.toUpperCase(), action: 'Convert' }),
  T('lowercase-converter', 'Lowercase Converter', 'Convert any text to lowercase letters.', { run: (t) => t.toLowerCase(), action: 'Convert' }),
  T('title-case-converter', 'Title Case Converter', 'Convert text to Title Case — capitalizes each word properly.', { run: (t) => toTitleCase(t), action: 'Convert' }),
  T('sentence-case-converter', 'Sentence Case Converter', 'Convert text to Sentence case — capital first letter per sentence.', { run: (t) => toSentenceCase(t), action: 'Convert' }),
  T('remove-extra-spaces', 'Remove Extra Spaces', 'Clean double spaces, tabs and trailing whitespace from text.', {
    run: (t) => t.replace(/[ \t]+/g, ' ').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), action: 'Clean',
  }),
  T('remove-duplicate-lines', 'Remove Duplicate Lines', 'Delete repeated lines from text or lists — keeps first occurrence.', {
    run: (t) => { const seen = new Set(); return t.split('\n').filter((l) => (l.trim() && !seen.has(l) ? (seen.add(l), true) : !l.trim())).join('\n'); },
    action: 'Remove Duplicates',
  }),
  T('sort-text', 'Sort Text Lines', 'Sort lines alphabetically A→Z or Z→A, numerically or by length.', {
    options: [{ key: 'mode', label: 'Sort order', type: 'select', options: [
      { value: 'az', label: 'A → Z' }, { value: 'za', label: 'Z → A' },
      { value: 'num', label: 'Numeric' }, { value: 'len', label: 'Shortest first' },
    ], default: 'az' }],
    action: 'Sort',
    run: (t, o) => {
      const ls = t.split('\n');
      const f = { az: (a, b) => a.localeCompare(b), za: (a, b) => b.localeCompare(a), num: (a, b) => parseFloat(a) - parseFloat(b), len: (a, b) => a.length - b.length }[o.mode];
      return ls.sort(f).join('\n');
    },
  }),
  T('reverse-text', 'Reverse Text', 'Reverse characters, words or whole lines in your text.', {
    options: [{ key: 'mode', label: 'Reverse', type: 'select', options: [
      { value: 'chars', label: 'Characters' }, { value: 'words', label: 'Words' }, { value: 'lines', label: 'Lines' },
    ], default: 'chars' }],
    action: 'Reverse',
    run: (t, o) => ({
      chars: [...t].reverse().join(''),
      words: t.split(/\s+/).reverse().join(' '),
      lines: t.split('\n').reverse().join('\n'),
    }[o.mode]),
  }),
  T('text-cleaner', 'Text Cleaner', 'Strip formatting junk — extra spaces, weird characters, empty lines.', {
    run: (t) => t.replace(/[^\x20-\x7E\n\t]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
    action: 'Clean Text',
  }),
  T('find-replace', 'Find & Replace', 'Find and replace text — case-sensitive or insensitive, all occurrences.', {
    options: [
      { key: 'find', label: 'Find', type: 'text', default: '' },
      { key: 'replace', label: 'Replace with', type: 'text', default: '' },
      { key: 'ci', label: 'Case-insensitive', type: 'checkbox', default: true },
    ],
    action: 'Replace All',
    run: (t, o) => (o.find ? t.split(new RegExp(o.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), o.ci ? 'gi' : 'g')).join(o.replace) : t),
  }, { popular: true }),
  T('text-diff', 'Text Difference Checker', 'Compare two texts line-by-line and see what changed.', {
    // two-input tool — uses options.a / options.b as the two texts
    inputLabel: 'Original text',
    options: [{ key: 'b', label: 'Changed text', type: 'textarea', default: '' }],
    action: 'Compare',
    run: (a, o) => {
      const la = a.split('\n'), lb = (o.b || '').split('\n');
      const out = [];
      const max = Math.max(la.length, lb.length);
      for (let i = 0; i < max; i++) {
        if (la[i] === lb[i]) out.push(`  ${la[i] ?? ''}`);
        else {
          if (la[i] !== undefined) out.push(`- ${la[i]}`);
          if (lb[i] !== undefined) out.push(`+ ${lb[i]}`);
        }
      }
      return { text: out.join('\n'), stats: [{ label: 'Lines A', value: la.length }, { label: 'Lines B', value: lb.length }] };
    },
  }),
  T('text-formatter', 'Text Formatter', 'Auto-format messy text — fix spacing, line breaks and casing.', {
    run: (t) => toSentenceCase(t.replace(/\s+/g, ' ').trim().replace(/ ([.,!?;:])/g, '$1')),
    action: 'Format',
  }),
  T('markdown-formatter', 'Markdown Formatter', 'Clean up markdown — normalize headers, lists and spacing.', {
    run: (t) => t.replace(/^#{1,6}\s*/gm, (m) => m.trim() + ' ').replace(/\n{3,}/g, '\n\n').trim(),
    action: 'Format',
  }),
  T('markdown-previewer', 'Markdown Previewer', 'Write markdown and see the rendered HTML preview live.', {
    run: (t) => ({ html: mdToHtml(t) }),
    action: 'Preview',
  }, { popular: true }),
  T('markdown-to-html', 'Markdown to HTML', 'Convert markdown to clean HTML code you can paste anywhere.', {
    run: (t) => mdToHtml(t),
    action: 'Convert to HTML',
  }),
  T('html-to-text', 'HTML to Text', 'Strip HTML tags and get clean readable plain text.', {
    run: (t) => t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
    action: 'Convert to Text',
  }),
  T('text-to-image', 'Text to Image', 'Render text onto a PNG image — choose size and colors.', {
    engine: 'image', // handled by ImageTool? no — text-to-image is canvas text render, do it inline below
  }),
  T('speech-to-text', 'Speech to Text', 'Dictate into your microphone — converts speech to text (browser speech recognition).', { mode: 'stt' }, { engine: 'speech' }),
  T('text-to-speech', 'Text to Speech', 'Read any text aloud with the browser speech engine — adjustable voice.', { mode: 'tts' }, { engine: 'speech' }),
];

// fix: text-to-image is a text-engine tool that renders via canvas — keep engine 'text' and draw in run
DOC_TOOLS.find((t) => t.id === 'text-to-image').engine = 'text';
DOC_TOOLS.find((t) => t.id === 'text-to-image').def = {
  action: 'Render Image',
  options: [
    { key: 'fontSize', label: 'Font size (px)', type: 'number', default: 32 },
    { key: 'bg', label: 'Background', type: 'text', default: '#ffffff', placeholder: '#ffffff' },
    { key: 'fg', label: 'Text color', type: 'text', default: '#111827', placeholder: '#111827' },
  ],
  run: (t, o) => {
    const c = document.createElement('canvas');
    const pad = 60, fs = parseInt(o.fontSize) || 32;
    const ctx = c.getContext('2d');
    ctx.font = `bold ${fs}px sans-serif`;
    const lines2 = t.split('\n');
    const w = Math.min(1600, Math.max(300, Math.max(...lines2.map((l) => ctx.measureText(l).width)) + pad * 2));
    c.width = w; c.height = lines2.length * fs * 1.5 + pad * 2;
    ctx.fillStyle = o.bg || '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = o.fg || '#111';
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textBaseline = 'top';
    lines2.forEach((l, i) => ctx.fillText(l, pad, pad + i * fs * 1.5));
    const dataUrl = c.toDataURL('image/png');
    return { stats: [{ label: 'Size', value: `${c.width}×${c.height}px` }], html: `<img src="${dataUrl}" class="max-w-full rounded-xl border border-slate-200" alt="Text image"/>` };
  },
};
