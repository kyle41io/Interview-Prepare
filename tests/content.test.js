const test = require("node:test");
const assert = require("node:assert");
const content = require("../assets/js/content.js");
const api = require("../assets/js/api.js");

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const TOPICS = [{ id: "dsa" }, { id: "oop" }];

// The route returns metadata; the bundle bytes come from the presigned URL.
function setup(metaImpl, bundleImpl) {
  api.__setBase("https://x.dev");
  const apiCalls = [];
  api.__setDeps({
    fetch: async (u) => {
      apiCalls.push(u);
      return { ok: true, status: 200, json: async () => metaImpl(u) };
    },
    token: async () => "TKN",
  });
  const registered = [];
  const storage = memStorage();
  content.__setDeps({
    storage,
    register: (d) => registered.push(d),
    fetch: bundleImpl,
  });
  return { apiCalls, registered, storage };
}

const signed = { url: "https://s3.example/bundle.json?sig=1", etag: "e1" };
const bundleOk = async () => ({ ok: true, json: async () => ({ topics: TOPICS }) });

test("load presigns, fetches the bundle, and registers every topic", async () => {
  const ctx = setup(() => signed, bundleOk);
  assert.strictEqual(await content.load(), 2);
  assert.match(ctx.apiCalls[0], /\/v1\/content\/bundle$/);
  assert.deepStrictEqual(ctx.registered.map((t) => t.id), ["dsa", "oop"]);
  api.__setBase("");
});

test("load sends the cached etag and reuses the cache when unchanged", async () => {
  const ctx = setup(() => signed, bundleOk);
  await content.load();

  let sawEtag = null;
  let bundleFetches = 0;
  content.__setDeps({
    storage: ctx.storage,
    register: (d) => ctx.registered.push(d),
    fetch: async () => { bundleFetches++; return bundleOk(); },
  });
  api.__setDeps({
    fetch: async (u) => {
      sawEtag = new URL(u).searchParams.get("etag");
      return { ok: true, status: 200, json: async () => ({ unchanged: true }) };
    },
    token: async () => "TKN",
  });
  ctx.registered.length = 0;

  assert.strictEqual(await content.load(), 2);
  assert.strictEqual(sawEtag, "e1", "cached etag must be sent for revalidation");
  assert.strictEqual(bundleFetches, 0, "unchanged must not refetch 1.3 MB");
  assert.deepStrictEqual(ctx.registered.map((t) => t.id), ["dsa", "oop"]);
  api.__setBase("");
});

test("load refetches and re-registers when the etag moved on", async () => {
  const ctx = setup(() => signed, bundleOk);
  await content.load();
  api.__setDeps({
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ url: "https://s3.example/b2", etag: "e2" }) }),
    token: async () => "TKN",
  });
  content.__setDeps({
    storage: ctx.storage,
    register: (d) => ctx.registered.push(d),
    fetch: async () => ({ ok: true, json: async () => ({ topics: [...TOPICS, { id: "new" }] }) }),
  });
  ctx.registered.length = 0;
  assert.strictEqual(await content.load(), 3);
  assert.deepStrictEqual(ctx.registered.map((t) => t.id), ["dsa", "oop", "new"]);
  api.__setBase("");
});

test("load falls back to the cache when the network fails", async () => {
  const ctx = setup(() => signed, bundleOk);
  await content.load();
  api.__setDeps({ fetch: async () => { throw new Error("offline"); }, token: async () => "TKN" });
  ctx.registered.length = 0;
  assert.strictEqual(await content.load(), 2, "offline reload must still render cached content");
  api.__setBase("");
});

test("load resolves 0 rather than throwing with no cache and no network", async () => {
  setup(() => { throw new Error("offline"); }, bundleOk);
  assert.strictEqual(await content.load(), 0);
  api.__setBase("");
});

test("load resolves 0 when the bucket has no bundle yet", async () => {
  setup(() => ({ url: null, etag: "" }), bundleOk);
  assert.strictEqual(await content.load(), 0);
  api.__setBase("");
});

// A cold boot delivers two auth events almost together (auth.init()'s getSession
// hydrate and the SDK's INITIAL_SESSION). Both see "not loaded yet" while the
// first fetch is in flight, and each would otherwise pull the same ~1.3 MB.
test("concurrent load calls share one in-flight fetch", async () => {
  api.__setBase("https://x.dev");
  let release;
  const gate = new Promise((r) => { release = r; });
  let metaCalls = 0;
  let bundleCalls = 0;
  api.__setDeps({
    fetch: async () => {
      metaCalls++;
      await gate;
      return { ok: true, status: 200, json: async () => signed };
    },
    token: async () => "TKN",
  });
  const registered = [];
  content.__setDeps({
    storage: memStorage(),
    register: (d) => registered.push(d),
    fetch: async () => { bundleCalls++; return bundleOk(); },
  });

  const first = content.load();
  const second = content.load();
  assert.strictEqual(second, first, "the second caller must await the in-flight load");
  release();
  assert.deepStrictEqual(await Promise.all([first, second]), [2, 2]);
  assert.strictEqual(metaCalls, 1, "one presign, not one per auth event");
  assert.strictEqual(bundleCalls, 1, "the bundle must not be downloaded twice");
  assert.deepStrictEqual(registered.map((t) => t.id), ["dsa", "oop"], "registration must still happen exactly once");
  api.__setBase("");
});

test("the in-flight slot is released once a load settles", async () => {
  setup(() => signed, bundleOk);
  const first = content.load();
  await first;
  const second = content.load();
  assert.notStrictEqual(second, first, "a later boot must revalidate, not replay the finished promise");
  await second;
  api.__setBase("");
});

test("clearCache drops the bundle so the next user on the device cannot read it", async () => {
  const ctx = setup(() => signed, bundleOk);
  await content.load();
  assert.ok(ctx.storage.getItem("ip.content.bundle"), "precondition: the bundle was cached");
  content.clearCache();
  assert.strictEqual(ctx.storage.getItem("ip.content.bundle"), null);
  // Cache gone and network down: nothing renders, rather than the previous
  // user's content rendering before the next user's own fetch is authorized.
  api.__setDeps({ fetch: async () => { throw new Error("offline"); }, token: async () => "TKN" });
  assert.strictEqual(await content.load(), 0);
  api.__setBase("");
});

test("load tolerates an unwritable cache", async () => {
  api.__setBase("https://x.dev");
  api.__setDeps({
    fetch: async () => ({ ok: true, status: 200, json: async () => signed }),
    token: async () => "TKN",
  });
  const registered = [];
  content.__setDeps({
    storage: { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } },
    register: (d) => registered.push(d),
    fetch: bundleOk,
  });
  assert.strictEqual(await content.load(), 2, "a failed cache write must not break rendering");
  api.__setBase("");
});
