// Imperative popup bridge — any module can trigger dialogs without hooks.
// PopupProvider registers its queue functions here on mount.
export const popupBus = {
  _show: null,
  _close: null,
  _closeAll: null,
  actions: {}, // registered app callbacks (openTool, openTemplates, ...)
  show(p) { this._show?.(p); },
  close() { this._close?.(); },
  closeAll() { this._closeAll?.(); },
};

// localStorage dismissal helpers — never annoy returning users
const seenKey = (k) => `pf_seen:${k}`;
export const popupSeen = (k) => { try { return !!localStorage.getItem(seenKey(k)); } catch { return true; } };
export const markPopupSeen = (k) => { try { localStorage.setItem(seenKey(k), '1'); } catch { /* private mode */ } };

export const fmtBytes = (b) =>
  b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
