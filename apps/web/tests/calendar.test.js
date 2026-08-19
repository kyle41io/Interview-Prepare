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

/* floatingIso: reminder times are floating wall-clock, but the scanner reads
   dates out of email bodies and the model attaches the sender's offset —
   "2026-08-22T09:00:00+07:00" for a 09:00 interview. Everything downstream
   renders reminder times in UTC on purpose, so a kept offset showed that
   interview at 02:00. The written digits are already local to the offset, so
   the zone is dropped rather than applied. */
test("floatingIso drops a trailing offset, keeping the wall clock", () => {
  assert.strictEqual(cal.floatingIso("2026-08-22T09:00:00+07:00"), "2026-08-22T09:00:00");
  assert.strictEqual(cal.floatingIso("2026-08-22T09:00:00+0700"), "2026-08-22T09:00:00");
  assert.strictEqual(cal.floatingIso("2026-08-22T09:00-05:00"), "2026-08-22T09:00");
});
test("floatingIso drops a trailing Z", () => {
  assert.strictEqual(cal.floatingIso("2026-07-10T09:30:00.000Z"), "2026-07-10T09:30:00.000");
});
test("floatingIso leaves a zoneless timestamp alone", () => {
  assert.strictEqual(cal.floatingIso("2026-08-07T15:30:00"), "2026-08-07T15:30:00");
  assert.strictEqual(cal.floatingIso("2026-08-07"), "2026-08-07");
});
test("floatingIso tolerates missing values", () => {
  assert.strictEqual(cal.floatingIso(null), "");
  assert.strictEqual(cal.floatingIso(undefined), "");
});

/* The pair that matters: a UTC render of the floating value shows the time the
   email wrote, whether or not the row carries an offset. */
test("an offset reminder and a floating one render the same clock time", () => {
  const asUtc = (v) => new Date(cal.floatingIso(v) + "Z").toISOString().slice(11, 16);
  assert.strictEqual(asUtc("2026-08-22T09:00:00+07:00"), "09:00");
  assert.strictEqual(asUtc("2026-08-22T09:00:00"), "09:00");
});
