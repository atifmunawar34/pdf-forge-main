import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal (progressive enhancement):
 * - Markup uses `data-reveal` — elements are VISIBLE by default.
 * - The hook adds `.reveal-init` (hidden) right before observing, so a
 *   broken/unavailable observer can never leave content invisible.
 * - `.pf-reveal` triggers the slide-up animation once intersecting.
 * - Failsafe: anything still hidden after 1.2s is force-revealed.
 */
export function useReveal(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = [...root.querySelectorAll('[data-reveal]:not(.pf-reveal)')];
    if (!els.length) return;

    const reveal = (el) => el.classList.add('pf-reveal');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (typeof IntersectionObserver === 'undefined' || reduced) {
      els.forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); }
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -10px 0px' }
    );

    // Only NOW hide — the observer is attached, so pf-reveal is guaranteed
    // either by intersection or by the failsafe below.
    els.forEach((el) => { el.classList.add('reveal-init'); io.observe(el); });

    const failsafe = setTimeout(() => els.forEach(reveal), 1200);

    return () => { io.disconnect(); clearTimeout(failsafe); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
