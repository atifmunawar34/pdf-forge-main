// Brand: ilovetopdf — red PDF icon with white heart + wordmark.
export function LogoIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* document with folded corner */}
      <path
        d="M10 2h17l14 14v26a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"
        fill="#f04b5e"
      />
      <path d="M27 2v10a4 4 0 0 0 4 4h10l-3-3L27 2z" fill="#d63a4c" />
      {/* heart */}
      <path
        d="M24 37c-6.6-4.8-11-8.6-11-13.3 0-3.2 2.4-5.7 5.7-5.7 2.1 0 4 1.2 5.3 3.3 1.3-2.1 3.2-3.3 5.3-3.3 3.3 0 5.7 2.5 5.7 5.7 0 4.7-4.4 8.5-11 13.3z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default function Logo({ dark = false, tagline = false, iconSize = 32, textClass = 'text-[20px]' }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LogoIcon size={iconSize} />
      <span className="flex flex-col leading-none">
        <span className={`font-extrabold tracking-tight ${textClass} ${dark ? 'text-white' : 'text-slate-900'}`}>
          iloveto<span className="text-[#f04b5e]">pdf</span>
        </span>
        {tagline && (
          <span className="mt-1 text-[8.5px] font-bold tracking-[0.3em] text-slate-400 uppercase">
            Edit &nbsp;•&nbsp; Compress &nbsp;•&nbsp; Convert &nbsp;•&nbsp; More
          </span>
        )}
      </span>
    </span>
  );
}
