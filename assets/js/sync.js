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

  return { merge };
});
