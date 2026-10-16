import { useState, useRef, useEffect, useMemo } from 'react';
import { Layers, ChevronDown, ShieldCheck, LayoutTemplate, Search, ArrowRight, Menu, X, FileText, Sparkles } from 'lucide-react';
import { PDF_CATEGORIES } from '../data/pdfTools';
import { fetchTemplates } from '../utils/templatesApi';
import { KIT_CATEGORIES, ALL_SEARCHABLE, searchTools } from '../data/kit';
import { useLocal } from './toolkit/utils';

const RECENT_KEY = 'pf_recent_searches';
const POPULAR = ['image-compressor', 'qr-code-generator', 'word-counter', 'merge', 'compress', 'loan-calculator', 'password-generator', 'meta-tag-generator'];

const ResultRow = ({ t, onGo }) => (
  <button
    onClick={() => onGo(t)}
    className="w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition group"
  >
    <div className="min-w-0">
      <p className="text-xs font-bold text-slate-700 group-hover:text-rose-600 truncate">{t.name}</p>
      <p className="text-[10px] text-slate-400 truncate">{t.desc}</p>
    </div>
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">{t.kind}</span>
  </button>
);

export default function Header({ onSelectTool, onHome, onTemplates, onOpenCategory, onOpenKitTool, onAssistant }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tplCats, setTplCats] = useState([]);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recent, setRecent] = useLocal(RECENT_KEY, []);
  const navRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchTemplates().then((d) => setTplCats(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenDropdown(null);
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim();
    if (!needle) return null;
    // Same scoring as the homepage grid — dropdown stays capped at 8
    return searchTools(needle).slice(0, 8);
  }, [q]);

  const suggestions = useMemo(() => {
    if (q.trim()) return null;
    const recents = recent
      .map((id) => ALL_SEARCHABLE.find((t) => t.id === id))
      .filter(Boolean)
      .slice(0, 3);
    const popular = POPULAR.map((id) => ALL_SEARCHABLE.find((t) => t.id === id)).filter(Boolean).slice(0, 5);
    return { recents, popular };
  }, [q, recent]);

  const go = (t) => {
    setRecent([t.id, ...recent.filter((id) => id !== t.id)].slice(0, 8));
    setSearchOpen(false);
    setQ('');
    if (t.kind === 'PDF') {
      const tool = PDF_CATEGORIES.flatMap((c) => c.tools).find((x) => x.id === t.id);
      if (tool) onSelectTool?.(tool);
    } else {
      const [cat, tool] = t.path.replace(/^\//, '').split('/');
      onOpenKitTool?.(cat, tool);
    }
  };

  const rowOf = (t, key) => <ResultRow key={key} t={t} onGo={go} />;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 pf-fade-in" ref={navRef}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div
          className="flex items-center space-x-3 cursor-pointer shrink-0"
          onClick={() => (onHome ? onHome() : window.scrollTo({ top: 0, behavior: 'smooth' }))}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-md shadow-rose-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">
            PDF<span className="text-rose-500">Forge</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="hidden lg:flex items-center space-x-1">
          {/* All Tools mega menu */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === '__tools' ? null : '__tools')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                openDropdown === '__tools' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Tools</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {openDropdown === '__tools' && (
              <div className="absolute top-full left-0 mt-2 w-[560px] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 pf-menu">
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => { onOpenCategory?.('pdf-tools'); setOpenDropdown(null); }}
                    className="px-3 py-2.5 rounded-xl text-left hover:bg-rose-50 transition group flex items-center gap-2.5"
                  >
                    <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><FileText className="w-3.5 h-3.5" /></span>
                    <span>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-rose-600">PDF Tools</p>
                      <p className="text-[10px] text-slate-400">Merge, split, convert & more</p>
                    </span>
                  </button>
                  {KIT_CATEGORIES.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => { onOpenCategory?.(c.slug); setOpenDropdown(null); }}
                      className="px-3 py-2.5 rounded-xl text-left hover:bg-rose-50 transition group flex items-center gap-2.5"
                    >
                      <span className={`w-7 h-7 rounded-lg ${c.chipBg} ${c.accent} flex items-center justify-center shrink-0`}><c.icon className="w-3.5 h-3.5" /></span>
                      <span>
                        <p className="text-xs font-bold text-slate-700 group-hover:text-rose-600">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.tools.length} tools</p>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Templates dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === '__tpl' ? null : '__tpl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                openDropdown === '__tpl' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-rose-500" />
              <span>Templates</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {openDropdown === '__tpl' && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 pf-menu max-h-[70vh] overflow-y-auto">
                <button
                  onClick={() => { onTemplates?.(null); setOpenDropdown(null); }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                >
                  All Templates →
                </button>
                <div className="h-px bg-slate-100 my-1" />
                {tplCats.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => { onTemplates?.(c.slug); setOpenDropdown(null); }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onAssistant?.()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 bg-gradient-to-r from-rose-500 to-indigo-600 text-white hover:opacity-90 transition cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>
        </nav>

        {/* Global search */}
        <div className="relative flex-1 max-w-xs sm:max-w-sm" ref={searchRef}>
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); e.target.blur(); } }}
            role="searchbox"
            aria-label="Search all tools"
            placeholder="Search all tools…"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
          />
          {searchOpen && (results || suggestions) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 max-h-[60vh] overflow-y-auto pf-menu">
              {results ? (
                results.length ? (
                  results.map((t) => rowOf(t, `${t.kind}-${t.id}`))
                ) : (
                  <p className="px-4 py-3 text-xs text-slate-400">No tools match "{q}".</p>
                )
              ) : (
                <>
                  {suggestions.recents.length > 0 && (
                    <>
                      <p className="px-4 pt-1 pb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300">Recent</p>
                      {suggestions.recents.map((t) => rowOf(t, `r-${t.id}`))}
                    </>
                  )}
                  <p className="px-4 pt-1 pb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300">Popular</p>
                  {suggestions.popular.map((t) => rowOf(t, `p-${t.id}`))}
                  <button
                    onClick={() => { onOpenCategory?.('pdf-tools'); setSearchOpen(false); }}
                    className="w-full px-4 py-2 text-left text-[11px] font-bold text-rose-500 hover:bg-rose-50 transition flex items-center gap-1"
                  >
                    Browse all tools <ArrowRight className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Badge */}
        <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden xl:inline">100% Free & Open-Source</span>
          <span className="xl:hidden">Free</span>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white max-h-[75vh] overflow-y-auto pf-menu">
          <div className="px-4 py-3 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 pt-1 pb-1">Categories</p>
            <button
              onClick={() => { onOpenCategory?.('pdf-tools'); setMobileOpen(false); }}
              className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition flex items-center gap-2.5"
            >
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><FileText className="w-3.5 h-3.5" /></span>
              PDF Tools <span className="text-[10px] font-bold text-slate-400">51 tools</span>
            </button>
            {KIT_CATEGORIES.map((c) => (
              <button
                key={c.slug}
                onClick={() => { onOpenCategory?.(c.slug); setMobileOpen(false); }}
                className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition flex items-center gap-2.5"
              >
                <span className={`w-7 h-7 rounded-lg ${c.chipBg} ${c.accent} flex items-center justify-center shrink-0`}><c.icon className="w-3.5 h-3.5" /></span>
                {c.name} <span className="text-[10px] font-bold text-slate-400">{c.tools.length} tools</span>
              </button>
            ))}
            <div className="h-px bg-slate-100 my-2" />
            <button
              onClick={() => { onAssistant?.(); setMobileOpen(false); }}
              className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition flex items-center gap-2.5 bg-gradient-to-r from-rose-500 to-indigo-600 text-white"
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </button>
            <button
              onClick={() => { onTemplates?.(null); setMobileOpen(false); }}
              className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition flex items-center gap-2.5"
            >
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><LayoutTemplate className="w-3.5 h-3.5" /></span>
              Templates
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
