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

  /* ---- _ensureProfile(): self-heal a missing profiles row ----
     The DB auto-provisions profiles via an on-auth-insert trigger, but a user
     whose auth row predates the trigger (e.g. logged in before migrations ran)
     has no profiles row — and every FK to profiles (payments, chat quota, sync)
     then fails with a 409. Upsert-ignore our own row on login (RLS allows
     auth.uid() = id); it's a no-op when the row already exists. */
  async function _ensureProfile(c, user) {
    if (!c || !user) return;
    try {
      const m = user.user_metadata || {};
      await c.from("profiles").upsert({
        id: user.id,
        email: user.email,
        display_name: m.full_name || m.name || null,
        avatar_url: m.avatar_url || m.picture || null,
      }, { onConflict: "id", ignoreDuplicates: true });
    } catch (e) { /* offline / already exists — ignore */ }
  }

  /* ---- init(): wire Supabase onAuthStateChange + get initial session ---- */
  async function init() {
    const c = client();
    if (!c) return;
    // Subscribe to auth state changes
    c.auth.onAuthStateChange(function (_event, session) {
      _notify(session ? session.user : null);
      if (session && session.user) _ensureProfile(c, session.user);
    });
    // Hydrate from existing session (e.g. redirect back after OAuth)
    try {
      const { data } = await c.auth.getSession();
      const session = data && data.session;
      _notify(session ? session.user : null);
      if (session && session.user) await _ensureProfile(c, session.user);
      // A Gmail refresh token is only returned right after the consent redirect.
      // Capture it once and hand it to the server (never kept client-side).
      if (session && session.provider_refresh_token) {
        const email = session.user && session.user.email;
        const _api = root.IP && root.IP.api;
        try {
          // Since the AWS migration the account lives in DynamoDB behind the
          // API, not the Supabase Edge Function — that function is no longer
          // deployed, so storing there left Gmail permanently disconnected.
          if (_api && _api.configured && _api.configured()) {
            await _api.post("/v1/gmail/connect", {
              refresh_token: session.provider_refresh_token,
              email: email,
            });
          } else {
            await c.functions.invoke("gmail-connect", { body: {
              action: "store",
              refresh_token: session.provider_refresh_token,
              email: email,
            } });
          }
        } catch (e) { /* server not deployed / offline — ignore */ }
      }
    } catch (e) { /* network error – stay logged out */ }
  }

  /* ---- signInWithGoogle(): redirect-based OAuth ---- */
  async function signInWithGoogle() {
    const c = client(); if (!c) return;
    try { await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0] } }); } catch (e) { /* offline / provider misconfig — stay logged out */ }
  }

  /* ---- connectGmail(): OAuth with gmail.readonly + offline (captures refresh token) ---- */
  async function connectGmail() {
    const c = client(); if (!c) return;
    try {
      await c.auth.signInWithOAuth({ provider: "google", options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        redirectTo: location.href.split("#")[0],
        queryParams: { access_type: "offline", prompt: "consent" },
      } });
    } catch (e) { /* stay disconnected */ }
  }

  /* ---- signOut() ---- */
  async function signOut() {
    const c = client();
    if (!c) return;
    try { await c.auth.signOut(); } catch (e) { /* ignore */ }
  }

  return { enabled, client, getUser, onChange, init, signInWithGoogle, connectGmail, signOut };
});
