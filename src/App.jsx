import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { Search, Lock, Sparkles, Server, ArrowRight } from 'lucide-react';
import { fetchTemplates, findTemplate } from './utils/templatesApi';

const BASE_URL = import.meta.env.BASE_URL || '/';

const findToolById = (id) =>
  PDF_CATEGORIES.flatMap((c) => c.tools).find((t) => t.id === id) || null;

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalTool, setActiveModalTool] = useState(null);
  const [activeStudioSession, setActiveStudioSession] = useState(null);
  const [modalSeed, setModalSeed] = useState(null);
  const studioSessionRef = useRef(null);
  const homeScrollRef = useRef(0);
  // tplRoute: null | {view:'templates'|'detail'|'editor', cat, slug}
  const [tplRoute, setTplRoute] = useState(null);
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
    if (tplRoute) {
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
  }, [activeModalTool, activeStudioSession, tplRoute]);

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
        if (sub === 'edit' && slug) setTplRoute({ view: 'editor', cat, slug });
        else if (slug) setTplRoute({ view: 'detail', cat, slug });
        else setTplRoute({ view: 'templates', cat: cat || null });
        return;
      }
      setTplRoute(null);

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
    navRef.current = true;
    homeScrollRef.current = window.scrollY;
    setTplRoute(null);
    setActiveModalTool(tool);
  };

  const goHome = () => {
    navRef.current = true;
    setActiveModalTool(null);
    setActiveStudioSession(null);
    setTplRoute(null);
    restoreHomeScroll();
  };

  // Templates navigation — `cat` may arrive as a click event, keep strings only
  const openTemplates = (cat = null) => {
    navRef.current = true;
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

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return PDF_CATEGORIES;
    const query = searchQuery.toLowerCase();
    return PDF_CATEGORIES.map((category) => ({
      ...category,
      tools: category.tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.desc.toLowerCase().includes(query)
      ),
    })).filter((category) => category.tools.length > 0);
  }, [searchQuery]);

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
          <Header onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates} />
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
        <Header onSelectTool={openTool} onHome={goHome} onTemplates={openTemplates} />

        {/* Hero Section */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-full text-xs font-bold mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete PDF & Office Utility Suite</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Every tool you need to work with <span className="text-rose-500">PDFs</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Fast, secure, and open-source. For tools requiring server-level conversion engines, files are processed ephemerally and never saved to any database.
          </p>

          {/* Privacy Notice Pill */}
          <div className="mt-4 inline-flex items-center space-x-2 text-xs text-slate-500 bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-sm">
            <Server className="w-3.5 h-3.5 text-blue-500" />
            <span>Ephemeral In-Memory Processing</span>
            <span className="text-slate-300">•</span>
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>No Files Stored</span>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search any tool (e.g. Merge, Compress, Word to PDF, Rotate)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition text-sm text-slate-800 placeholder-slate-400"
            />
          </div>
        </section>

        {/* Grid Suite */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-12">
          {filteredCategories.map((category) => (
            <div key={category.title} className="space-y-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {category.title}
                </h2>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onSelect={openTool}
                  />
                ))}
              </div>
            </div>
          ))}
        </main>

        {/* Popular Templates */}
        {tplData && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Popular Templates
              </h2>
              <button
                onClick={() => openTemplates()}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                View All Templates <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

        <Reviews />
      </div>

      <Footer onSelectTool={openTool} />

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
