# Reminders Calendar + Scan Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Reminders page into a navigable month-calendar grid with a side panel for adding/deleting interview & deadline events, and tune the Gmail scan to read the last 2 months without creating stale past-dated calendar entries.

**Architecture:** All reminder reads/writes run on the existing Supabase fallback path (`IP_CONFIG.API_URL` is `""`), keeping the dormant `IP.api` seam. Pure date/layout helpers go in a new `assets/js/calendar.js` (`IP.calendar`) so they are unit-testable under the existing `node --test` harness. `app.js` `renderReminders()` is rewritten to draw the grid + panel; `gmail.js` gains `createReminder`/`deleteReminder`. One surgical edit to the `gmail-scan` edge function widens the window and drops stale reminders at insert time.

**Tech Stack:** Vanilla JS (no build), dual-export module pattern (`root.IP.x` + `module.exports`), `node --test` (node 18), Supabase JS client, Deno edge function (TypeScript).

## Global Constraints

- Vanilla JS, no build step. Every new module uses the dual-export IIFE wrapper matching `assets/js/gmail.js`/`api.js`.
- Keep the `IP.api`-or-Supabase seam in `IP.gmail`: new functions use `IP.api.*` when `IP.api.configured()`, else the Supabase client via `IP.auth.client()`.
- Full frontend suite `node --test tests/*.test.js` must stay green (currently 105/105) and grow with new tests.
- Per-feature incremental commits (one feature per commit).
- Do NOT use Fable models anywhere.
- Reference date for defaults/tests: 2026-07-22. The test env runs in UTC.
- Manual events persist to the same `reminders` table with `source:"manual"`, `status:"upcoming"`; scanned events carry the Gmail message id as `source`.
- Calendar = dated online-test + interview (+ manual) events only; the notification bell keeps carrying confirmations and everything else (unchanged).

**Deviation from spec (flag at handoff):** the spec's §7 lists a frontend unit test for `isStalePastDate`. That predicate lives only in the Deno edge function (§1); the browser deliberately does NOT filter by it, because filtering >30-day-past events client-side would hide legitimately-old completed events when the user navigates back to a past month. It is verified via the edge function's non-destructive `?inspect=1` path instead. `monthGrid` and `buildWhen` (both genuinely consumed by the frontend) carry the new unit tests.

---

### Task 1: Scan tuning — 60-day window + drop stale past reminders

**Files:**
- Modify: `supabase/functions/gmail-scan/index.ts` (line 23 `DEFAULT_Q`; add helper near line 24; wrap the reminder-insert at lines 91-96)

**Interfaces:**
- Produces: no frontend-visible interface. Behavior change only: `DEFAULT_Q` reads `newer_than:60d`; reminders whose effective date is >30 days before now are not inserted (the notification is still inserted).

No automated test harness exists for the edge function; verify by reading the diff and (post-deploy) via `?inspect=1`.

- [ ] **Step 1: Widen the scan window**

In `supabase/functions/gmail-scan/index.ts`, change line 23 from:

```ts
const DEFAULT_Q = "newer_than:14d in:inbox " + KW_QUERY;
```

to:

```ts
const DEFAULT_Q = "newer_than:60d in:inbox " + KW_QUERY;
```

- [ ] **Step 2: Add the stale-date predicate**

Immediately after the `DEFAULT_Q` line (line 23), add:

```ts
// A reminder inherits the event date the AI extracted from inside the email.
// Emails can reference dates far in the past (old mock tests, forwarded threads);
// those must not become calendar entries. Undated / unparseable = not stale.
function isStalePastDate(iso: string | null, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (isNaN(t)) return false;
  return t < now - 30 * 24 * 60 * 60 * 1000;
}
```

- [ ] **Step 3: Guard the reminder insert (notification still inserted)**

Replace the reminder-insert block (currently lines 91-96):

```ts
      if ((c.kind === "test" || c.kind === "interview") && (c.event_at || c.deadline_at)) {
        await admin.from("reminders").insert({
          user_id: acc.user_id, kind: c.kind, title: c.title || subject, company: c.company || null,
          due_at: c.event_at || null, deadline_at: c.deadline_at || null, source: m.id,
        });
      }
```

with:

```ts
      if ((c.kind === "test" || c.kind === "interview") && (c.event_at || c.deadline_at)
          && !isStalePastDate(c.event_at || c.deadline_at, Date.now())) {
        await admin.from("reminders").insert({
          user_id: acc.user_id, kind: c.kind, title: c.title || subject, company: c.company || null,
          due_at: c.event_at || null, deadline_at: c.deadline_at || null, source: m.id,
        });
      }
```

The `notifications` insert directly above it is untouched, so the bell stays complete.

- [ ] **Step 4: Verify the diff reads correctly**

Run: `git diff supabase/functions/gmail-scan/index.ts`
Expected: exactly the three changes above — `60d`, the new `isStalePastDate` function, and the guarded insert. No other lines changed.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/gmail-scan/index.ts
git commit -m "feat(scan): widen Gmail scan to 60d and drop stale past-dated reminders"
```

---

### Task 2: `IP.calendar` pure helpers + tests

**Files:**
- Create: `assets/js/calendar.js`
- Create: `tests/calendar.test.js`
- Modify: `index.html:138` (add `<script>` tag before `gmail.js`)

**Interfaces:**
- Produces:
  - `monthGrid(year, month)` → `Array<{ date: string|null, inMonth: boolean, day: number|null }>` of length 42. `year` is a full year (e.g. 2026); `month` is 0-based (0=Jan). `date` is `"YYYY-MM-DD"` for in-month cells, `null` for leading/trailing padding cells.
  - `buildWhen({ kind, date, time })` → `{ due_at: string|null, deadline_at: string|null }`. `date` is `"YYYY-MM-DD"` or falsy; `time` is `"HH:MM"` or falsy. `kind === "deadline"` sets `deadline_at`; any other kind sets `due_at`; the other field is `null`. Falsy `date` → both `null`.

- [ ] **Step 1: Write the failing tests**

Create `tests/calendar.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/calendar.test.js`
Expected: FAIL — `Cannot find module '../assets/js/calendar.js'`.

- [ ] **Step 3: Implement `assets/js/calendar.js`**

```js
/* IP.calendar — pure calendar layout + reminder date helpers (no I/O, no DOM).
   Dual-export: root.IP.calendar always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.IP = root.IP || {};
  root.IP.calendar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function pad2(n) { return String(n).padStart(2, "0"); }

  /* Pure: 42-cell month grid (6 rows x 7 cols), Sunday-first.
     month is 0-based. Padding cells (before the 1st / after the last) are null. */
  function monthGrid(year, month) {
    var startWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var cells = [];
    for (var i = 0; i < 42; i++) {
      var dayNum = i - startWeekday + 1;
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        cells.push({ date: year + "-" + pad2(month + 1) + "-" + pad2(dayNum), inMonth: true, day: dayNum });
      } else {
        cells.push({ date: null, inMonth: false, day: null });
      }
    }
    return cells;
  }

  /* Pure: map a manual-entry {kind,date,time} to reminder-table timestamp columns.
     kind "deadline" -> deadline_at; anything else -> due_at. */
  function buildWhen(opts) {
    opts = opts || {};
    if (!opts.date) return { due_at: null, deadline_at: null };
    var iso = new Date(opts.date + "T" + (opts.time || "00:00")).toISOString();
    if (opts.kind === "deadline") return { due_at: null, deadline_at: iso };
    return { due_at: iso, deadline_at: null };
  }

  return { monthGrid: monthGrid, buildWhen: buildWhen };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/calendar.test.js`
Expected: PASS — 7 tests pass.

- [ ] **Step 5: Load the module in the browser**

In `index.html`, add a script tag immediately before the `gmail.js` line (currently line 138):

```html
<script src="assets/js/calendar.js"></script>
<script src="assets/js/gmail.js"></script>
```

- [ ] **Step 6: Commit**

```bash
git add assets/js/calendar.js tests/calendar.test.js index.html
git commit -m "feat(calendar): pure monthGrid + buildWhen helpers with tests"
```

---

### Task 3: Data layer — `createReminder`, `deleteReminder`, broaden `fetchReminders`, `api.del`

**Files:**
- Modify: `assets/js/api.js:46-53` (add `del` verb)
- Modify: `assets/js/gmail.js` (broaden `fetchReminders`; add `createReminder`, `deleteReminder`; extend `notifIcon`; export the two new fns)
- Modify: `tests/api.test.js` (add `del` test)
- Modify: `tests/gmail.test.js` (update `fetchReminders` URL assertion; add create/delete tests; inject `IP.calendar` in setup)

**Interfaces:**
- Consumes: `IP.calendar.buildWhen` (Task 2); `IP.api.del` (this task).
- Produces:
  - `IP.api.del(path)` → same contract as `get`/`post`/`put`, method `DELETE`, no body.
  - `IP.gmail.createReminder({ title, kind, company, date, time })` → resolves to the created row object on success, or `null` on failure / logged-out. API path: `POST /v1/reminders` with the row body. Supabase path: insert into `reminders`.
  - `IP.gmail.deleteReminder(id)` → resolves `true`/`false`. API path: `DELETE /v1/reminders/<id>`. Supabase path: delete by id.
  - `IP.gmail.fetchReminders()` → now returns `upcoming` + `done` reminders (was `upcoming` only). API path URL: `/v1/reminders?status=upcoming,done`.

- [ ] **Step 1: Write the failing `api.del` test**

In `tests/api.test.js`, append:

```js
test("del builds URL + DELETE method + bearer header, no body", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({
    fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ deleted: true }) }; },
    token: async () => "TKN4",
  });
  const r = await api.del("/v1/reminders/r1");
  assert.strictEqual(calls[0][0], "https://x.dev/v1/reminders/r1");
  assert.strictEqual(calls[0][1].method, "DELETE");
  assert.strictEqual(calls[0][1].headers.Authorization, "Bearer TKN4");
  assert.strictEqual(calls[0][1].body, undefined);
  assert.deepStrictEqual(r, { deleted: true });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/api.test.js`
Expected: FAIL — `api.del is not a function`.

- [ ] **Step 3: Add the `del` verb to `api.js`**

In `assets/js/api.js`, change the returned object (lines 46-53) to add `del`:

```js
  return {
    configured,
    get: (p) => _req("GET", p),
    post: (p, b) => _req("POST", p, b),
    put: (p, b) => _req("PUT", p, b),
    del: (p) => _req("DELETE", p),
    __setBase,
    __setDeps,
  };
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test tests/api.test.js`
Expected: PASS.

- [ ] **Step 5: Update the `fetchReminders` test and write the new gmail tests**

In `tests/gmail.test.js`, add `del` to the mocked `api` and inject `IP.calendar` inside `setup()` (lines 32-61). Change the `api` object and the `IP` object:

```js
function setup(configured, calls) {
  global.window = global;
  global.IP = {
    api: {
      configured: () => configured,
      get: async (p) => {
        calls.push(["get", p]);
        return p.indexOf("reminders") >= 0 ? [] : [{ id: "n1", read: false, title: "t" }];
      },
      post: async (p, b) => { calls.push(["post", p, b]); return { id: "created", ...b }; },
      put: async (p, b) => { calls.push(["put", p, b]); return { ok: true }; },
      del: async (p) => { calls.push(["del", p]); return { deleted: true }; },
    },
    calendar: require("../assets/js/calendar.js"),
    auth: {
      getUser: () => ({ id: "u1" }),
      client: () => ({
        from: () => ({
          select: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }),
          update: () => ({ eq: async () => ({ data: [] }) }),
          in: () => ({ order: async () => ({ data: [] }) }),
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: "sup" } }) }) }),
          delete: () => ({ eq: async () => ({ data: [] }) }),
        }),
        functions: { invoke: async () => ({ data: null }) },
      }),
    },
  };
}
```

Update the existing `fetchReminders` URL assertion (line 91) from:

```js
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/reminders?status=upcoming"));
```

to:

```js
  assert.ok(calls.some((c) => c[0] === "get" && c[1] === "/v1/reminders?status=upcoming,done"));
```

Append new tests:

```js
test("createReminder POSTs /v1/reminders with a manual-source row when configured", async () => {
  const calls = [];
  setup(true, calls);
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
  setup(true, calls);
  await g.createReminder({ title: "Submit take-home", kind: "deadline", date: "2026-07-20" });
  const call = calls.find((c) => c[0] === "post" && c[1] === "/v1/reminders");
  assert.strictEqual(call[2].deadline_at, "2026-07-20T00:00:00.000Z");
  assert.strictEqual(call[2].due_at, null);
});
test("deleteReminder DELETEs /v1/reminders/<id> when configured", async () => {
  const calls = [];
  setup(true, calls);
  const ok = await g.deleteReminder("r9");
  assert.ok(calls.some((c) => c[0] === "del" && c[1] === "/v1/reminders/r9"));
  assert.strictEqual(ok, true);
});
test("not configured -> createReminder + deleteReminder use Supabase path (no IP.api call)", async () => {
  const calls = [];
  setup(false, calls);
  await g.createReminder({ title: "x", kind: "interview", date: "2026-07-15" });
  await g.deleteReminder("r1");
  assert.strictEqual(calls.length, 0);
});
```

- [ ] **Step 6: Run gmail tests to verify the new ones fail**

Run: `node --test tests/gmail.test.js`
Expected: FAIL — `g.createReminder is not a function` (and the updated URL assertion fails).

- [ ] **Step 7: Broaden `fetchReminders` in `gmail.js`**

In `assets/js/gmail.js`, replace `fetchReminders` (lines 158-175):

```js
  /* Stateful: fetch reminders for the calendar (upcoming + completed) */
  async function fetchReminders() {
    if (_apiOn()) {
      try {
        return (await _api().get("/v1/reminders?status=upcoming,done")) || [];
      } catch (e) {
        return [];
      }
    }
    var c = _client();
    if (!c) return [];
    try {
      var res = await c.from("reminders").select("*").in("status", ["upcoming", "done"]).order("due_at");
      return (res && res.data) || [];
    } catch (e) {
      return [];
    }
  }
```

- [ ] **Step 8: Add `createReminder` and `deleteReminder` in `gmail.js`**

Immediately after `setReminderStatus` (after line 195), add:

```js
  /* Stateful: create a manual calendar reminder (source:"manual").
     Returns the created row on success, else null. */
  async function createReminder(opts) {
    var when = (root.IP && root.IP.calendar)
      ? root.IP.calendar.buildWhen(opts)
      : { due_at: null, deadline_at: null };
    var row = {
      kind: opts.kind || "other",
      title: opts.title || "",
      company: opts.company || null,
      due_at: when.due_at,
      deadline_at: when.deadline_at,
      source: "manual",
      status: "upcoming",
    };
    if (_apiOn()) {
      try {
        return (await _api().post("/v1/reminders", row)) || null;
      } catch (e) {
        return null;
      }
    }
    var c = _client();
    if (!c) return null;
    var user = root.IP && root.IP.auth && root.IP.auth.getUser && root.IP.auth.getUser();
    if (!user || !user.id) return null;
    row.user_id = user.id;
    try {
      var res = await c.from("reminders").insert(row).select().single();
      return (res && res.data) || null;
    } catch (e) {
      return null;
    }
  }

  /* Stateful: hard-delete a reminder (used only for source:"manual" events). */
  async function deleteReminder(id) {
    if (_apiOn()) {
      try {
        await _api().del("/v1/reminders/" + encodeURIComponent(id));
        return true;
      } catch (e) {
        return false;
      }
    }
    var c = _client();
    if (!c) return false;
    try {
      await c.from("reminders").delete().eq("id", id);
      return true;
    } catch (e) {
      return false;
    }
  }
```

- [ ] **Step 9: Extend `notifIcon` for the deadline kind and export the new fns**

In `assets/js/gmail.js`, change `notifIcon` (lines 57-59) to include `deadline`:

```js
  function notifIcon(type) {
    return ({ test: "📝", interview: "📅", offer: "🎉", rejection: "🙏", deadline: "⏰", other: "✉️" })[type] || "✉️";
  }
```

Add both functions to the returned object (after `setReminderStatus: setReminderStatus,` at line 286):

```js
    setReminderStatus: setReminderStatus,
    createReminder: createReminder,
    deleteReminder: deleteReminder,
```

- [ ] **Step 10: Run the full frontend suite**

Run: `node --test tests/*.test.js`
Expected: PASS — all tests pass (105 prior + `del` + 4 new gmail tests + 7 calendar tests).

- [ ] **Step 11: Commit**

```bash
git add assets/js/api.js assets/js/gmail.js tests/api.test.js tests/gmail.test.js
git commit -m "feat(gmail): createReminder/deleteReminder, broaden fetchReminders, api.del"
```

---

### Task 4: Month-grid render + navigation + i18n strings

**Files:**
- Modify: `assets/js/app.js:130-155` (add calendar UI strings to the `UI` object region — near existing `reminders`/`exportIcs` keys)
- Modify: `assets/js/app.js:606-649` (add `Calendar` state + `pad2`/`remDateKey` helpers; rewrite `renderReminders`)

**Interfaces:**
- Consumes: `IP.calendar.monthGrid` (Task 2); `IP.gmail.notifIcon`, `IP.gmail.buildICS` (existing); `t`, `esc`, `fa`, `UI`, `State`, `Reminders`, `render` (existing app.js internals).
- Produces (used by Task 5's handlers): DOM data-attributes `data-cal-prev`, `data-cal-next`, `data-cal-today`, `data-cal-day="YYYY-MM-DD"`, `data-cal-del="<id>"`, and a form `[data-cal-add]` carrying `name="title"|"kind"|"company"|"time"`. The module-scope `Calendar` object `{ year, month, selected }`.

- [ ] **Step 1: Add calendar UI strings**

In `assets/js/app.js`, inside the `Object.assign(IP.i18n.STR, { ... })` block, add these keys next to the existing `reminders`/`dismiss` entries (around line 143-152):

```js
    calAdd: { vi: "Thêm", en: "Add" },
    calDelete: { vi: "Xoá", en: "Delete" },
    calToday: { vi: "Hôm nay", en: "Today" },
    calPrev: { vi: "Tháng trước", en: "Previous month" },
    calNext: { vi: "Tháng sau", en: "Next month" },
    calFieldTitle: { vi: "Tiêu đề", en: "Title" },
    calFieldType: { vi: "Loại", en: "Type" },
    calFieldCompany: { vi: "Công ty", en: "Company" },
    calFieldTime: { vi: "Giờ", en: "Time" },
    calKindInterview: { vi: "Phỏng vấn", en: "Interview" },
    calKindTest: { vi: "Online test", en: "Online test" },
    calKindDeadline: { vi: "Hạn nộp", en: "Deadline" },
    calKindOther: { vi: "Khác", en: "Other" },
    calNoEvents: { vi: "Không có sự kiện.", en: "No events." },
    calAddFailed: { vi: "Không lưu được, thử lại.", en: "Couldn't save, try again." },
```

- [ ] **Step 2: Add `Calendar` state and date helpers**

In `assets/js/app.js`, replace the Reminders-page header block (lines 606-611):

```js
  /* ---------- Reminders page ---------- */
  const Reminders = { list: null };
  async function loadReminders() {
    Reminders.list = await IP.gmail.fetchReminders();
    if (State.mode === "reminders") render();
  }
```

with:

```js
  /* ---------- Reminders page (month calendar) ---------- */
  const Reminders = { list: null };
  const Calendar = { year: null, month: null, selected: null };
  function calPad2(n) { return String(n).padStart(2, "0"); }
  function calDateKey(d) { return d.getFullYear() + "-" + calPad2(d.getMonth() + 1) + "-" + calPad2(d.getDate()); }
  function remDateKey(r) {
    const w = r.due_at || r.deadline_at;
    if (!w) return null;
    return calDateKey(new Date(w));
  }
  function calEnsureInit() {
    if (Calendar.year == null) {
      const now = new Date();
      Calendar.year = now.getFullYear();
      Calendar.month = now.getMonth();
      Calendar.selected = calDateKey(now);
    }
  }
  async function loadReminders() {
    Reminders.list = await IP.gmail.fetchReminders();
    if (State.mode === "reminders") render();
  }
```

- [ ] **Step 3: Rewrite `renderReminders` to draw the grid + panel**

Replace the whole `renderReminders` function (lines 612-649) with:

```js
  function calKindLabel(kind) {
    return t(kind === "interview" ? UI.calKindInterview
      : kind === "test" ? UI.calKindTest
      : kind === "deadline" ? UI.calKindDeadline
      : UI.calKindOther);
  }
  function renderCalNav(L, locale) {
    const label = new Date(Calendar.year, Calendar.month, 1)
      .toLocaleDateString(locale, { month: "long", year: "numeric" });
    return `<div class="cal-nav">
      <button class="btn" data-cal-prev aria-label="${t(UI.calPrev)}">${fa("fa-solid fa-chevron-left")}</button>
      <span class="cal-month-label">${esc(label)}</span>
      <button class="btn" data-cal-next aria-label="${t(UI.calNext)}">${fa("fa-solid fa-chevron-right")}</button>
      <button class="btn" data-cal-today>${t(UI.calToday)}</button>
    </div>`;
  }
  function renderCalHeader(locale) {
    // Jan 1 2023 was a Sunday — anchor to render Sunday..Saturday short names.
    let cells = "";
    for (let i = 0; i < 7; i++) {
      const wd = new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" });
      cells += `<div class="cal-th">${esc(wd)}</div>`;
    }
    return `<div class="cal-head">${cells}</div>`;
  }
  function renderCalGrid(byDay, todayKey) {
    const cells = IP.calendar.monthGrid(Calendar.year, Calendar.month);
    return `<div class="cal-grid">` + cells.map((c) => {
      if (!c.date) return `<div class="cal-cell cal-cell--out"></div>`;
      const events = byDay[c.date] || [];
      const shown = events.slice(0, 2).map((r) =>
        `<span class="cal-pill cal-pill--${esc(r.kind || "other")}" title="${esc(r.title)}">${esc(r.title)}</span>`
      ).join("");
      const more = events.length > 2 ? `<span class="cal-more">+${events.length - 2}</span>` : "";
      const cls = "cal-cell"
        + (c.date === todayKey ? " cal-cell--today" : "")
        + (c.date === Calendar.selected ? " cal-cell--sel" : "");
      return `<div class="${cls}" data-cal-day="${c.date}">
        <div class="cal-daynum">${c.day}</div>${shown}${more}</div>`;
    }).join("") + `</div>`;
  }
  function renderCalPanel(byDay, locale) {
    const events = byDay[Calendar.selected] || [];
    const heading = Calendar.selected
      ? new Date(Calendar.selected + "T00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
      : "";
    const list = events.length
      ? events.map((r) => {
          const w = r.due_at || r.deadline_at;
          const time = w ? new Date(w).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";
          const del = r.source === "manual"
            ? `<button class="btn danger-btn" data-cal-del="${r.id}">${t(UI.calDelete)}</button>` : "";
          return `<div class="cal-event" data-rem="${r.id}">
            <span class="rem-kind ${esc(r.kind || "")}">${IP.gmail.notifIcon(r.kind)}</span>
            <div class="rem-body">
              <div class="rem-title">${esc(r.title)}</div>
              <div class="rem-sub">${esc(r.company || "")}${r.company ? " · " : ""}${esc(time)}</div>
            </div>
            <div class="rem-actions">
              <button class="btn" data-ics="${r.id}">${t(UI.exportIcs)}</button>
              <button class="btn green" data-rem-done="${r.id}">${t(UI.markDone)}</button>
              <button class="btn danger-btn" data-rem-dismiss="${r.id}">${t(UI.dismiss)}</button>
              ${del}
            </div>
          </div>`;
        }).join("")
      : `<div class="empty-hint">${t(UI.calNoEvents)}</div>`;
    const form = `<form class="cal-add-form" data-cal-add>
      <input name="title" required placeholder="${t(UI.calFieldTitle)}" />
      <select name="kind">
        <option value="interview">${t(UI.calKindInterview)}</option>
        <option value="test">${t(UI.calKindTest)}</option>
        <option value="deadline">${t(UI.calKindDeadline)}</option>
        <option value="other">${t(UI.calKindOther)}</option>
      </select>
      <input name="company" placeholder="${t(UI.calFieldCompany)}" />
      <input name="time" type="time" aria-label="${t(UI.calFieldTime)}" />
      <button type="submit" class="btn green">${t(UI.calAdd)}</button>
      <div class="cal-add-error" hidden>${t(UI.calAddFailed)}</div>
    </form>`;
    return `<div class="cal-panel">
      <div class="cal-panel-head">${esc(heading)}</div>
      <div class="cal-panel-list">${list}</div>${form}</div>`;
  }
  function renderReminders() {
    calEnsureInit();
    const L = State.lang;
    const locale = L === "vi" ? "vi-VN" : "en-US";
    const head = `<div class="page-head"><h1>${fa("fa-solid fa-calendar-check")} ${t(UI.reminders)}</h1></div>`;
    const byDay = {};
    (Reminders.list || []).forEach((r) => {
      const key = remDateKey(r);
      if (!key) return;
      (byDay[key] = byDay[key] || []).push(r);
    });
    const todayKey = calDateKey(new Date());
    const calendar = `<div class="cal-wrap">
      <div class="cal-main">${renderCalNav(L, locale)}${renderCalHeader(locale)}${renderCalGrid(byDay, todayKey)}</div>
      ${renderCalPanel(byDay, locale)}</div>`;
    return `<div class="fade-in reminders-page">${head}${calendar}</div>`;
  }
```

- [ ] **Step 4: Manual smoke check of the render (no handlers yet)**

Run: `node -e "require('./assets/js/calendar.js'); console.log(require('./assets/js/calendar.js').monthGrid(2026,6).filter(c=>c.inMonth).length)"`
Expected: `31` (July has 31 days — confirms the grid helper the render depends on).

(The DOM render itself is exercised by the browser; there is no app.js node test. Handlers are wired in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add assets/js/app.js
git commit -m "feat(calendar): month-grid render, month nav, side panel markup + i18n"
```

---

### Task 5: Side-panel interactions — day select, add, delete, month nav wiring

**Files:**
- Modify: `assets/js/app.js` (the delegated click listener near lines 1440-1465; add a delegated `submit` listener for the add form)

**Interfaces:**
- Consumes: `Calendar`, `loadReminders`, `render`, `IP.gmail.createReminder`, `IP.gmail.deleteReminder` (Tasks 3-4); existing `data-ics`/`data-rem-done`/`data-rem-dismiss` handlers (unchanged, they already operate on `Reminders.list` which still holds every reminder).

- [ ] **Step 1: Wire the calendar click handlers**

In `assets/js/app.js`, inside the main delegated click listener, immediately BEFORE the existing `// reminders page actions` / `data-ics` block (around line 1440), add:

```js
      // calendar navigation + day selection + manual-event delete
      if (e.target.closest("[data-cal-prev]")) {
        if (Calendar.month === 0) { Calendar.month = 11; Calendar.year--; } else { Calendar.month--; }
        render(); return;
      }
      if (e.target.closest("[data-cal-next]")) {
        if (Calendar.month === 11) { Calendar.month = 0; Calendar.year++; } else { Calendar.month++; }
        render(); return;
      }
      if (e.target.closest("[data-cal-today]")) {
        const now = new Date();
        Calendar.year = now.getFullYear(); Calendar.month = now.getMonth();
        Calendar.selected = calDateKey(now);
        render(); return;
      }
      if (e.target.closest("[data-cal-del]")) {
        const id = e.target.closest("[data-cal-del]").dataset.calDel;
        (async () => { await IP.gmail.deleteReminder(id); await loadReminders(); })();
        return;
      }
      if (e.target.closest("[data-cal-day]")) {
        // Let action buttons inside a day/panel handle their own clicks first.
        if (!e.target.closest("[data-ics],[data-rem-done],[data-rem-dismiss],[data-cal-del]")) {
          Calendar.selected = e.target.closest("[data-cal-day]").dataset.calDay;
          render(); return;
        }
      }
```

Leave the existing `data-ics` / `data-rem-done` / `data-rem-dismiss` blocks unchanged — they already find the reminder in `Reminders.list` and work from the panel markup.

- [ ] **Step 2: Add the add-event submit handler**

Locate the existing delegated `submit` listener (search for `addEventListener("submit"`). If one exists, add this branch at its top; if none exists, add a new listener next to the click listener registration:

```js
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-cal-add]");
    if (!form) return;
    e.preventDefault();
    const title = (form.querySelector("[name=title]").value || "").trim();
    if (!title) return;
    const kind = form.querySelector("[name=kind]").value;
    const company = (form.querySelector("[name=company]").value || "").trim();
    const time = form.querySelector("[name=time]").value || "";
    const errEl = form.querySelector(".cal-add-error");
    (async () => {
      const row = await IP.gmail.createReminder({ title, kind, company, date: Calendar.selected, time });
      if (!row) { if (errEl) errEl.hidden = false; return; }
      await loadReminders();
    })();
  });
```

If a `submit` listener already exists, do NOT add a second one — insert only the `data-cal-add` branch inside it, using the same `e.preventDefault()`/field-reading code.

- [ ] **Step 3: Confirm the existing suite is unaffected**

Run: `node --test tests/*.test.js`
Expected: PASS — unchanged count (app.js has no node tests; this confirms no accidental breakage of shared modules).

- [ ] **Step 4: Commit**

```bash
git add assets/js/app.js
git commit -m "feat(calendar): wire day-select, month nav, add-event and delete handlers"
```

---

### Task 6: Calendar CSS

**Files:**
- Modify: `assets/css/styles.css` (append `.cal-*` rules)

**Interfaces:**
- Consumes: the class names emitted in Task 4 (`cal-wrap`, `cal-main`, `cal-nav`, `cal-month-label`, `cal-head`, `cal-th`, `cal-grid`, `cal-cell`, `cal-cell--out`, `cal-cell--today`, `cal-cell--sel`, `cal-daynum`, `cal-pill`, `cal-pill--interview|test|deadline|other`, `cal-more`, `cal-panel`, `cal-panel-head`, `cal-panel-list`, `cal-event`, `cal-add-form`, `cal-add-error`).

- [ ] **Step 1: Append the calendar styles**

Add to the end of `assets/css/styles.css`. Use `var(--...)` tokens if the file defines them; the values below are safe standalone fallbacks — match the surrounding file's existing token names if present:

```css
/* ---------- Reminders month calendar ---------- */
.cal-wrap { display: flex; gap: 16px; align-items: flex-start; }
.cal-main { flex: 1 1 auto; min-width: 0; }
.cal-panel { flex: 0 0 300px; border: 1px solid rgba(128,128,128,.25); border-radius: 10px; padding: 12px; }
.cal-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.cal-month-label { font-weight: 600; font-size: 1.05rem; margin: 0 auto 0 4px; text-transform: capitalize; }
.cal-head { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
.cal-th { text-align: center; font-size: .75rem; opacity: .6; text-transform: uppercase; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-cell { min-height: 84px; border: 1px solid rgba(128,128,128,.2); border-radius: 8px; padding: 4px; cursor: pointer; overflow: hidden; display: flex; flex-direction: column; gap: 2px; }
.cal-cell--out { background: transparent; border-color: transparent; cursor: default; }
.cal-cell--today { border-color: #2563eb; }
.cal-cell--sel { box-shadow: 0 0 0 2px #2563eb inset; }
.cal-daynum { font-size: .8rem; opacity: .7; }
.cal-pill { display: block; font-size: .72rem; padding: 1px 6px; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
.cal-pill--interview { background: #2563eb; }
.cal-pill--test { background: #7c3aed; }
.cal-pill--deadline { background: #dc2626; }
.cal-pill--other { background: #64748b; }
.cal-more { font-size: .7rem; opacity: .6; }
.cal-panel-head { font-weight: 600; margin-bottom: 8px; text-transform: capitalize; }
.cal-panel-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.cal-event { display: flex; gap: 8px; align-items: flex-start; }
.cal-add-form { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(128,128,128,.25); padding-top: 10px; }
.cal-add-form input, .cal-add-form select { padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(128,128,128,.4); background: transparent; color: inherit; }
.cal-add-error { color: #dc2626; font-size: .8rem; }
@media (max-width: 720px) {
  .cal-wrap { flex-direction: column; }
  .cal-panel { flex-basis: auto; width: 100%; }
  .cal-cell { min-height: 60px; }
}
```

- [ ] **Step 2: Confirm the suite still passes (no JS touched)**

Run: `node --test tests/*.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add assets/css/styles.css
git commit -m "style(calendar): month-grid + side-panel styles, responsive stacking"
```

---

## Self-Review

**Spec coverage:**
- §1 scan window 60d + drop stale → Task 1. ✅
- §2 data layer (`fetchReminders` broadened, `createReminder`, `deleteReminder`, `buildWhen` helper) → Tasks 2-3. ✅
- §3 view layer (month grid, day cells, side panel, add form, nav) → Tasks 4-5. ✅
- §4 CSS `.cal-*` responsive → Task 6. ✅
- §5 i18n (form labels, type options, Add/Delete) → Task 4. Month names & weekday abbreviations are produced via `toLocaleDateString` rather than static strings — a simplification that is more correctly localized; flag noted below. ✅
- §6 error handling (inline add error, empty calendar on fetch fail via existing `fetchReminders` catch, sign-in gate unchanged) → Tasks 3-5. ✅
- §7 testing: `monthGrid` + `buildWhen` unit tests (Task 2), `del`/create/delete gmail+api tests (Task 3). `isStalePastDate` frontend test intentionally omitted — see the flagged deviation in Global Constraints. ✅ (with noted deviation)
- §8 commits: 6 per-feature commits. ✅

**Placeholder scan:** none — every code step carries complete code and exact commands.

**Type consistency:** `monthGrid`/`buildWhen` signatures match between Task 2 (definition), Task 3 (`createReminder` consumes `buildWhen`), and Task 4 (`renderCalGrid` consumes `monthGrid`). `createReminder({title,kind,company,date,time})` field names match across gmail.js, its tests, and the Task 5 submit handler. `Calendar {year,month,selected}` used identically in Tasks 4 and 5. Data-attributes emitted in Task 4 match the selectors in Task 5.

**Deviations to flag to the user before execution:**
1. `isStalePastDate` is edge-function-only (verified via `?inspect=1`), not a frontend unit test — client-side filtering would break navigating to past months.
2. Month/weekday names come from `toLocaleDateString`, not static i18n strings — fewer strings to maintain, correctly localized.
