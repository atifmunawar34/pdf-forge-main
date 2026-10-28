import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, ArrowRight, Menu, X, FileText, Sparkles, Grip, CircleUserRound } from 'lucide-react';
import Logo from './Logo';
import ToolGlyph from './ToolGlyph';
import { PDF_CATEGORIES } from '../data/pdfTools';
import { useLocal } from './toolkit/utils';
import { useT } from '../i18n/index.jsx';

const RECENT_KEY = 'pf_recent_searches';
const POPULAR = ['merge', 'compress', 'split', 'pdf-to-word', 'jpg-to-pdf', 'edit'];
const PDF_ALL = PDF_CATEGORIES.flatMap((c) => c.tools).map((x) => ({ ...x, kind: 'PDF' }));

// Synonym/keyword map so searches like "image" or "password" surface the right tools
const ALIASES = {
  image: ['jpg-to-pdf', 'png-to-pdf', 'webp-to-pdf', 'pdf-to-jpg', 'pdf-to-png', 'pdf-to-webp', 'extract-images', 'scan', 'watermark'],
  photo: ['jpg-to-pdf', 'pdf-to-jpg'],
  picture: ['jpg-to-pdf', 'png-to-pdf', 'pdf-to-jpg'],
  word: ['pdf-to-word', 'word-to-pdf'],
  doc: ['pdf-to-word', 'word-to-pdf'],
  docx: ['pdf-to-word', 'word-to-pdf'],
  excel: ['pdf-to-excel', 'excel-to-pdf'],
  xls: ['pdf-to-excel', 'excel-to-pdf'],
  xlsx: ['pdf-to-excel', 'excel-to-pdf'],
  spreadsheet: ['pdf-to-excel', 'excel-to-pdf'],
  powerpoint: ['pdf-to-powerpoint', 'powerpoint-to-pdf'],
  ppt: ['pdf-to-powerpoint', 'powerpoint-to-pdf'],
  pptx: ['pdf-to-powerpoint', 'powerpoint-to-pdf'],
  presentation: ['pdf-to-powerpoint', 'powerpoint-to-pdf'],
  slide: ['pdf-to-powerpoint', 'powerpoint-to-pdf'],
  html: ['html-to-pdf', 'pdf-to-html'],
  webpage: ['html-to-pdf', 'pdf-to-html'],
  text: ['pdf-to-txt', 'txt-to-pdf', 'ocr'],
  txt: ['pdf-to-txt', 'txt-to-pdf'],
  markdown: ['md-to-pdf', 'to-markdown'],
  md: ['md-to-pdf', 'to-markdown'],
  password: ['protect', 'unlock'],
  lock: ['protect', 'unlock'],
  secure: ['protect'],
  decrypt: ['unlock'],
  encrypt: ['protect'],
  sign: ['sign'],
  signature: ['sign'],
  delete: ['remove'],
  erase: ['redact', 'remove-metadata'],
  camera: ['scan'],
  scanner: ['scan'],
  combine: ['merge'],
  join: ['merge'],
  smaller: ['compress'],
  shrink: ['compress'],
  resize: ['compress', 'crop'],
  number: ['page-numbers'],
  numbering: ['page-numbers'],
  ocr: ['ocr', 'scan'],
  searchable: ['ocr'],
  archive: ['pdf-to-pdfa'],
  blank: ['insert-blank'],
  reorder: ['organize', 'reverse'],
  sort: ['organize'],
  stamp: ['watermark'],
  form: ['forms'],
  fill: ['forms'],
  author: ['metadata'],
  title: ['metadata'],
  info: ['page-info'],
  inspect: ['page-info'],
  compare: ['compare'],
  diff: ['compare'],
  privacy: ['redact', 'remove-metadata'],
  attachment: ['extract-attachments'],
  translate: ['translate'],
  summarize: ['summarizer'],
  summary: ['summarizer'],
};

const ResultRow = ({ t, onGo }) => (
  <button
    onClick={() => onGo(t)}
    className="w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-slate-50 transition group"
  >
    <ToolGlyph icon={t.icon} colorClass={t.color} size={30} />
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-bold text-slate-700 group-hover:text-rose-600 truncate">{t.name}</p>
      <p className="text-[11px] text-slate-400 truncate">{t.desc}</p>
    </div>
    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-500 transition shrink-0" />
  </button>
);

export default function Header({ onSelectTool, onHome, onOpenCategory, onAssistant }) {
  const t = useT();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recent, setRecent] = useLocal(RECENT_KEY, []);
  const navRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenDropdown(null);
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    const words = needle.split(/\s+/);
    const aliasIds = new Set(words.flatMap((w) => ALIASES[w] || []));
    return PDF_ALL
      .map((x) => {
        const hay = `${x.id} ${x.name} ${x.desc}`.toLowerCase();
        let score = 0;
        if (x.name.toLowerCase().startsWith(needle)) score += 3;
        if (x.name.toLowerCase().includes(needle)) score += 2;
        if (hay.includes(needle)) score += 1;
        if (aliasIds.has(x.id)) score += 2;
        return { x, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((r) => r.x);
  }, [q]);

  const suggestions = useMemo(() => {
    if (q.trim()) return null;
    const recents = recent
      .map((id) => PDF_ALL.find((t) => t.id === id))
      .filter(Boolean)
      .slice(0, 3);
    const popular = POPULAR.map((id) => PDF_ALL.find((t) => t.id === id)).filter(Boolean).slice(0, 5);
    return { recents, popular };
  }, [q, recent]);

  const go = (t) => {
    setRecent([t.id, ...recent.filter((id) => id !== t.id)].slice(0, 8));
    setSearchOpen(false);
    setQ('');
    const tool = PDF_CATEGORIES.flatMap((c) => c.tools).find((x) => x.id === t.id);
    if (tool) onSelectTool?.(tool);
  };

  const rowOf = (t, key) => <ResultRow key={key} t={t} onGo={go} />;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pf-fade-in" ref={navRef}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand — flat iLovePDF-style wordmark */}
        <div
          className="flex items-center space-x-2 cursor-pointer shrink-0"
          onClick={() => (onHome ? onHome() : window.scrollTo({ top: 0, behavior: 'smooth' }))}
        >
          <Logo />
        </div>

        {/* Nav — iLovePDF inline links: MERGE | SPLIT | COMPRESS | CONVERT PDF | ALL PDF TOOLS */}
        <nav className="hidden lg:flex items-center space-x-1">
          {['merge', 'split', 'compress'].map((tid) => {
            const tool = PDF_CATEGORIES.flatMap((c) => c.tools).find((x) => x.id === tid);
            return tool ? (
              <button
                key={tid}
                onClick={() => onSelectTool?.(tool)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wide text-slate-700 hover:text-rose-600 transition cursor-pointer"
              >
                {t(`nav_${tid}`)}
              </button>
            ) : null;
          })}

          {/* Convert PDF dropdown — convert to/from PDF columns */}
          <div className="relative"
            onMouseEnter={() => setOpenDropdown('__conv')}
            onMouseLeave={() => setOpenDropdown((d) => (d === '__conv' ? null : d))}
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === '__conv' ? null : '__conv')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wide flex items-center space-x-1 transition cursor-pointer ${
                openDropdown === '__conv' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:text-rose-600'
              }`}
            >
              <span>{t('nav_convert')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {openDropdown === '__conv' && (
              <div className="absolute top-full left-0 mt-2 w-[440px] bg-white rounded-xl shadow-xl border border-slate-200 p-5 z-50 pf-menu">
                <div className="absolute -top-3 left-0 right-0 h-3 bg-transparent" />
                <div className="grid grid-cols-2 gap-x-6">
                  {PDF_CATEGORIES.filter((c) => c.title.toLowerCase().includes('convert')).map((cat) => (
                    <div key={cat.title}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{cat.title}</p>
                      <ul className="space-y-1">
                        {cat.tools.map((t) => (
                          <li key={t.id}>
                            <button
                              onClick={() => { onSelectTool?.(t); setOpenDropdown(null); }}
                              className="w-full text-left flex items-center gap-2.5 py-1 group cursor-pointer"
                            >
                              <ToolGlyph icon={t.icon} colorClass={t.color} size={24} />
                              <span className="text-[13px] font-medium text-slate-700 group-hover:text-rose-600 transition truncate">{t.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All Tools mega menu — iLovePDF-style grouped columns */}
          <div className="relative"
            onMouseEnter={() => setOpenDropdown('__tools')}
            onMouseLeave={() => setOpenDropdown((d) => (d === '__tools' ? null : d))}
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === '__tools' ? null : '__tools')}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold flex items-center space-x-1 transition ${
                openDropdown === '__tools' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="uppercase tracking-wide">{t('nav_all')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {openDropdown === '__tools' && (
              <div className="fixed left-1/2 -translate-x-1/2 top-14 pt-3 w-[92vw] max-w-[980px] bg-transparent z-50 pf-menu">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-7 max-h-[78vh] overflow-y-auto">
                  <div className="grid grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-5">
                    {PDF_CATEGORIES.filter((cat) => !cat.title.toLowerCase().includes('convert')).map((cat) => (
                      <div key={cat.title}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">{cat.title}</p>
                        <ul className="space-y-1">
                          {cat.tools.map((t) => (
                            <li key={t.id}>
                              <button
                                onClick={() => { onSelectTool?.(t); setOpenDropdown(null); }}
                                className="w-full text-left flex items-center gap-2.5 py-1 group cursor-pointer"
                              >
                                <ToolGlyph icon={t.icon} colorClass={t.color} size={24} />
                                <span className="text-[13px] font-medium text-slate-700 group-hover:text-rose-600 transition truncate">{t.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

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
            placeholder={t('search_ph')}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
          />
          {searchOpen && (results || suggestions) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 max-h-[60vh] overflow-y-auto pf-menu">
              {results ? (
                results.length ? (
                  results.map((t) => rowOf(t, `${t.kind}-${t.id}`))
                ) : (
                  <p className="px-4 py-3 text-xs text-slate-400">{t('s_none')} "{q}".</p>
                )
              ) : (
                <>
                  {suggestions.recents.length > 0 && (
                    <>
                      <p className="px-4 pt-1 pb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300">{t('s_recent')}</p>
                      {suggestions.recents.map((t) => rowOf(t, `r-${t.id}`))}
                    </>
                  )}
                  <p className="px-4 pt-1 pb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300">{t('s_popular')}</p>
                  {suggestions.popular.map((t) => rowOf(t, `p-${t.id}`))}
                  <button
                    onClick={() => { onOpenCategory?.('pdf-tools'); setSearchOpen(false); }}
                    className="w-full px-4 py-2 text-left text-[11px] font-bold text-rose-500 hover:bg-rose-50 transition flex items-center gap-1"
                  >
                    {t('s_browse')} <ArrowRight className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right cluster — avatar + app-launcher dots (iLovePDF style) */}
        <div className="hidden sm:flex items-center space-x-1 shrink-0">
          <div className="relative"
            onMouseEnter={() => setOpenDropdown('__acct')}
            onMouseLeave={() => setOpenDropdown((d) => (d === '__acct' ? null : d))}
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === '__acct' ? null : '__acct')}
              aria-label="Account"
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition cursor-pointer"
            >
              <CircleUserRound className="w-6 h-6" strokeWidth={1.5} />
            </button>
            {openDropdown === '__acct' && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 pf-menu">
                <div className="absolute -top-3 left-0 right-0 h-3 bg-transparent" />
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <span className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <CircleUserRound className="w-6 h-6" strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">Guest</p>
                    <p className="text-[11px] text-slate-400">No signup needed</p>
                  </div>
                </div>
                <p className="pt-3 text-[11px] text-slate-500 leading-relaxed">
                  Every tool is 100% free — no account, no watermark, no limits.
                </p>
              </div>
            )}
          </div>
          <div className="relative"
            onMouseEnter={() => setOpenDropdown('__apps')}
            onMouseLeave={() => setOpenDropdown((d) => (d === '__apps' ? null : d))}
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === '__apps' ? null : '__apps')}
              aria-label="More products"
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
            >
              <Grip className="w-5 h-5" strokeWidth={2} />
            </button>
            {openDropdown === '__apps' && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 pf-menu">
                <div className="absolute -top-3 left-0 right-0 h-3 bg-transparent" />
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">More</p>
                {[
                  { label: 'AI Assistant', desc: 'Describe a task, get it done', slug: null, onOpen: () => onAssistant?.() },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { p.onOpen?.(p.slug); setOpenDropdown(null); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-rose-50 transition group cursor-pointer"
                  >
                    <p className="text-[13px] font-bold text-slate-700 group-hover:text-rose-600">{p.label}</p>
                    <p className="text-[11px] text-slate-400">{p.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            <div className="h-px bg-slate-100 my-2" />
            <button
              onClick={() => { onAssistant?.(); setMobileOpen(false); }}
              className="w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition flex items-center gap-2.5 bg-rose-600 text-white"
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
