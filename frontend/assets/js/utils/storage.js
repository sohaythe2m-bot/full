/**
 * storage.js
 * Thin, safe wrapper around localStorage (JSON-aware, never throws).
 */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return raw; // plain string values (e.g. tokens)
      }
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      const raw = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, raw);
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
