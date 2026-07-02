/* IP.pro — Pro entitlement: code generation, expiry math, VietQR, admin check,
 * plus a stateful entitlement/catalog/sections client cache.
 * Dual-export: browser global (IP.pro) + CommonJS (module.exports) for tests.
 * Depends on: IP.auth.client(), IP.auth.getUser() — accessed lazily at call time only.
 */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.pro = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  const PRICE_VND = 49000;
  const PLAN_DAYS = 30;

  /* ---- Pure helpers ---- */

  const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  function genProCode(rand) {
    const r = rand || Math.random;
    let s = "";
    for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(r() * CODE_CHARS.length)];
    return "PRO-" + s;
  }

  function extendExpiry(nowIso, currentIso, days) {
    const base = Math.max(Date.parse(nowIso), currentIso ? Date.parse(currentIso) : 0);
    return new Date(base + days * 86400000).toISOString();
  }

  function vietqrUrl(amount, code) {
    return "https://img.vietqr.io/image/970407-19036335023019-compact2.jpg?amount=" + amount +
      "&addInfo=" + encodeURIComponent(code) + "&accountName=" + encodeURIComponent("NGUYEN VAN KIEN");
  }

  function isAdmin(uid, list) {
    return !!uid && Array.isArray(list) && list.indexOf(uid) !== -1;
  }

  /* ---- Stateful: entitlement cache, catalog, sections ---- */

  let _ent = null;           // cached entitlement row (or null)
  let _catalog = null;       // Map<topic_id, [{position,title}]> — fetched once
  const _sections = new Map(); // topic_id -> [section] cache
  let _listeners = [];

  function _auth() {
    return root.IP && root.IP.auth;
  }

  function _client() {
    const a = _auth();
    return a ? a.client() : null;
  }

  function onChange(cb) {
    if (typeof cb === "function") _listeners.push(cb);
    return function () { _listeners = _listeners.filter(function (f) { return f !== cb; }); };
  }

  function _emit() {
    _listeners.forEach(function (cb) {
      try { cb(_ent); } catch (e) { /* ignore */ }
    });
  }

  async function init() {
    const a = _auth();
    const user = a && a.getUser();
    if (!user) {
      _ent = null;
      _emit();
      return;
    }
    const c = _client();
    if (!c) {
      _ent = null;
      _emit();
      return;
    }
    try {
      const { data, error } = await c.from("entitlements").select("*").maybeSingle();
      _ent = error ? null : (data || null);
    } catch (e) {
      _ent = null;
    }
    _emit();
  }

  function refresh() {
    return init();
  }

  function isPro() {
    return !!(_ent && _ent.status === "active" && Date.parse(_ent.expires_at) > Date.now());
  }

  async function catalog(topicId) {
    if (!_catalog) {
      _catalog = new Map();
      const c = _client();
      if (c) {
        try {
          const { data, error } = await c.from("pro_catalog").select("topic_id,position,title");
          if (!error && Array.isArray(data)) {
            data.forEach(function (row) {
              const list = _catalog.get(row.topic_id) || [];
              list.push({ position: row.position, title: row.title });
              _catalog.set(row.topic_id, list);
            });
          }
        } catch (e) {
          /* leave _catalog as empty Map on network error */
        }
      }
    }
    return _catalog.get(topicId) || [];
  }

  async function sections(topicId) {
    if (!isPro()) return null;
    if (_sections.has(topicId)) return _sections.get(topicId);
    const c = _client();
    if (!c) return null;
    try {
      const { data, error } = await c
        .from("pro_content")
        .select("position,section")
        .eq("topic_id", topicId)
        .order("position");
      if (error || !Array.isArray(data)) return null;
      const list = data.map(function (row) { return row.section; });
      _sections.set(topicId, list);
      return list;
    } catch (e) {
      return null;
    }
  }

  return {
    genProCode,
    extendExpiry,
    vietqrUrl,
    isAdmin,
    init,
    refresh,
    isPro,
    catalog,
    sections,
    onChange,
    PRICE_VND,
    PLAN_DAYS,
  };
});
