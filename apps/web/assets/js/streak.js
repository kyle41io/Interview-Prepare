/* IP.streak — daily learning streak (Phase A, Task 10)
   Dual-export: root.IP.streak always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.IP = root.IP || {};
  root.IP.streak = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function todayStr(date) {
    var d = date || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function dayDiff(a, b) {
    /* a, b = "YYYY-MM-DD"; returns whole days b-a (UTC-safe) */
    var pa = a.split("-").map(Number), pb = b.split("-").map(Number);
    var ua = Date.UTC(pa[0], pa[1] - 1, pa[2]), ub = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((ub - ua) / 86400000);
  }

  function compute(prev, today) {
    var p = prev || { count: 0, lastActiveDate: null, dailyGoal: 1 };
    if (p.lastActiveDate === today) return { count: p.count, lastActiveDate: today, dailyGoal: p.dailyGoal || 1 };
    var count;
    if (!p.lastActiveDate) {
      count = 1;
    } else {
      count = dayDiff(p.lastActiveDate, today) === 1 ? (p.count || 0) + 1 : 1;
    }
    return { count: count, lastActiveDate: today, dailyGoal: p.dailyGoal || 1 };
  }

  function store() {
    return (typeof globalThis !== "undefined" && globalThis.IP && globalThis.IP.store)
      ? globalThis.IP.store
      : null;
  }

  function get() {
    var s = store();
    var def = { count: 0, lastActiveDate: null, dailyGoal: 1 };
    return s ? s.get("streak", def) : def;
  }

  function bump() {
    var next = compute(get(), todayStr());
    var s = store();
    if (s) s.set("streak", next);
    return next;
  }

  return { compute: compute, todayStr: todayStr, get: get, bump: bump };
});
