const test = require("node:test");
const assert = require("node:assert");
const api = require("../assets/js/api.js");

test("configured reflects API_URL", () => {
  api.__setBase("");
  assert.strictEqual(api.configured(), false);
  api.__setBase("https://x.dev");
  assert.strictEqual(api.configured(), true);
});

test("get builds URL + bearer header", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ ok: 1 }) }; },
    token: async () => "TKN",
  });
  const r = await api.get("/v1/progress");
  assert.strictEqual(calls[0][0], "https://x.dev/v1/progress");
  assert.strictEqual(calls[0][1].method, "GET");
  assert.strictEqual(calls[0][1].headers.Authorization, "Bearer TKN");
  assert.deepStrictEqual(r, { ok: 1 });
});

test("post builds URL + method + JSON body + bearer header", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ saved: true }) }; },
    token: async () => "TKN2",
  });
  const r = await api.post("/v1/progress", { id: "a1", done: true });
  assert.strictEqual(calls[0][0], "https://x.dev/v1/progress");
  assert.strictEqual(calls[0][1].method, "POST");
  assert.strictEqual(calls[0][1].headers.Authorization, "Bearer TKN2");
  assert.strictEqual(calls[0][1].headers["content-type"], "application/json");
  assert.strictEqual(calls[0][1].body, JSON.stringify({ id: "a1", done: true }));
  assert.deepStrictEqual(r, { saved: true });
});

test("put builds URL + method + JSON body", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ updated: true }) }; },
    token: async () => "TKN3",
  });
  const r = await api.put("/v1/state", { foo: "bar" });
  assert.strictEqual(calls[0][0], "https://x.dev/v1/state");
  assert.strictEqual(calls[0][1].method, "PUT");
  assert.strictEqual(calls[0][1].body, JSON.stringify({ foo: "bar" }));
  assert.deepStrictEqual(r, { updated: true });
});

test("request without a token omits Authorization header", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ ok: 1 }) }; },
    token: async () => null,
  });
  await api.get("/v1/progress");
  assert.strictEqual(calls[0][1].headers.Authorization, undefined);
});

test("non-2xx response rejects with status-carrying error", async () => {
  api.__setBase("https://x.dev");
  api.__setDeps({
    fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    token: async () => "TKN",
  });
  const r = await api.get("/v1/progress").catch((e) => e);
  assert.strictEqual(r.error, "http-500");
});

test("a non-2xx rejection carries the parsed error body", async () => {
  api.__setBase("https://x.dev");
  api.__setDeps({
    fetch: async () => ({ ok: false, status: 429, json: async () => ({ error: "quota-session", remaining: 0 }) }),
    token: async () => "TKN",
  });
  const r = await api.post("/v1/chat", {}).catch((e) => e);
  assert.strictEqual(r.error, "http-429");
  assert.strictEqual(r.status, 429);
  assert.strictEqual(r.body.error, "quota-session");
});

test("a non-2xx response with an unreadable body still rejects", async () => {
  api.__setBase("https://x.dev");
  api.__setDeps({
    // No json method at all — a bodyless 502 from a gateway.
    fetch: async () => ({ ok: false, status: 502 }),
    token: async () => "TKN",
  });
  const r = await api.get("/v1/progress").catch((e) => e);
  assert.strictEqual(r.error, "http-502");
  assert.strictEqual(r.body, null);
});

test("network error rejects", async () => {
  api.__setBase("https://x.dev");
  api.__setDeps({
    fetch: async () => { throw new Error("network down"); },
    token: async () => "TKN",
  });
  const r = await api.get("/v1/progress").catch((e) => e);
  assert.ok(r);
});

test("rejects when not configured", async () => {
  api.__setBase("");
  const r = await api.get("/v1/progress").catch((e) => e);
  assert.strictEqual(r.error, "api-not-configured");
});

test("post/put also reject when not configured", async () => {
  api.__setBase("");
  const r1 = await api.post("/v1/progress", {}).catch((e) => e);
  const r2 = await api.put("/v1/progress", {}).catch((e) => e);
  assert.strictEqual(r1.error, "api-not-configured");
  assert.strictEqual(r2.error, "api-not-configured");
});

test("del builds URL + DELETE method + bearer header, no body", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ deleted: true }) }; },
    token: async () => "TKN4",
  });
  const r = await api.del("/v1/reminders/r1");
  assert.strictEqual(calls[0][0], "https://x.dev/v1/reminders/r1");
  assert.strictEqual(calls[0][1].method, "DELETE");
  assert.strictEqual(calls[0][1].headers.Authorization, "Bearer TKN4");
  assert.strictEqual(calls[0][1].body, undefined);
  assert.deepStrictEqual(r, { deleted: true });
});
