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

/* ---------- API routing (Task 5) ---------- */
function setup(configured, calls) {
  global.window = global;
  global.IP = {
    api: {
      configured: () => configured,
      get: async (p) => {
        calls.push(["get", p]);
        return p.indexOf("reminders") >= 0 ? [] : [{ id: "n1", read: false, title: "t" }];
      },
      post: async (p, b) => {
        calls.push(["post", p, b]);
        return { ok: true };
      },
      put: async (p, b) => {
        calls.push(["put", p, b]);
        return { ok: true };
      },
    },
    auth: {
      client: () => ({
        from: () => ({
          select: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }),
          update: () => ({ eq: async () => ({ data: [] }) }),
          in: () => ({ order: async () => ({ data: [] }) }),
        }),
        functions: { invoke: async () => ({ data: null }) },
      }),
    },
  };
}

test("fetchNotifications uses GET /v1/notifications when configured", async () => {
  const calls = [];
  setup(true, calls);
  const list = await g.fetchNotifications();
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/notifications"));
  assert.strictEqual(list[0].id, "n1");
});

test("markRead(notif) posts to /v1/notifications/read with {created_at,id} when configured", async () => {
  const calls = [];
  setup(true, calls);
  await g.markRead({ id: "n1", created_at: "2026-07-10T00:00:00Z" });
  const call = calls.find((c) => c[0] === "post" && c[1] === "/v1/notifications/read");
  assert.ok(call);
  assert.deepStrictEqual(call[2], { created_at: "2026-07-10T00:00:00Z", id: "n1" });
});

test("markAllRead posts to /v1/notifications/read-all when configured", async () => {
  const calls = [];
  setup(true, calls);
  await g.markAllRead();
  assert.ok(calls.some((c) => c[0] === "post" && c[1] === "/v1/notifications/read-all"));
});

test("fetchReminders GETs /v1/reminders?status=upcoming when configured", async () => {
  const calls = [];
  setup(true, calls);
  await g.fetchReminders();
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/reminders?status=upcoming"));
});

test("setReminderStatus PUTs /v1/reminders/<id> when configured", async () => {
  const calls = [];
  setup(true, calls);
  await g.setReminderStatus("r1", "done");
  const call = calls.find((c) => c[0] === "put" && c[1] === "/v1/reminders/r1");
  assert.ok(call);
  assert.deepStrictEqual(call[2], { status: "done" });
});

test("status() GETs /v1/gmail/status when configured", async () => {
  const calls = [];
  setup(true, calls);
  await g.status();
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/gmail/status"));
});

test("disconnect() POSTs /v1/gmail/disconnect when configured", async () => {
  const calls = [];
  setup(true, calls);
  await g.disconnect();
  assert.ok(calls.some((c) => c[0] === "post" && c[1] === "/v1/gmail/disconnect"));
});

test("connectWithCode POSTs /v1/gmail/connect with code + redirect_uri", async () => {
  const calls = [];
  setup(true, calls);
  await g.connectWithCode("abc123", "https://example.com/cb");
  const call = calls.find((c) => c[0] === "post" && c[1] === "/v1/gmail/connect");
  assert.ok(call);
  assert.deepStrictEqual(call[2], { code: "abc123", redirect_uri: "https://example.com/cb" });
});

test("subscribeRealtime is a no-op returning null when configured (bell polls instead)", () => {
  const calls = [];
  setup(true, calls);
  const result = g.subscribeRealtime(() => {});
  assert.strictEqual(result, null);
});

test("not configured -> fetchNotifications uses Supabase path (no IP.api call)", async () => {
  const calls = [];
  setup(false, calls);
  await g.fetchNotifications();
  assert.strictEqual(calls.filter((c) => c[0] === "get").length, 0);
});

test("not configured -> markRead uses Supabase path (no IP.api call)", async () => {
  const calls = [];
  setup(false, calls);
  await g.markRead({ id: "n1", created_at: "2026-07-10T00:00:00Z" });
  assert.strictEqual(calls.filter((c) => c[0] === "post").length, 0);
});

test("not configured -> markAllRead, fetchReminders, setReminderStatus, status, disconnect use Supabase path", async () => {
  const calls = [];
  setup(false, calls);
  await g.markAllRead();
  await g.fetchReminders();
  await g.setReminderStatus("r1", "done");
  await g.status();
  await g.disconnect();
  assert.strictEqual(calls.length, 0);
});
