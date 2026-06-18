/* IP.sync — local<->server state sync (Supabase). merge() is pure. */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.sync = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function _scalar(l, s, dflt) {
    if (l !== undefined && l !== null) return l;
    if (s !== undefined && s !== null) return s;
    return dflt;
  }

  // pure: merge local (this device) with server state. Never loses progress.
  function merge(local, server) {
    const l = local || {}, s = server || {};
    // progress: union
    const progress = {};
    Object.keys(Object.assign({}, s.progress, l.progress)).forEach((id) => {
      progress[id] = !!(((l.progress || {})[id]) || ((s.progress || {})[id]));
    });
    // bookmarks: union + dedupe
    const bookmarks = Array.from(new Set([].concat(s.bookmarks || [], l.bookmarks || [])));
    // quizBest: max per topic
    const quizBest = Object.assign({}, s.quizBest || {});
    Object.keys(l.quizBest || {}).forEach((id) => {
      quizBest[id] = Math.max(Number(l.quizBest[id]) || 0, Number(quizBest[id]) || 0);
    });
    // cards: per key, higher reps wins; tie -> later due; one side -> that side
    const cards = {};
    const lc = l.cards || {}, sc = s.cards || {};
    Object.keys(Object.assign({}, sc, lc)).forEach((k) => {
      const a = lc[k], b = sc[k];
      if (a && b) {
        const ra = Number(a.reps) || 0, rb = Number(b.reps) || 0;
        cards[k] = ra > rb ? a : rb > ra ? b : ((Number(a.due) || 0) >= (Number(b.due) || 0) ? a : b);
      } else { cards[k] = a || b; }
    });
    // streak: higher count; tie -> later lastActiveDate
    let streak;
    const ls = l.streak, ss = s.streak;
    if (ls && ss) {
      const ca = Number(ls.count) || 0, cb = Number(ss.count) || 0;
      if (ca > cb) streak = ls; else if (cb > ca) streak = ss;
      else streak = ((ls.lastActiveDate || "") >= (ss.lastActiveDate || "")) ? ls : ss;
    } else { streak = ls || ss || { count: 0, lastActiveDate: null, dailyGoal: 1 }; }

    return {
      lang: _scalar(l.lang, s.lang, "vi"),
      theme: _scalar(l.theme, s.theme, "system"),
      track: _scalar(l.track, s.track, null),
      progress, cards, quizBest, bookmarks, streak,
      schemaVersion: Math.max(Number(l.schemaVersion) || 1, Number(s.schemaVersion) || 1),
    };
  }

  /* ---------- runtime helpers (lazy, safe in Node) ---------- */
  function _auth()  { return root.IP && root.IP.auth; }
  function _store() { return root.IP && root.IP.store; }
  function _loggedIn() {
    const a = _auth();
    return !!(a && a.getUser && a.getUser());
  }

  /* ---------- apply callback ---------- */
  let _applyCb = null;
  function setApplyCallback(cb) { _applyCb = cb; }

  /* ---------- dirty flag (push failed while offline) ---------- */
  let _dirty = false;

  /* ---------- pull ---------- */
  async function pull() {
    try {
      const a = _auth();
      if (!a) return null;
      const user = a.getUser && a.getUser();
      if (!user) return null;
      const client = a.client && a.client();
      if (!client) return null;
      const { data, error } = await client
        .from("user_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) { console.warn("[sync] pull error", error.message); return null; }
      return (data && data.state) ? data.state : null;
    } catch (e) { console.warn("[sync] pull exception", e); return null; }
  }

  /* ---------- push ---------- */
  async function push(state) {
    try {
      const a = _auth();
      if (!a) return;
      const user = a.getUser && a.getUser();
      if (!user) return;
      const client = a.client && a.client();
      if (!client) return;
      const { error } = await client
        .from("user_state")
        .upsert({ user_id: user.id, state: state, updated_at: new Date().toISOString() });
      if (error) { console.warn("[sync] push error", error.message); _dirty = true; return; }
      _dirty = false;
    } catch (e) { console.warn("[sync] push exception", e); _dirty = true; }
  }

  /* ---------- schedulePush (debounce ~2500ms) ---------- */
  let _pushTimer = null;
  function schedulePush() {
    if (!_loggedIn()) return;
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(function () {
      const st = _store();
      if (st && _loggedIn()) push(st.snapshot());
    }, 2500);
  }

  /* ---------- onLogin ---------- */
  async function onLogin() {
    const st = _store();
    if (!st) return;
    const local = st.snapshot();
    const server = await pull();
    const merged = server ? merge(local, server) : local;
    st.replaceAll(merged, { silent: true });
    if (_applyCb) { try { _applyCb(); } catch (e) { console.warn("[sync] applyCb error", e); } }
    await push(merged);
  }

  /* ---------- start ---------- */
  function start() {
    const st = _store();
    if (!st || !st.onChange) return;
    st.onChange(function (key) {
      if (key !== "*" && _loggedIn()) schedulePush();
    });
    if (root.addEventListener) {
      root.addEventListener("online", function () {
        if (_dirty && _loggedIn()) {
          const store = _store();
          if (store) push(store.snapshot());
        }
      });
    }
  }

  return { merge, pull, push, schedulePush, onLogin, start, setApplyCallback };
});
