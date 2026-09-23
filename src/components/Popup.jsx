import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

/**
 * Reusable accessible modal.
 * - ESC close + click-outside close (when dismissable)
 * - Focus trap + focus restore
 * - Entrance animation (pf-panel); body scroll lock
 * - Mobile-friendly (scrollable, bottom-sheet-ish on small screens)
 */
export default function Popup({
  onClose,
  children,
  size = 'md',
  dismissable = true,   // false = cannot close via ESC/backdrop/X (e.g. processing)
  showClose = true,
  labelledBy,
  className = '',
}) {
  const panelRef = useRef(null);
  const requestClose = () => { if (dismissable) onClose?.(); };

  // ESC key
  useEffect(() => {
    if (!dismissable) return;
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissable]);

  // Focus trap + restore
  useEffect(() => {
    const prev = document.activeElement;
    const panel = panelRef.current;
    if (!panel) return () => prev?.focus?.();
    const focusable = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusable[0] || panel).focus?.();
    const trap = (e) => {
      if (e.key !== 'Tab' || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel.addEventListener('keydown', trap);
    return () => { panel.removeEventListener('keydown', trap); prev?.focus?.(); };
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm pf-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative w-full ${SIZES[size] || SIZES.md} bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-[88vh] overflow-y-auto outline-none pf-panel ${className}`}
      >
        {showClose && dismissable && (
          <button
            onClick={requestClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
