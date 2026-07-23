const test = require("node:test");
const assert = require("node:assert");
const cal = require("../assets/js/calendar.js");

test("monthGrid returns 42 cells", () => {
  assert.strictEqual(cal.monthGrid(2026, 6).length, 42);
});
test("monthGrid: July 2026 starts on Wednesday (3 leading pads)", () => {
  const g = cal.monthGrid(2026, 6); // month 6 = July
  assert.deepStrictEqual(g[0], { date: null, inMonth: false, day: null });
  assert.deepStrictEqual(g[1], { date: null, inMonth: false, day: null });
  assert.deepStrictEqual(g[2], { date: null, inMonth: false, day: null });
  assert.deepStrictEqual(g[3], { date: "2026-07-01", inMonth: true, day: 1 });
  assert.deepStrictEqual(g[33], { date: "2026-07-31", inMonth: true, day: 31 });
  assert.deepStrictEqual(g[34], { date: null, inMonth: false, day: null });
});
test("monthGrid: February 2026 has 28 in-month cells starting Sunday", () => {
  const g = cal.monthGrid(2026, 1); // month 1 = February
  assert.deepStrictEqual(g[0], { date: "2026-02-01", inMonth: true, day: 1 });
  const inMonth = g.filter((c) => c.inMonth);
  assert.strictEqual(inMonth.length, 28);
  assert.strictEqual(inMonth[27].date, "2026-02-28");
});
test("buildWhen: non-deadline kind fills due_at only", () => {
  const w = cal.buildWhen({ kind: "interview", date: "2026-07-15", time: "14:30" });
  assert.strictEqual(w.due_at, "2026-07-15T14:30:00.000Z");
  assert.strictEqual(w.deadline_at, null);
});
test("buildWhen: deadline kind fills deadline_at only", () => {
  const w = cal.buildWhen({ kind: "deadline", date: "2026-07-15", time: "14:30" });
  assert.strictEqual(w.deadline_at, "2026-07-15T14:30:00.000Z");
  assert.strictEqual(w.due_at, null);
});
test("buildWhen: missing time defaults to midnight", () => {
  const w = cal.buildWhen({ kind: "test", date: "2026-07-15" });
  assert.strictEqual(w.due_at, "2026-07-15T00:00:00.000Z");
});
test("buildWhen: missing date returns nulls", () => {
  assert.deepStrictEqual(cal.buildWhen({ kind: "interview" }), { due_at: null, deadline_at: null });
});
