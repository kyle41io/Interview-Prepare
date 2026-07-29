/* IP.content — loads the learning banks from private S3 and feeds them to the
   existing PREP registry. Content is not shipped in the page, so nothing renders
   until a signed-in fetch (or a warm cache) supplies it.

   All topics load at once, on purpose: PREP.topics is a synchronous map and the
   home dashboard plus both study modes aggregate across every id in PREP.order
   (app.js:899, :970, :1069). A lazily-filled registry would throw there.

   Two hops by design: the authenticated API returns a short-lived presigned URL,
   then the bundle bytes come straight from S3 — keeping 1.3 MB out of Lambda.

   Dual-export: sets root.IP.content AND module.exports, like the other modules. */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.content = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  const CACHE_KEY = "ip.content.bundle";

  /* Injected in tests; in the browser these are localStorage, the global PREP
     registry every render path already reads from, and window.fetch. */
  let _deps = null;
  function __setDeps(d) { _deps = d || null; }

  function _storage() {
    if (_deps) return _deps.storage;
    try { return root.localStorage; } catch (e) { return null; }
  }
  function _register(doc) {
    if (_deps) return _deps.register(doc);
    if (root.PREP && root.PREP.register) root.PREP.register(doc);
  }
  function _fetch(url) {
    if (_deps && _deps.fetch) return _deps.fetch(url);
    return root.fetch(url);
  }

  function _readCache() {
    const store = _storage();
    if (!store) return null;
    try {
      const hit = JSON.parse(store.getItem(CACHE_KEY));
      return hit && Array.isArray(hit.topics) && hit.etag ? hit : null;
    } catch (e) {
      return null;   // missing or corrupt — treat as a cold cache
    }
  }

  function _writeCache(bundle) {
    const store = _storage();
    if (!store) return;
    // The bundle is ~1.3 MB, so a quota failure is plausible. Content still
    // renders this session; it just refetches next time.
    try { store.setItem(CACHE_KEY, JSON.stringify(bundle)); }
    catch (e) { console.warn("[content] cache write failed", e); }
  }

  function _registerAll(topics) {
    topics.forEach(_register);
    return topics.length;
  }

  /* Resolves with the number of topics registered. Never rejects: a content
     failure must degrade to the cache, or to an empty app, but never take down
     the boot sequence. */
  async function load() {
    const cached = _readCache();
    const fallback = function () { return cached ? _registerAll(cached.topics) : 0; };

    let meta;
    try {
      meta = await root.IP.api.get(
        "/v1/content/bundle" + (cached ? "?etag=" + encodeURIComponent(cached.etag) : ""),
      );
    } catch (e) {
      console.warn("[content] bundle metadata fetch failed", e);
      return fallback();
    }

    if (!meta || meta.unchanged || !meta.url) return fallback();

    let topics;
    try {
      const res = await _fetch(meta.url);
      if (!res || !res.ok) throw new Error("bundle HTTP " + (res && res.status));
      const body = await res.json();
      topics = body && body.topics;
      if (!Array.isArray(topics)) throw new Error("malformed bundle");
    } catch (e) {
      console.warn("[content] bundle download failed", e);
      return fallback();
    }

    if (meta.etag) _writeCache({ topics: topics, etag: meta.etag });
    return _registerAll(topics);
  }

  return { load: load, __setDeps: __setDeps };
});
