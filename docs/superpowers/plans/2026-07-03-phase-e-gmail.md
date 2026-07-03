# Phase E — Gmail Intelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kết nối Gmail (readonly), quét định kỳ, dùng AI phân loại email tuyển dụng (bài test / mời phỏng vấn / offer / từ chối) → đẩy vào thông báo realtime + trang lịch nhắc + xuất .ics.

**Architecture:** Google OAuth (tái dùng client Phase B) xin thêm scope `gmail.readonly` + offline → client gửi `provider_refresh_token` cho Edge Function `gmail-connect` lưu vào bảng **chỉ-service-role**. Cron Edge Function `gmail-scan` (pg_cron 15') refresh access token → Gmail API → pre-filter từ khoá → `aiClassify` (adapter Phase D) → insert `notifications`+`reminders` (idempotent). Client: chuông thông báo (Supabase Realtime + Web Notification), trang lịch nhắc, xuất ICS.

**Tech Stack:** Supabase (Postgres/RLS/RPC/Realtime, Edge Functions Deno, pg_cron+pg_net), Gmail REST API, vanilla JS no-build (`IP.*`), `node --test`.

## Global Constraints

- **No build step**; nhánh `handbook-phase-e` off main (`295e10b`); commit theo feature; suite giữ **55/55 + test mới**.
- **KHÔNG Fable**. `gmail-scan` dùng `aiClassify` từ `supabase/functions/_shared/ai.ts` (đã có, Anthropic haiku / OpenAI mini).
- **Refresh token Gmail + Google client secret CHỈ ở server** (bảng service-role-only + Edge secret). Client KHÔNG bao giờ đọc `gmail_accounts`. Scope chỉ `gmail.readonly`.
- **Không lưu thân email**; chỉ lưu kết quả phân loại (company/title/summary/thời gian). Idempotent theo `message-id`.
- Google OAuth ở **Testing mode** (≤100 test user); dùng lại `GOOGLE_CLIENT_ID/SECRET` của Phase B (đặt làm Edge secret).
- **Bilingual** mọi chuỗi UI; **dual-export** cho `assets/js/gmail.js`; CSS token-based cả 2 theme; **line numbers ước lượng — grep anchor**.
- Mode `reminders` vào được: dispatch + restore + menu (anchor các nhánh `State.mode === "chat"`/`"upgrade"`).
- FK mọi bảng mới → `profiles(id)` `ON DELETE CASCADE`.

---

## File Structure
**Create:** `supabase/migrations/0004_gmail.sql` · `supabase/functions/gmail-connect/index.ts` · `supabase/functions/gmail-status/index.ts` · `supabase/functions/gmail-scan/index.ts` · `assets/js/gmail.js` · `tests/gmail.test.js` · `supabase/seed/cron_gmail.sql` · `docs/superpowers/DEPLOY-PHASE-E.md`
**Modify:** `assets/js/auth.js` (thêm `connectGmail()`), `index.html` (script gmail.js + chuông topbar + menu reminders), `assets/js/app.js` (mode reminders, bell dropdown, realtime wiring, Settings Gmail block), `assets/css/styles.css`, `docs/PENDING-SETUP.md` (§4 tick).

---

## Task 1: Migration 0004 — bảng + RLS + realtime

**Files:** Create `supabase/migrations/0004_gmail.sql`.
**Interfaces (Produces):** `gmail_accounts` (service-role only), `notifications`, `reminders` (user select/update-own, service-role insert), `gmail_seen` (service-role only, idempotency); `notifications` thêm vào realtime publication.

- [ ] **Step 1: Viết `supabase/migrations/0004_gmail.sql`**
```sql
-- Phase E: Gmail connection + AI-classified notifications/reminders
create table if not exists public.gmail_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  refresh_token text not null,
  last_scan timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.gmail_accounts enable row level security;
-- NO client policies: service-role only (client checks status via Edge Function).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,               -- 'test'|'interview'|'offer'|'rejection'|'other'
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  source text,                      -- gmail message-id (idempotency ref)
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "own notif select" on public.notifications for select using (auth.uid() = user_id);
create policy "own notif update" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- insert: service-role only

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,               -- 'test'|'interview'
  title text not null,
  company text,
  due_at timestamptz,
  deadline_at timestamptz,
  status text not null default 'upcoming',  -- 'upcoming'|'done'|'dismissed'
  source text,
  created_at timestamptz not null default now()
);
alter table public.reminders enable row level security;
create policy "own rem select" on public.reminders for select using (auth.uid() = user_id);
create policy "own rem update" on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- insert: service-role only

create table if not exists public.gmail_seen (
  user_id uuid not null references public.profiles(id) on delete cascade,
  msg_id text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, msg_id)
);
alter table public.gmail_seen enable row level security;
-- service-role only

-- Realtime: let clients subscribe to their own notifications inserts (RLS still applies).
alter publication supabase_realtime add table public.notifications;
```
- [ ] **Step 2: Đọc lại** — gmail_accounts/gmail_seen không có policy client; notifications/reminders select+update own, insert chỉ service-role; realtime publication thêm notifications.
- [ ] **Step 3: Commit** — `git add supabase/migrations/0004_gmail.sql && git commit -m "feat(db): gmail_accounts, notifications, reminders, gmail_seen + realtime"`

## Task 2: `IP.gmail` — pure helpers (TDD) + client state

**Files:** Create `assets/js/gmail.js`, `tests/gmail.test.js`; Modify `index.html` (script sau `chat.js`).
**Interfaces (Produces):**
- Pure: `looksRecruiting(subject, snippet)` → bool (regex từ khoá VI+EN: interview|phỏng vấn|test|assessment|offer|tuyển|regret|unfortunately|application|recruit…). `buildICS(reminder)` → string VCALENDAR hợp lệ (VEVENT với DTSTART từ `due_at`, SUMMARY `title`, DESCRIPTION company, dùng `due_at`; nếu chỉ có `deadline_at` thì dùng nó). `icsDate(iso)` → `YYYYMMDDTHHMMSSZ`. `notifIcon(type)` → emoji.
- Stateful: `IP.gmail.fetchNotifications()` / `unreadCount()` / `markRead(id)` / `markAllRead()`; `fetchReminders()` / `setReminderStatus(id,status)`; `subscribeRealtime(onInsert)` (Supabase channel `postgres_changes` INSERT trên `notifications` của mình); `status()` (gọi Edge `gmail-status`); `connect()` (gọi `IP.auth.connectGmail()`); `disconnect()` (gọi Edge `gmail-connect` action disconnect).

- [ ] **Step 1: Test thất bại** — `tests/gmail.test.js`:
```js
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
```
- [ ] **Step 2: FAIL** — `node --test tests/gmail.test.js`.
- [ ] **Step 3: Viết `assets/js/gmail.js`** — UMD dual-export (name `gmail`) như `assets/js/chat.js`. Pure:
```js
  var RE = /(interview|phỏng\s*v[aấ]n|assessment|coding\s*test|\btest\b|take[-\s]?home|offer|onboarding|tuy[eể]n|recruit|application|regret|unfortunately|shortlist|screening|hiring|vòng)/i;
  function looksRecruiting(subject, snippet) { return RE.test(String(subject || "") + " " + String(snippet || "")); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function icsDate(iso) { const d = new Date(iso);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z"; }
  function esc(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function buildICS(r) {
    var when = r.due_at || r.deadline_at; var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Interview Prep//EN", "BEGIN:VEVENT",
      "UID:" + (r.id || (r.source || "rem") + "@interviewprep"),
      "DTSTAMP:" + icsDate(new Date(0).toISOString()),
      "DTSTART:" + icsDate(when), "SUMMARY:" + esc(r.title),
      "DESCRIPTION:" + esc((r.company ? r.company + " — " : "") + (r.kind || "")),
      "END:VEVENT", "END:VCALENDAR"];
    return lines.join("\r\n");
  }
  function notifIcon(type) { return ({ test: "📝", interview: "📅", offer: "🎉", rejection: "🙏", other: "✉️" })[type] || "✉️"; }
```
  (Lưu ý test `buildICS` không truyền `id`/không kiểm DTSTAMP — icsDate(new Date(0)) ổn định. Dùng `\r\n` join nhưng test match từng dòng nên OK.)
  Stateful dùng `root.IP.auth.client()` call-time: `fetchNotifications()` → `from("notifications").select("*").order("created_at",{ascending:false}).limit(30)`; `unreadCount()` từ cache; `markRead(id)`/`markAllRead()` update; `fetchReminders()` → `from("reminders").select("*").in("status",["upcoming"]).order("due_at")`; `setReminderStatus`; `subscribeRealtime(cb)` → `client().channel("notif").on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications"},cb).subscribe()`; `status()`/`disconnect()` → `client().functions.invoke("gmail-status"|"gmail-connect",...)`; `connect()` → `root.IP.auth.connectGmail()`. Mọi lỗi swallow.
  Export: `{ looksRecruiting, icsDate, buildICS, notifIcon, fetchNotifications, unreadCount, markRead, markAllRead, fetchReminders, setReminderStatus, subscribeRealtime, status, connect, disconnect }`.
- [ ] **Step 4: PASS** — `node --test tests/gmail.test.js` (5) rồi full suite (55+5=60).
- [ ] **Step 5:** `index.html` thêm `<script src="assets/js/gmail.js"></script>` sau `chat.js`.
- [ ] **Step 6: Commit** — `git add assets/js/gmail.js tests/gmail.test.js index.html && git commit -m "feat: IP.gmail module — recruiting prefilter, ICS builder (TDD)"`

## Task 3: `connectGmail()` + Edge Functions `gmail-connect` / `gmail-status`

**Files:** Modify `assets/js/auth.js`; Create `supabase/functions/gmail-connect/index.ts`, `supabase/functions/gmail-status/index.ts`.
**Interfaces:** `IP.auth.connectGmail()` → redirect OAuth với scope gmail.readonly + offline. `gmail-connect` POST `{action:"store", refresh_token, email}` (lưu row, service-role) | `{action:"disconnect"}` (xoá row) — verify JWT. `gmail-status` → `{connected:bool, email, last_scan}`.

- [ ] **Step 1: `auth.js` thêm `connectGmail`** (cạnh `signInWithGoogle`), và export nó:
```js
  async function connectGmail() {
    const c = client(); if (!c) return;
    try {
      await c.auth.signInWithOAuth({ provider: "google", options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        redirectTo: location.href.split("#")[0],
        queryParams: { access_type: "offline", prompt: "consent" },
      } });
    } catch (e) { /* stay disconnected */ }
  }
```
  Thêm `connectGmail` vào object `return {...}`. Trong `init()` sau khi `getSession()`: nếu `data.session.provider_refresh_token` tồn tại → gọi `client().functions.invoke("gmail-connect",{body:{action:"store", refresh_token: data.session.provider_refresh_token, email: data.session.user?.email}})` (một lần, token chỉ trả về ngay sau consent). Bọc try/catch.
- [ ] **Step 2: `gmail-connect/index.ts`** — pattern như `approve-payment` (CORS/OPTIONS/JWT verify service-role). `store`: upsert `gmail_accounts{user_id, refresh_token, email, active:true}`. `disconnect`: delete row. 401 nếu không JWT.
- [ ] **Step 3: `gmail-status/index.ts`** — verify JWT → `admin.from("gmail_accounts").select("email,last_scan,active").eq("user_id",uid).maybeSingle()` → `{connected: !!row && row.active, email: row?.email, last_scan: row?.last_scan}`.
- [ ] **Step 4: Verify** — `node --check assets/js/auth.js`; suite 60. Commit — `git add assets/js/auth.js supabase/functions/gmail-connect supabase/functions/gmail-status && git commit -m "feat(fn): Gmail connect/disconnect/status + connectGmail OAuth (readonly, offline)"`

## Task 4: Edge Function `gmail-scan` (cron)

**Files:** Create `supabase/functions/gmail-scan/index.ts`.
**Interfaces:** Gọi bởi pg_cron (POST, header service-role/secret). Với mỗi `gmail_accounts.active`: refresh access token (Google token endpoint, `GOOGLE_CLIENT_ID/SECRET`) → `messages.list` `q="newer_than:2d in:inbox" maxResults=20` → mỗi msg chưa có trong `gmail_seen`: `messages.get` (headers From/Subject/Date + snippet) → `looksRecruiting` pre-filter → `aiClassify` → nếu `is_recruiting`: insert `notifications` + (kind test/interview có mốc) insert `reminders`; đánh dấu `gmail_seen`. Cập nhật `last_scan`.

- [ ] **Step 1: Viết `gmail-scan/index.ts`**
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiClassify } from "../_shared/ai.ts";

const CLASSIFY_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    is_recruiting: { type: "boolean" },
    kind: { type: "string", enum: ["test", "interview", "offer", "rejection", "other"] },
    company: { type: "string" }, title: { type: "string" },
    event_at: { type: ["string", "null"] }, deadline_at: { type: ["string", "null"] },
    summary: { type: "string" },
  },
  required: ["is_recruiting", "kind", "company", "title", "event_at", "deadline_at", "summary"],
};
const RE = /(interview|phỏng|assessment|coding|test|take-home|offer|onboarding|tuyển|recruit|application|regret|unfortunately|shortlist|screening|hiring|vòng)/i;
const SYS = "You classify a recruiting-related email for an IT job seeker. Return JSON per the schema. is_recruiting=false if it is not about a job application/interview/offer/rejection/test. kind: test=coding test/assessment, interview=interview invite/schedule, offer=job offer, rejection=declined, other=recruiting but none of these. event_at/deadline_at: ISO 8601 if a date/time is present, else null. Keep summary <=200 chars, in the email's language.";

async function refreshToken(refresh: string): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_CLIENT_ID")!, client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token: refresh, grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) return null;
  const j = await r.json(); return j.access_token || null;
}
function header(headers: any[], name: string): string {
  return (headers || []).find((h: any) => h.name?.toLowerCase() === name)?.value || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  // gate: require the CRON_SECRET so only pg_cron/authorized callers run scans
  const secret = req.headers.get("x-cron-secret");
  if (secret !== Deno.env.get("CRON_SECRET")) return new Response("forbidden", { status: 403 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: accounts } = await admin.from("gmail_accounts").select("*").eq("active", true);
  let processed = 0;
  for (const acc of accounts || []) {
    const token = await refreshToken(acc.refresh_token);
    if (!token) continue;
    const auth = { headers: { Authorization: "Bearer " + token } };
    const list = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + encodeURIComponent("newer_than:2d in:inbox") + "&maxResults=20", auth).then(r => r.ok ? r.json() : { messages: [] });
    for (const m of (list.messages || [])) {
      const { data: seen } = await admin.from("gmail_seen").select("msg_id").eq("user_id", acc.user_id).eq("msg_id", m.id).maybeSingle();
      if (seen) continue;
      await admin.from("gmail_seen").insert({ user_id: acc.user_id, msg_id: m.id });
      const msg = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + m.id + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date", auth).then(r => r.ok ? r.json() : null);
      if (!msg) continue;
      const subject = header(msg.payload?.headers, "subject"), from = header(msg.payload?.headers, "from"), snippet = msg.snippet || "";
      if (!RE.test(subject + " " + snippet)) continue;
      let c: any;
      try { c = await aiClassify({ system: SYS, input: `From: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`, schema: CLASSIFY_SCHEMA }); } catch { continue; }
      if (!c?.is_recruiting) continue;
      await admin.from("notifications").insert({
        user_id: acc.user_id, type: c.kind || "other",
        title: (c.company ? c.company + " — " : "") + (c.title || subject), body: c.summary || "", source: m.id,
      });
      if ((c.kind === "test" || c.kind === "interview") && (c.event_at || c.deadline_at)) {
        await admin.from("reminders").insert({
          user_id: acc.user_id, kind: c.kind, title: c.title || subject, company: c.company || null,
          due_at: c.event_at || null, deadline_at: c.deadline_at || null, source: m.id,
        });
      }
      processed++;
    }
    await admin.from("gmail_accounts").update({ last_scan: new Date().toISOString() }).eq("user_id", acc.user_id);
  }
  return new Response(JSON.stringify({ ok: true, processed }), { headers: { "content-type": "application/json" } });
});
```
- [ ] **Step 2: Đọc lại** — gated bằng `CRON_SECRET`; refresh token server-only; idempotent (gmail_seen insert trước xử lý); pre-filter trước AI (tiết kiệm); không lưu thân mail (chỉ subject/snippet → classify → lưu kết quả).
- [ ] **Step 3: Commit** — `git add supabase/functions/gmail-scan && git commit -m "feat(fn): gmail-scan cron — fetch, prefilter, AI-classify, notify + remind"`

## Task 5: Client — chuông thông báo + realtime + trang lịch nhắc + Settings

**Files:** Modify `assets/js/app.js`, `index.html`, `assets/css/styles.css`.
**Interfaces:** Consumes `IP.gmail.*`. Produces: chuông topbar (`#bellBtn` + badge + dropdown), mode `reminders` (`renderReminders()`), Settings Gmail block, realtime wiring lúc login.

- [ ] **Step 1: UI strings** — `reminders:{vi:"Lịch nhắc",en:"Reminders"}`, `notifications:{vi:"Thông báo",en:"Notifications"}`, `noNotifs:{vi:"Chưa có thông báo.",en:"No notifications."}`, `noReminders:{vi:"Chưa có lịch nhắc nào.",en:"No reminders yet."}`, `markAllRead:{vi:"Đánh dấu đã đọc hết",en:"Mark all read"}`, `exportIcs:{vi:"Xuất .ics",en:"Export .ics"}`, `markDone:{vi:"Xong",en:"Done"}`, `dismiss:{vi:"Bỏ qua",en:"Dismiss"}`, `gmailConnect:{vi:"Kết nối Gmail",en:"Connect Gmail"}`, `gmailDisconnect:{vi:"Ngắt kết nối",en:"Disconnect"}`, `gmailConnected:{vi:"Đã kết nối Gmail",en:"Gmail connected"}`, `gmailBlurb:{vi:"Tự động phát hiện email tuyển dụng (bài test, phỏng vấn, offer) và nhắc lịch.",en:"Auto-detect recruiting emails (tests, interviews, offers) and remind you."}`.
- [ ] **Step 2: Chuông topbar** — `index.html`: trước `.profile-wrap` thêm `<button class="icon-btn" id="bellBtn" title="Notifications" hidden><i class="fa-solid fa-bell"></i><span class="bell-badge" id="bellBadge" hidden></span></button><div class="notif-menu" id="notifMenu" hidden></div>`. Trong `updateAuthUI(user)`: `#bellBtn` hidden = !user; nếu user → `refreshBell()`.
- [ ] **Step 3: `refreshBell()` + dropdown render** trong app.js:
```js
  async function refreshBell() {
    if (!IP.auth.getUser()) return;
    const list = await IP.gmail.fetchNotifications();
    const unread = (list || []).filter(n => !n.read).length;
    const badge = document.getElementById("bellBadge");
    if (badge) { badge.hidden = unread === 0; badge.textContent = unread > 9 ? "9+" : String(unread); }
    const menu = document.getElementById("notifMenu");
    if (menu) menu.innerHTML = `<div class="notif-head">${t(UI.notifications)}<button class="link-btn" id="notifReadAll">${t(UI.markAllRead)}</button></div>` +
      ((list || []).length ? list.slice(0, 12).map(n => `<div class="notif-item ${n.read ? "" : "unread"}" data-notif="${n.id}"><span class="ni-ic">${IP.gmail.notifIcon(n.type)}</span><div class="ni-body"><div class="ni-title">${esc(n.title)}</div><div class="ni-sub">${esc(n.body || "")}</div></div></div>`).join("") : `<div class="empty-hint">${t(UI.noNotifs)}</div>`);
  }
```
  Handlers (delegated): `#bellBtn` → toggle `#notifMenu.hidden` + `refreshBell()`; `#notifReadAll` → `IP.gmail.markAllRead()` then `refreshBell()`; `[data-notif]` → `IP.gmail.markRead(id)` + nếu có reminder liên quan mở mode reminders (đơn giản: chỉ markRead + refreshBell). Đóng menu khi click ngoài (thêm vào listener đóng profile menu hiện có).
- [ ] **Step 4: `renderReminders()`** (mode `reminders`) — load qua `loadReminders()` (async, set `Reminders.list` rồi render). Nhóm theo ngày, mỗi item: icon kind, title, company, thời gian (`toLocaleString`), badge kind; nút `data-ics="{id}"` (Xuất .ics), `data-rem-done="{id}"`, `data-rem-dismiss="{id}"`. Rỗng → `noReminders`.
- [ ] **Step 5: ICS export handler** — `[data-ics]` → tìm reminder trong `Reminders.list`, `const ics = IP.gmail.buildICS(r)`, tạo Blob `text/calendar`, `URL.createObjectURL`, `<a download="reminder.ics">` click, revoke. `[data-rem-done]`/`[data-rem-dismiss]` → `IP.gmail.setReminderStatus(id,"done"/"dismissed")` + `loadReminders()`.
- [ ] **Step 6: Wiring** — dispatch `else if (State.mode === "reminders") main.innerHTML = renderReminders();`; restore branch; menu hồ sơ item `data-menu="reminders"` (icon `fa-solid fa-calendar-check`) → set mode + `loadReminders()`; `setI("reminders", UI.reminders)`. **Realtime + Web Notification**: trong boot `IP.auth.onChange` nhánh `if(user)`: gọi `IP.gmail.subscribeRealtime((payload) => { refreshBell(); const n = payload.new; if (n) { toast(IP.gmail.notifIcon(n.type) + " " + n.title); if (window.Notification && Notification.permission === "granted") new Notification(n.title, { body: n.body || "" }); } })` và xin quyền `if (window.Notification && Notification.permission === "default") Notification.requestPermission()`. Cũng gọi `refreshBell()`.
- [ ] **Step 7: Settings Gmail block** — trong `renderSettings()` thêm khối "Gmail": mô tả `gmailBlurb`; async `loadGmailStatus()` cập nhật; nút Kết nối (`#gmailConnectBtn` → `IP.gmail.connect()`) hoặc trạng thái "Đã kết nối {email} · quét lần cuối {last_scan}" + nút Ngắt (`#gmailDisconnectBtn` → `IP.gmail.disconnect()` + reload settings).
- [ ] **Step 8: CSS** — `.bell-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;background:var(--red);color:#fff;font-size:10px;font-weight:800;border-radius:99px;display:grid;place-items:center;padding:0 4px}`, `#bellBtn{position:relative}`, `.notif-menu{position:absolute;top:52px;right:120px;width:340px;max-height:70vh;overflow-y:auto;background:var(--panel);border:1px solid var(--line2);border-radius:12px;box-shadow:var(--shadow);z-index:60;padding:6px}`, `.notif-item{display:flex;gap:10px;padding:10px;border-radius:8px;cursor:pointer}`, `.notif-item:hover{background:var(--panel2)}`, `.notif-item.unread{background:color-mix(in srgb,var(--accent) 8%,transparent)}`, `.ni-title{font-size:13.5px;font-weight:600}`, `.ni-sub{font-size:12px;color:var(--muted)}`, reminders timeline (`.rem-item`, `.rem-kind` badge test/interview màu), `.reminders-page{max-width:720px}`.
- [ ] **Step 9: Verify** — `node --check assets/js/app.js`; suite 60; thủ công (chưa deploy: fetch trả [] → chuông rỗng, không crash): chuông hiện khi login, dropdown rỗng OK; mode reminders mở; Settings có khối Gmail nút Kết nối; không hồi quy chat/pro.
- [ ] **Step 10: Commit** — `git add assets/js/app.js index.html assets/css/styles.css && git commit -m "feat(ui): notification bell + realtime, reminders page + ICS export, Gmail settings"`

## Task 6: pg_cron setup + deploy guide

**Files:** Create `supabase/seed/cron_gmail.sql`, `docs/superpowers/DEPLOY-PHASE-E.md`; Modify `docs/PENDING-SETUP.md`.

- [ ] **Step 1: `cron_gmail.sql`** — bật extension + lịch 15':
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Replace <PROJECT_REF> and <CRON_SECRET> before running.
select cron.schedule('gmail-scan-15m', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/gmail-scan',
    headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
    body := '{}'::jsonb
  );
$$);
```
- [ ] **Step 2: `DEPLOY-PHASE-E.md`** — (1) SQL Editor chạy `0004_gmail.sql`; (2) Google Console: thêm scope `gmail.readonly` vào consent screen (Testing), thêm test users (email bạn/bạn bè); (3) set secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (từ Phase B), `CRON_SECRET` (chuỗi ngẫu nhiên); (4) `supabase functions deploy gmail-connect gmail-status gmail-scan`; (5) SQL Editor: chạy `cron_gmail.sql` (điền PROJECT_REF + CRON_SECRET); (6) test: Settings → Kết nối Gmail → cho phép → gửi mail giả lập mời PV cho chính mình → ≤15' (hoặc gọi thủ công `gmail-scan` với header) → chuông có thông báo + reminders có mục; xuất .ics mở được; ngắt kết nối dừng quét. Note: Realtime cần bật cho bảng notifications (migration đã add publication).
- [ ] **Step 3:** `PENDING-SETUP.md` §4 đánh dấu các mục. Commit — `git add supabase/seed/cron_gmail.sql docs/superpowers/DEPLOY-PHASE-E.md docs/PENDING-SETUP.md && git commit -m "docs: Phase E deploy guide + pg_cron schedule"`

---

## Final verification
- [ ] `node --test tests/` → **60/60** (55 + 5 gmail).
- [ ] Chưa deploy: app chạy, chuông/reminders/Settings-Gmail hiện, mọi fetch degrade [] không crash; chat/pro/nội dung không hồi quy.
- [ ] Không secret trong repo; `file://` mở được (Realtime/functions chỉ hoạt động khi online + đã deploy).
- [ ] Sau deploy (DEPLOY-PHASE-E.md): kết nối Gmail (test user) → mail mời PV → ≤15' có notification + reminder; realtime toast khi đang mở app; .ics mở trong Google Calendar; ngắt kết nối dừng quét; user khác không đọc được dữ liệu (RLS).

## Self-Review (đã chạy)
1. **Coverage**: spec §4.1 connect (OAuth readonly+offline, refresh token server-only)→T3; §4.2 scan (refresh/list/get/prefilter/classify/insert/idempotent)→T4 (+T1 bảng); §4.3 client (chuông realtime+WebNotif, reminders page, ICS, Settings)→T2+T5; §5 security (refresh token+secret server-only, không lưu thân mail, RLS)→T1+T3+T4; §6 secrets→T6; §7 test (pure TDD + manual)→T2 TDD + checklists; §8 nghiệm thu→Final.
2. **Placeholders**: không TBD; code đầy đủ migrations/functions; UI steps cụ thể.
3. **Consistency**: `IP.gmail.{looksRecruiting,icsDate,buildICS,notifIcon,fetchNotifications,unreadCount,markRead,markAllRead,fetchReminders,setReminderStatus,subscribeRealtime,status,connect,disconnect}` thống nhất T2→T5; `IP.auth.connectGmail` T3→T2(connect); `aiClassify` (Phase D) reuse T4; bảng/cột (notifications.type/read/source, reminders.kind/due_at/deadline_at/status, gmail_seen PK) khớp T1↔T4↔T5; mode `reminders` wire đủ; CRON_SECRET gate T4↔T6.
