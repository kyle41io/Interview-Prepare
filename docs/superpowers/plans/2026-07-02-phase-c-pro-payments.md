# Phase C — Pro Tier + VietQR Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gói Pro trả phí: nội dung chuyên sâu khoá server-side (RLS), mua qua VietQR với mã duy nhất, admin duyệt thủ công (webhook-ready).

**Architecture:** Supabase: 4 bảng mới (entitlements, payment_requests, pro_content, pro_catalog) + RLS; 1 Edge Function `approve-payment` (list/approve/reject, chỉ ADMIN_UIDS, service-role ghi, seam `applyApproval`). Frontend: module `IP.pro` (pure helpers TDD + entitlement cache + fetch pro sections), mode `upgrade` + `admin`, khoá/mở section Pro trong `renderTopic`.

**Tech Stack:** Supabase (Postgres/RLS/Edge Functions Deno), vanilla JS no-build, `node --test`.

## Global Constraints

- **No build step**; nhánh `handbook-phase-c` (off main `47404aa`); commit theo feature; suite `node --test` giữ **42/42 + test mới**.
- **Không secret trong repo**: `ADMIN_UIDS` là Edge Function secret (server enforcement); `config.js` chỉ thêm danh sách UI-gating public `ADMIN_UIDS: []` (lộ uid admin không phải secret). Service-role key chỉ trong function env.
- **Mọi ghi entitlement/duyệt tiền qua service-role trong Edge Function** — client không tự cấp quyền được. Client chỉ: insert payment_request pending của mình, update own pending→submitted.
- **Giá & QR**: `PRICE_VND = 49000`, `PLAN_DAYS = 30`, bank `970407`, STK `19036335023019`, tên `NGUYEN VAN KIEN`, QR: `https://img.vietqr.io/image/970407-19036335023019-compact2.jpg?amount={amount}&addInfo={code}&accountName=NGUYEN%20VAN%20KIEN` (ảnh lỗi → fallback text + copy).
- **Bilingual** mọi chuỗi UI; **dual-export** cho `assets/js/pro.js` (pattern chuẩn `IP.*`); CSS token-based cả 2 theme; **line numbers ước lượng — locate bằng grep anchor**.
- Mode mới `upgrade`, `admin` phải vào: `render()` dispatch (anchor `State.mode === "cheat"`), view-restore (anchor `_v.mode === "cheat"`), `saveView` hợp lệ.
- FK mọi bảng mới → `profiles(id)`/`auth.users` với `ON DELETE CASCADE` (xoá tài khoản sạch).

---

## File Structure
**Create:** `supabase/migrations/0003_pro.sql` · `supabase/functions/approve-payment/index.ts` · `assets/js/pro.js` · `tests/pro.test.js` · `supabase/seed/pro_content_seed.sql` · `docs/superpowers/DEPLOY-PHASE-C.md`
**Modify:** `assets/js/config.js` (+ADMIN_UIDS public) · `index.html` (script pro.js + menu items) · `assets/js/app.js` (renderUpgrade/renderAdmin/pro sections trong renderTopic/badge PRO cạnh avatar) · `assets/css/styles.css`

---

## Task 1: Migration 0002 — bảng + RLS

**Files:** Create `supabase/migrations/0002_pro.sql` (Phase B chỉ có 0001 → file này là 0002).
**Interfaces:** Produces schema cho mọi task sau.

- [ ] **Step 1: Viết `supabase/migrations/0002_pro.sql`**
```sql
-- Phase C: entitlements + payments + pro content, all RLS
create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier text not null default 'pro',
  status text not null default 'active',
  expires_at timestamptz not null,
  source text,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "own entitlement select" on public.entitlements for select using (auth.uid() = user_id);
-- no insert/update/delete policies: service-role only

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  plan text not null default 'pro-month',
  amount int not null,
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.payment_requests enable row level security;
create policy "own payreq select" on public.payment_requests for select using (auth.uid() = user_id);
create policy "own payreq insert" on public.payment_requests for insert
  with check (auth.uid() = user_id and status = 'pending');
create policy "own payreq submit" on public.payment_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'submitted');

create table if not exists public.pro_catalog (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null,
  position int not null default 0,
  title jsonb not null,           -- {vi,en}
  unique(topic_id, position)
);
alter table public.pro_catalog enable row level security;
create policy "catalog select all" on public.pro_catalog for select using (true);

create table if not exists public.pro_content (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null,
  position int not null default 0,
  section jsonb not null,         -- full section {id,title:{vi,en},blocks:[...]}
  created_at timestamptz not null default now(),
  unique(topic_id, position)
);
alter table public.pro_content enable row level security;
create policy "pro content for entitled" on public.pro_content for select using (
  exists (select 1 from public.entitlements e
          where e.user_id = auth.uid() and e.status = 'active' and e.expires_at > now())
);
```
- [ ] **Step 2: Đọc lại kiểm tra** — RLS bật cả 4 bảng; entitlements/pro_content không có policy ghi client; payment update chỉ pending→submitted (WITH CHECK); catalog public-read (chỉ metadata title).
- [ ] **Step 3: Commit** — `git add supabase/migrations/0002_pro.sql && git commit -m "feat(db): pro entitlements, payment requests, pro content + catalog with RLS"`

## Task 2: `IP.pro` — pure helpers (TDD) + client module

**Files:** Create `assets/js/pro.js`, `tests/pro.test.js`; Modify `index.html` (script sau `account.js`), `assets/js/config.js` (thêm `ADMIN_UIDS: []` public).
**Interfaces (Produces):**
- Pure: `genProCode(rand?)` → `"PRO-XXXXXX"` (6 ký tự từ `ABCDEFGHJKMNPQRSTUVWXYZ23456789` — bỏ I/L/O/0/1; `rand` injectable cho test, default Math.random). `extendExpiry(nowIso, currentExpiryIso|null, days)` → ISO string = max(now,current)+days*86400000. `vietqrUrl(amount, code)` → URL đúng format Global Constraints (encode accountName). `isAdmin(uid, adminList)` → bool.
- Stateful: `IP.pro.init()` (gọi sau login: select own entitlement → cache), `IP.pro.isPro()` → bool (cache, check expires), `IP.pro.refresh()`, `IP.pro.catalog(topicId)` → Promise<[{position,title}]> (cache toàn bộ catalog 1 lần), `IP.pro.sections(topicId)` → Promise<[section]|null> (null nếu không entitled/lỗi), `IP.pro.onChange(cb)`.

- [ ] **Step 1: Test thất bại** — `tests/pro.test.js`:
```js
const test = require("node:test");
const assert = require("node:assert");
const pro = require("../assets/js/pro.js");

test("genProCode format + charset", () => {
  const c = pro.genProCode(() => 0.5);
  assert.match(c, /^PRO-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  // deterministic with injected rand
  assert.strictEqual(pro.genProCode(() => 0), "PRO-AAAAAA");
});
test("extendExpiry from now when no current expiry", () => {
  const out = pro.extendExpiry("2026-07-02T00:00:00.000Z", null, 30);
  assert.strictEqual(out, "2026-08-01T00:00:00.000Z");
});
test("extendExpiry stacks on future expiry", () => {
  const out = pro.extendExpiry("2026-07-02T00:00:00.000Z", "2026-07-10T00:00:00.000Z", 30);
  assert.strictEqual(out, "2026-08-09T00:00:00.000Z");
});
test("extendExpiry ignores past expiry", () => {
  const out = pro.extendExpiry("2026-07-02T00:00:00.000Z", "2026-06-01T00:00:00.000Z", 30);
  assert.strictEqual(out, "2026-08-01T00:00:00.000Z");
});
test("vietqrUrl builds exact URL", () => {
  assert.strictEqual(pro.vietqrUrl(49000, "PRO-ABC234"),
    "https://img.vietqr.io/image/970407-19036335023019-compact2.jpg?amount=49000&addInfo=PRO-ABC234&accountName=NGUYEN%20VAN%20KIEN");
});
test("isAdmin", () => {
  assert.strictEqual(pro.isAdmin("u1", ["u1","u2"]), true);
  assert.strictEqual(pro.isAdmin("u3", ["u1"]), false);
  assert.strictEqual(pro.isAdmin(null, ["u1"]), false);
});
```
- [ ] **Step 2: FAIL** — `node --test tests/pro.test.js` (module missing).
- [ ] **Step 3: Viết `assets/js/pro.js`** — dual-export chuẩn (`root.IP.pro = api` luôn + `module.exports`), factory nhận `root`. Pure phần trên; stateful phần dùng `root.IP.auth.client()` lazily (call-time, an toàn khi require trong Node):
```js
  const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  function genProCode(rand) { const r = rand || Math.random; let s = "";
    for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(r() * CODE_CHARS.length)];
    return "PRO-" + s; }
  function extendExpiry(nowIso, currentIso, days) {
    const base = Math.max(Date.parse(nowIso), currentIso ? Date.parse(currentIso) : 0);
    return new Date(base + days * 86400000).toISOString(); }
  function vietqrUrl(amount, code) {
    return "https://img.vietqr.io/image/970407-19036335023019-compact2.jpg?amount=" + amount +
      "&addInfo=" + encodeURIComponent(code) + "&accountName=" + encodeURIComponent("NGUYEN VAN KIEN"); }
  function isAdmin(uid, list) { return !!uid && Array.isArray(list) && list.indexOf(uid) !== -1; }
```
  Stateful: `_ent` cache; `init()` → nếu `IP.auth.getUser()`: `client().from("entitlements").select("*").maybeSingle()` → `_ent`, `_emit()`; `isPro()` → `_ent && _ent.status==="active" && Date.parse(_ent.expires_at) > Date.now()`; `refresh()=init()`; `catalog()`: 1 lần `from("pro_catalog").select("topic_id,position,title")` → Map; `sections(topicId)`: nếu !isPro() trả null, else `from("pro_content").select("position,section").eq("topic_id",topicId).order("position")` → mảng section (cache theo topic); mọi lỗi mạng → null/[] không throw. Export: `{genProCode, extendExpiry, vietqrUrl, isAdmin, init, refresh, isPro, catalog, sections, onChange, PRICE_VND: 49000, PLAN_DAYS: 30}`.
- [ ] **Step 4: PASS** `node --test tests/pro.test.js` (6 test) rồi full suite (42+6=48).
- [ ] **Step 5:** `config.js` thêm dòng `ADMIN_UIDS: [],  // public UI-gating; real enforcement is the Edge Function secret` trong `window.IP_CONFIG`. `index.html` thêm `<script src="assets/js/pro.js"></script>` sau `account.js`.
- [ ] **Step 6: Commit** — `git add assets/js/pro.js tests/pro.test.js index.html assets/js/config.js && git commit -m "feat: IP.pro module — pro-code/expiry/vietqr helpers (TDD) + entitlement cache"`

## Task 3: Edge Function `approve-payment`

**Files:** Create `supabase/functions/approve-payment/index.ts`.
**Interfaces:** POST body `{action:"list"}` → `{requests:[...]}` (mọi request status submitted/pending, kèm email từ profiles); `{action:"approve"|"reject", payment_id, note?}` → `{ok:true}`. 401 không JWT; **403 nếu caller không nằm trong secret `ADMIN_UIDS`** (comma-separated uuids). Approve = seam `applyApproval(admin, paymentId)`: update payment → approved + decided_at, upsert entitlement (`expires_at = extendExpiry(now, current, 30)` — logic nhân bản trong TS, giữ same semantics), source `'manual'`. Reject → status rejected + note. Webhook sau này gọi lại `applyApproval` — giữ hàm thuần tách khỏi phần auth-check.

- [ ] **Step 1: Viết function** — theo pattern `supabase/functions/delete-account/index.ts` (CORS headers mọi nhánh, OPTIONS 204, Bearer JWT → `admin.auth.getUser(jwt)`, env `SUPABASE_URL` + `SERVICE_ROLE_KEY`, thêm `ADMIN_UIDS`):
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });

function extendExpiry(nowMs: number, currentIso: string | null, days: number): string {
  const base = Math.max(nowMs, currentIso ? Date.parse(currentIso) : 0);
  return new Date(base + days * 86400000).toISOString();
}
async function applyApproval(admin: ReturnType<typeof createClient>, paymentId: string) {
  const { data: pay, error } = await admin.from("payment_requests").select("*").eq("id", paymentId).single();
  if (error || !pay) return { error: "payment not found" };
  if (pay.status === "approved") return { ok: true }; // idempotent
  const { data: ent } = await admin.from("entitlements").select("expires_at").eq("user_id", pay.user_id).maybeSingle();
  const expires = extendExpiry(Date.now(), ent?.expires_at ?? null, 30);
  const { error: e1 } = await admin.from("entitlements").upsert({ user_id: pay.user_id, tier: "pro", status: "active", expires_at: expires, source: "manual", updated_at: new Date().toISOString() });
  if (e1) return { error: e1.message };
  const { error: e2 } = await admin.from("payment_requests").update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", paymentId);
  if (e2) return { error: e2.message };
  return { ok: true, expires_at: expires };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "no token" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SERVICE_ROLE_KEY")!;
    const adminUids = (Deno.env.get("ADMIN_UIDS") || "").split(",").map(s => s.trim()).filter(Boolean);
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u?.user) return json({ error: "invalid token" }, 401);
    if (!adminUids.includes(u.user.id)) return json({ error: "forbidden" }, 403);
    const body = await req.json().catch(() => ({}));
    if (body.action === "list") {
      const { data, error } = await admin.from("payment_requests")
        .select("id,user_id,code,plan,amount,status,note,created_at, profiles(email,display_name)")
        .in("status", ["pending", "submitted"]).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ requests: data });
    }
    if (body.action === "approve") { const r = await applyApproval(admin, body.payment_id); return "error" in r ? json(r, 500) : json(r); }
    if (body.action === "reject") {
      const { error } = await admin.from("payment_requests").update({ status: "rejected", note: body.note ?? null, decided_at: new Date().toISOString() }).eq("id", body.payment_id).in("status", ["pending", "submitted"]);
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) { return json({ error: String(e) }, 500); }
});
```
- [ ] **Step 2: Đọc lại** — uid chỉ từ JWT verified; adminUids từ env; applyApproval idempotent; reject không đè approved.
- [ ] **Step 3: Commit** — `git add supabase/functions/approve-payment/index.ts && git commit -m "feat(fn): approve-payment Edge Function — admin list/approve/reject, webhook-ready seam"`

## Task 4: Trang Nâng cấp Pro (mode `upgrade`)

**Files:** Modify `assets/js/app.js`, `index.html` (menu), `assets/css/styles.css`.
**Interfaces:** Consumes `IP.pro.*`, `IP.auth`. Produces mode `"upgrade"`, `renderUpgrade()`, async loader `loadUpgradeData()`, menu item `data-menu="upgrade"`, badge PRO cạnh avatar khi `isPro()`.

- [ ] **Step 1: UI strings** (khối `UI = Object.assign`): `upgrade:{vi:"Nâng cấp Pro",en:"Upgrade to Pro"}`, `proActiveUntil:{vi:"Pro của bạn hiệu lực đến",en:"Your Pro is active until"}`, `payStep1:{vi:"Quét QR & chuyển khoản đúng nội dung",en:"Scan the QR & transfer with the exact note"}`, `iPaid:{vi:"Tôi đã chuyển khoản",en:"I have transferred"}`, `waitingApproval:{vi:"Đang chờ duyệt (thường trong vài giờ)",en:"Awaiting approval (usually within hours)"}`, `payRejected:{vi:"Bị từ chối",en:"Rejected"}`, `signInFirst:{vi:"Đăng nhập để nâng cấp Pro",en:"Sign in to upgrade"}`, `copy:{vi:"Sao chép",en:"Copy"}`.
- [ ] **Step 2: State phụ** — biến module-scope `Upgrade = { reqs: null, loading: false }`. `async function loadUpgradeData()`: nếu user → `IP.auth.client().from("payment_requests").select("*").order("created_at",{ascending:false})` → `Upgrade.reqs`; `IP.pro.refresh()`; `render()`.
- [ ] **Step 3: `renderUpgrade()`** (đặt cạnh `renderSettings`): các trạng thái —
  (a) chưa login → hint + nút sign-in;
  (b) `IP.pro.isPro()` → card "PRO đang hiệu lực đến {date}" + lịch sử;
  (c) có request `pending` mới nhất → **bước thanh toán**: ảnh QR `<img src="${IP.pro.vietqrUrl(req.amount, req.code)}" onerror="this.hidden=true;document.getElementById('qrFallback').hidden=false">` + fallback `#qrFallback[hidden]` (bảng: Ngân hàng Techcombank / STK 19036335023019 (nút copy) / Số tiền 49.000đ / Nội dung `req.code` (nút copy)) + nút `#iPaidBtn`;
  (d) có `submitted` → trạng thái chờ duyệt;
  (e) không có request active → mô tả quyền lợi Pro (đọc section chuyên sâu, sắp tới: chat AI) + giá + nút `#startUpgradeBtn`.
  Lịch sử requests bảng nhỏ (code, ngày, trạng thái).
- [ ] **Step 4: Handlers** (delegated listener):
```js
      if (e.target.closest("#startUpgradeBtn")) {
        (async () => { const c = IP.auth.client(); const u = IP.auth.getUser(); if (!c || !u) return;
          const code = IP.pro.genProCode();
          await c.from("payment_requests").insert({ user_id: u.id, code, amount: IP.pro.PRICE_VND, plan: "pro-month", status: "pending" });
          await loadUpgradeData(); })();
        return;
      }
      if (e.target.closest("#iPaidBtn")) {
        (async () => { const c = IP.auth.client(); const req = (Upgrade.reqs || []).find(r => r.status === "pending");
          if (!c || !req) return;
          await c.from("payment_requests").update({ status: "submitted" }).eq("id", req.id);
          await loadUpgradeData(); })();
        return;
      }
      if (e.target.closest("[data-copy]")) { const v = e.target.closest("[data-copy]").dataset.copy;
        if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {}); return; }
```
- [ ] **Step 5: Wire** — dispatch `else if (State.mode === "upgrade") main.innerHTML = renderUpgrade();` (anchor `State.mode === "cheat"`); restore branch tương tự; menu `index.html`: `<button data-menu="upgrade"><i class="fa-solid fa-crown"></i> <span data-i18n="upgrade">Nâng cấp Pro</span></button>` trước `settings`; `setI("upgrade", UI.upgrade)`; menu action → set mode + `loadUpgradeData()`. Badge: trong `updateAuthUI` nếu `IP.pro.isPro()` thêm class `pro` cho `#profileBtn` (CSS viền vàng + crown dot). Boot: sau `IP.auth.onChange` handler hiện có thêm `IP.pro.init()` khi user login (`if (user) IP.pro.init();` cạnh `IP.sync.onLogin()`).
- [ ] **Step 6: CSS** — `.upgrade-page{max-width:640px}`, `.qr-card{display:flex;flex-direction:column;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px}`, `.qr-card img{width:min(300px,80vw);border-radius:10px}`, `.pay-row{display:flex;justify-content:space-between;gap:10px;width:100%;font-size:13.5px;padding:7px 0;border-bottom:1px dashed var(--line)}`, `.status-pill{...pending/submitted/approved/rejected màu var(--yellow/accent/green/red)}`, `#profileBtn.pro{border-color:var(--yellow);box-shadow:0 0 0 2px color-mix(in srgb,var(--yellow) 30%,transparent)}`.
- [ ] **Step 7: Verify** — `node --check`; suite 48; thủ công (config ADMIN trống vẫn OK): chưa login thấy hint; login → bấm nâng cấp → QR hiện đúng amount+code; "đã chuyển" → trạng thái chờ; reload giữ.
- [ ] **Step 8: Commit** — `git add assets/js/app.js index.html assets/css/styles.css && git commit -m "feat(ui): Pro upgrade page — VietQR flow with unique code + status tracking"`

## Task 5: Trang Admin (mode `admin`)

**Files:** Modify `assets/js/app.js`, `index.html`, `assets/css/styles.css`.
**Interfaces:** Consumes `IP.pro.isAdmin(uid, IP_CONFIG.ADMIN_UIDS)`, Edge Function `approve-payment` qua `IP.auth.client().functions.invoke`. Produces mode `"admin"`, `renderAdmin()`, `loadAdminData()`.

- [ ] **Step 1:** `Admin = { reqs: null, loading: false, error: null }`; `async function loadAdminData()`: `functions.invoke("approve-payment", { body: { action: "list" } })` → reqs/error; `render()`.
- [ ] **Step 2: `renderAdmin()`** — nếu `!IP.pro.isAdmin(user?.id, (window.IP_CONFIG||{}).ADMIN_UIDS)` → `empty-hint` "Not authorized" (UI-gating; server vẫn là chốt thật). Bảng requests: email/tên, code, amount, ngày, status pill, nút Duyệt (`data-approve="{id}"`) / Từ chối (`data-reject="{id}"`) cho status submitted (pending chỉ hiển thị).
- [ ] **Step 3: Handlers** — `[data-approve]`/`[data-reject]` → confirm → `functions.invoke("approve-payment", { body: { action, payment_id } })` → `loadAdminData()`. Lỗi → alert message từ function.
- [ ] **Step 4: Wire** — dispatch + restore + menu item `data-menu="admin"` (`fa-solid fa-user-shield`, label `{vi:"Quản trị",en:"Admin"}`) — **menu item chỉ render… menu là static HTML nên: để nút trong HTML với `hidden`, và trong `updateAuthUI` show khi `IP.pro.isAdmin(...)`**. `setI("admin", UI.admin)`.
- [ ] **Step 5: CSS** — `.admin-table` (bảng tương tự pay-row), nút duyệt xanh/từ chối đỏ nhỏ.
- [ ] **Step 6: Verify** — không phải admin: menu ẩn + trang chặn; suite 48; parse OK. (Duyệt thật test sau deploy.)
- [ ] **Step 7: Commit** — `git add assets/js/app.js index.html assets/css/styles.css && git commit -m "feat(ui): admin approval page for payment requests"`

## Task 6: Pro sections trong `renderTopic` + lock UI

**Files:** Modify `assets/js/app.js`, `assets/css/styles.css`.
**Interfaces:** Consumes `IP.pro.catalog/sections/isPro`. Produces: sau `${sections}` trong renderTopic thêm `<div id="proSections" data-topic="${id}"></div>`; async `hydrateProSections(topicId)` gọi cuối `render()` (cạnh `setupToc()`).

- [ ] **Step 1: `hydrateProSections`**:
```js
  async function hydrateProSections() {
    const host = document.getElementById("proSections"); if (!host) return;
    const topicId = host.dataset.topic;
    const cat = await IP.pro.catalog(topicId);           // [{position,title}] or []
    if (!cat.length) return;
    if (IP.pro.isPro()) {
      const secs = await IP.pro.sections(topicId);
      if (!secs) return;
      host.innerHTML = secs.map((s, i) => `
        <div class="section pro-section" data-sec="pro${i}">
          <div class="section-head"><h2>${t(s.title)} <span class="pro-badge">${fa(ICON.pro)} PRO</span></h2></div>
          <div class="section-body">${(s.blocks || []).map(renderBlock).join("")}</div>
        </div>`).join("");
    } else {
      host.innerHTML = cat.map(c => `
        <div class="section pro-locked">
          <div class="section-head"><h2>${fa("fa-solid fa-lock")} ${t(c.title)} <span class="pro-badge">${fa(ICON.pro)} PRO</span></h2>
          <button class="btn" data-menu-go="upgrade">${t(UI.upgrade)}</button></div>
        </div>`).join("");
    }
  }
```
  Gọi `hydrateProSections();` ngay sau `setupToc();` trong `render()`. Handler `[data-menu-go="upgrade"]` → mode upgrade + `loadUpgradeData()`.
- [ ] **Step 2: CSS** — `.pro-locked{opacity:.85;border-style:dashed}`, `.pro-locked .section-head{cursor:default}`, `.pro-section{border-color:color-mix(in srgb,var(--yellow) 45%,var(--line))}`.
- [ ] **Step 3: Verify** — không login/không pro: topic có catalog hiện khối khoá + nút; race an toàn (đổi topic nhanh: host.dataset.topic check sau await — thêm guard `if (!document.getElementById("proSections") || document.getElementById("proSections").dataset.topic !== topicId) return;` sau mỗi await). Suite 48.
- [ ] **Step 4: Commit** — `git add assets/js/app.js assets/css/styles.css && git commit -m "feat: server-gated Pro sections in topics with lock/upgrade UI"`

## Task 7: Seed nội dung Pro + tài liệu deploy

**Files:** Create `supabase/seed/pro_content_seed.sql`, `docs/superpowers/DEPLOY-PHASE-C.md`.
**Interfaces:** Seed 4 section Pro song ngữ (JSON đúng schema section của app) cho: `system-design` ("Thiết kế hệ thống: Case study URL Shortener end-to-end"), `microservices` ("Saga pattern & distributed transactions chuyên sâu"), `databases` ("Chiến lược index & query tuning thực chiến"), `dl-nlp` ("Fine-tuning LLM: LoRA/QLoRA thực hành") — mỗi section 4-6 blocks chất lượng (prose/list/table/code/callout), viết như content topic chuẩn. INSERT vào `pro_catalog` (topic_id, position, title) + `pro_content` (topic_id, position, section) — dùng `$$...$$` dollar-quoting cho JSON.

- [ ] **Step 1: Author seed SQL** — 4 cặp INSERT catalog+content, `on conflict (topic_id, position) do update set title/section = excluded...` (re-runnable). JSON section escape đúng trong SQL.
- [ ] **Step 2: Validate JSON** — script tạm: node đọc file, regex tách `$$...$$` JSON, `JSON.parse` từng cái → OK.
- [ ] **Step 3: `DEPLOY-PHASE-C.md`** — các bước user: (1) SQL Editor chạy `0002_pro.sql` rồi `pro_content_seed.sql`; (2) `supabase functions deploy approve-payment` + `supabase secrets set SERVICE_ROLE_KEY=... ADMIN_UIDS=<uuid>` (kèm cách lấy uuid: Dashboard → Authentication → Users); (3) sửa `assets/js/config.js` ADMIN_UIDS thêm uuid (public); (4) checklist test end-to-end (mua → duyệt → đọc pro → RLS chặn user khác).
- [ ] **Step 4: Commit** — `git add supabase/seed/pro_content_seed.sql docs/superpowers/DEPLOY-PHASE-C.md && git commit -m "content(pro): seed 4 pro deep-dive sections + phase C deploy guide"`

---

## Final verification
- [ ] `node --test tests/` → 48/48 (42 cũ + 6 pro).
- [ ] Config ADMIN trống + chưa deploy: app chạy local-only đủ, trang upgrade hiện flow tới bước QR (insert cần login+DB → các nhánh degrade không throw), admin ẩn.
- [ ] Không secret trong repo; `file://` vẫn mở được.
- [ ] Sau khi user deploy (checklist DEPLOY-PHASE-C.md): mua→duyệt→pro section đọc được; user khác bị khoá; hết hạn khoá lại.

## Self-Review (đã chạy)
1. **Coverage** spec §2.1→T1(+pro_catalog bổ sung để lock-teaser không lộ nội dung — cải tiến so spec, ghi chú); §2.2→T3,T4,T5; §2.3→T2,T4,T6; §5 security→T1 RLS + T3 server-check; §6 secrets→T7 docs; §7 test→T2 TDD + checklists; §8 nghiệm thu→Final; §9 commit→7 commits.
2. **Placeholders**: không TBD; seed content outline cụ thể (contract như content tasks trước).
3. **Consistency**: `IP.pro.{genProCode,extendExpiry,vietqrUrl,isAdmin,init,refresh,isPro,catalog,sections,onChange,PRICE_VND,PLAN_DAYS}` dùng thống nhất T2→T4/T5/T6; `extendExpiry` semantics trùng giữa JS (T2) và TS (T3); migration file đặt `0002_pro.sql` nhất quán (ghi đè nhầm lẫn 0003 ở đầu Task 1 — đã chốt 0002); mode `upgrade`/`admin` wire đủ dispatch+restore+menu.
