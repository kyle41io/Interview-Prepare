/* IP.theme — light/dark with system default */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.theme = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  const META = { dark: "#18191a", light: "#f4f5f8" };   // must track --bg in styles.css

  // pure
  function resolve(pref, prefersDark) {
    if (pref === "light" || pref === "dark") return pref;
    return prefersDark ? "dark" : "light"; // pref === "system" or unknown
  }

  function prefersDark() {
    try { return root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches; }
    catch { return true; }
  }
  function pref() {
    try { return (root.IP && root.IP.store) ? root.IP.store.get("theme", "system") : "system"; }
    catch { return "system"; }
  }
  function current() { return resolve(pref(), prefersDark()); }

  function apply() {
    const eff = current();
    if (root.document) {
      root.document.documentElement.dataset.theme = eff;
      const m = root.document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", META[eff]);
    }
    return eff;
  }
  function toggle() {
    const next = current() === "dark" ? "light" : "dark";
    if (root.IP && root.IP.store) root.IP.store.set("theme", next);
    apply();
    return next;
  }
  return { resolve, apply, toggle, current, pref };
});
