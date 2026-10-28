// Minimal runtime i18n — dictionary lookup + subscription hook.
// Language is stored in localStorage 'pf-lang'; calling setLang()
// re-renders every component using useT().
import { useSyncExternalStore } from 'react';
import { STR } from './strings';
import { STR2 } from './strings2';

const listeners = new Set();
export const getLang = () => localStorage.getItem('pf-lang') || 'en';

export function setLang(code) {
  localStorage.setItem('pf-lang', code);
  listeners.forEach((f) => f());
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function t(key) {
  const l = getLang();
  return STR[l]?.[key] ?? STR2[l]?.[key] ?? STR.en[key] ?? STR2.en[key] ?? key;
}

export function useT() {
  const lang = useSyncExternalStore(subscribe, getLang);
  return (key) => STR[lang]?.[key] ?? STR2[lang]?.[key] ?? STR.en[key] ?? STR2.en[key] ?? key;
}
