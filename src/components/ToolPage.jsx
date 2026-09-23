import React, { useMemo } from 'react';
import { ChevronRight, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import TextTool from './toolkit/TextTool';
import CalcTool from './toolkit/CalcTool';
import ConvertTool from './toolkit/ConvertTool';
import GenerateTool from './toolkit/GenerateTool';
import QrTool from './toolkit/QrTool';
import ColorTool from './toolkit/ColorTool';
import ImageTool from './toolkit/ImageTool';
import FileTool from './toolkit/FileTool';
import SeoTool from './toolkit/SeoTool';
import AiTool from './toolkit/AiTool';
import SpeechTool from './toolkit/SpeechTool';
import { useSeo } from './toolkit/utils';

export const ENGINES = {
  text: TextTool, calc: CalcTool, convert: ConvertTool, generate: GenerateTool,
  qr: QrTool, color: ColorTool, image: ImageTool, file: FileTool,
  seo: SeoTool, ai: AiTool, speech: SpeechTool,
};

const DEFAULT_FAQS = (name) => [
  { q: `Is ${name} free?`, a: `Yes — ${name} is completely free, with no signup and no limits.` },
  { q: 'Are my files uploaded?', a: 'No. Processing happens locally in your browser — your files never leave your device.' },
  { q: `How do I use ${name}?`, a: `Open the tool, provide your input, run it, then copy or download the result.` },
];

/**
 * Reusable individual tool page — engine interface + SEO content blocks.
 */
export default function ToolPage({ category, tool, onHome, onOpenCategory, onOpenTool }) {
  const Engine = ENGINES[tool.engine];
  const related = useMemo(
    () => category.tools.filter((t) => t.id !== tool.id).slice(0, 6),
    [category, tool]
  );
  const faqs = tool.faqs || DEFAULT_FAQS(tool.name);

  useSeo({
    title: `${tool.name} — Free Online | PDF Forge`,
    description: tool.desc,
    slug: `${category.slug}/${tool.id}`,
  });

  const steps = tool.howto || [
    'Provide your input — type, paste or drop a file.',
    `Click "${tool.def?.action || 'Run'}" to process instantly in your browser.`,
    'Copy or download the result — done.',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-6 flex-wrap pf-rise" style={{ '--d': '0ms' }}>
        <button onClick={onHome} className="hover:text-rose-500 transition cursor-pointer">Home</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => onOpenCategory(category.slug)} className="hover:text-rose-500 transition cursor-pointer">{category.name}</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-600">{tool.name}</span>
      </nav>

      {/* Header — themed by category */}
      <div className={`relative overflow-hidden rounded-3xl ${category.chipBg || 'bg-slate-50'} border border-slate-200 p-5 sm:p-7 mb-6 pf-rise`} style={{ '--d': '60ms' }}>
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/40 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <span className={`w-12 h-12 rounded-2xl bg-white ${category.accent || 'text-rose-600'} shadow-sm flex items-center justify-center shrink-0`}>
            {category.icon ? <category.icon className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{tool.name}</h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">{tool.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-full">100% Free</span>
              <span className="text-[10px] font-bold text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-full">No signup</span>
              <span className="text-[10px] font-bold text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-full">
                {tool.engine === 'ai' ? 'AI-assisted' : 'Runs in your browser'}
              </span>
              <span className={`text-[10px] font-bold ${category.accent || 'text-rose-600'} bg-white/80 border border-slate-200 px-2.5 py-1 rounded-full`}>{category.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool interface */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm mb-10 pf-rise" style={{ '--d': '120ms' }}>
        {Engine ? <Engine def={{ ...tool.def, id: tool.id }} /> : <p className="text-sm text-slate-400">Tool coming soon.</p>}
      </div>

      {/* How to use + Features */}
      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">How to use</h2>
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl p-3">
                <span className={`shrink-0 w-6 h-6 rounded-full ${category.chipBg || 'bg-rose-50'} ${category.accent || 'text-rose-600'} text-xs font-black flex items-center justify-center mt-0.5`}>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Features</h2>
          <ul className="space-y-2.5">
            {(tool.features || ['100% free, no signup', 'Runs locally — private by design', 'Instant results', 'Works on any device']).map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" /> FAQ
        </h2>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <details key={i} className="faq group bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 transition-colors hover:border-slate-300">
              <summary className="text-sm font-bold text-slate-700 cursor-pointer list-none flex items-center justify-between">
                {f.q}
                <span className="faq-plus text-slate-300 text-lg leading-none">+</span>
              </summary>
              <p className="faq-body mt-2 text-sm text-slate-500 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related tools */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Related tools</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {related.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTool(category, t)}
              className="group bg-white border border-slate-200 rounded-2xl p-4 text-left transition hover:shadow-md hover:border-rose-200 cursor-pointer"
            >
              <p className="font-bold text-sm text-slate-800 group-hover:text-rose-600 transition">{t.name}</p>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.desc}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
