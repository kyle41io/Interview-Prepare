const test = require("node:test");
const assert = require("node:assert");
const sync = require("../assets/js/sync.js");

test("progress is unioned (learned on either side)", () => {
  const out = sync.merge({ progress: { a: true } }, { progress: { b: true } });
  assert.deepStrictEqual(out.progress, { a: true, b: true });
});
test("bookmarks unioned + deduped", () => {
  const out = sync.merge({ bookmarks: ["a", "b"] }, { bookmarks: ["b", "c"] });
  assert.deepStrictEqual(out.bookmarks.sort(), ["a", "b", "c"]);
});
test("quizBest takes max per topic", () => {
  const out = sync.merge({ quizBest: { dsa: 80, x: 50 } }, { quizBest: { dsa: 60, y: 90 } });
  assert.deepStrictEqual(out.quizBest, { dsa: 80, x: 50, y: 90 });
});
test("cards keep entry with higher reps; tie -> later due", () => {
  const out = sync.merge(
    { cards: { "t#0": { reps: 3, due: 10 }, "t#1": { reps: 1, due: 5 } } },
    { cards: { "t#0": { reps: 5, due: 20 }, "t#1": { reps: 1, due: 9 } } }
  );
  assert.deepStrictEqual(out.cards["t#0"], { reps: 5, due: 20 }); // server higher reps
  assert.deepStrictEqual(out.cards["t#1"], { reps: 1, due: 9 });  // tie reps -> later due (server)
});
test("streak: higher count wins; tie -> later date", () => {
  assert.strictEqual(sync.merge({ streak: { count: 5, lastActiveDate: "2026-06-01" } }, { streak: { count: 3, lastActiveDate: "2026-06-10" } }).streak.count, 5);
  assert.strictEqual(sync.merge({ streak: { count: 3, lastActiveDate: "2026-06-01" } }, { streak: { count: 3, lastActiveDate: "2026-06-10" } }).streak.lastActiveDate, "2026-06-10");
});
test("scalars: local wins when present, else server", () => {
  const out = sync.merge({ lang: "en", theme: "dark", track: { role: "swe", level: "junior" } }, { lang: "vi", theme: "light", track: null });
  assert.strictEqual(out.lang, "en");
  assert.strictEqual(out.theme, "dark");
  assert.deepStrictEqual(out.track, { role: "swe", level: "junior" });
  // local track null -> server track used
  const out2 = sync.merge({ track: null }, { track: { role: "devops", level: "" } });
  assert.deepStrictEqual(out2.track, { role: "devops", level: "" });
});
test("missing fields -> safe defaults, no throw", () => {
  const out = sync.merge({}, {});
  assert.deepStrictEqual(out.progress, {});
  assert.deepStrictEqual(out.bookmarks, []);
  assert.strictEqual(out.lang, "vi");
  assert.strictEqual(out.theme, "system");
  assert.strictEqual(out.track, null);
});
test("does not mutate inputs", () => {
  const local = { progress: { a: true }, bookmarks: ["a"] };
  const server = { progress: { b: true }, bookmarks: ["b"] };
  sync.merge(local, server);
  assert.deepStrictEqual(local, { progress: { a: true }, bookmarks: ["a"] });
  assert.deepStrictEqual(server, { progress: { b: true }, bookmarks: ["b"] });
});
