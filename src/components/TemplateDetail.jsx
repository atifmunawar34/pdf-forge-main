import { useEffect, useMemo } from 'react';
import { PencilLine, ShieldAlert, ChevronRight } from 'lucide-react';
import { sampleValues } from '../utils/templateValues';
import { trackTemplate } from '../utils/templatesApi';
import TemplateDoc from './TemplateDoc';
import TemplateCard from './TemplateCard';

export default function TemplateDetail({ tpl, allTemplates, onUse, onPreview, onBack }) {
  const sample = useMemo(() => sampleValues(tpl), [tpl]);

  // SEO: title, meta description, canonical, OG + FAQ structured data
  useEffect(() => {
    const prevTitle = document.title;
    const title = tpl.seoTitle || `${tpl.name} Template — PDF Forge`;
    const desc = tpl.seoDescription || tpl.description;
    const url = `https://atifmunawar34.github.io/pdf-forge/templates/${tpl.category}/${tpl.slug}`;
    document.title = title;

    const setMeta = (sel, attr, content) => {
      let el = document.querySelector(sel);
      const prev = el?.getAttribute('content');
      if (!el) {
        el = document.createElement('meta');
        if (sel.includes('name=')) el.setAttribute('name', sel.match(/name="([^"]+)"/)?.[1]);
        else el.setAttribute('property', sel.match(/property="([^"]+)"/)?.[1]);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
      return () => { if (prev != null) el.setAttribute('content', prev); };
    };
    const restores = [
      setMeta('meta[name="description"]', 'content', desc),
      setMeta('meta[property="og:title"]', 'content', title),
      setMeta('meta[property="og:description"]', 'content', desc),
      setMeta('meta[property="og:url"]', 'content', url),
    ];

    // canonical link for this template URL
    let canon = document.querySelector('link[rel="canonical"]');
    const prevCanon = canon?.getAttribute('href');
    if (!canon) {
      canon = document.createElement('link');
      canon.setAttribute('rel', 'canonical');
      document.head.appendChild(canon);
    }
    canon.setAttribute('href', url);

    // FAQPage structured data (rich results)
    let faqScript = null;
    if (tpl.faqs?.length) {
      faqScript = document.createElement('script');
      faqScript.type = 'application/ld+json';
      faqScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: tpl.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
      document.head.appendChild(faqScript);
    }

    trackTemplate(tpl.id, 'view');
    return () => {
      document.title = prevTitle;
      restores.forEach((r) => r());
      if (prevCanon != null) canon.setAttribute('href', prevCanon);
      if (faqScript) faqScript.remove();
    };
  }, [tpl]);

  const related = useMemo(
    () => allTemplates.filter((t) => t.category === tpl.category && t.id !== tpl.id).slice(0, 4),
    [allTemplates, tpl]
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold mb-5">
          <button onClick={onBack} className="hover:text-rose-500 cursor-pointer">Templates</button>
          <ChevronRight className="w-3 h-3" />
          <span>{tpl.categoryName}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-600">{tpl.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* preview */}
          <div className="max-w-[700px] mx-auto w-full">
            <TemplateDoc tpl={tpl} values={sample} />
          </div>

          {/* info panel */}
          <aside className="space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
                {tpl.categoryName}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 leading-tight">
                {tpl.name} — Free Template
              </h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{tpl.description}</p>
            </div>

            <button
              onClick={() => onUse(tpl)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-sm transition shadow-md shadow-rose-500/25 cursor-pointer"
            >
              <PencilLine className="w-5 h-5" /> Use This Template — Free
            </button>
            <p className="text-[11px] text-slate-400 text-center -mt-2">
              Fill the fields online → download as PDF or print
            </p>

            {tpl.disclaimer && (
              <div className="flex gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 leading-relaxed">{tpl.disclaimer}</p>
              </div>
            )}

            {/* FAQ */}
            {tpl.faqs?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">FAQ</h2>
                {tpl.faqs.map((f, i) => (
                  <div key={i}>
                    <p className="text-xs font-bold text-slate-700">{f.q}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-sm font-black text-slate-800 mb-4">Related Templates</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((t) => (
                <TemplateCard key={t.id} tpl={t} onPreview={() => onPreview(t)} onUse={() => onUse(t)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
