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

/* Two kinds of timestamp share the reminder table. A scanned one carries the
   sender's offset ("2026-08-22T09:00:00+07:00" for a 09:00 interview in
   Vietnam) and is a real instant; a hand-typed one is floating wall-clock and
   the bare "Z" buildWhen writes is part of how it is stored, not a claim about
   UTC. hasZone is the test that tells them apart, and everything below hangs
   off it. */
test("hasZone spots an explicit offset", () => {
  assert.strictEqual(cal.hasZone("2026-08-22T09:00:00+07:00"), true);
  assert.strictEqual(cal.hasZone("2026-08-22T09:00:00+0700"), true);
  assert.strictEqual(cal.hasZone("2026-08-22T09:00-05:00"), true);
  assert.strictEqual(cal.hasZone("2026-08-22T09:00:00+00:00"), true);
});
test("hasZone treats a bare Z and a zoneless value as floating", () => {
  assert.strictEqual(cal.hasZone("2026-07-10T09:30:00.000Z"), false);
  assert.strictEqual(cal.hasZone("2026-08-07T15:30:00"), false);
  assert.strictEqual(cal.hasZone("2026-08-07"), false);
  assert.strictEqual(cal.hasZone(null), false);
});

test("floatingIso drops a trailing offset", () => {
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

test("whenDate reads a zone-bearing value as the instant it names", () => {
  assert.strictEqual(cal.whenDate("2026-08-22T09:00:00+07:00").toISOString(), "2026-08-22T02:00:00.000Z");
});
test("whenDate hands a floating value's own digits back through getUTC*", () => {
  // This is what keeps a typed "15:30" from drifting with the browser's zone.
  const d = cal.whenDate("2026-08-07T15:30:00");
  assert.strictEqual(d.getUTCHours(), 15);
  assert.strictEqual(d.getUTCMinutes(), 30);
});
test("whenDate treats a date with no time as midnight", () => {
  assert.strictEqual(cal.whenDate("2026-08-07").toISOString(), "2026-08-07T00:00:00.000Z");
});
test("whenDate returns null for junk and blanks", () => {
  assert.strictEqual(cal.whenDate("deadline"), null);
  assert.strictEqual(cal.whenDate(""), null);
  assert.strictEqual(cal.whenDate(null), null);
});

test("whenDateKey buckets a floating reminder by the digits it was typed with", () => {
  assert.strictEqual(cal.whenDateKey("2026-08-22T15:30:00.000Z"), "2026-08-22");
  assert.strictEqual(cal.whenDateKey("2026-08-22"), "2026-08-22");
});
test("whenDateKey buckets a zone-bearing reminder by the viewer's own day", () => {
  // Which day this lands on depends on where it is read, so the assertion is
  // relational: the key is the local date of that instant, whatever TZ the
  // suite runs under.
  const iso = "2026-08-22T09:00:00+07:00";
  const d = new Date(iso);
  const local = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  assert.strictEqual(cal.whenDateKey(iso), local);
});
test("whenDateKey tolerates missing values", () => {
  assert.strictEqual(cal.whenDateKey(null), null);
  assert.strictEqual(cal.whenDateKey(""), null);
});

test("formatWhenTime shows a floating time exactly as written", () => {
  assert.strictEqual(cal.formatWhenTime("2026-08-22T15:30:00.000Z", "en-GB"), "15:30");
  assert.strictEqual(cal.formatWhenTime("2026-08-07T09:05:00", "en-GB"), "09:05");
});
test("formatWhenTime converts a zone-bearing time into the viewer's zone", () => {
  const iso = "2026-08-22T09:00:00+07:00";
  assert.strictEqual(
    cal.formatWhenTime(iso, "en-GB"),
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  );
});
test("formatWhenTime returns empty for a reminder with no date", () => {
  assert.strictEqual(cal.formatWhenTime(null, "en-GB"), "");
  assert.strictEqual(cal.formatWhenTime("deadline", "en-GB"), "");
});

/* The user's own case, pinned rather than relational: they are in GMT+7 and the
   TechPlus invitation is stored as 09:00+07:00, so their calendar has to read
   09:00 — it read 02:00 before, because every renderer formatted in UTC. A
   child process is the only way to fix a timezone for a Node test. */
test("a GMT+7 reader sees a 09:00+07:00 interview at 09:00", () => {
  const { execFileSync } = require("node:child_process");
  const script = `const cal = require("${require.resolve("../assets/js/calendar.js")}");
    process.stdout.write(cal.formatWhenTime("2026-08-22T09:00:00+07:00", "en-GB") + "|" + cal.whenDateKey("2026-08-22T09:00:00+07:00"));`;
  const out = execFileSync(process.execPath, ["-e", script], {
    env: Object.assign({}, process.env, { TZ: "Asia/Ho_Chi_Minh" }),
    encoding: "utf8",
  });
  assert.strictEqual(out, "09:00|2026-08-22");
});
test("a GMT+0 reader sees that same interview at their own 02:00", () => {
  const { execFileSync } = require("node:child_process");
  const script = `const cal = require("${require.resolve("../assets/js/calendar.js")}");
    process.stdout.write(cal.formatWhenTime("2026-08-22T09:00:00+07:00", "en-GB"));`;
  const out = execFileSync(process.execPath, ["-e", script], {
    env: Object.assign({}, process.env, { TZ: "UTC" }),
    encoding: "utf8",
  });
  assert.strictEqual(out, "02:00");
});
