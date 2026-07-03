const test = require("node:test");
const assert = require("node:assert");
const g = require("../assets/js/gmail.js");

test("looksRecruiting matches EN + VI keywords", () => {
  assert.ok(g.looksRecruiting("Interview invitation", "we'd like to schedule"));
  assert.ok(g.looksRecruiting("Thư mời phỏng vấn", "vòng kỹ thuật"));
  assert.ok(g.looksRecruiting("Coding assessment", "HackerRank test link"));
  assert.strictEqual(g.looksRecruiting("Your Amazon order", "has shipped"), false);
});
test("icsDate formats UTC basic", () => {
  assert.strictEqual(g.icsDate("2026-07-10T09:30:00.000Z"), "20260710T093000Z");
});
test("buildICS produces a valid VEVENT", () => {
  const ics = g.buildICS({ title: "Interview @ ACME", company: "ACME", kind: "interview", due_at: "2026-07-10T09:30:00.000Z" });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:Interview @ ACME/);
  assert.match(ics, /DTSTART:20260710T093000Z/);
  assert.match(ics, /END:VCALENDAR/);
});
test("buildICS escapes commas/semicolons per RFC5545", () => {
  const ics = g.buildICS({ title: "Test, round 1; final", company: "X", kind: "test", due_at: "2026-07-10T09:30:00.000Z" });
  assert.match(ics, /SUMMARY:Test\\, round 1\\; final/);
});
test("notifIcon maps types", () => {
  assert.strictEqual(typeof g.notifIcon("interview"), "string");
  assert.ok(g.notifIcon("offer").length >= 1);
});
