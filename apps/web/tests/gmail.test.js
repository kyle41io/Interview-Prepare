const test = require("node:test");
const assert = require("node:assert");
const g = require("../assets/js/gmail.js");

test("icsDate formats UTC basic", () => {
  assert.strictEqual(g.icsDate("2026-07-10T09:30:00.000Z"), "20260710T093000Z");
});
test("buildICS produces a valid VEVENT", () => {
  const ics = g.buildICS({ title: "Interview @ ACME", company: "ACME", kind: "interview", due_at: "2026-07-10T09:30:00.000Z" });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:Interview @ ACME/);
  // Floating wall-clock: DTSTART carries no trailing Z (see gmail.js buildICS).
  assert.match(ics, /DTSTART:20260710T093000\r\n/);
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

/* ---------- API routing ---------- */
function setup(calls) {
  global.window = global;
  global.IP = {
    api: {
      get: async (p) => {
        calls.push(["get", p]);
        return p.indexOf("reminders") >= 0 ? [] : [{ id: "n1", read: false, title: "t" }];
      },
      post: async (p, b) => { calls.push(["post", p, b]); return { id: "created", ...b }; },
      put: async (p, b) => { calls.push(["put", p, b]); return { ok: true }; },
      del: async (p) => { calls.push(["del", p]); return { deleted: true }; },
    },
    calendar: require("../assets/js/calendar.js"),
  };
}

test("fetchNotifications uses GET /v1/notifications", async () => {
  const calls = [];
  setup(calls);
  const list = await g.fetchNotifications();
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/notifications"));
  assert.strictEqual(list[0].id, "n1");
});

test("markRead(notif) posts to /v1/notifications/read with {created_at,id}", async () => {
  const calls = [];
  setup(calls);
  await g.markRead({ id: "n1", created_at: "2026-07-10T00:00:00Z" });
  const call = calls.find((c) => c[0] === "post" && c[1] === "/v1/notifications/read");
  assert.ok(call);
  assert.deepStrictEqual(call[2], { created_at: "2026-07-10T00:00:00Z", id: "n1" });
});

test("markAllRead posts to /v1/notifications/read-all", async () => {
  const calls = [];
  setup(calls);
  await g.markAllRead();
  assert.ok(calls.some((c) => c[0] === "post" && c[1] === "/v1/notifications/read-all"));
});

test("fetchReminders GETs /v1/reminders?status=upcoming", async () => {
  const calls = [];
  setup(calls);
  await g.fetchReminders();
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/reminders?status=upcoming,done"));
});

test("setReminderStatus PUTs /v1/reminders/<id>", async () => {
  const calls = [];
  setup(calls);
  await g.setReminderStatus("r1", "done");
  const call = calls.find((c) => c[0] === "put" && c[1] === "/v1/reminders/r1");
  assert.ok(call);
  assert.deepStrictEqual(call[2], { status: "done" });
});

test("status() GETs /v1/gmail/status", async () => {
  const calls = [];
  setup(calls);
  await g.status();
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/gmail/status"));
});

test("disconnect() POSTs /v1/gmail/disconnect", async () => {
  const calls = [];
  setup(calls);
  await g.disconnect();
  assert.ok(calls.some((c) => c[0] === "post" && c[1] === "/v1/gmail/disconnect"));
});

test("a rejected request resolves to a falsy result rather than throwing", async () => {
  global.window = global;
  global.IP = { api: {
    get: async () => { throw new Error("network"); },
    post: async () => { throw new Error("network"); },
    put: async () => { throw new Error("network"); },
    del: async () => { throw new Error("network"); },
  } };
  assert.deepStrictEqual(await g.fetchNotifications(), []);
  assert.deepStrictEqual(await g.fetchReminders(), []);
  assert.strictEqual(await g.markRead({ id: "n1" }), false);
  assert.strictEqual(await g.markAllRead(), false);
  assert.strictEqual(await g.setReminderStatus("r1", "done"), false);
  assert.strictEqual(await g.deleteReminder("r1"), false);
  assert.strictEqual(await g.status(), null);
  assert.strictEqual(await g.disconnect(), false);
});

test("createReminder POSTs /v1/reminders with a manual-source row", async () => {
  const calls = [];
  setup(calls);
  const row = await g.createReminder({ title: "Onsite", kind: "interview", company: "ACME", date: "2026-07-15", time: "14:30" });
  const call = calls.find((c) => c[0] === "post" && c[1] === "/v1/reminders");
  assert.ok(call);
  assert.strictEqual(call[2].title, "Onsite");
  assert.strictEqual(call[2].kind, "interview");
  assert.strictEqual(call[2].company, "ACME");
  assert.strictEqual(call[2].source, "manual");
  assert.strictEqual(call[2].status, "upcoming");
  assert.strictEqual(call[2].due_at, "2026-07-15T14:30:00.000Z");
  assert.strictEqual(call[2].deadline_at, null);
  assert.strictEqual(row.id, "created");
});
test("createReminder maps deadline kind to deadline_at", async () => {
  const calls = [];
  setup(calls);
  await g.createReminder({ title: "Submit take-home", kind: "deadline", date: "2026-07-20" });
  const call = calls.find((c) => c[0] === "post" && c[1] === "/v1/reminders");
  assert.strictEqual(call[2].deadline_at, "2026-07-20T00:00:00.000Z");
  assert.strictEqual(call[2].due_at, null);
});
test("deleteReminder DELETEs /v1/reminders/<id>", async () => {
  const calls = [];
  setup(calls);
  const ok = await g.deleteReminder("r9");
  assert.ok(calls.some((c) => c[0] === "del" && c[1] === "/v1/reminders/r9"));
  assert.strictEqual(ok, true);
});
test("createReminder returns null when the request is rejected", async () => {
  global.window = global;
  global.IP = { api: { post: async () => { throw new Error("network"); } }, calendar: require("../assets/js/calendar.js") };
  assert.strictEqual(await g.createReminder({ title: "x", kind: "interview", date: "2026-07-15" }), null);
});

test("buildICS ignores the offset a scanned reminder may carry", () => {
  // The row this covers is real: due_at "2026-08-22T09:00:00+07:00" for a 09:00
  // interview. Converting would have exported it as 02:00.
  const ics = g.buildICS({ title: "Interview", company: "TechPlus", kind: "interview", due_at: "2026-08-22T09:00:00+07:00" });
  assert.match(ics, /DTSTART:20260822T090000\r\n/);
});
