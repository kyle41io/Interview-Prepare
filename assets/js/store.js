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
  let _listeners = [];

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

  function _write(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  }
  function _notify(key) {
    _listeners.forEach((f) => { try { f(key); } catch {} });
  }
  function set(key, value) { _write(key, value); _notify(key); }

  function onChange(cb) {
    _listeners.push(cb);
    return function off() { _listeners = _listeners.filter((f) => f !== cb); };
  }
  function snapshot() {
    const d = defaults();
    const out = {};
    Object.keys(d).forEach((k) => { out[k] = get(k, d[k]); });
    return out;
  }
  function replaceAll(state, opts) {
    const d = defaults();
    const src = state && typeof state === "object" ? state : {};
    Object.keys(d).forEach((k) => { if (k in src) _write(k, src[k]); });
    if (!(opts && opts.silent)) _notify("*");
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

  return { defaults, migrate, get, set, reset, clearAll, snapshot, onChange, replaceAll, PREFIX, SCHEMA_VERSION };
});
