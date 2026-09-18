import { useMemo } from 'react';
import { Eye, PencilLine, Flame } from 'lucide-react';
import TemplateDoc from './TemplateDoc';
import { sampleValues } from '../utils/templateValues';

// Live miniature: the real TemplateDoc scaled down inside the card frame.
const MiniDoc = ({ tpl }) => {
  const sample = useMemo(() => sampleValues(tpl), [tpl]);
  return (
    <div
      className="absolute top-0 left-0 pointer-events-none select-none"
      style={{ width: '250%', transform: 'scale(0.4)', transformOrigin: 'top left' }}
    >
      <TemplateDoc tpl={tpl} values={sample} />
    </div>
  );
};

export default function TemplateCard({ tpl, onPreview, onUse }) {
  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-rose-200 transition flex flex-col">
      <div className="relative aspect-[4/3] bg-slate-50 border-b border-slate-100 overflow-hidden">
        <MiniDoc tpl={tpl} />
        {tpl.featured && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
            <Flame className="w-3 h-3" /> POPULAR
          </span>
        )}
        <button
          onClick={onPreview}
          className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <span className="flex items-center gap-1.5 bg-white text-slate-800 text-xs font-bold px-4 py-2 rounded-xl shadow">
            <Eye className="w-4 h-4" /> Preview
          </span>
        </button>
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-bold text-slate-800 leading-snug">{tpl.name}</h3>
        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed flex-1">{tpl.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{tpl.categoryName}</span>
          <button
            onClick={onUse}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <PencilLine className="w-3.5 h-3.5" /> Use Template
          </button>
        </div>
      </div>
    </div>
  );
}
