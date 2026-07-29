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
  let _gmailStored = null;         // provider_refresh_token already handed to the server

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

  /* ---- Gmail connect diagnostics ----
     Connecting Gmail has two independent halves that fail in ways the UI cannot
     tell apart: Google/Supabase may never hand us a refresh token, or the handoff
     to our server may be rejected. Both used to be swallowed, leaving "click
     Connect, nothing happens" as the only symptom. Record the last outcome and
     log it under one greppable prefix; read it from the console with
     IP.auth.gmailDiag(). */
  let _gmailDiag = null;
  function _diag(outcome, detail) {
    _gmailDiag = { outcome: outcome, detail: detail || null, at: new Date().toISOString() };
    const line = "[ip:gmail-connect] " + outcome + (detail ? " — " + detail : "");
    if (outcome === "stored") console.info(line); else console.warn(line);
  }
  function gmailDiag() { return _gmailDiag; }

  /* ---- _storeGmailToken(): hand the one-shot Google refresh token to the server ----
     Google issues provider_refresh_token exactly once, on the consent redirect,
     and Supabase drops it from the session at the next token refresh — miss it
     and Gmail stays disconnected until the user consents again. It rides in on
     BOTH the SIGNED_IN event and the getSession() hydrate below, and which one
     wins is a race, so run from both and de-dupe on the token itself. */
  async function _storeGmailToken(session) {
    const rt = session && session.provider_refresh_token;
    if (!rt || rt === _gmailStored) return;
    _gmailStored = rt;
    const email = (session.user && session.user.email) || null;
    try {
      // Since the AWS migration the account lives in DynamoDB behind the API,
      // not the Supabase Edge Function — that function is no longer deployed.
      await root.IP.api.post("/v1/gmail/connect", { refresh_token: rt, email: email });
      _diag("stored", email);
      // The settings screen may have already fetched status before this
      // resolved, showing "not connected" for a connect that did work.
      if (root.dispatchEvent) root.dispatchEvent(new CustomEvent("ip:gmail-connected"));
    } catch (e) {
      _gmailStored = null; // failed handoff — let the next attempt retry
      _diag("handoff-failed", (e && (e.error || e.message)) || String(e));
    }
  }

  /* ---- init(): wire Supabase onAuthStateChange + get initial session ---- */
  async function init() {
    const c = client();
    if (!c) return;
    // Subscribe to auth state changes
    c.auth.onAuthStateChange(function (event, session) {
      _notify(session ? session.user : null);
      if (session && session.user) _ensureProfile(c, session.user);
      if (session) _storeGmailToken(session);
      // A fresh sign-in with no refresh token means Google never issued one —
      // a Google-side problem (scope not granted, consent screen skipped), not
      // a problem with our handoff. Ordinary page loads and hourly refreshes
      // legitimately carry no token, so only a SIGNED_IN is worth reporting.
      if (event === "SIGNED_IN" && session && !session.provider_refresh_token) {
        _diag("no-refresh-token", "Google returned no provider_refresh_token");
      }
    });
    // Hydrate from existing session (e.g. redirect back after OAuth)
    try {
      const { data } = await c.auth.getSession();
      const session = data && data.session;
      _notify(session ? session.user : null);
      if (session && session.user) await _ensureProfile(c, session.user);
      if (session) await _storeGmailToken(session);
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

  return { enabled, client, getUser, onChange, init, signInWithGoogle, connectGmail, signOut, gmailDiag };
});
