/* IP.auth — optional Google OAuth via Supabase
   Dual-export: sets root.IP.auth AND exports via module.exports for tests. */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.auth = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  /* ---- internal state ---- */
  let _client = null;
  let _user = null;               // cached current user (null = logged out)
  let _listeners = [];             // onChange callbacks

  /* ---- enabled: true only when config + Supabase SDK present ---- */
  function enabled() {
    return !!(
      root.IP_CONFIG &&
      root.IP_CONFIG.SUPABASE_URL &&
      root.IP_CONFIG.SUPABASE_ANON_KEY &&
      root.supabase
    );
  }

  /* ---- client(): lazy singleton ---- */
  function client() {
    if (!enabled()) return null;
    if (!_client) {
      _client = root.supabase.createClient(
        root.IP_CONFIG.SUPABASE_URL,
        root.IP_CONFIG.SUPABASE_ANON_KEY
      );
    }
    return _client;
  }

  /* ---- getUser(): returns cached user or null ---- */
  function getUser() {
    return _user;
  }

  /* ---- onChange(cb): register a listener; called with user|null ---- */
  function onChange(cb) {
    if (typeof cb === "function") _listeners.push(cb);
    return function () { _listeners = _listeners.filter(function (f) { return f !== cb; }); };
  }

  function _notify(user) {
    _user = user || null;
    _listeners.forEach(function (cb) {
      try { cb(_user); } catch (e) { /* ignore */ }
    });
  }

  /* ---- init(): wire Supabase onAuthStateChange + get initial session ---- */
  async function init() {
    const c = client();
    if (!c) return;
    // Subscribe to auth state changes
    c.auth.onAuthStateChange(function (_event, session) {
      _notify(session ? session.user : null);
    });
    // Hydrate from existing session (e.g. redirect back after OAuth)
    try {
      const { data } = await c.auth.getSession();
      _notify(data && data.session ? data.session.user : null);
    } catch (e) { /* network error – stay logged out */ }
  }

  /* ---- signInWithGoogle(): redirect-based OAuth ---- */
  async function signInWithGoogle() {
    const c = client(); if (!c) return;
    try { await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0] } }); } catch (e) { /* offline / provider misconfig — stay logged out */ }
  }

  /* ---- signOut() ---- */
  async function signOut() {
    const c = client();
    if (!c) return;
    try { await c.auth.signOut(); } catch (e) { /* ignore */ }
  }

  return { enabled, client, getUser, onChange, init, signInWithGoogle, signOut };
});
