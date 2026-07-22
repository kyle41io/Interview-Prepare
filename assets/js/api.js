/* IP.api — browser HTTP client for the Phase F NestJS API (Task 6).
   Empty IP_CONFIG.API_URL => configured() is false and calls reject with
   {error:"api-not-configured"}; callers (IP.sync, Task 7) degrade to local-only.
   Dual-export: root.IP.api always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.IP = root.IP || {};
  root.IP.api = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  let _base = (root.IP_CONFIG && root.IP_CONFIG.API_URL) || "";
  let _fetch = (typeof fetch !== "undefined") ? fetch.bind(globalThis) : null;
  let _token = async () => {
    const c = root.IP && root.IP.auth && root.IP.auth.client();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  };

  /* ---------- test seams ---------- */
  function __setBase(b) { _base = b || ""; }
  function __setDeps(d) {
    if (d.fetch) _fetch = d.fetch;
    if (d.token) _token = d.token;
  }

  function configured() { return !!_base; }

  async function _req(method, path, body) {
    if (!_base) return Promise.reject({ error: "api-not-configured" });
    const tk = await _token();
    const headers = { "content-type": "application/json" };
    if (tk) headers.Authorization = "Bearer " + tk;
    const res = await _fetch(_base + path, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return Promise.reject({ error: "http-" + res.status, status: res.status });
    return res.json();
  }

  return {
    configured,
    get: (p) => _req("GET", p),
    post: (p, b) => _req("POST", p, b),
    put: (p, b) => _req("PUT", p, b),
    del: (p) => _req("DELETE", p),
    __setBase,
    __setDeps,
  };
});
