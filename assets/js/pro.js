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

  function _api() {
    return root.IP.api;
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
    try {
      _ent = await _api().get("/v1/billing/entitlement");
    } catch (e) {
      _ent = null;
    }
    _emit();
  }

  function refresh() {
    return init();
  }

  function isPro() {
    return !!(_ent && _ent.isPro);
  }

  async function catalog(topicId) {
    if (!_catalog) {
      _catalog = new Map();
      try {
        const rows = await _api().get("/v1/pro/catalog");
        if (Array.isArray(rows)) {
          rows.forEach(function (row) {
            const list = _catalog.get(row.topic_id) || [];
            list.push({ position: row.position, title: row.title });
            _catalog.set(row.topic_id, list);
          });
        }
      } catch (e) {
        /* leave _catalog as empty Map on network error */
      }
    }
    return _catalog.get(topicId) || [];
  }

  async function sections(topicId) {
    if (!isPro()) return null;
    if (_sections.has(topicId)) return _sections.get(topicId);
    try {
      const r = await _api().get("/v1/pro/content/" + encodeURIComponent(topicId));
      const list = ((r && r.sections) || []).map(function (s) { return s.section; });
      _sections.set(topicId, list);
      return list;
    } catch (e) {
      return null;
    }
  }

  /* ---- Payment / admin ---- */

  async function currentPayment() {
    return _api().get("/v1/billing/payment/current");
  }

  async function createPayment(plan) {
    return _api().post("/v1/billing/payment", plan ? { plan: plan } : {});
  }

  async function submitPayment(code) {
    return _api().post("/v1/billing/payment/" + encodeURIComponent(code) + "/submit", {});
  }

  async function adminListPayments(status) {
    return _api().get("/v1/billing/admin/payments?status=" + encodeURIComponent(status));
  }

  async function adminApprove(item) {
    return _api().post("/v1/billing/admin/payment/approve", { userId: item.userId, code: item.code });
  }

  async function adminReject(item) {
    return _api().post("/v1/billing/admin/payment/reject", { userId: item.userId, code: item.code });
  }

  return {
    vietqrUrl,
    isAdmin,
    init,
    refresh,
    isPro,
    catalog,
    sections,
    onChange,
    currentPayment,
    createPayment,
    submitPayment,
    adminListPayments,
    adminApprove,
    adminReject,
    PRICE_VND,
    PLAN_DAYS,
  };
});
