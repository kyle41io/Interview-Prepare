const test = require("node:test");
const assert = require("node:assert");
const streak = require("../assets/js/streak.js");

const base = { count: 3, lastActiveDate: "2026-06-16", dailyGoal: 1 };

test("compute: same day keeps count unchanged", () => {
  const result = streak.compute(base, "2026-06-16");
  assert.strictEqual(result.count, 3);
  assert.strictEqual(result.lastActiveDate, "2026-06-16");
});

test("compute: consecutive day increments count by 1", () => {
  const result = streak.compute(base, "2026-06-17");
  assert.strictEqual(result.count, 4);
  assert.strictEqual(result.lastActiveDate, "2026-06-17");
});

test("compute: gap resets count to 1", () => {
  const result = streak.compute(base, "2026-06-19");
  assert.strictEqual(result.count, 1);
  assert.strictEqual(result.lastActiveDate, "2026-06-19");
});

test("compute: first-ever (no prev) returns count 1", () => {
  const result = streak.compute(null, "2026-06-17");
  assert.strictEqual(result.count, 1);
  assert.strictEqual(result.lastActiveDate, "2026-06-17");
});

test("todayStr: returns YYYY-MM-DD string for a given Date", () => {
  const d = new Date(2026, 5, 17); // June 17, 2026 local
  assert.strictEqual(streak.todayStr(d), "2026-06-17");
});
