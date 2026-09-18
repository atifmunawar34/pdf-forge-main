import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Flame, FileText, X } from 'lucide-react';
import { fetchTemplates, usageScore } from '../utils/templatesApi';
import TemplateCard from './TemplateCard';

const PAGE_SIZE = 24;

const DOC_TYPES = [
  ['invoice', 'Invoices & Quotes'], ['letter', 'Letters'], ['cv', 'CV / Resume'],
  ['form', 'Forms'], ['agreement', 'Agreements'], ['report', 'Reports & Plans'],
  ['checklist', 'Checklists'], ['planner', 'Planners'], ['table', 'Sheets & Trackers'], ['receipt', 'Receipts'],
];

const SORTS = [
  ['popular', 'Most Popular'], ['newest', 'Newest'], ['az', 'A–Z'],
];

const Sel = ({ value, onChange, options, label }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

export default function TemplatesHub({ categorySlug, onPreview, onUse }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState(categorySlug || 'all');
  const [docType, setDocType] = useState('all');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTemplates().then(setData).catch((e) => setError(e.message));
  }, []);

  // App remounts this component per category (key prop), so initial state is enough
  const pick = (setter) => (v) => { setter(v); setPage(1); };

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.templates.filter((t) => t.status !== 'draft');
    if (cat !== 'all') list = list.filter((t) => t.category === cat);
    if (docType !== 'all') list = list.filter((t) => t.docType === docType);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.name, t.description, t.categoryName, ...(t.tags || [])].join(' ').toLowerCase().includes(q)
      );
    }
    const by = {
      popular: (a, b) => (b.featured - a.featured) || (usageScore(b) - usageScore(a)) || a.name.localeCompare(b.name),
      newest: (a, b) => b.id.localeCompare(a.id),
      az: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort] || by.popular);
  }, [data, query, cat, docType, sort]);

  const popular = useMemo(() => {
    if (!data) return [];
    return [...data.templates].sort((a, b) => usageScore(b) - usageScore(a) || (b.featured - a.featured)).slice(0, 8);
  }, [data]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const searching = query.trim() || cat !== 'all' || docType !== 'all';

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* hero */}
      <section className="bg-gradient-to-b from-rose-50 to-slate-50 border-b border-slate-200 px-4 pt-12 pb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Ready-to-Use Templates for <span className="text-rose-500">Work, Business & Life</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
          Create professional documents faster with customizable templates — fill, preview, download as PDF.
        </p>
        <div className="mt-6 max-w-xl mx-auto relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates… (invoice, resume, agreement, planner)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-12 pr-10 py-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* filters */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:border-rose-300 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
          <p className="text-xs text-slate-400 font-semibold">{filtered.length} templates</p>
        </div>

        {showFilters && (
          <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Sel label="Category" value={cat} onChange={pick(setCat)}
              options={[['all', 'All categories'], ...(data?.categories || []).map((c) => [c.slug, c.name])]} />
            <Sel label="Document Type" value={docType} onChange={pick(setDocType)}
              options={[['all', 'All types'], ...DOC_TYPES]} />
            <Sel label="Sort By" value={sort} onChange={pick(setSort)} options={SORTS} />
            <div className="flex items-end">
              <button
                onClick={() => { setCat('all'); setDocType('all'); setSort('popular'); setQuery(''); setPage(1); }}
                className="w-full text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl px-3 py-2.5 transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700">
            Could not load templates: {error}. Make sure the backend server is running.
          </div>
        )}

        {!data && !error && (
          <div className="mt-10 text-center text-slate-400 text-sm">Loading templates…</div>
        )}

        {/* popular row — only when not searching */}
        {data && !searching && (
          <section className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-black text-slate-800">Popular Templates</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {popular.map((t) => (
                <TemplateCard key={t.id} tpl={t} onPreview={() => onPreview(t)} onUse={() => onUse(t)} />
              ))}
            </div>
          </section>
        )}

        {/* category chips */}
        {data && !searching && (
          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => pick(setCat)('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                cat === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'
              }`}
            >
              All
            </button>
            {data.categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => pick(setCat)(c.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                  cat === c.slug ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* main grid */}
        {data && (
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-black text-slate-800">
                {searching ? `Results` : 'All Templates'}
              </h2>
            </div>
            {shown.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-bold text-slate-500">No templates found</p>
                <p className="text-xs mt-1">Try a different search or clear the filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {shown.map((t) => (
                  <TemplateCard key={t.id} tpl={t} onPreview={() => onPreview(t)} onUse={() => onUse(t)} />
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:border-rose-300 transition cursor-pointer"
                >
                  ← Prev
                </button>
                <span className="text-xs font-bold text-slate-500">{page} / {pages}</span>
                <button
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:border-rose-300 transition cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
