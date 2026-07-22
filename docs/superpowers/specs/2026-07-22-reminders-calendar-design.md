# Reminders Calendar + Scan Tuning — Design

**Date:** 2026-07-22
**Branch:** off `main` (frontend + edge function; no NestJS work)
**Status:** Approved for planning

## Goal

Turn the Reminders page ("Lịch nhắc") into a month-calendar grid with a side
panel, let the user add/delete interview & deadline events directly on the
calendar, and tune the Gmail scan so it reads the last 2 months and never
creates stale (long-past) calendar entries.

## Background / current state

- App is a static vanilla-JS frontend (GitHub Pages) + Supabase backend.
- `IP_CONFIG.API_URL` is `""`, so all reminder reads/writes run on the
  **Supabase fallback path**, not the (undeployed) NestJS API. The API seam
  in `IP.gmail` is kept but dormant.
- Scanned reminders live in the Supabase `reminders` table:
  `id, user_id, kind, title, company, due_at, deadline_at, source, status`.
- The Gmail scan (`supabase/functions/gmail-scan/index.ts`) inserts a
  `notifications` row for **every** recruiting email, but a `reminders` row
  only for `kind` in {`test`,`interview`} that carries a date.
- The 2023 dates the user saw are **event dates the AI extracted from inside
  mock-test emails** — a reminder inherits the in-email date. They are not a
  function of the scan window.

## Scope

Two changes on one branch:

1. **Scan tuning** — edge function only.
2. **Calendar page** — frontend only (`gmail.js`, `app.js`, `styles.css`,
   i18n strings, tests).

Explicitly out of scope: any NestJS/API deployment, publishing the OAuth app,
changing the classifier categories.

## Constraints

- Vanilla JS, no build step. Dual-export module pattern
  (`root.IP.x` + `module.exports`), matching existing files.
- Keep the `IP.api`-or-Supabase seam in `IP.gmail` — new functions use
  `IP.api.*` when `IP.api.configured()`, else the Supabase client.
- Keep frontend `node --test` at 60/60 and add new tests.
- Per-feature incremental commits.
- Do NOT use Fable models anywhere.
- Today's date for defaults/testing: 2026-07-22.

---

## 1. Scan changes (`supabase/functions/gmail-scan/index.ts`)

- `DEFAULT_Q`: change `newer_than:14d` → `newer_than:60d` (last 2 months).
  Gmail returns newest-first by default, so descending order is automatic.
- In the reminder-insert block: compute the effective date
  (`event_at || deadline_at`). If it parses **and** is older than
  `now − 30 days`, **skip the `reminders` insert** but still insert the
  `notifications` row (the bell stays complete; the calendar stays clean).
- The skip predicate is a small pure helper so it can be unit-tested and so
  the same rule can be mirrored client-side if ever needed:
  `isStalePastDate(iso, now)` → `true` when `iso` parses to a date more than
  30 days before `now`. A null/unparseable date is **not** stale (returns
  `false`) — undated events are unaffected.
- Everything else (classifier, `gmail_seen` dedup, notification insert for
  all recruiting mail) unchanged.

Verification: no test harness exists in the edge function; verify via the
existing `?inspect=1` non-destructive path after deploy.

## 2. Data layer (`assets/js/gmail.js`)

New/changed functions, all preserving the API-or-Supabase seam:

- `fetchReminders()` — broaden the status filter from `["upcoming"]` to
  `["upcoming","done"]` so completed events still render (styled done).
  Ordering by `due_at` unchanged.
- `createReminder({ title, kind, company, date, time })` — NEW.
  - `date` is `YYYY-MM-DD` (the selected day); `time` optional `HH:MM`.
  - Builds an ISO timestamp from `date` (+ `time` if given, else all-day).
  - `kind:"deadline"` → set `deadline_at`; any other kind → set `due_at`.
  - Row: `{ user_id, kind, title, company: company||null, due_at, deadline_at,
    source:"manual", status:"upcoming" }`.
  - Supabase `.from("reminders").insert(row).select().single()` (or
    `IP.api.post("/v1/reminders", row)` when configured). Returns the created
    row.
- `deleteReminder(id)` — NEW. Supabase
  `.from("reminders").delete().eq("id", id)` (or `IP.api.del`/`IP.api.delete`
  matching the existing `IP.api` verbs). Used only for `source:"manual"`
  events; scanned events keep using `setReminderStatus(id,"dismissed")`.

The date→field mapping is extracted as a pure helper
`buildWhen({ kind, date, time })` → `{ due_at, deadline_at }` so it is
unit-testable without a Supabase client.

## 3. View layer (`assets/js/app.js`, replacing `renderReminders()`)

- Calendar state: `{ viewYear, viewMonth, selectedDate }`. Default
  `viewYear/viewMonth` = current month (2026-07); `selectedDate` = today.
- **Month grid:** SUN–SAT weekday header, 6 week-rows of day cells. Pure
  helper `monthGrid(year, month)` → array of 42 cell descriptors
  ({ date: "YYYY-MM-DD" | null-for-padding, inMonth: bool }); first cell is
  the Sunday on/before the 1st. Nav: prev / next / Today buttons update state
  and re-render.
- **Day cell:** shows up to 2 event pills (colored by `kind`:
  interview / test / deadline / other) using `title`; "+N more" when
  overflowing; today's cell highlighted; clicking selects the day.
- **Side panel:** for `selectedDate`, lists that day's events with existing
  actions — export `.ics` (`buildICS`), mark done (`data-rem-done`), dismiss
  (`data-rem-dismiss`) — plus **Delete** for `source:"manual"` events. Below
  the list, an **Add** form: Title (required), Type (interview / online test /
  deadline / other), Company (optional), Time (optional); date = selected day.
  Empty day → panel shows the Add form directly.
- Grouping events by day: index the fetched reminders by the local date of
  `due_at || deadline_at`.

## 4. CSS (`assets/css/styles.css`)

New `.cal-*` classes: `.cal-grid`, `.cal-cell`, `.cal-cell--today`,
`.cal-cell--out`, `.cal-pill` (+ per-kind modifiers), `.cal-panel`,
`.cal-nav`, `.cal-add-form`. Responsive: on narrow screens the side panel
drops below the grid (stacked), on wide screens it sits beside it.

## 5. i18n

Reuse the existing `reminders` label for the page title. Add strings (vi + en)
for: month names, weekday abbreviations, form labels (Title / Type / Company /
Time), the four type options, and the **Add** / **Delete** buttons. Follow the
existing UI-strings structure in `app.js`.

## 6. Error handling

- create/delete failure → non-blocking inline message in the side panel; the
  optimistic row is rolled back / not shown.
- fetch failure → empty calendar with a retry affordance, mirroring current
  reminder-load behavior.
- Logged-out → existing sign-in gate (unchanged).

## 7. Testing

Frontend `node --test` — keep 60/60 and add:

- `buildWhen` / `createReminder` date→`due_at`/`deadline_at` mapping
  (deadline vs. non-deadline; with and without time).
- `monthGrid` date math: correct starting weekday and 42-cell length for a
  known month (e.g. July 2026 starts on a Wednesday), and month rollover.
- `isStalePastDate` predicate: >30d past = true; within 30d/future = false;
  null/unparseable = false.
- Mock `fetch` / Supabase client as existing `IP.api`/`IP.gmail` tests do.

Edge function verified manually via `?inspect=1`.

## 8. Commits (per-feature)

1. Scan: 60d window + `isStalePastDate` skip on reminder insert.
2. `gmail.js`: `createReminder`, `deleteReminder`, `buildWhen`,
   broadened `fetchReminders` + tests.
3. `app.js`: month-grid render (`monthGrid`, cells, nav) + tests.
4. `app.js`: side panel + Add/Delete UI wiring.
5. CSS: `.cal-*` styles (responsive).
6. i18n strings (vi + en).
