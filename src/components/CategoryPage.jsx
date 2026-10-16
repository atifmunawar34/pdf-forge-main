import { useMemo, useState } from 'react';
import { ChevronRight, Search, Star, ArrowRight } from 'lucide-react';
import { KIT_CATEGORIES } from '../data/kit';
import { useSeo } from './toolkit/utils';

/**
 * Reusable category page — breadcrumb, search, featured, full grid, related.
 * Used by every kit category (image-tools, calculators, …) plus PDF tools.
 */
const ToolCardBtn = ({ t, onOpen }) => (
  <button
    onClick={onOpen}
    className="pf-card pf-press group bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-lg hover:border-rose-200 cursor-pointer"
  >
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-bold text-slate-800 group-hover:text-rose-600 transition text-sm leading-snug">{t.name}</h3>
      {t.popular && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />}
    </div>
    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">{t.desc}</p>
    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 opacity-0 group-hover:opacity-100 transition">
      Open tool <ArrowRight className="w-3 h-3" />
    </span>
  </button>
);

export default function CategoryPage({ category, onOpenTool, onOpenCategory, onHome }) {
  const [q, setQ] = useState('');
  useSeo({
    title: `${category.name} — Free Online Tools | PDF Forge`,
    description: category.seoDesc || category.desc,
    slug: category.slug,
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return category.tools;
    const needle = q.toLowerCase();
    return category.tools.filter((t) =>
      t.name.toLowerCase().includes(needle) ||
      t.desc.toLowerCase().includes(needle) ||
      (t.keywords || []).some((k) => k.includes(needle))
    );
  }, [q, category]);

  const featured = category.tools.filter((t) => t.featured).slice(0, 6);
  const related = KIT_CATEGORIES.filter((c) => c.slug !== category.slug).slice(0, 4);

  const cardOf = (t) => <ToolCardBtn key={t.id} t={t} onOpen={() => onOpenTool(category, t)} />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-6 pf-rise" style={{ '--d': '0ms' }}>
        <button onClick={onHome} className="hover:text-rose-500 transition cursor-pointer">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-600">{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 pf-rise" style={{ '--d': '60ms' }}>
        <div className="flex items-center gap-3">
          <span className={`w-11 h-11 rounded-2xl ${category.chipBg || 'bg-rose-50'} ${category.accent || 'text-rose-600'} flex items-center justify-center shrink-0`}>
            {category.icon ? <category.icon className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{category.name}</h1>
        </div>
        <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-2xl">{category.desc}</p>
        <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{category.tools.length} tools</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-10 pf-rise" style={{ '--d': '120ms' }}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${category.name.toLowerCase()}…`}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 shadow-sm transition"
        />
      </div>

      {/* Featured */}
      {!q && featured.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Featured
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured.map(cardOf)}
          </div>
        </section>
      )}

      {/* All tools */}
      <section className="mb-12">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          {q ? `${filtered.length} result${filtered.length === 1 ? '' : 's'}` : `All ${category.name}`}
        </h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No tools match "{q}".</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(cardOf)}
          </div>
        )}
      </section>

      {/* Related categories */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Related categories</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {related.map((c) => (
            <button
              key={c.slug}
              onClick={() => onOpenCategory(c.slug)}
              className="bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-2xl p-4 text-left transition group cursor-pointer"
            >
              <span className={`inline-flex w-8 h-8 rounded-lg ${c.chipBg || 'bg-slate-100'} ${c.accent || 'text-slate-600'} items-center justify-center`}>
                {c.icon ? <c.icon className="w-4 h-4" /> : null}
              </span>
              <p className="mt-1.5 font-bold text-sm text-slate-700 group-hover:text-rose-600">{c.name}</p>
              <p className="text-[11px] text-slate-400">{c.tools.length} tools</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
