// Value helpers for the schema-driven template engine.

// Build the initial values object from a template schema.
// fields sections -> {key: {field: value}}  |  group sections -> [row, row]
export function initValues(tpl) {
  const v = {};
  for (const s of tpl.sections || []) {
    if (s.type === 'fields') {
      v[s.key] = {};
      for (const f of s.fields) {
        v[s.key][f.key] =
          f.default ?? (f.type === 'checkbox' ? false : f.type === 'number' || f.type === 'currency' ? '' : '');
      }
    } else if (s.type === 'group') {
      v[s.key] = Array.from({ length: s.min ?? 1 }, () => emptyRow(s.fields));
    }
  }
  return v;
}

const emptyRow = (fields) => {
  const r = {};
  for (const f of fields) r[f.key] = f.default ?? (f.type === 'checkbox' ? false : '');
  return r;
};

// Fill a template with realistic sample data for previews.
export function sampleValues(tpl) {
  const v = initValues(tpl);
  const fill = (fd, row = {}) => {
    const k = fd.key;
    if (row[k] !== '' && row[k] !== false && row[k] != null) return row[k];
    const label = (fd.label || k).toLowerCase();
    if (fd.default != null && fd.default !== '') return fd.default;
    switch (fd.type) {
      case 'date': return '2026-02-01';
      case 'number': return label.includes('qty') ? 2 : label.includes('%') || label.includes('tax') ? 10 : 1;
      case 'currency': return label.includes('price') || label.includes('amount') || label.includes('rent') ? 250 : 100;
      case 'email': return 'name@example.com';
      case 'phone': return '+1 555 123 4567';
      case 'address': return '123 Main Street, City';
      case 'longtext':
        if (label.includes('terms')) return 'Payment due within 14 days. Late payments may incur a fee.';
        if (label.includes('notes')) return 'Additional notes go here.';
        if (label.includes('clause')) return 'The parties agree to the terms described in this clause.';
        if (label.includes('content')) return 'Section content goes here. Describe the details clearly.';
        return 'Sample text — replace with your own content in the editor.';
      case 'select': return fd.options?.[0] || '';
      case 'checkbox': return true;
      case 'image': return null;
      default: {
        if (label.includes('name') && label.includes('company')) return 'Acme Corporation';
        if (label.includes('name')) return 'John Smith';
        if (label.includes('title')) return 'Sample Title';
        if (label.includes('date')) return '2026-02-01';
        if (label.includes('no.') || label.includes('number') || label.includes('ref')) return 'DOC-001';
        return 'Sample';
      }
    }
  };

  for (const s of tpl.sections || []) {
    if (s.type === 'fields') {
      for (const fd of s.fields) v[s.key][fd.key] = fill(fd, v[s.key]);
    } else if (s.type === 'group') {
      const n = Math.max(2, Math.min(3, s.min ?? 2));
      v[s.key] = Array.from({ length: n }, (_, i) => {
        const r = emptyRow(s.fields);
        for (const fd of s.fields) {
          const base = fill(fd, r);
          r[fd.key] = typeof base === 'string' && base !== '' && i > 0 ? `${base} ${i + 1}` : base;
          if (fd.type === 'number' || fd.type === 'currency') r[fd.key] = (base || 1) * (i + 1);
        }
        return r;
      });
    }
  }
  return v;
}

// Merge user-entered values over the sample data: empty fields fall back to
// demo content so the live preview always looks like a complete document.
export function mergeWithSample(tpl, values) {
  const s = sampleValues(tpl);
  const out = {};
  for (const sec of tpl.sections || []) {
    if (sec.type === 'fields') {
      out[sec.key] = {};
      for (const fd of sec.fields) {
        const uv = values?.[sec.key]?.[fd.key];
        out[sec.key][fd.key] = uv === '' || uv == null ? s[sec.key]?.[fd.key] : uv;
      }
    } else if (sec.type === 'group') {
      const rows = values?.[sec.key] || [];
      const srows = s[sec.key] || [];
      out[sec.key] = rows.map((r, i) => {
        const sr = srows[i] || {};
        const merged = { ...sr };
        for (const [k, v] of Object.entries(r)) {
          if (v !== '' && v != null) merged[k] = v;
        }
        return merged;
      });
    }
  }
  return out;
}

const toNum = (x) => {
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : 0;
};

// Totals for money documents (invoice/quote/receipt tables).
export function calcTotals(tpl, values) {
  const itemsSec = (tpl.sections || []).find(
    (s) => s.type === 'group' && s.fields.some((fd) => fd.type === 'currency' || fd.key === 'price')
  );
  if (!itemsSec) return null;
  const rows = values[itemsSec.key] || [];
  let subtotal = 0, tax = 0;
  const hasTax = itemsSec.fields.some((fd) => fd.key === 'tax');
  for (const r of rows) {
    const qty = itemsSec.fields.some((fd) => fd.key === 'qty') ? toNum(r.qty) : 1;
    const price = toNum(r.price ?? r.amount);
    const line = qty * price;
    subtotal += line;
    tax += line * (toNum(r.tax) / 100);
  }
  return { subtotal, tax: hasTax ? tax : 0, total: subtotal + (hasTax ? tax : 0), line: (r) => toNum(r.qty || 1) * toNum(r.price ?? r.amount) };
}

export const money = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNum(n));
