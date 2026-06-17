/* IP.store — localStorage wrapper + pure state migration (no build) */
(function (root, factory) {
  const api = factory();
  root.IP = root.IP || {};
  root.IP.store = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const PREFIX = "ip_";
  const SCHEMA_VERSION = 1;

  function defaults() {
    return {
      lang: "vi",
      theme: "system",
      track: null,
      progress: {},
      cards: {},
      quizBest: {},
      bookmarks: [],
      streak: { count: 0, lastActiveDate: null, dailyGoal: 1 },
      schemaVersion: SCHEMA_VERSION,
    };
  }

  function migrate(stored) {
    const d = defaults();
    const src = stored && typeof stored === "object" ? stored : {};
    const out = {};
    Object.keys(d).forEach((k) => { out[k] = k in src ? src[k] : d[k]; });
    out.schemaVersion = SCHEMA_VERSION;
    return out;
  }

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch { return fallback; }
  }

  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  }

  function reset(key) {
    try { localStorage.removeItem(PREFIX + key); } catch {}
  }

  function clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.indexOf(PREFIX) === 0)
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  return { defaults, migrate, get, set, reset, clearAll, PREFIX, SCHEMA_VERSION };
});
