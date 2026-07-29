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
