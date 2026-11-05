// iLovePDF-style tool glyph: two overlapping rounded squares — light one
// behind, solid colored one in front carrying the tool's icon.
const PALETTE = {
  rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' },
  red: { 500: '#ef4444', 600: '#dc2626' },
  orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c' },
  amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
  yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04' },
  lime: { 500: '#84cc16', 600: '#65a30d' },
  green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
  emerald: { 500: '#10b981', 600: '#059669' },
  teal: { 500: '#14b8a6', 600: '#0d9488' },
  cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' },
  sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' },
  blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb' },
  indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5' },
  violet: { 500: '#8b5cf6', 600: '#7c3aed' },
  purple: { 500: '#a855f7', 600: '#9333ea' },
  fuchsia: { 500: '#d946ef', 600: '#c026d3' },
  pink: { 500: '#ec4899', 600: '#db2777' },
  slate: { 500: '#64748b', 600: '#475569' },
};

// 'text-rose-500' -> '#f43f5e'
function hexFromClass(cls) {
  const m = /text-(\w+)-(\d+)/.exec(cls || '');
  if (!m) return '#e11d48';
  return PALETTE[m[1]]?.[m[2]] || PALETTE[m[1]]?.[500] || '#e11d48';
}

export default function ToolGlyph({ icon: Icon, colorClass, size = 36 }) {
  const hex = hexFromClass(colorClass);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <span
        className="absolute rounded-[18%]"
        style={{ background: hex, opacity: 0.25, width: '72%', height: '72%', left: 0, top: 0 }}
      />
      <span
        className="absolute rounded-[18%] flex items-center justify-center text-white"
        style={{ background: hex, width: '72%', height: '72%', right: 0, bottom: 0 }}
      >
        {Icon && <Icon style={{ width: '58%', height: '58%' }} strokeWidth={2.25} />}
      </span>
    </span>
  );
}
