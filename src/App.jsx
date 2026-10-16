import { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import ToolCard from './components/ToolCard';
import ToolModal from './components/ToolModal';
import ToolStudio from './components/ToolStudio';
import Reviews from './components/Reviews';
import Footer from './components/Footer';
import TemplatesHub from './components/TemplatesHub';
import TemplateDetail from './components/TemplateDetail';
import TemplateEditor from './components/TemplateEditor';
import TemplateCard from './components/TemplateCard';
import { PDF_CATEGORIES } from './data/pdfTools';
import { Search, Sparkles, ArrowRight, FileText, LayoutTemplate, X, Zap, ShieldCheck, BadgeCheck, MousePointerClick, Upload, Download } from 'lucide-react';
import { fetchTemplates, findTemplate } from './utils/templatesApi';
import { PopupProvider } from './components/Popups';
import { popupBus, popupSeen, markPopupSeen } from './utils/popupBus';
import {
  WELCOME_POPUP, ANNOUNCEMENT_POPUP,
} from './data/popupConfig';
import { useReveal } from './hooks/useReveal';
import CategoryPage from './components/CategoryPage';
import ToolPage from './components/ToolPage';
import AssistantPage from './components/AssistantPage';
import DocumentCreator from './components/DocumentCreator';
import { KIT_CATEGORIES, findKitCategory, findKitTool, searchTools, broadSearchSlug } from './data/kit';

const BASE_URL = import.meta.env.BASE_URL || '/';
const KIT_SLUGS = new Set(KIT_CATEGORIES.map((c) => c.slug));

// Pseudo-category so PDF tools reuse the same CategoryPage layout
const PDF_CAT = {
  slug: 'pdf-tools', name: 'PDF Tools', icon: FileText, accent: 'text-rose-600', chipBg: 'bg-rose-50',
  desc: 'Merge, split, compress, convert, edit, protect and manage PDFs — free, private, in-browser.',
  seoDesc: 'Free online PDF tools: merge PDF, split PDF, compress PDF, PDF to Word/JPG/Excel, OCR, protect, unlock, sign and 40+ more.',
  tools: PDF_CATEGORIES.flatMap((c) => c.tools),
};

const findToolById = (id) =>
  PDF_CATEGORIES.flatMap((c) => c.tools).find((t) => t.id === id) || null;

export default function App() {
  return (
    <PopupProvider>
      <AppContent />
    </PopupProvider>
  );
}

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [activeModalTool, setActiveModalTool] = useState(null);
  const [activeStudioSession, setActiveStudioSession] = useState(null);
  const [modalSeed, setModalSeed] = useState(null);
  const studioSessionRef = useRef(null);
  const homeScrollRef = useRef(0);
  // tplRoute: null | {view:'templates'|'detail'|'editor', cat, slug}
  const [tplRoute, setTplRoute] = useState(null);
  // kitRoute: null | {cat:'document-creator'|'pdf-tools'|<kit-slug>, tool?}
  const [kitRoute, setKitRoute] = useState(null);
  const [tplData, setTplData] = useState(null);
  // Set true inside nav handlers so the push effect only writes to history
  // after a real user navigation — never on mount or passive re-renders.
  const navRef = useRef(false);

  // Restore the homepage scroll position so users land exactly where they left
  const restoreHomeScroll = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: homeScrollRef.current, behavior: 'instant' });
    });
  };

  useEffect(() => {
    studioSessionRef.current = activeStudioSession;
  }, [activeStudioSession]);

  // Load the template library once (homepage section + templates pages share it)
  useEffect(() => {
    fetchTemplates().then(setTplData).catch(() => {});
  }, []);

  // Keep the URL in sync with app state:
  //   /pdf-forge/<tool>                         -> upload modal
  //   /pdf-forge/<tool>/workspace               -> editing workspace
  //   /pdf-forge/templates[/cat[/slug[/edit]]]  -> templates pages
  useEffect(() => {
    if (!navRef.current) return;
    navRef.current = false;
    let target;
    if (kitRoute) {
      target = kitRoute.tool
        ? `${BASE_URL}${kitRoute.cat}/${kitRoute.tool}`
        : `${BASE_URL}${kitRoute.cat}`;
    } else if (tplRoute) {
      target =
        tplRoute.view === 'editor'
          ? `${BASE_URL}templates/${tplRoute.cat}/${tplRoute.slug}/edit`
          : tplRoute.view === 'detail'
            ? `${BASE_URL}templates/${tplRoute.cat}/${tplRoute.slug}`
            : tplRoute.cat
              ? `${BASE_URL}templates/${tplRoute.cat}`
              : `${BASE_URL}templates`;
    } else {
      const id = activeStudioSession?.tool?.id || activeModalTool?.id;
      target = activeStudioSession
        ? `${BASE_URL}${id}/workspace`
        : id
          ? `${BASE_URL}${id}`
          : BASE_URL;
    }
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
  }, [activeModalTool, activeStudioSession, tplRoute, kitRoute]);

  // Keep state in sync with the URL (browser back/forward + deep links)
  useEffect(() => {
    const syncFromUrl = () => {
      // Legacy hash links like /#/split still work
      let rel = window.location.hash.replace(/^#\/?/, '');
      if (!rel) {
        const path = window.location.pathname;
        rel = (path.startsWith(BASE_URL) ? path.slice(BASE_URL.length) : path.replace(/^\/+/, ''))
          .replace(/\/+$/, '');
      }
      // Templates section routes
      if (rel === 'templates' || rel.startsWith('templates/')) {
        const [, cat, slug, sub] = rel.split('/');
        setModalSeed(null);
        setActiveModalTool(null);
        setActiveStudioSession(null);
        setKitRoute(null);
        if (sub === 'edit' && slug) setTplRoute({ view: 'editor', cat, slug });
        else if (slug) setTplRoute({ view: 'detail', cat, slug });
        else setTplRoute({ view: 'templates', cat: cat || null });
        return;
      }
      setTplRoute(null);

      // AI Assistant + Document Creator routes
      if (rel === 'ai') {
        setModalSeed(null);
        setActiveModalTool(null);
        setActiveStudioSession(null);
        setKitRoute({ cat: 'ai' });
        return;
      }
      if (rel === 'document-creator') {
        setModalSeed(null);
        setActiveModalTool(null);
        setActiveStudioSession(null);
        setKitRoute({ cat: 'document-creator' });
        return;
      }

      // Kit category + tool routes (image-tools, calculators, pdf-tools, …)
      const [catSlug, kitToolSlug] = rel.split('/');
      if (catSlug === 'pdf-tools' || KIT_SLUGS.has(catSlug)) {
        setModalSeed(null);
        setActiveStudioSession(null);
        if (catSlug === 'pdf-tools' && kitToolSlug) {
          // deep link to a specific PDF tool → its upload modal
          setKitRoute(null);
          setActiveModalTool(findToolById(kitToolSlug));
          return;
        }
        setActiveModalTool(null);
        setKitRoute({ cat: catSlug, tool: kitToolSlug || null });
        return;
      }
      setKitRoute(null);

      const [toolId] = rel.split('/');
      const tool = findToolById(toolId);

      // Seed the upload modal with the previous session's files when stepping
      // back out of a workspace for the same tool
      const prev = studioSessionRef.current;
      setModalSeed(
        prev && tool && prev.tool.id === tool.id
          ? {
              files: prev.files,
              imageCards: prev.imageCards,
              htmlCode: prev.htmlCode,
              htmlMode: prev.htmlMode,
            }
          : null
      );

      // /tool/workspace deep links can't restore uploaded files — show the modal
      setActiveStudioSession(null);
      setActiveModalTool(tool);
      if (!tool) restoreHomeScroll();
    };
    window.addEventListener('popstate', syncFromUrl);
    syncFromUrl();
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const openTool = (tool) => {
    if (typeof tool === 'string') tool = findToolById(tool);
    if (!tool) return;
    navRef.current = true;
    homeScrollRef.current = window.scrollY;
    setTplRoute(null);
    setKitRoute(null);
    // One step: click a tool → its upload modal opens immediately
    setActiveModalTool(tool);
  };

  const goHome = () => {
    navRef.current = true;
    setActiveModalTool(null);
    setActiveStudioSession(null);
    setTplRoute(null);
    setKitRoute(null);
    restoreHomeScroll();
  };

  // Kit categories + document creator navigation
  const openKitCategory = (slug) => {
    navRef.current = true;
    setTplRoute(null);
    setActiveModalTool(null);
    setActiveStudioSession(null);
    setKitRoute({ cat: slug, tool: null });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openKitTool = (cat, tool) => {
    navRef.current = true;
    setTplRoute(null);
    setActiveModalTool(null);
    setActiveStudioSession(null);
    setKitRoute({ cat, tool });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openCreator = () => openKitCategory('document-creator');
  const openAssistant = () => openKitCategory('ai');

  // Assistant → open a PDF tool's modal in place (stays on /ai), files pre-loaded
  const openAssistantPdfTool = (toolId, files) => {
    const tool = findToolById(toolId);
    if (!tool) return;
    navRef.current = true;
    setModalSeed(files?.length ? { files } : null);
    setActiveModalTool(tool);
  };

  // Templates navigation — `cat` may arrive as a click event, keep strings only
  const openTemplates = (cat = null) => {
    navRef.current = true;
    setKitRoute(null);
    setTplRoute({ view: 'templates', cat: typeof cat === 'string' ? cat : null });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const previewTemplate = (tpl) => {
    navRef.current = true;
    setTplRoute({ view: 'detail', cat: tpl.category, slug: tpl.slug });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const editTemplate = (tpl) => {
    navRef.current = true;
    setTplRoute({ view: 'editor', cat: tpl.category, slug: tpl.slug });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // First-visit welcome + scheduled announcement; expose actions to popups
  useEffect(() => {
    if (WELCOME_POPUP.enabled && !popupSeen(WELCOME_POPUP.key)) {
      popupBus.show({
        type: 'welcome',
        title: WELCOME_POPUP.title,
        description: WELCOME_POPUP.description,
        primaryLabel: WELCOME_POPUP.primaryLabel,
        secondaryLabel: WELCOME_POPUP.secondaryLabel,
        onPrimary: () => document.getElementById('pdf-tools')?.scrollIntoView({ behavior: 'smooth' }),
        onSecondary: () => openTemplates(),
      });
      markPopupSeen(WELCOME_POPUP.key);
    }
    const a = ANNOUNCEMENT_POPUP;
    const now = Date.now();
    const inWindow = (!a.startDate || new Date(a.startDate).getTime() <= now)
      && (!a.endDate || new Date(a.endDate).getTime() >= now);
    if (a.enabled && a.title && inWindow && !popupSeen(a.key)) {
      popupBus.show({ type: 'announcement', ...a });
      markPopupSeen(a.key);
    }
    popupBus.actions.openTool = openTool;
    popupBus.actions.openTemplates = openTemplates;
    popupBus.actions.openCategory = openKitCategory;
  }, []);

  // Global search — every category, every tool. Broad terms ("image",
  // "photo", "pdf"…) list every related service with no result cap.
  const globalResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const all = searchTools(q);
    return broadSearchSlug(q) ? all : all.slice(0, 16);
  }, [searchQuery]);

  const openSearchResult = (r) => {
    setSearchQuery('');
    if (r.kind === 'PDF') openTool(r.id);
    else {
      const [cat, tool] = r.path.replace(/^\//, '').split('/');
      openKitTool(cat, tool);
    }
  };

  // Homepage category cards — front door, not the warehouse
  const homepageCategories = [
    { slug: 'pdf-tools', name: 'PDF Tools', icon: FileText, accent: 'text-rose-600', chipBg: 'bg-rose-50', tagline: 'Merge, split, convert & edit', count: PDF_CAT.tools.length, action: 'cat' },
    ...KIT_CATEGORIES.map((c) => ({
      slug: c.slug, name: c.name, icon: c.icon, accent: c.accent, chipBg: c.chipBg, tagline: c.desc.split('—')[0].split('-')[0].trim(),
      count: c.tools.length, action: 'cat',
    })),
    { slug: 'templates', name: 'Templates', icon: LayoutTemplate, accent: 'text-blue-600', chipBg: 'bg-blue-50', tagline: 'Resumes, invoices, letters & more', count: tplData?.templates?.length || 176, action: 'templates' },
  ];
  const openHomepageCategory = (c) =>
    c.action === 'templates' ? openTemplates() : c.action === 'creator' ? openCreator() : openKitCategory(c.slug);

  // Popular tools — small curated homepage set (PDF tools already shown above)
  const popularTools = KIT_CATEGORIES.flatMap((c) =>
    c.tools.filter((t) => t.popular).map((t) => ({ kind: c.name, cat: c.slug, id: t.id, name: t.name, desc: t.desc }))
  ).slice(0, 12);

  // Hero stats shown in the CTA + steps
  const totalTools = PDF_CATEGORIES.flatMap((c) => c.tools).length + KIT_CATEGORIES.flatMap((c) => c.tools).length;

  const revealRef = useReveal([searchQuery, activeCat]);

  const handleLaunchStudio = (tool, sessionData) => {
    navRef.current = true;
    setModalSeed(null);
    setActiveModalTool(null);
    setActiveStudioSession({
      tool,
      files: sessionData.files || [],
      imageCards: sessionData.imageCards || [],
      htmlCode: sessionData.htmlCode || '',
      htmlMode: sessionData.htmlMode || 'file'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stepwise back from workspace -> tool upload modal (previous history entry)
  const handleStudioBack = () => {
    window.history.back();
  };

  // ---------- Kit category / tool pages + Document Creator ----------
  if (kitRoute) {
    let kitContent;
    if (kitRoute.cat === 'ai') {
      kitContent = (
        <AssistantPage
          onOpenPdfTool={openAssistantPdfTool}
          onOpenTemplates={openTemplates}
          onOpenCreator={openCreator}
          onOpenCategory={openKitCategory}
          onOpenKitTool={openKitTool}
        />
      );
    } else if (kitRoute.cat === 'document-creator') {
      kitContent = <DocumentCreator onHome={goHome} onTemplates={() => openTemplates()} />;
    } else {
      const isPdf = kitRoute.cat === 'pdf-tools';
      const cat = isPdf ? PDF_CAT : findKitCategory(kitRoute.cat);
      const tool = kitRoute.tool ? (isPdf ? cat.tools.find((t) => t.id === kitRoute.tool) : findKitTool(kitRoute.cat, kitRoute.tool).tool) : null;
      kitContent = !cat ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <p className="text-sm font-bold text-slate-500">Category not found</p>
          <button onClick={goHome} className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer">← Back home</button>
        </div>
      ) : tool && !isPdf ? (
        <ToolPage
          category={cat}
          tool={tool}
          onHome={goHome}
          onOpenCategory={openKitCategory}
          onOpenTool={(c, t) => openKitTool(c.slug, t.id)}
        />
      ) : (
        <CategoryPage
          category={cat}
          onHome={goHome}
          onOpenCategory={openKitCategory}
          onOpenTool={(c, t) => (c.slug === 'pdf-tools' ? openTool(t) : openKitTool(c.slug, t.id))}
        />
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col justify-between">
        <div>
          <Header
            onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates}
            onOpenCategory={openKitCategory} onOpenKitTool={openKitTool} onCreator={openCreator} onAssistant={openAssistant}
          />
          {kitContent}
        </div>
        <Footer onSelectTool={openTool} />
      </div>
    );
  }

  // ---------- Templates pages (rendered inside the site shell) ----------
  if (tplRoute) {
    const currentTpl = tplData ? findTemplate(tplData, tplRoute.cat, tplRoute.slug) : null;

    let tplContent;
    if (!tplData) {
      tplContent = (
        <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
          Loading templates…
        </div>
      );
    } else if (tplRoute.view === 'editor' && currentTpl) {
      tplContent = (
        <TemplateEditor
          tpl={currentTpl}
          onBack={() => {
            navRef.current = true;
            setTplRoute({ view: 'detail', cat: tplRoute.cat, slug: tplRoute.slug });
          }}
        />
      );
    } else if (tplRoute.view === 'detail') {
      tplContent = !currentTpl ? (
        <div className="min-h-[60vh] bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-400">
          <p className="text-sm font-bold text-slate-500">Template not found</p>
          <button onClick={openTemplates} className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer">
            ← Browse all templates
          </button>
        </div>
      ) : (
        <TemplateDetail
          tpl={currentTpl}
          allTemplates={tplData.templates}
          onUse={editTemplate}
          onPreview={previewTemplate}
          onBack={openTemplates}
        />
      );
    } else {
      tplContent = (
        <TemplatesHub
          key={tplRoute.cat || 'all'}
          categorySlug={tplRoute.cat}
          onPreview={previewTemplate}
          onUse={editTemplate}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col justify-between">
        <div>
          <Header
            onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates}
            onOpenCategory={openKitCategory} onOpenKitTool={openKitTool} onCreator={openCreator} onAssistant={openAssistant}
          />
          {tplContent}
        </div>
        <Footer onSelectTool={openTool} />
      </div>
    );
  }

  // If a tool session is active, render the dedicated full-screen studio
  if (activeStudioSession) {
    return (
      <ToolStudio
        tool={activeStudioSession.tool}
        initialFiles={activeStudioSession.files}
        initialImageCards={activeStudioSession.imageCards}
        initialHtmlCode={activeStudioSession.htmlCode}
        initialHtmlMode={activeStudioSession.htmlMode}
        onBack={handleStudioBack}
        onHome={goHome}
        onSwitchTool={(toolId) => {
          const target = findToolById(toolId);
          if (!target) return;
          navRef.current = true;
          setActiveStudioSession((prev) =>
            prev
              ? {
                  tool: target,
                  files: prev.files,
                  imageCards: prev.imageCards,
                  htmlCode: prev.htmlCode,
                  htmlMode: prev.htmlMode,
                }
              : prev
          );
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col justify-between">
      <div>
        <Header
          onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates}
          onOpenCategory={openKitCategory} onOpenKitTool={openKitTool} onCreator={openCreator} onAssistant={openAssistant}
        />

        {/* Hero — slim: title + search, tools start right away */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center pt-6 pb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pf-rise" style={{ '--d': '0ms' }}>
            Free Online PDF Tools — <span className="text-rose-500">Merge, Compress & Convert</span>
          </h1>
          <div className="mt-4 max-w-xl mx-auto relative pf-rise" style={{ '--d': '80ms' }}>
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-rose-500" />
            <input
              type="text"
              role="searchbox"
              aria-label="Search all tools"
              placeholder="Search any tool (e.g. Merge, Compress, Image, QR Code)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
              className="peer w-full pl-12 pr-10 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:shadow-md transition-all text-sm text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* AI Assistant lives in the floating bubble (bottom-right) */}

        {/* Search results (global — all categories) */}
        {searchQuery.trim() ? (
          <main id="pdf-tools" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              {globalResults.length} {globalResults.length === 1 ? 'tool' : 'tools'} for "{searchQuery}"
            </h2>
            {globalResults.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No tools match — try another keyword.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                {globalResults.map((r, i) => (
                  <button
                    key={`${r.kind}-${r.id}`}
                    onClick={() => openSearchResult(r)}
                    style={{ '--d': `${Math.min(i * 30, 240)}ms` }}
                    className="pf-rise pf-press pf-card group bg-white border border-slate-200 rounded-2xl p-4 text-left hover:shadow-md hover:border-rose-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-slate-800 group-hover:text-rose-600 transition-colors">{r.name}</p>
                      <ArrowRight className="w-3.5 h-3.5 text-rose-500 pf-arrow shrink-0" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.desc}</p>
                    <span className="mt-2 inline-block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{r.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </main>
        ) : (
          /* PDF tools first — the core product — then categories */
          <main id="pdf-tools" ref={revealRef} className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-8">
            {/* PDF tools — iLovePDF-style filter pills + flat grid */}
            <section>
              <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 mb-5 bg-slate-50/90 backdrop-blur-md" data-reveal>
                <div className="flex gap-1.5 overflow-x-auto pf-scroll-x">
                  {['All', ...PDF_CATEGORIES.map((c) => c.title)].map((title) => (
                    <button
                      key={title}
                      onClick={() => setActiveCat(title)}
                      aria-pressed={activeCat === title}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        activeCat === title
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {(activeCat === 'All'
                  ? PDF_CATEGORIES.flatMap((c) => c.tools)
                  : PDF_CATEGORIES.find((c) => c.title === activeCat)?.tools || []
                ).map((tool, i) => (
                  <div key={tool.id} data-reveal className="h-full" style={{ '--reveal-delay': `${Math.min(i * 25, 400)}ms` }}>
                    <ToolCard tool={tool} onSelect={openTool} />
                  </div>
                ))}
              </div>
            </section>

            {/* All other tool categories */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">More Tools — Categories</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {homepageCategories.map((c, i) => (
                  <button
                    key={c.slug}
                    data-reveal
                    style={{ '--reveal-delay': `${Math.min(i * 40, 400)}ms` }}
                    onClick={() => openHomepageCategory(c)}
                    className="pf-card pf-press group bg-white border border-slate-200 rounded-2xl p-4 text-left hover:shadow-lg hover:border-rose-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`inline-flex w-9 h-9 rounded-xl ${c.chipBg} ${c.accent} items-center justify-center transition-transform group-hover:scale-105`}>
                        <c.icon className="w-5 h-5" strokeWidth={2} />
                      </span>
                      <ArrowRight className="w-4 h-4 text-rose-500 pf-arrow mt-1" />
                    </div>
                    <p className="mt-2 font-bold text-sm text-slate-800 group-hover:text-rose-600 transition">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{c.tagline}</p>
                    <p className="mt-2 text-[10px] font-black text-rose-500 uppercase tracking-wide">
                      {c.count} {c.count === 1 ? 'tool' : 'tools'}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Popular tools — small curated set only */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Popular Tools</h2>
                <button onClick={() => openKitCategory('pdf-tools')} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer">
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4">
                {popularTools.map((p, i) => (
                  <button
                    key={p.id}
                    data-reveal
                    style={{ '--reveal-delay': `${Math.min(i * 40, 400)}ms` }}
                    onClick={() => openKitTool(p.cat, p.id)}
                    className="pf-card pf-press group bg-white border border-slate-200 rounded-2xl p-4 text-left hover:shadow-md hover:border-rose-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-slate-800 group-hover:text-rose-600 transition">{p.name}</p>
                      <ArrowRight className="w-3.5 h-3.5 text-rose-500 pf-arrow shrink-0" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{p.desc}</p>
                    <span className="mt-2 inline-block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{p.kind}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Why PDF Forge — trust feature strip */}
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  [Zap, 'Instant Results', 'Tools run in seconds — most never leave your browser, no waiting rooms.'],
                  [ShieldCheck, 'Private by Design', 'In-memory processing. Your files are never uploaded and never stored.'],
                  [BadgeCheck, 'Free Forever', 'Every tool, every template — no signup, no watermark, no paywall.'],
                  [LayoutTemplate, 'All-in-One Suite', 'PDF, image, document and business tools plus 175+ pro templates.'],
                ].map(([Icon, title, text], i) => (
                  <div
                    key={title}
                    data-reveal
                    style={{ '--reveal-delay': `${Math.min(i * 60, 240)}ms` }}
                    className="pf-card bg-white border border-slate-200 rounded-2xl p-4"
                  >
                    <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white items-center justify-center shadow-md shadow-rose-500/20">
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </span>
                    <p className="mt-2.5 font-bold text-sm text-slate-800">{title}</p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section className="relative">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">How It Works</h2>
              <div className="relative grid sm:grid-cols-3 gap-3">
                <div className="hidden sm:block absolute top-6 left-[20%] right-[20%] h-px bg-gradient-to-r from-rose-200 via-indigo-200 to-rose-200" />
                {[
                  [MousePointerClick, 'Pick a tool', `${totalTools}+ tools for PDFs, images, documents and more — search or browse.`],
                  [Upload, 'Drop your files', 'Drag & drop or paste. Everything processes in memory, right in your browser.'],
                  [Download, 'Get your file', 'Instant results — download as PDF, image, ZIP or copy to clipboard.'],
                ].map(([Icon, title, text], i) => (
                  <div key={title} data-reveal style={{ '--reveal-delay': `${i * 100}ms` }} className="relative text-center px-4">
                    <span className="relative z-10 inline-flex w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm items-center justify-center text-rose-500">
                      <Icon className="w-5 h-5" strokeWidth={2} />
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                    </span>
                    <p className="mt-2.5 font-bold text-sm text-slate-800">{title}</p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed max-w-[16rem] mx-auto">{text}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>
        )}

        {/* Popular Templates */}
        {tplData && (
          <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pf-slide-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Free Document Templates
              </h2>
              <button
                onClick={() => openTemplates()}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                View All Templates <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Resume templates, invoice templates, cover letters, contracts, receipts & business forms — fill online and download as PDF.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
              {tplData.templates.filter((t) => t.featured).slice(0, 8).map((t) => (
                <TemplateCard
                  key={t.id}
                  tpl={t}
                  onPreview={() => previewTemplate(t)}
                  onUse={() => editTemplate(t)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Final CTA banner */}
        {!searchQuery.trim() && (
          <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-rose-600 to-indigo-700 px-6 sm:px-12 py-10 text-center text-white shadow-xl">
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Ready to get it done?</h2>
                <p className="mt-2 text-sm text-rose-100 max-w-xl mx-auto">
                  {totalTools}+ free tools and {tplData?.templates?.length || 176}+ templates. No account, no watermark — pick a task and go.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    onClick={() => document.getElementById('pdf-tools')?.scrollIntoView({ behavior: 'smooth' })}
                    className="pf-press inline-flex items-center gap-2 bg-white text-rose-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-rose-50 transition shadow-md cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Browse PDF Tools
                  </button>
                  <button
                    onClick={() => openTemplates()}
                    className="pf-press inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/20 transition cursor-pointer"
                  >
                    <LayoutTemplate className="w-4 h-4" /> Explore Templates
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <Reviews />
      </div>

      <Footer onSelectTool={openTool} />

      {/* Floating AI Assistant bubble — help on demand, off the main flow */}
      <button
        onClick={openAssistant}
        aria-label="Open AI Assistant"
        title="AI Assistant — describe a task, get it done"
        className="pf-press pf-pop fixed bottom-5 right-5 z-40 group flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xl shadow-slate-900/25 border border-white/10 hover:shadow-2xl hover:from-slate-800 hover:to-indigo-900 transition cursor-pointer"
      >
        <span className="relative flex">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-slate-900" />
        </span>
        <span className="text-xs font-bold leading-none">Ask AI</span>
      </button>

      {/* Upload & Security Modal */}
      {activeModalTool && (
        <ToolModal
          tool={activeModalTool}
          onClose={() => {
            navRef.current = true;
            setModalSeed(null);
            setActiveModalTool(null);
            restoreHomeScroll();
          }}
          onLaunchStudio={handleLaunchStudio}
          initialFiles={modalSeed?.files}
          initialImageCards={modalSeed?.imageCards}
          initialHtmlCode={modalSeed?.htmlCode}
          initialHtmlMode={modalSeed?.htmlMode}
        />
      )}
    </div>
  );
}
