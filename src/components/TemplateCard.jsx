import { useMemo, useRef, useState, useEffect } from 'react';
import { Eye, PencilLine, Flame } from 'lucide-react';
import TemplateDoc from './TemplateDoc';
import { sampleValues } from '../utils/templateValues';

// Live miniature: the real TemplateDoc scaled to fit the whole page in the card.
const MiniDoc = ({ tpl }) => {
  const sample = useMemo(() => sampleValues(tpl), [tpl]);
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    const o = outerRef.current;
    const i = innerRef.current;
    if (!o || !i) return;
    const update = () => {
      const iw = i.offsetWidth;
      const ih = i.scrollHeight;
      if (iw && ih) setScale(Math.min(o.clientWidth / iw, o.clientHeight / ih) * 0.95);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [tpl]);

  return (
    <div ref={outerRef} className="absolute inset-0 overflow-hidden flex items-start justify-center pointer-events-none select-none bg-gradient-to-b from-slate-100 to-slate-200/70 p-3">
      <div
        ref={innerRef}
        className="shrink-0"
        style={{ width: 520, transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        <TemplateDoc tpl={tpl} values={sample} />
      </div>
    </div>
  );
};

export default function TemplateCard({ tpl, onPreview, onUse }) {
  return (
    <div
      onClick={onPreview}
      onKeyDown={(e) => e.key === 'Enter' && onPreview?.()}
      role="button"
      tabIndex={0}
      aria-label={`Open ${tpl.name} template`}
      className="pf-card group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-rose-200 cursor-pointer text-left transition"
    >
      {/* portrait preview — documents are A4 */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <MiniDoc tpl={tpl} />

        {!!tpl.featured && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 bg-amber-400/95 text-amber-950 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm">
            <Flame className="w-2.5 h-2.5" /> Popular
          </span>
        )}
        <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wide bg-slate-900/75 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
          {tpl.categoryName}
        </span>

        {/* hover overlay — gradient + actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5">
          <p className="text-white font-bold text-sm leading-snug drop-shadow">{tpl.name}</p>
          <p className="mt-0.5 text-[10px] text-slate-200/80 line-clamp-2">{tpl.description}</p>
          <div className="mt-2.5 flex gap-1.5 translate-y-1.5 group-hover:translate-y-0 transition-transform duration-200">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview?.(); }}
              className="flex-1 inline-flex items-center justify-center gap-1 bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold px-2.5 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            {onUse && (
              <button
                onClick={(e) => { e.stopPropagation(); onUse(); }}
                className="flex-1 inline-flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold px-2.5 py-2 rounded-lg shadow-md transition cursor-pointer"
              >
                <PencilLine className="w-3.5 h-3.5" /> Use
              </button>
            )}
          </div>
        </div>
      </div>

      {/* footer strip — always visible */}
      <div className="px-3.5 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">{tpl.name}</p>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-400">{tpl.docType}</span>
      </div>
    </div>
  );
}
