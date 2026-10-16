const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

let cache = null;
let inflight = null;

export function fetchTemplates({ force = false } = {}) {
  if (cache && !force) return Promise.resolve(cache);
  if (inflight && !force) return inflight;
  inflight = fetch(`${API_BASE_URL}/api/templates`)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load templates (${r.status})`);
      return r.json();
    })
    .then((d) => {
      cache = { categories: d.categories || [], templates: d.templates || [] };
      inflight = null;
      return cache;
    })
    .catch((e) => {
      inflight = null;
      throw e;
    });
  return inflight;
}

export const findTemplate = (data, categorySlug, slug) =>
  data.templates.find((t) => t.slug === slug && (!categorySlug || t.category === categorySlug)) || null;

export const usageScore = (t) =>
  (t.usage?.view || 0) * 1 + (t.usage?.preview || 0) * 2 + (t.usage?.use || 0) * 4 + (t.usage?.download || 0) * 5;

export function trackTemplate(id, type) {
  try {
    fetch(`${API_BASE_URL}/api/templates/${id}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    }).catch(() => {});
  } catch {
    /* analytics is best-effort */
  }
}
