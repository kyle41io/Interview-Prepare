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

  function _api() {
    return root.IP && root.IP.api;
  }

  function _apiOn() {
    const a = _api();
    return !!(a && a.configured && a.configured());
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
    if (_apiOn()) {
      try {
        _ent = await _api().get("/v1/billing/entitlement");
      } catch (e) {
        _ent = null;
      }
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
    if (_ent && typeof _ent.isPro === "boolean") return _ent.isPro; // API entitlement view
    return !!(_ent && _ent.status === "active" && Date.parse(_ent.expires_at) > Date.now()); // Supabase row
  }

  async function catalog(topicId) {
    if (_apiOn()) {
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
    if (_apiOn()) {
      try {
        const r = await _api().get("/v1/pro/content/" + encodeURIComponent(topicId));
        const list = ((r && r.sections) || []).map(function (s) { return s.section; });
        _sections.set(topicId, list);
        return list;
      } catch (e) {
        return null;
      }
    }
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

  /* ---- Payment / admin (API when configured; Supabase fallback else) ---- */

  async function _supabaseCurrentPayment() {
    const c = _client();
    if (!c) return null;
    try {
      const { data, error } = await c
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !Array.isArray(data)) return null;
      const item = data.find(function (r) { return r.status === "pending" || r.status === "submitted"; });
      return item || null;
    } catch (e) {
      return null;
    }
  }

  async function currentPayment() {
    if (_apiOn()) return _api().get("/v1/billing/payment/current");
    return _supabaseCurrentPayment();
  }

  async function _supabaseCreatePayment(plan) {
    const c = _client();
    const a = _auth();
    const u = a && a.getUser();
    if (!c || !u) return Promise.reject(new Error("not-signed-in"));
    const code = genProCode();
    const p = plan || "pro-month";
    await c.from("payment_requests").insert({ user_id: u.id, code, amount: PRICE_VND, plan: p, status: "pending" });
    return { code: code, amount: PRICE_VND, plan: p, vietqr: { url: vietqrUrl(PRICE_VND, code) } };
  }

  async function createPayment(plan) {
    if (_apiOn()) return _api().post("/v1/billing/payment", plan ? { plan: plan } : {});
    return _supabaseCreatePayment(plan);
  }

  async function _supabaseSubmit(code) {
    const c = _client();
    if (!c) return Promise.reject(new Error("not-signed-in"));
    return c.from("payment_requests").update({ status: "submitted" }).eq("code", code);
  }

  async function submitPayment(code) {
    if (_apiOn()) return _api().post("/v1/billing/payment/" + encodeURIComponent(code) + "/submit", {});
    return _supabaseSubmit(code);
  }

  async function _supabaseAdminList() {
    const c = _client();
    if (!c) return Promise.reject(new Error("not-signed-in"));
    const { data, error } = await c.functions.invoke("approve-payment", { body: { action: "list" } });
    if (error) throw error;
    return data;
  }

  async function adminListPayments(status) {
    if (_apiOn()) return _api().get("/v1/billing/admin/payments?status=" + encodeURIComponent(status));
    return _supabaseAdminList(status);
  }

  async function adminApprove(item) {
    if (_apiOn()) return _api().post("/v1/billing/admin/payment/approve", { userId: item.userId, code: item.code });
    const c = _client();
    if (!c) return Promise.reject(new Error("not-signed-in"));
    const { data, error } = await c.functions.invoke("approve-payment", { body: { action: "approve", payment_id: item.id } });
    if (error) throw error;
    return data;
  }

  async function adminReject(item) {
    if (_apiOn()) return _api().post("/v1/billing/admin/payment/reject", { userId: item.userId, code: item.code });
    const c = _client();
    if (!c) return Promise.reject(new Error("not-signed-in"));
    const { data, error } = await c.functions.invoke("approve-payment", { body: { action: "reject", payment_id: item.id } });
    if (error) throw error;
    return data;
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
