import { useEffect, useState, useCallback } from 'react';

/* Non-component helpers shared by the toolkit engines */

export const useSeo = ({ title, description, slug }) => {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content');
    if (meta && description) meta.setAttribute('content', description);
    let canon = document.querySelector('link[rel="canonical"]');
    const prevCanon = canon?.getAttribute('href');
    if (canon && slug) canon.setAttribute('href', `https://atifmunawar34.github.io/pdf-forge/${slug}`);
    return () => {
      document.title = prevTitle;
      if (prevDesc != null && meta) meta.setAttribute('content', prevDesc);
      if (prevCanon != null && canon) canon.setAttribute('href', prevCanon);
    };
  }, [title, description, slug]);
};

export const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const downloadText = (text, filename, mime = 'text/plain') =>
  download(new Blob([text], { type: mime }), filename);

export const fmtSize = (b) =>
  b == null ? '—' : b > 1073741824 ? `${(b / 1073741824).toFixed(2)} GB`
    : b > 1048576 ? `${(b / 1048576).toFixed(2)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

export const useLocal = (key, initial) => {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s != null ? JSON.parse(s) : initial; } catch { return initial; }
  });
  const set = useCallback((nv) => {
    setV(nv);
    try { localStorage.setItem(key, JSON.stringify(nv)); } catch { /* ignore */ }
  }, [key]);
  return [v, set];
};
