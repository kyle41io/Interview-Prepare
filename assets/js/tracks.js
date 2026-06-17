/* IP.tracks — pure track resolution & progress */
(function (root, factory) {
  const api = factory();
  root.IP = root.IP || {};
  root.IP.tracks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function getTrack(role, level, tracks) {
    const lv = level || "";
    return (tracks || []).find((t) => t.role === role && (t.level || "") === lv) || null;
  }
  function resolveItems(track, validIds) {
    const items = (track && track.items) || [];
    if (!validIds) return items.slice();
    const set = Array.isArray(validIds) ? new Set(validIds) : validIds;
    return items.filter((id) => set.has(id));
  }
  function progressOf(track, progressMap, validIds) {
    const items = resolveItems(track, validIds);
    const total = items.length;
    const done = items.filter((id) => progressMap && progressMap[id]).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function nextTopic(track, progressMap, validIds) {
    const items = resolveItems(track, validIds);
    for (const id of items) { if (!progressMap || !progressMap[id]) return id; }
    return items.length ? items[items.length - 1] : null;
  }
  return { getTrack, resolveItems, progressOf, nextTopic };
});
