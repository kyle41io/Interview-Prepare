const test = require("node:test");
const assert = require("node:assert");
const sync = require("../assets/js/sync.js");
const api = require("../assets/js/api.js");

/* ---------- adapter tests (pure) ---------- */

test("toApiSnapshot: maps progress->topics (only truthy), cards due->due_at, streak, settings", () => {
  const local = {
    lang: "en",
    theme: "dark",
    track: { role: "swe", level: "junior" },
    progress: { a: true, b: false, c: true },
    cards: { "t#0": { interval: 3, ease: 2.6, reps: 2, due: 12345 } },
    quizBest: { dsa: 80 },
    bookmarks: ["a", "b"],
    streak: { count: 5, lastActiveDate: "2026-07-01", dailyGoal: 3 },
    schemaVersion: 1,
  };
  const out = sync.toApiSnapshot(local);
  assert.deepStrictEqual(out.topics, { a: true, c: true });
  assert.deepStrictEqual(out.cards["t#0"], { due_at: 12345, interval: 3, ease: 2.6, reps: 2 });
  assert.deepStrictEqual(out.quizBest, { dsa: 80 });
  assert.deepStrictEqual(out.bookmarks, ["a", "b"]);
  assert.deepStrictEqual(out.streak, { current: 5, longest: 5, last_day: "2026-07-01" });
  assert.deepStrictEqual(out.settings, { lang: "en", theme: "dark", track_role: "swe", track_level: "junior" });
  // dailyGoal must never be sent to the API
  assert.strictEqual(out.dailyGoal, undefined);
});

test("toApiSnapshot: streak.longest derived as max(server longest, count); null streak -> null", () => {
  const withLonger = sync.toApiSnapshot({ streak: { count: 3, longest: 10, lastActiveDate: "d" } });
  assert.strictEqual(withLonger.streak.longest, 10);
  const withShorterLongest = sync.toApiSnapshot({ streak: { count: 20, longest: 4, lastActiveDate: "d" } });
  assert.strictEqual(withShorterLongest.streak.longest, 20);
  const noStreak = sync.toApiSnapshot({});
  assert.strictEqual(noStreak.streak, null);
});

test("toApiSnapshot: empty input -> all-empty shapes, no throw", () => {
  const out = sync.toApiSnapshot();
  assert.deepStrictEqual(out.topics, {});
  assert.deepStrictEqual(out.cards, {});
  assert.deepStrictEqual(out.quizBest, {});
  assert.deepStrictEqual(out.bookmarks, []);
  assert.strictEqual(out.streak, null);
  assert.deepStrictEqual(out.settings, { lang: undefined, theme: undefined, track_role: undefined, track_level: undefined });
});

test("fromApiSnapshot: maps topics->progress (all true), cards due_at->due, streak, settings; keeps local dailyGoal", () => {
  const apiSnap = {
    topics: { a: true, c: true },
    cards: { "t#0": { due_at: 12345, interval: 3, ease: 2.6, reps: 2 } },
    quizBest: { dsa: 80 },
    bookmarks: ["a", "b"],
    streak: { current: 5, longest: 9, last_day: "2026-07-01" },
    settings: { lang: "en", theme: "dark", track_role: "swe", track_level: "junior" },
  };
  const out = sync.fromApiSnapshot(apiSnap, { streak: { dailyGoal: 3 } });
  assert.deepStrictEqual(out.progress, { a: true, c: true });
  assert.deepStrictEqual(out.cards["t#0"], { interval: 3, ease: 2.6, reps: 2, due: 12345 });
  assert.deepStrictEqual(out.quizBest, { dsa: 80 });
  assert.deepStrictEqual(out.bookmarks, ["a", "b"]);
  assert.strictEqual(out.streak.count, 5);
  assert.strictEqual(out.streak.lastActiveDate, "2026-07-01");
  assert.strictEqual(out.streak.dailyGoal, 3); // preserved from local, not from API
  assert.strictEqual(out.lang, "en");
  assert.strictEqual(out.theme, "dark");
  assert.deepStrictEqual(out.track, { role: "swe", level: "junior" });
  assert.strictEqual(out.schemaVersion, 1);
});

test("fromApiSnapshot: no streak -> zeroed streak with dailyGoal fallback of 1; no track fields -> null track", () => {
  const out = sync.fromApiSnapshot({ settings: {} }, null);
  assert.deepStrictEqual(out.streak, { count: 0, lastActiveDate: null, dailyGoal: 1 });
  assert.strictEqual(out.track, null);
});

test("fromApiSnapshot: empty input -> all-empty shapes, no throw", () => {
  const out = sync.fromApiSnapshot();
  assert.deepStrictEqual(out.progress, {});
  assert.deepStrictEqual(out.cards, {});
  assert.deepStrictEqual(out.quizBest, {});
  assert.deepStrictEqual(out.bookmarks, []);
  assert.deepStrictEqual(out.streak, { count: 0, lastActiveDate: null, dailyGoal: 1 });
  assert.strictEqual(out.track, null);
});

test("round-trip: fromApiSnapshot(toApiSnapshot(local)) preserves progress/cards/quizBest/bookmarks/streak.count/lang/theme/track, keeps local dailyGoal", () => {
  const local = {
    lang: "vi",
    theme: "system",
    track: { role: "devops", level: "mid" },
    progress: { a: true, b: true },
    cards: { "t#0": { interval: 6, ease: 2.5, reps: 4, due: 555 } },
    quizBest: { dsa: 70, sys: 90 },
    bookmarks: ["x", "y"],
    streak: { count: 7, lastActiveDate: "2026-07-05", dailyGoal: 5 },
    schemaVersion: 1,
  };
  const roundTripped = sync.fromApiSnapshot(sync.toApiSnapshot(local), local);
  assert.deepStrictEqual(roundTripped.progress, local.progress);
  assert.deepStrictEqual(roundTripped.cards["t#0"], local.cards["t#0"]);
  assert.deepStrictEqual(roundTripped.quizBest, local.quizBest);
  assert.deepStrictEqual(roundTripped.bookmarks, local.bookmarks);
  assert.strictEqual(roundTripped.streak.count, local.streak.count);
  assert.strictEqual(roundTripped.streak.dailyGoal, local.streak.dailyGoal); // dailyGoal preserved locally, not through API
  assert.strictEqual(roundTripped.lang, local.lang);
  assert.strictEqual(roundTripped.theme, local.theme);
  assert.deepStrictEqual(roundTripped.track, local.track);
});

test("round-trip: empty local -> empty shapes, no throw", () => {
  const roundTripped = sync.fromApiSnapshot(sync.toApiSnapshot({}), {});
  assert.deepStrictEqual(roundTripped.progress, {});
  assert.deepStrictEqual(roundTripped.cards, {});
  assert.deepStrictEqual(roundTripped.quizBest, {});
  assert.deepStrictEqual(roundTripped.bookmarks, []);
  assert.deepStrictEqual(roundTripped.streak, { count: 0, lastActiveDate: null, dailyGoal: 1 });
});

/* ---------- gating tests: pull()/push() branch on IP.api.configured() ---------- */

test("configured()->false: pull() takes the Supabase branch, never touches IP.api (no auth -> null, no throw)", async () => {
  api.__setBase("");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push(["fetch", u, o]); return { ok: true, json: async () => ({}) }; },
    token: async () => "TKN",
  });
  const origAuth = global.IP && global.IP.auth;
  if (global.IP) delete global.IP.auth; // no auth configured -> Supabase branch returns null early
  const result = await sync.pull();
  assert.strictEqual(result, null);
  assert.strictEqual(calls.length, 0); // IP.api.get was never invoked
  if (origAuth) global.IP.auth = origAuth;
});

test("configured()->false: push() takes the Supabase branch, never touches IP.api", async () => {
  api.__setBase("");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push(["fetch", u, o]); return { ok: true, json: async () => ({}) }; },
    token: async () => "TKN",
  });
  const origAuth = global.IP && global.IP.auth;
  if (global.IP) delete global.IP.auth; // no auth configured -> Supabase branch returns early
  await sync.push({ progress: { a: true } });
  assert.strictEqual(calls.length, 0); // IP.api.post was never invoked
  if (origAuth) global.IP.auth = origAuth;
});

test("configured()->true: pull() calls IP.api.get('/v1/progress') and adapts the response", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => {
      calls.push([u, o]);
      return {
        ok: true,
        json: async () => ({
          topics: { a: true },
          cards: {},
          quizBest: {},
          bookmarks: [],
          streak: { current: 2, longest: 2, last_day: "2026-07-01" },
          settings: { lang: "en", theme: "dark", track_role: null, track_level: null },
        }),
      };
    },
    token: async () => "TKN",
  });
  const result = await sync.pull();
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0][0], "https://x.dev/v1/progress");
  assert.strictEqual(calls[0][1].method, "GET");
  // response was translated via fromApiSnapshot, not passed through raw
  assert.deepStrictEqual(result.progress, { a: true });
  assert.strictEqual(result.streak.count, 2);
  assert.strictEqual(result.lang, "en");
  api.__setBase(""); // reset for subsequent tests
});

test("configured()->true: push() calls IP.api.post('/v1/progress/sync', <adapted body>)", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ ok: true }) }; },
    token: async () => "TKN",
  });
  const state = {
    lang: "en",
    theme: "dark",
    track: { role: "swe", level: "junior" },
    progress: { a: true, b: false },
    cards: { "t#0": { interval: 1, ease: 2.5, reps: 0, due: 999 } },
    quizBest: { dsa: 50 },
    bookmarks: ["a"],
    streak: { count: 1, lastActiveDate: "2026-07-10", dailyGoal: 1 },
  };
  await sync.push(state);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0][0], "https://x.dev/v1/progress/sync");
  assert.strictEqual(calls[0][1].method, "POST");
  const sentBody = JSON.parse(calls[0][1].body);
  assert.deepStrictEqual(sentBody, sync.toApiSnapshot(state));
  assert.deepStrictEqual(sentBody.topics, { a: true });
  assert.strictEqual(sentBody.cards["t#0"].due_at, 999);
  api.__setBase(""); // reset for subsequent tests
});
