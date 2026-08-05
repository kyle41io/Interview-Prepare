/* IP.bookmarks — save/unsave topics (Phase A, Task 9)
   Dual-export: root.IP.bookmarks always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory();
  root.IP = root.IP || {};
  root.IP.bookmarks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function store() {
    return (typeof globalThis !== "undefined" && globalThis.IP && globalThis.IP.store)
      ? globalThis.IP.store
      : null;
  }

  /* Pure: returns true if id is in list */
  function has(list, id) {
    return Array.isArray(list) && list.indexOf(id) !== -1;
  }

  /* Pure, non-mutating: add or remove id from list */
  function toggle(list, id) {
    var arr = Array.isArray(list) ? list.slice() : [];
    var idx = arr.indexOf(id);
    if (idx === -1) {
      arr.push(id);
    } else {
      arr.splice(idx, 1);
    }
    return arr;
  }

  /* Read from store; fallback to [] */
  function all() {
    var s = store();
    if (!s) return [];
    return s.get("bookmarks", []) || [];
  }

  /* Toggle in store and persist */
  function toggleStored(id) {
    var next = toggle(all(), id);
    var s = store();
    if (s) s.set("bookmarks", next);
    return next;
  }

  return { has: has, toggle: toggle, all: all, toggleStored: toggleStored };
});
