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
import { PDF_CATEGORIES } from './data/pdfTools';
import { ArrowRight, FileText, LayoutTemplate, Zap, ShieldCheck, BadgeCheck, MousePointerClick, Upload, Download } from 'lucide-react';
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
import { useT } from './i18n/index.jsx';

const CAT_KEY = {
  'Organize PDF': 'cat_organize', 'Optimize PDF': 'cat_optimize',
  'Convert to PDF': 'cat_to', 'Convert from PDF': 'cat_from',
  'Edit PDF': 'cat_edit', 'PDF Security': 'cat_security', 'PDF Intelligence': 'cat_intel',
};

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
  const t = useT();
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
  //   /ilovetopdf/<tool>                         -> upload modal
  //   /ilovetopdf/<tool>/workspace               -> editing workspace
  //   /ilovetopdf/templates[/cat[/slug[/edit]]]  -> templates pages
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
      if (!tool) {
        restoreHomeScroll();
        // Unknown/junk paths under the base (e.g. legacy /pdf-forge/) →
        // normalize the address bar to the clean homepage URL.
        if (rel) window.history.replaceState(null, '', BASE_URL);
      }
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
    setActiveCat('All');
    setSearchQuery('');
    // Logo/home nav always lands at the top — scroll restore is only for
    // browser back/forward (handled in syncFromUrl).
    homeScrollRef.current = 0;
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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

  // Hero stats shown in the CTA + steps
  const totalTools = PDF_CATEGORIES.flatMap((c) => c.tools).length;

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
      <div className="min-h-screen bg-[#f6f4f9] text-slate-800 font-sans antialiased flex flex-col justify-between">
        <div>
          <Header
            onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates}
            onOpenCategory={openKitCategory} onOpenKitTool={openKitTool} onCreator={openCreator} onAssistant={openAssistant}
          />
          {kitContent}
        </div>
        <Footer onSelectTool={openTool} onOpenCategory={openKitCategory} />
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
      <div className="min-h-screen bg-[#f6f4f9] text-slate-800 font-sans antialiased flex flex-col justify-between">
        <div>
          <Header
            onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates}
            onOpenCategory={openKitCategory} onOpenKitTool={openKitTool} onCreator={openCreator} onAssistant={openAssistant}
          />
          {tplContent}
        </div>
        <Footer onSelectTool={openTool} onOpenCategory={openKitCategory} />
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
    <div className="min-h-screen bg-[#f6f4f9] text-slate-800 font-sans antialiased flex flex-col justify-between">
      <div>
        <Header
          onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates}
          onOpenCategory={openKitCategory} onOpenKitTool={openKitTool} onCreator={openCreator} onAssistant={openAssistant}
        />

        {/* Hero — iLovePDF style: compact title + subline, pills right below */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center pt-10 pb-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight pf-rise" style={{ '--d': '0ms' }}>
            {t('hero_title')}
          </h1>
        </section>

        {/* AI Assistant lives in the floating bubble (bottom-right) */}

        {/* Search results (global — all categories) */}
        {searchQuery.trim() ? (
          <main id="pdf-tools" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
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
                    className="pf-rise pf-press pf-card group bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-lg hover:border-rose-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-[15px] text-slate-800 group-hover:text-rose-600 transition-colors">{r.name}</p>
                      <ArrowRight className="w-3.5 h-3.5 text-rose-500 pf-arrow shrink-0" />
                    </div>
                    <p className="mt-1.5 text-[13px] text-slate-500 line-clamp-2">{r.desc}</p>
                    <span className="mt-2.5 inline-block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{r.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </main>
        ) : (
          /* PDF tools first — the core product — then categories */
          <main id="pdf-tools" ref={revealRef} className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-14">
            {/* PDF tools — iLovePDF flat hairline grid: one bordered table of cells */}
            <section>
              <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 mb-5 bg-[#f6f4f9]/95 backdrop-blur-md" data-reveal>
                <div className="flex gap-2.5 overflow-x-auto pf-scroll-x justify-start sm:justify-center">
                  {['All', ...PDF_CATEGORIES.map((c) => c.title)].map((title) => (
                    <button
                      key={title}
                      onClick={() => setActiveCat(title)}
                      aria-pressed={activeCat === title}
                      className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold border transition cursor-pointer ${
                        activeCat === title
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {title === 'All' ? t('tab_all') : t(CAT_KEY[title] || title)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
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

            {/* Work your way — 3-step explainer */}
            <section className="border-t border-slate-100 pt-12">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('sec_work')}</h2>
                <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">{t('sec_work_sub')}</p>
              </div>
              <div className="relative grid sm:grid-cols-3 gap-5">
                {/* connector line behind the step badges */}
                <div className="hidden sm:block absolute top-9 left-[16%] right-[16%] h-px border-t border-dashed border-rose-200" />
                {[
                  [MousePointerClick, 'w1t', 'w1d'],
                  [Upload, 'w2t', 'w2d'],
                  [Download, 'w3t', 'w3d'],
                ].map(([Icon, title, text], i) => (
                  <div key={title} data-reveal style={{ '--reveal-delay': `${i * 100}ms` }}
                    className="pf-card relative bg-white border border-slate-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-rose-200 transition">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex w-12 h-12 rounded-xl bg-rose-600 items-center justify-center text-white shadow-md shadow-rose-600/25">
                        <Icon className="w-6 h-6" strokeWidth={1.75} />
                      </span>
                      <span className="text-[11px] font-black tracking-widest text-rose-500 uppercase">
                        {t('step_w')} {i + 1}
                      </span>
                    </div>
                    <p className="mt-4 font-bold text-base text-slate-900">{t(title)}</p>
                    <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{t(text)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Image tools promo — iLovePDF's iLoveIMG block */}


            {/* Trusted by — iLovePDF's "trusted by millions" block + badges */}
            <section className="border-t border-slate-100 pt-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('trusted_title')}</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed max-w-2xl mx-auto">
                {t('trusted_desc')}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {[
                  [ShieldCheck, 'b_private'],
                  [BadgeCheck, 'b_https'],
                  [Zap, 'b_browser'],
                  [LayoutTemplate, 'b_free'],
                ].map(([Icon, label]) => (
                  <span key={label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600">
                    <Icon className="w-4 h-4 text-rose-600" />
                    {t(label)}
                  </span>
                ))}
              </div>
            </section>
          </main>
        )}

        {/* Final CTA banner */}
        {!searchQuery.trim() && (
          <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-rose-600 to-indigo-700 px-6 sm:px-12 py-10 text-center text-white shadow-xl">
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{t('cta_title')}</h2>
                <p className="mt-2 text-sm text-rose-100 max-w-xl mx-auto">
                  {totalTools}+ {t('tools_w')}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    onClick={() => openKitCategory('pdf-tools')}
                    className="pf-press inline-flex items-center gap-2 bg-white text-rose-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-rose-50 transition shadow-md cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> {t('cta_browse')}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Parent company — AASTACK */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl px-6 sm:px-12 py-8 text-center shadow-sm" data-reveal>
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-slate-100 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-rose-50 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-500">{t('aa_kicker')}</p>
              <a
                href="https://aastack.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 hover:opacity-75 transition"
                title="aastack.com"
              >
                <img
                  src={`${import.meta.env.BASE_URL}aastack-logo.png`}
                  alt="AASTACK — Apps · Websites · AI · Software"
                  className="h-20 sm:h-28 w-auto mx-auto"
                />
              </a>
              <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
                {t('aa_desc')}
              </p>
              <a
                href="https://aastack.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="pf-press mt-5 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-md"
              >
                {t('aa_btn')} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        <Reviews />
      </div>

      <Footer onSelectTool={openTool} onOpenCategory={openKitCategory} />

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
