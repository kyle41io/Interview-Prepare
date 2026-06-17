/* IP.i18n — bilingual picker + UI string registry */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.i18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  // pure: choose a language string with fallback
  function pick(node, lang) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    if (node[lang] != null) return node[lang];
    if (node.en != null) return node.en;
    if (node.vi != null) return node.vi;
    return "";
  }

  function currentLang() {
    try { return (root.IP && root.IP.store) ? root.IP.store.get("lang", "vi") : "vi"; }
    catch { return "vi"; }
  }
  function t(node) { return pick(node, currentLang()); }

  // UI strings (extended by later tasks). vi/en pairs only.
  const STR = {
    learn: { vi: "Học", en: "Learn" },
    cards: { vi: "Thẻ ghi nhớ", en: "Flashcards" },
    quiz: { vi: "Trắc nghiệm", en: "Quiz" },
    search: { vi: "Tìm kiếm…", en: "Search…" },
  };

  return { pick, t, STR };
});
