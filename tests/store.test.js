const test = require("node:test");
const assert = require("node:assert");
const store = require("../assets/js/store.js");

test("defaults() has all keys with safe values", () => {
  const d = store.defaults();
  assert.strictEqual(d.lang, "vi");
  assert.strictEqual(d.theme, "system");
  assert.strictEqual(d.track, null);
  assert.deepStrictEqual(d.progress, {});
  assert.deepStrictEqual(d.bookmarks, []);
  assert.deepStrictEqual(d.streak, { count: 0, lastActiveDate: null, dailyGoal: 1 });
  assert.strictEqual(d.schemaVersion, 1);
});

test("migrate() keeps existing values and fills missing", () => {
  const out = store.migrate({ lang: "en", progress: { dsa: true } });
  assert.strictEqual(out.lang, "en");                 // kept
  assert.deepStrictEqual(out.progress, { dsa: true }); // kept
  assert.strictEqual(out.theme, "system");            // filled
  assert.deepStrictEqual(out.bookmarks, []);          // filled
});

test("migrate() does not mutate input", () => {
  const input = { lang: "en" };
  store.migrate(input);
  assert.deepStrictEqual(input, { lang: "en" });
});
