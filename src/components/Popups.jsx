import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, AlertTriangle, FileUp, FileX2, Megaphone,
  Loader2, MessageSquareText, Wrench,
} from 'lucide-react';
import Popup from './Popup';
import { MAX_FILE_MB, TOOL_FORMATS } from '../data/popupConfig';
import { popupBus, fmtBytes } from '../utils/popupBus';

/* ---------------------------------------------------------------------------
 * Popup host — queue by priority, one dialog at a time.
 * Trigger from anywhere: popupBus.show({ type: 'error', ... })
 * ------------------------------------------------------------------------- */

const PRIORITY = {
  'error': 100,
  'processing': 90,
  'file-limit': 85,
  'unsupported': 85,
  'upload': 80,
  'success': 70,
  'auth': 65,
  'settings': 60,
  'tool-intro': 50,
  'welcome': 40,
  'announcement': 30,
  'related': 20,
  'feedback': 10,
};


/* ------------------------------- Host ----------------------------------- */

export function PopupProvider({ children }) {
  const [queue, setQueue] = useState([]);

  const show = useCallback((popup) => {
    setQueue((q) => {
      if (q.some((p) => p.id === popup.id)) return q;
      return [...q, { priority: PRIORITY[popup.type] ?? 25, ...popup }]
        .sort((a, b) => b.priority - a.priority);
    });
  }, []);
  const close = useCallback(() => setQueue((q) => q.slice(1)), []);
  const closeAll = useCallback(() => setQueue([]), []);

  useEffect(() => {
    popupBus._show = show;
    popupBus._close = close;
    popupBus._closeAll = closeAll;
  }, [show, close, closeAll]);

  const active = queue[0] || null;

  return (
    <>
      {children}
      {active && <PopupRenderer popup={active} onClose={close} />}
    </>
  );
}

/* ---------------------------- Shared pieces ------------------------------ */

const Btn = ({ children, onClick, variant = 'primary', className = '' }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
      variant === 'primary'
        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm active:scale-[0.98]'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-[0.98]'
    } ${className}`}
  >
    {children}
  </button>
);

const IconBadge = ({ Icon, bg = 'bg-rose-50', color = 'text-rose-500', size = 'w-6 h-6' }) => (
  <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
    <Icon className={size} />
  </div>
);

const SuccessMark = () => (
  <svg className="w-14 h-14" viewBox="0 0 52 52" aria-hidden="true">
    <circle className="pf-check-circle" cx="26" cy="26" r="24" fill="none" stroke="#10b981" strokeWidth="3" />
    <path className="pf-check-mark" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" d="M15 27l8 8 15-16" />
  </svg>
);

/* ------------------------------ Renderer --------------------------------- */

function PopupRenderer({ popup, onClose }) {
  const done = (fn) => () => { fn?.(); onClose(); };

  switch (popup.type) {
    /* ---- Welcome ---- */
    case 'welcome':
      return (
        <Popup open onClose={onClose} size="md" labelledBy="pf-title">
          <div className="p-7 sm:p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4 pf-float">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 id="pf-title" className="text-xl font-black text-slate-900">{popup.title}</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{popup.description}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Btn onClick={done(popup.onPrimary)}>{popup.primaryLabel || 'Get Started'}</Btn>
              {popup.secondaryLabel && <Btn variant="secondary" onClick={done(popup.onSecondary)}>{popup.secondaryLabel}</Btn>}
            </div>
          </div>
        </Popup>
      );

    /* ---- Tool intro ---- */
    case 'tool-intro': {
      const t = popup.tool || {};
      const TIcon = t.icon || Wrench;
      return (
        <Popup open onClose={onClose} size="md" labelledBy="pf-title">
          <div className="p-7 sm:p-8 text-center">
            <div className={`mx-auto w-14 h-14 rounded-2xl ${t.bg || 'bg-rose-50'} ${t.color || 'text-rose-500'} flex items-center justify-center mb-4`}>
              <TIcon className="w-7 h-7" />
            </div>
            <h2 id="pf-title" className="text-xl font-black text-slate-900">{t.name}</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{popup.description || t.desc}</p>
            {popup.formats?.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {popup.formats.map((f) => (
                  <span key={f} className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-1 rounded-md">.{f}</span>
                ))}
              </div>
            )}
            <div className="mt-6">
              <Btn onClick={done(popup.onPrimary)} className="w-full sm:w-auto">{popup.action || 'Get Started'}</Btn>
            </div>
          </div>
        </Popup>
      );
    }

    /* ---- Processing (non-dismissable) ---- */
    case 'processing':
      return (
        <Popup open onClose={() => {}} dismissable={false} showClose={false} size="sm" labelledBy="pf-title">
          <div className="p-7 text-center">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto mb-4" />
            <h2 id="pf-title" className="text-lg font-black text-slate-900">{popup.title || 'Processing your file…'}</h2>
            <p className="mt-1.5 text-xs text-slate-500">{popup.description || 'Please wait — this may take a moment.'}</p>
            {popup.fileName && <p className="mt-2 text-[11px] text-slate-400 truncate">{popup.fileName}</p>}
            <div className="mt-5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-rose-500 rounded-full pf-progress-bar" />
            </div>
          </div>
        </Popup>
      );

    /* ---- Success / download ---- */
    case 'success':
      return (
        <Popup open onClose={onClose} size="md" labelledBy="pf-title">
          <div className="p-7 sm:p-8 text-center">
            <div className="flex justify-center mb-4"><SuccessMark /></div>
            <h2 id="pf-title" className="text-xl font-black text-slate-900">{popup.title || 'Your file is ready!'}</h2>
            <p className="mt-1.5 text-sm text-slate-500">{popup.description || 'Processed successfully.'}</p>
            {popup.fileName && (
              <div className="mt-4 mx-auto max-w-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-left">
                <p className="text-xs font-bold text-slate-700 truncate">{popup.fileName}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {[popup.fileType || 'File', popup.fileSize != null && fmtBytes(popup.fileSize)].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              {popup.onDownload && <Btn onClick={done(popup.onDownload)}>{popup.downloadLabel || 'Download'}</Btn>}
              <Btn variant="secondary" onClick={done(popup.onAnother)}>{popup.anotherLabel || 'Done'}</Btn>
            </div>
            {popup.related?.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Try another tool</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {popup.related.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={done(() => popup.onSelectTool?.(rt))}
                      className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      {rt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Popup>
      );

    /* ---- Error ---- */
    case 'error':
      return (
        <Popup open onClose={onClose} size="sm" labelledBy="pf-title">
          <div className="p-7 text-center pf-shake">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 id="pf-title" className="text-lg font-black text-slate-900">{popup.title || 'Something went wrong'}</h2>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              {popup.description || 'The file could not be processed. Please try again.'}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              {popup.onRetry && <Btn onClick={done(popup.onRetry)}>Try Again</Btn>}
              <Btn variant="secondary" onClick={done(popup.onAnother)}>{popup.anotherLabel || 'Close'}</Btn>
            </div>
          </div>
        </Popup>
      );

    /* ---- File too large ---- */
    case 'file-limit':
      return (
        <Popup open onClose={onClose} size="sm" labelledBy="pf-title">
          <div className="p-7 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
              <FileUp className="w-6 h-6" />
            </div>
            <h2 id="pf-title" className="text-lg font-black text-slate-900">File Too Large</h2>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              {popup.fileName && <><span className="font-bold text-slate-700">{popup.fileName}</span> exceeds </>}
              the maximum upload size of {popup.limitMb || MAX_FILE_MB} MB.
            </p>
            <div className="mt-6"><Btn onClick={done(popup.onRetry)}>Choose Another File</Btn></div>
          </div>
        </Popup>
      );

    /* ---- Unsupported file type ---- */
    case 'unsupported':
      return (
        <Popup open onClose={onClose} size="sm" labelledBy="pf-title">
          <div className="p-7 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
              <FileX2 className="w-6 h-6" />
            </div>
            <h2 id="pf-title" className="text-lg font-black text-slate-900">Unsupported File</h2>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              {popup.fileName && <><span className="font-bold text-slate-700">{popup.fileName}</span> isn't supported. </>}
              Supported formats: {(popup.formats || TOOL_FORMATS.default).map((f) => `.${f}`).join('  ')}
            </p>
            <div className="mt-6"><Btn onClick={done(popup.onRetry)}>Choose Another File</Btn></div>
          </div>
        </Popup>
      );

    /* ---- Announcement ---- */
    case 'announcement':
      return (
        <Popup open onClose={onClose} size="md" labelledBy="pf-title">
          <div className="p-7 sm:p-8 text-center">
            {popup.image
              ? <img src={popup.image} alt="" className="mx-auto mb-4 max-h-36 rounded-xl object-cover" />
              : <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4"><Megaphone className="w-6 h-6" /></div>}
            <h2 id="pf-title" className="text-xl font-black text-slate-900">{popup.title}</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{popup.description}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              {popup.primaryLabel && <Btn onClick={done(popup.onPrimary)}>{popup.primaryLabel}</Btn>}
              <Btn variant="secondary" onClick={onClose}>{popup.secondaryLabel || 'Dismiss'}</Btn>
            </div>
          </div>
        </Popup>
      );

    /* ---- Related tools ---- */
    case 'related':
      return (
        <Popup open onClose={onClose} size="md" labelledBy="pf-title">
          <div className="p-7 sm:p-8">
            <h2 id="pf-title" className="text-lg font-black text-slate-900 text-center">{popup.title || 'Need another PDF tool?'}</h2>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {(popup.tools || []).map((rt) => {
                const RtIcon = rt.icon || Wrench;
                return (
                  <button
                    key={rt.id}
                    onClick={done(() => popup.onSelect?.(rt))}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 transition text-left cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-lg ${rt.bg || 'bg-slate-100'} ${rt.color || 'text-slate-500'} flex items-center justify-center shrink-0`}>
                      <RtIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{rt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Popup>
      );

    /* ---- Feedback ---- */
    case 'feedback':
      return <FeedbackPopup popup={popup} onClose={onClose} />;

    /* ---- Generic settings/options dialog ---- */
    case 'settings':
      return <SettingsPopup popup={popup} onClose={onClose} done={done} />;

    default:
      return null;
  }
}

/* ---- Feedback (has a form) ---- */
function FeedbackPopup({ popup, onClose }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Popup open onClose={onClose} size="md" labelledBy="pf-title">
      <div className="p-7 sm:p-8">
        {sent ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-3"><SuccessMark /></div>
            <h2 className="text-lg font-black text-slate-900">Thanks for the feedback!</h2>
            <p className="mt-1.5 text-sm text-slate-500">We read every message.</p>
            <div className="mt-5"><Btn onClick={onClose}>Close</Btn></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <IconBadge Icon={MessageSquareText} bg="bg-blue-50" color="text-blue-500" />
              <div>
                <h2 id="pf-title" className="text-lg font-black text-slate-900">{popup.title || 'Send Feedback'}</h2>
                <p className="text-xs text-slate-400">{popup.description || 'Tell us what to improve.'}</p>
              </div>
            </div>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What worked? What's missing?"
              className="w-full text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
            />
            <div className="mt-4 flex gap-2.5 justify-end">
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn onClick={() => { popup.onSubmit?.(text); setSent(true); }}>Send</Btn>
            </div>
          </>
        )}
      </div>
    </Popup>
  );
}

/* ---- Generic settings dialog (compression level, page range, etc.) ---- */
function SettingsPopup({ popup, onClose, done }) {
  const [selected, setSelected] = useState(popup.options?.[0]?.value ?? null);
  const [text, setText] = useState('');
  return (
    <Popup open onClose={onClose} size="sm" labelledBy="pf-title">
      <div className="p-7">
        <h2 id="pf-title" className="text-lg font-black text-slate-900">{popup.title || 'Settings'}</h2>
        {popup.description && <p className="mt-1 text-xs text-slate-500">{popup.description}</p>}

        {popup.options?.length > 0 && (
          <div className="mt-4 space-y-2">
            {popup.options.map((o) => (
              <button
                key={o.value}
                onClick={() => setSelected(o.value)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition text-left cursor-pointer ${
                  selected === o.value ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">{o.label}</p>
                  {o.hint && <p className="text-[11px] text-slate-400 mt-0.5">{o.hint}</p>}
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selected === o.value ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`} />
              </button>
            ))}
          </div>
        )}

        {popup.inputLabel && (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={popup.inputLabel}
            className="mt-4 w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        )}

        <div className="mt-5 flex gap-2.5 justify-end">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={done(() => popup.onApply?.({ value: selected, text }))}>{popup.applyLabel || 'Apply'}</Btn>
        </div>
      </div>
    </Popup>
  );
}
