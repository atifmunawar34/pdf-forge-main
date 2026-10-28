import { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { PDF_CATEGORIES } from '../data/pdfTools';
import { popupBus } from '../utils/popupBus';
import { setLang, getLang, useT } from '../i18n/index.jsx';
import { toolName } from '../i18n/tools.jsx';

// Languages across all continents — same set as iLovePDF's picker
const LANGUAGES = [
  ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['pt', 'Português'], ['ja', '日本語'], ['ru', 'Русский'],
  ['ko', '한국어'], ['zh-CN', '中文 (简体)'], ['zh-TW', '中文 (繁體)'], ['ar', 'العربية'],
  ['bg', 'Български'], ['ca', 'Català'], ['nl', 'Nederlands'], ['el', 'Ελληνικά'],
  ['hi', 'हिन्दी'], ['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'],
  ['pl', 'Polski'], ['sv', 'Svenska'], ['th', 'ภาษาไทย'], ['tr', 'Türkçe'],
  ['uk', 'Українська'], ['vi', 'Tiếng Việt'], ['sw', 'Kiswahili'],
];

function findTool(toolId) {
  for (const category of PDF_CATEGORIES) {
    const found = category.tools.find((t) => t.id === toolId);
    if (found) return found;
  }
  return null;
}

// Social brand glyphs (lucide doesn't ship brand icons)
const XIcon = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L2.2 3h6.4l4.4 5.8L17.5 3zm-1.1 16.1h1.7L7.7 4.8H5.9L16.4 19.1z" />
  </svg>
);
const FacebookIcon = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M13.5 21.9v-8h2.7l.4-3.1h-3.1V8.8c0-.9.25-1.5 1.55-1.5h1.65V4.5c-.3 0-1.3-.12-2.45-.12-2.4 0-4.05 1.47-4.05 4.16v2.32H7.5v3.1h2.7v8z" />
  </svg>
);
const LinkedInIcon = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M6.9 8.6H4V20h2.9zM5.4 3.4a1.7 1.7 0 100 3.4 1.7 1.7 0 000-3.4zM11 8.6h2.8v1.6h.04c.4-.74 1.35-1.9 2.86-1.9 3 0 3.6 1.97 3.6 4.6V20h-3v-6.2c0-1.5-.03-3.4-2.07-3.4-2.07 0-2.4 1.6-2.4 3.3V20h-2.9z" />
  </svg>
);
const InstagramIcon = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const TikTokIcon = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M16.7 3c.4 2.2 1.9 3.6 4.3 3.8v3c-1.7 0-3.1-.5-4.3-1.4v6.9c0 4-3 6.7-6.7 6.7A6.5 6.5 0 013.3 15c0-3.9 3.1-6.7 7-6.5v3.2c-2-.2-3.7 1.2-3.7 3.3 0 2 1.5 3.4 3.4 3.4 2 0 3.6-1.5 3.6-3.8V3z" />
  </svg>
);
const YouTubeIcon = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M21.6 7.2a2.7 2.7 0 00-1.9-1.9C18 4.7 12 4.7 12 4.7s-6 0-7.7.6a2.7 2.7 0 00-1.9 1.9C1.8 8.9 1.8 12 1.8 12s0 3.1.6 4.8a2.7 2.7 0 001.9 1.9c1.7.6 7.7.6 7.7.6s6 0 7.7-.6a2.7 2.7 0 001.9-1.9c.6-1.7.6-4.8.6-4.8s0-3.1-.6-4.8zM9.9 15.1V8.9l5.2 3.1z" />
  </svg>
);

const GH = 'https://github.com/saurabhpan98/ilovetopdf';

export default function Footer({ onSelectTool, onOpenCategory }) {
  const t = useT();
  const [lang, setLangState] = useState(getLang());
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  const langName = LANGUAGES.find(([c]) => c === lang)?.[1] || 'English';

  useEffect(() => {
    if (!langOpen) return;
    const close = (e) => { if (!langRef.current?.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [langOpen]);

  const pickLang = (code) => {
    setLangState(code);
    setLang(code);
    setLangOpen(false);
  };

  const openTool = (toolId) => () => {
    const tool = findTool(toolId);
    if (tool && onSelectTool) {
      onSelectTool(tool);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const openCat = (slug) => () => onOpenCategory?.(slug);
  const infoPopup = (title, description) => () =>
    popupBus.show({ type: 'announcement', title, description, secondaryLabel: 'Close' });

  const COLS = [
    {
      h: 'foot_product',
      links: [
        ['fl_home', () => window.scrollTo({ top: 0, behavior: 'smooth' })],
        ['nav_merge', openTool('merge')],
        ['nav_compress', openTool('compress')],
        ['fl_tools', openCat('pdf-tools')],
        ['tool:edit', openTool('edit')],
      ],
    },
    {
      h: 'foot_resources',
      links: [
        ['fl_sign', openTool('sign')],
        ['tool:protect', openTool('protect')],
      ],
    },
    {
      h: 'foot_solutions',
      links: [
        ['fl_business', () => {}],
        ['fl_education', () => {}],
        ['tool:ocr', openTool('ocr')],
        ['nav_split', openTool('split')],
        ['tool:unlock', openTool('unlock')],
      ],
    },
    {
      h: 'foot_legal',
      links: [
        ['fl_security', infoPopup('Security', 'Files are processed in memory and never stored. Heavy conversions run in ephemeral server tasks that discard data immediately after the response.')],
        ['fl_privacy', infoPopup('Privacy Policy', 'Your files are processed in memory and never stored, logged, or shared. No account, no tracking, no retention.')],
        ['fl_terms', infoPopup('Terms & Conditions', 'ilovetopdf is a free, open-source utility provided as-is. Use it only for files you own or have rights to modify.')],
        ['fl_cookies', infoPopup('Cookies', 'We use only local storage for your preferences and recent files — nothing is sent to any server.')],
      ],
    },
    {
      h: 'foot_company',
      links: [
        ['fl_about', infoPopup('About ilovetopdf', 'ilovetopdf is a free, open-source toolkit for working with PDFs, images and documents — fast, private, no signup. An aastack product.')],
        ['fl_contact', () => popupBus.show({ type: 'feedback' })],
        ['fl_blog', () => {}],
        ['fl_press', () => {}],
      ],
    },
  ];

  return (
    <footer className="bg-[#2b2b34] text-slate-300">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {COLS.map((col) => (
            <div key={col.h} className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">{t(col.h)}</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                {col.links.map(([label, fn]) => (
                  <li key={label}>
                    {typeof fn === 'string' ? (
                      <a href={fn} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                        {label}
                      </a>
                    ) : (
                      <button type="button" onClick={fn} className="hover:text-white transition cursor-pointer text-left">
                        {label.startsWith('tool:') ? toolName({ id: label.slice(5) }) : t(label)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* bottom bar — language, social, copyright */}
        <div className="mt-12 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative" ref={langRef}>
            {langOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-[560px] max-w-[92vw] bg-white text-slate-700 rounded-xl shadow-2xl border border-slate-200 p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-0.5 z-50 pf-menu">
                {LANGUAGES.map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => pickLang(code)}
                    className={`flex items-center gap-2 text-left text-sm font-semibold py-2 px-1 rounded-md cursor-pointer transition ${
                      code === lang ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Check className={`w-4 h-4 shrink-0 ${code === lang ? 'text-slate-900' : 'text-transparent'}`} />
                    {name}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 border border-white/40 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" /> {langName} <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex items-center space-x-5 text-slate-300">
            {[XIcon, FacebookIcon, LinkedInIcon, InstagramIcon, TikTokIcon, YouTubeIcon].map((Icon, i) => (
              <a key={i} href={GH} target="_blank" rel="noopener noreferrer" className="hover:text-white transition text-[15px]">
                <Icon className="w-[18px] h-[18px]" />
              </a>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center sm:text-right">
            © ilovetopdf {new Date().getFullYear()} ® - Your PDF Editor
            <span className="mx-1.5 text-slate-500">·</span>
            A product of{' '}
            <a href="https://aastack.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-300 hover:text-white transition">
              aastack
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
