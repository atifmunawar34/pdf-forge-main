import ToolGlyph from './ToolGlyph';
import { useT } from '../i18n/index.jsx';
import { toolName, toolDesc } from '../i18n/tools.jsx';

export default function ToolCard({ tool, onSelect }) {
  useT(); // re-render on language change
  const isInactive = tool.inactive;

  return (
    <button
      onClick={() => !isInactive && onSelect(tool)}
      disabled={isInactive}
      className={`pf-press group relative w-full h-full min-h-[190px] text-left bg-white p-7 rounded-2xl border border-slate-200 transition-shadow duration-150 ${
        isInactive
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:shadow-lg hover:border-slate-300 cursor-pointer'
      }`}
    >
      {/* Dynamic Badge */}
      {tool.badge && (
        <span
          className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            tool.badge === 'Coming Soon'
              ? 'bg-slate-100 text-slate-600 border border-slate-200'
              : tool.badge === '90% Accurate'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {tool.badge}
        </span>
      )}

      <span className={`transition-transform ${!isInactive ? 'group-hover:scale-110' : ''}`}>
        <ToolGlyph icon={tool.icon} colorClass={tool.color} size={46} />
      </span>
      <h3
        className={`mt-4 font-bold text-base leading-snug ${
          !isInactive ? 'text-slate-900 group-hover:text-rose-600' : 'text-slate-500'
        } transition-colors`}
      >
        {toolName(tool)}
      </h3>
      <p className="mt-2 text-sm text-slate-500 leading-snug line-clamp-3">
        {toolDesc(tool)}
      </p>
    </button>
  );
}
