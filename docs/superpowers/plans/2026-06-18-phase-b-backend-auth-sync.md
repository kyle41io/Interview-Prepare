# Phase B — Backend + Google OAuth + Account Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm đăng nhập Google (tùy chọn) + đồng bộ state đa thiết bị qua Supabase, giữ frontend static no-build.

**Architecture:** Supabase BaaS (Postgres + Auth + RLS + Edge Functions, region EU). Frontend static trên GitHub Pages nạp client Supabase **self-host** (UMD) + 2 module `IP.auth`/`IP.sync` + `config.js`. `IP.store` (cache local) được mở rộng để chụp snapshot và phát sự kiện. Logic thuần (`IP.sync.merge`, mở rộng `IP.store`) unit-test bằng `node --test`; auth/sync/RLS/Edge Function kiểm thử thủ công.

**Tech Stack:** HTML/CSS/Vanilla JS (no build), `@supabase/supabase-js` v2 (UMD self-host), Supabase (Postgres/GoTrue/RLS/Edge Functions Deno), `node --test`.

## Global Constraints

- **No build step**: chỉ `<script>`/`<link>`; `index.html` mở trực tiếp được. Không bundler/framework/package.json.
- **No-dependency tests**: `node --test` (Node ≥18; v20 có sẵn). Không thêm `package.json`/`node_modules`.
- **Repo scope**: chỉ sửa repo `Interview-Prepare/`; nhánh `handbook-phase-b`.
- **Commit theo từng feature** (conventional commits), mỗi task = 1 commit, site luôn chạy.
- **Bảo mật**: KHÔNG secret trong repo. Frontend chỉ chứa `SUPABASE_URL` + `SUPABASE_ANON_KEY` (public). Google Client Secret ở dashboard Supabase; service-role key ở secret của Edge Function.
- **Đăng nhập tùy chọn**: app chạy đầy đủ khi chưa login HOẶC khi `IP_CONFIG` trống HOẶC khi Supabase offline (degrade local-only, không throw).
- **Self-host** Supabase JS UMD tại `assets/vendor/supabase.js` (như Font Awesome ở Phase A) — không CDN runtime.
- **localStorage prefix** `ip_`; không đổi tên/format khoá Phase A. State shape khớp `IP.store.defaults()`: `lang, theme, track, progress, cards, quizBest, bookmarks, streak, schemaVersion`.
- **Dual-export pattern** cho mọi module logic (`assets/js/*.js`):
  ```js
  (function (root, factory) {
    const api = factory(root);
    root.IP = root.IP || {};
    root.IP.<name> = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  })(typeof window !== "undefined" ? window : globalThis, function (root) { "use strict"; /* ... */ return {...}; });
  ```
- **Region EU**, GDPR: dữ liệu tối thiểu (email/tên/avatar + state), xoá tài khoản đầy đủ.

---

## File Structure

**Tạo mới:**
- `assets/vendor/supabase.js` — Supabase JS UMD self-host (expose `window.supabase`).
- `assets/js/config.js` — `window.IP_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY }` (placeholder rỗng tới khi user cấp).
- `assets/js/auth.js` — `IP.auth` (Google OAuth, session, disabled-khi-thiếu-config).
- `assets/js/sync.js` — `IP.sync` (`merge` thuần + pull/push/debounce/offline/onLogin).
- `supabase/migrations/0001_init.sql` — profiles + user_state + RLS + profile trigger.
- `supabase/functions/delete-account/index.ts` — Edge Function (Deno) xoá tài khoản.
- `tests/store-ext.test.js` — test `snapshot/onChange/replaceAll`.
- `tests/sync-merge.test.js` — test `IP.sync.merge`.

**Sửa:**
- `assets/js/store.js` — thêm `snapshot()`, `onChange(cb)`, `replaceAll(state,opts)`; `set` phát sự kiện.
- `index.html` — nạp vendor+config+auth+sync; nút Sign-in + mục account trong menu hồ sơ.
- `assets/js/app.js` — boot init auth/sync; `reloadFromStore()`; UI account; nhành động sign-out/delete.
- `assets/css/styles.css` — style nút sign-in / account row.

---

## Task 1: Vendor Supabase JS + config.js + load order

**Files:**
- Create: `assets/vendor/supabase.js`, `assets/js/config.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `window.supabase.createClient`; `window.IP_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY }`.

- [ ] **Step 1: Vendor Supabase UMD**

Run (repo root):
```bash
mkdir -p assets/vendor
curl -L -o assets/vendor/supabase.js https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js
grep -c "createClient" assets/vendor/supabase.js   # expect >0
```
Expected: file tải về (vài trăm KB), chứa `createClient`. Nếu mạng bị chặn: tải thủ công bản UMD `@supabase/supabase-js@2` (file `dist/umd/supabase.js`) và đặt vào `assets/vendor/supabase.js`.

- [ ] **Step 2: Tạo `assets/js/config.js` (placeholder public)**

```js
/* Public Supabase config. URL + anon key are PUBLIC (safe in a static site; RLS protects data).
   Fill these in after creating the Supabase project (region EU). Empty = app runs local-only. */
window.IP_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
```

- [ ] **Step 3: Nạp trong `index.html`** — thêm NGAY TRƯỚC `<script src="assets/js/store.js">` (hiện ở dòng 92):

```html
<!-- ===== Backend (Supabase) ===== -->
<script src="assets/vendor/supabase.js"></script>
<script src="assets/js/config.js"></script>

<!-- ===== App ===== -->
<script src="assets/js/store.js"></script>
```
Và sau `streak.js`, trước `app.js` (dòng 98-99), thêm:
```html
<script src="assets/js/streak.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/sync.js"></script>
<script src="assets/js/app.js"></script>
```

- [ ] **Step 4: Kiểm tra thủ công**

Mở `index.html`. Expected: Console không lỗi; `window.supabase` tồn tại; `window.IP_CONFIG` tồn tại (URL rỗng). App chạy bình thường (Phase A không hồi quy).

- [ ] **Step 5: Commit**
```bash
git add assets/vendor/supabase.js assets/js/config.js index.html
git commit -m "chore: vendor self-hosted Supabase JS + config.js placeholder"
```

---

## Task 2: `IP.store` extension — snapshot / onChange / replaceAll

**Files:**
- Modify: `assets/js/store.js`
- Create: `tests/store-ext.test.js`

**Interfaces:**
- Produces:
  - `IP.store.snapshot()` → object gồm mọi khoá trong `defaults()`, đọc giá trị hiện tại (fallback = default).
  - `IP.store.onChange(cb)` → đăng ký; `cb(key)` gọi sau mỗi `set`; với `replaceAll` không-silent gọi `cb("*")`. Trả hàm huỷ đăng ký.
  - `IP.store.replaceAll(state, opts)` → ghi mọi khoá có trong `state` (giới hạn các khoá của `defaults()`); `opts.silent` true → không phát sự kiện.
  - `IP.store.set(key, value)` (đã có) → nay phát `onChange(key)` sau khi ghi.

- [ ] **Step 1: Viết test thất bại** — `tests/store-ext.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");

// minimal localStorage shim for Node
function makeShim() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => Array.from(m.keys())[i],
    get length() { return m.size; },
    _map: m,
  };
}
global.localStorage = makeShim();
// Object.keys(localStorage) must list stored keys for clearAll(); emulate via defineProperty
function freshStore() {
  delete require.cache[require.resolve("../assets/js/store.js")];
  return require("../assets/js/store.js");
}

test("snapshot returns all default keys when empty", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const s = store.snapshot();
  assert.deepStrictEqual(Object.keys(s).sort(), Object.keys(store.defaults()).sort());
  assert.strictEqual(s.lang, "vi");
  assert.deepStrictEqual(s.bookmarks, []);
});

test("snapshot reflects set values", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  store.set("lang", "en");
  store.set("bookmarks", ["dsa"]);
  const s = store.snapshot();
  assert.strictEqual(s.lang, "en");
  assert.deepStrictEqual(s.bookmarks, ["dsa"]);
});

test("onChange fires on set with the key", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  store.onChange((k) => seen.push(k));
  store.set("theme", "dark");
  assert.deepStrictEqual(seen, ["theme"]);
});

test("replaceAll writes known keys and fires once with '*'", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  store.onChange((k) => seen.push(k));
  store.replaceAll({ lang: "en", progress: { dsa: true }, ignored: 1 });
  assert.strictEqual(store.snapshot().lang, "en");
  assert.deepStrictEqual(store.snapshot().progress, { dsa: true });
  assert.strictEqual(store.snapshot().ignored, undefined); // not a known key
  assert.deepStrictEqual(seen, ["*"]);
});

test("replaceAll silent does not fire", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  store.onChange((k) => seen.push(k));
  store.replaceAll({ lang: "en" }, { silent: true });
  assert.deepStrictEqual(seen, []);
});

test("onChange unsubscribe stops further events", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  const off = store.onChange((k) => seen.push(k));
  store.set("lang", "en");
  off();
  store.set("lang", "vi");
  assert.deepStrictEqual(seen, ["lang"]);
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/store-ext.test.js`
Expected: FAIL — `snapshot`/`onChange`/`replaceAll` chưa tồn tại.

- [ ] **Step 3: Sửa `assets/js/store.js`** — thay khối hàm get/set + return. Cụ thể:

(a) Thêm sau `SCHEMA_VERSION` (dòng 10), khai báo listeners:
```js
  let _listeners = [];
```
(b) Thay `set` (dòng 42-44) và thêm `_write`/`_notify`/`snapshot`/`onChange`/`replaceAll`:
```js
  function _write(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  }
  function _notify(key) {
    _listeners.forEach((f) => { try { f(key); } catch {} });
  }
  function set(key, value) { _write(key, value); _notify(key); }

  function onChange(cb) {
    _listeners.push(cb);
    return function off() { _listeners = _listeners.filter((f) => f !== cb); };
  }
  function snapshot() {
    const d = defaults();
    const out = {};
    Object.keys(d).forEach((k) => { out[k] = get(k, d[k]); });
    return out;
  }
  function replaceAll(state, opts) {
    const d = defaults();
    const src = state && typeof state === "object" ? state : {};
    Object.keys(d).forEach((k) => { if (k in src) _write(k, src[k]); });
    if (!(opts && opts.silent)) _notify("*");
  }
```
(c) Cập nhật `return` (dòng 58):
```js
  return { defaults, migrate, get, set, reset, clearAll, snapshot, onChange, replaceAll, PREFIX, SCHEMA_VERSION };
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/store-ext.test.js`
Expected: PASS (6 test).

- [ ] **Step 5: Regression toàn bộ**

Run: `node --test tests/`
Expected: tất cả PASS (28 Phase A + 6 mới = 34).

- [ ] **Step 6: Commit**
```bash
git add assets/js/store.js tests/store-ext.test.js
git commit -m "feat: IP.store snapshot + change events + replaceAll"
```

---

## Task 3: `IP.sync.merge` (pure) + tests

**Files:**
- Create: `assets/js/sync.js` (chỉ phần `merge` + khung module ở task này; pull/push thêm ở Task 6)
- Create: `tests/sync-merge.test.js`

**Interfaces:**
- Produces: `IP.sync.merge(local, server)` → state đã gộp đầy đủ (pure, không mutate input). Quy tắc (spec §7): progress=union, bookmarks=union, quizBest=max, cards=reps lớn hơn (tie: due muộn hơn), streak=count lớn hơn (tie: lastActiveDate muộn hơn), track/theme/lang=local thắng nếu có, schemaVersion=max.

- [ ] **Step 1: Viết test thất bại** — `tests/sync-merge.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const sync = require("../assets/js/sync.js");

test("progress is unioned (learned on either side)", () => {
  const out = sync.merge({ progress: { a: true } }, { progress: { b: true } });
  assert.deepStrictEqual(out.progress, { a: true, b: true });
});
test("bookmarks unioned + deduped", () => {
  const out = sync.merge({ bookmarks: ["a", "b"] }, { bookmarks: ["b", "c"] });
  assert.deepStrictEqual(out.bookmarks.sort(), ["a", "b", "c"]);
});
test("quizBest takes max per topic", () => {
  const out = sync.merge({ quizBest: { dsa: 80, x: 50 } }, { quizBest: { dsa: 60, y: 90 } });
  assert.deepStrictEqual(out.quizBest, { dsa: 80, x: 50, y: 90 });
});
test("cards keep entry with higher reps; tie -> later due", () => {
  const out = sync.merge(
    { cards: { "t#0": { reps: 3, due: 10 }, "t#1": { reps: 1, due: 5 } } },
    { cards: { "t#0": { reps: 5, due: 20 }, "t#1": { reps: 1, due: 9 } } }
  );
  assert.deepStrictEqual(out.cards["t#0"], { reps: 5, due: 20 }); // server higher reps
  assert.deepStrictEqual(out.cards["t#1"], { reps: 1, due: 9 });  // tie reps -> later due (server)
});
test("streak: higher count wins; tie -> later date", () => {
  assert.strictEqual(sync.merge({ streak: { count: 5, lastActiveDate: "2026-06-01" } }, { streak: { count: 3, lastActiveDate: "2026-06-10" } }).streak.count, 5);
  assert.strictEqual(sync.merge({ streak: { count: 3, lastActiveDate: "2026-06-01" } }, { streak: { count: 3, lastActiveDate: "2026-06-10" } }).streak.lastActiveDate, "2026-06-10");
});
test("scalars: local wins when present, else server", () => {
  const out = sync.merge({ lang: "en", theme: "dark", track: { role: "swe", level: "junior" } }, { lang: "vi", theme: "light", track: null });
  assert.strictEqual(out.lang, "en");
  assert.strictEqual(out.theme, "dark");
  assert.deepStrictEqual(out.track, { role: "swe", level: "junior" });
  // local track null -> server track used
  const out2 = sync.merge({ track: null }, { track: { role: "devops", level: "" } });
  assert.deepStrictEqual(out2.track, { role: "devops", level: "" });
});
test("missing fields -> safe defaults, no throw", () => {
  const out = sync.merge({}, {});
  assert.deepStrictEqual(out.progress, {});
  assert.deepStrictEqual(out.bookmarks, []);
  assert.strictEqual(out.lang, "vi");
  assert.strictEqual(out.theme, "system");
  assert.strictEqual(out.track, null);
});
test("does not mutate inputs", () => {
  const local = { progress: { a: true }, bookmarks: ["a"] };
  const server = { progress: { b: true }, bookmarks: ["b"] };
  sync.merge(local, server);
  assert.deepStrictEqual(local, { progress: { a: true }, bookmarks: ["a"] });
  assert.deepStrictEqual(server, { progress: { b: true }, bookmarks: ["b"] });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/sync-merge.test.js`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết `assets/js/sync.js`** (khung + merge; pull/push ở Task 6)

```js
/* IP.sync — local<->server state sync (Supabase). merge() is pure. */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.sync = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function _scalar(l, s, dflt) {
    if (l !== undefined && l !== null) return l;
    if (s !== undefined && s !== null) return s;
    return dflt;
  }

  // pure: merge local (this device) with server state. Never loses progress.
  function merge(local, server) {
    const l = local || {}, s = server || {};
    // progress: union
    const progress = {};
    Object.keys(Object.assign({}, s.progress, l.progress)).forEach((id) => {
      progress[id] = !!(((l.progress || {})[id]) || ((s.progress || {})[id]));
    });
    // bookmarks: union + dedupe
    const bookmarks = Array.from(new Set([].concat(s.bookmarks || [], l.bookmarks || [])));
    // quizBest: max per topic
    const quizBest = Object.assign({}, s.quizBest || {});
    Object.keys(l.quizBest || {}).forEach((id) => {
      quizBest[id] = Math.max(Number(l.quizBest[id]) || 0, Number(quizBest[id]) || 0);
    });
    // cards: per key, higher reps wins; tie -> later due; one side -> that side
    const cards = {};
    const lc = l.cards || {}, sc = s.cards || {};
    Object.keys(Object.assign({}, sc, lc)).forEach((k) => {
      const a = lc[k], b = sc[k];
      if (a && b) {
        const ra = Number(a.reps) || 0, rb = Number(b.reps) || 0;
        cards[k] = ra > rb ? a : rb > ra ? b : ((Number(a.due) || 0) >= (Number(b.due) || 0) ? a : b);
      } else { cards[k] = a || b; }
    });
    // streak: higher count; tie -> later lastActiveDate
    let streak;
    const ls = l.streak, ss = s.streak;
    if (ls && ss) {
      const ca = Number(ls.count) || 0, cb = Number(ss.count) || 0;
      if (ca > cb) streak = ls; else if (cb > ca) streak = ss;
      else streak = ((ls.lastActiveDate || "") >= (ss.lastActiveDate || "")) ? ls : ss;
    } else { streak = ls || ss || { count: 0, lastActiveDate: null, dailyGoal: 1 }; }

    return {
      lang: _scalar(l.lang, s.lang, "vi"),
      theme: _scalar(l.theme, s.theme, "system"),
      track: _scalar(l.track, s.track, null),
      progress, cards, quizBest, bookmarks, streak,
      schemaVersion: Math.max(Number(l.schemaVersion) || 1, Number(s.schemaVersion) || 1),
    };
  }

  return { merge };
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/sync-merge.test.js`
Expected: PASS (8 test).

- [ ] **Step 5: Commit**
```bash
git add assets/js/sync.js tests/sync-merge.test.js
git commit -m "feat: IP.sync.merge (pure smart-merge) + unit tests"
```

---

## Task 4: Supabase migration — profiles + user_state + RLS + profile trigger

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: bảng `profiles`, `user_state`; RLS policies; trigger tạo `profiles` khi có auth user mới.

- [ ] **Step 1: Viết `supabase/migrations/0001_init.sql`**

```sql
-- Phase B: profiles + user_state + RLS + profile auto-provision trigger

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;

create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create policy "own state select" on public.user_state for select using (auth.uid() = user_id);
create policy "own state insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own state update" on public.user_state for update using (auth.uid() = user_id);
create policy "own state delete" on public.user_state for delete using (auth.uid() = user_id);

-- Auto-create a profile row when a new auth user signs up (uses Google metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Xác minh cú pháp (đọc lại)**

Đọc lại file: mỗi `create policy` đúng cú pháp; trigger `security definer`; `on delete cascade` ở cả 2 FK. (Áp dụng thật vào Supabase ở phần kiểm thử thủ công Task 6/7 khi đã có project + key.)

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): supabase migration — profiles + user_state + RLS + profile trigger"
```

---

## Task 5: `IP.auth` (Google OAuth, optional) + Sign-in UI + boot wiring

**Files:**
- Create: `assets/js/auth.js`
- Modify: `index.html` (nút Sign-in topbar; mục account trong profile menu)
- Modify: `assets/js/app.js` (boot init auth; cập nhật UI theo trạng thái đăng nhập)
- Modify: `assets/css/styles.css` (style nút sign-in / account)

**Interfaces:**
- Consumes: `window.supabase`, `window.IP_CONFIG`.
- Produces:
  - `IP.auth.enabled()` → bool (config có URL+key).
  - `IP.auth.client()` → Supabase client singleton hoặc `null`.
  - `IP.auth.signInWithGoogle()` / `IP.auth.signOut()`.
  - `IP.auth.getUser()` → user hiện tại hoặc `null` (đồng bộ, từ session cache).
  - `IP.auth.onChange(cb)` → `cb(user|null)` khi trạng thái đổi; trả hàm huỷ.
  - `IP.auth.init()` → khởi tạo client + lắng nghe session; gọi 1 lần lúc boot.

- [ ] **Step 1: Viết `assets/js/auth.js`**

```js
/* IP.auth — Supabase Google OAuth (optional; disabled when config missing) */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.auth = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  let _client = null;
  let _user = null;
  let _cbs = [];

  function cfg() { return root.IP_CONFIG || {}; }
  function enabled() { return !!(cfg().SUPABASE_URL && cfg().SUPABASE_ANON_KEY && root.supabase); }
  function client() {
    if (!enabled()) return null;
    if (!_client) _client = root.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY);
    return _client;
  }
  function getUser() { return _user; }
  function onChange(cb) { _cbs.push(cb); return function () { _cbs = _cbs.filter((f) => f !== cb); }; }
  function _emit() { _cbs.forEach((f) => { try { f(_user); } catch {} }); }

  async function init() {
    const c = client();
    if (!c) return;
    try {
      const { data } = await c.auth.getSession();
      _user = data && data.session ? data.session.user : null;
      _emit();
      c.auth.onAuthStateChange((_event, session) => {
        _user = session ? session.user : null;
        _emit();
      });
    } catch { /* degrade: stay logged out */ }
  }
  async function signInWithGoogle() {
    const c = client(); if (!c) return;
    await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0] } });
  }
  async function signOut() {
    const c = client(); if (!c) return;
    try { await c.auth.signOut(); } catch {}
  }
  return { enabled, client, getUser, onChange, init, signInWithGoogle, signOut };
});
```

- [ ] **Step 2: Sign-in button + account section trong `index.html`**

Thêm nút Sign-in NGAY TRƯỚC `.profile-wrap` (hiện dòng 46):
```html
  <button class="signin-btn" id="signinBtn" hidden><i class="fa-brands fa-google"></i> <span data-i18n="signIn">Sign in</span></button>
  <div class="profile-wrap">
```
> Lưu ý: `fa-brands fa-google` cần font Brands. Phase A chỉ self-host solid+regular. Để tránh phụ thuộc font brands, DÙNG icon solid thay thế: `<i class="fa-solid fa-right-to-bracket"></i>` cho nút Sign-in. (Không thêm file font mới.)

Trong `#profileMenu`, thêm mục account Ở TRÊN CÙNG (trước `change-track`) — sẽ ẩn/hiện theo trạng thái:
```html
    <div class="acct" id="acctRow" hidden><img id="acctAvatar" alt=""><span id="acctName"></span></div>
    <button data-menu="signout" id="menuSignout" hidden><i class="fa-solid fa-right-from-bracket"></i> <span data-i18n="signOut">Đăng xuất</span></button>
    <button data-menu="delete" id="menuDelete" class="danger" hidden><i class="fa-solid fa-user-xmark"></i> <span data-i18n="deleteAccount">Xoá tài khoản</span></button>
    <hr id="acctSep" hidden>
    <button data-menu="change-track">...</button>   <!-- giữ nguyên các mục cũ -->
```
Sửa nút Sign-in dùng icon solid:
```html
  <button class="signin-btn" id="signinBtn" hidden><i class="fa-solid fa-right-to-bracket"></i> <span data-i18n="signIn">Sign in with Google</span></button>
```

- [ ] **Step 3: i18n strings** — trong `app.js` khối `UI`/`IP.i18n.STR` thêm:
```js
    signIn: { vi: "Đăng nhập với Google", en: "Sign in with Google" },
    signOut: { vi: "Đăng xuất", en: "Sign out" },
    deleteAccount: { vi: "Xoá tài khoản", en: "Delete account" },
    confirmDelete: { vi: "Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu trên máy chủ? Không thể hoàn tác.", en: "Permanently delete your account and all server data? This cannot be undone." },
```
Và trong `syncStaticText()` thêm:
```js
    setI("signIn", UI.signIn); setI("signOut", UI.signOut); setI("deleteAccount", UI.deleteAccount);
```

- [ ] **Step 4: Boot wiring trong `app.js`** — thêm hàm cập nhật UI account + init auth.

Thêm hàm (cạnh `bind`):
```js
  function updateAuthUI(user) {
    const signin = document.getElementById("signinBtn");
    const acctRow = document.getElementById("acctRow");
    const sep = document.getElementById("acctSep");
    const mOut = document.getElementById("menuSignout");
    const mDel = document.getElementById("menuDelete");
    const on = !!user;
    if (signin) signin.hidden = on || !IP.auth.enabled();
    [acctRow, sep, mOut, mDel].forEach((el) => { if (el) el.hidden = !on; });
    if (on && acctRow) {
      const md = user.user_metadata || {};
      document.getElementById("acctName").textContent = md.full_name || md.name || user.email || "";
      const av = document.getElementById("acctAvatar");
      if (av) { if (md.avatar_url) { av.src = md.avatar_url; av.style.display = ""; } else av.style.display = "none"; }
    }
  }
```
Trong `bind()`, thêm xử lý click nút sign-in + menu signout/delete (cạnh khối profile menu):
```js
    const sBtn = document.getElementById("signinBtn");
    if (sBtn) sBtn.onclick = () => IP.auth.signInWithGoogle();
```
Trong `pMenu` click handler, thêm nhánh:
```js
        else if (action === "signout") { pMenu.hidden = true; IP.auth.signOut(); }
        else if (action === "delete") {
          pMenu.hidden = true;
          if (confirm(t(UI.confirmDelete))) IP.account.deleteAccount();   // defined in Task 7
        }
```
Trong boot (`DOMContentLoaded`), sau `bind();` thêm:
```js
    updateAuthUI(IP.auth.getUser());
    IP.auth.onChange((user) => { updateAuthUI(user); });
    IP.auth.init();
```

- [ ] **Step 5: CSS** — `assets/css/styles.css` (cuối file):
```css
.signin-btn{display:inline-flex;align-items:center;gap:7px;background:var(--accent);color:#fff;border:none;
  font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:9px;cursor:pointer}
.signin-btn:hover{background:var(--accent-d)}
.acct{display:flex;align-items:center;gap:9px;padding:9px 10px}
.acct img{width:26px;height:26px;border-radius:99px}
.acct span{font-size:13px;font-weight:700;color:var(--txt)}
```

- [ ] **Step 6: Kiểm tra thủ công (config TRỐNG — chưa có key)**

Mở `index.html` (IP_CONFIG rỗng). Expected:
- [ ] Console không lỗi; `IP.auth.enabled() === false`; nút Sign-in **ẩn**; app local-only chạy bình thường.
- [ ] `node --test tests/` vẫn xanh (34 test) — auth.js không có unit test nhưng không phá gì.

> Kiểm thử đăng nhập thật cần key (Task 6 checklist) — chưa làm được ở bước này.

- [ ] **Step 7: Commit**
```bash
git add assets/js/auth.js index.html assets/js/app.js assets/css/styles.css
git commit -m "feat: IP.auth (optional Google OAuth) + sign-in/account UI"
```

---

## Task 6: `IP.sync` pull/push/debounce/offline + onLogin wiring

**Files:**
- Modify: `assets/js/sync.js` (thêm pull/push/schedulePush/onLogin/start/retry)
- Modify: `assets/js/app.js` (boot: `reloadFromStore`, đăng ký applyCb, `IP.sync.start()`, gọi `onLogin` khi đăng nhập)

**Interfaces:**
- Consumes: `IP.auth.client/getUser`, `IP.store.snapshot/replaceAll/onChange`, `IP.sync.merge`.
- Produces:
  - `IP.sync.pull()` → Promise<state|null>.
  - `IP.sync.push(state)` → Promise<void> (đặt cờ dirty nếu lỗi).
  - `IP.sync.schedulePush()` → debounce push snapshot.
  - `IP.sync.onLogin()` → pull→merge→replaceAll(silent)→applyCb→push.
  - `IP.sync.start()` → wire store.onChange→schedulePush (khi đã đăng nhập) + retry online.
  - `IP.sync.setApplyCallback(cb)` → đăng ký callback app gọi sau khi áp state.

- [ ] **Step 1: Mở rộng `assets/js/sync.js`** — thêm vào trong factory (trước `return`), và cập nhật return:

```js
  let _applyCb = null;
  let _timer = null;
  let _dirty = false;

  function setApplyCallback(cb) { _applyCb = cb; }
  function _auth() { return root.IP && root.IP.auth; }
  function _store() { return root.IP && root.IP.store; }
  function _loggedIn() { return !!(_auth() && _auth().getUser()); }

  async function pull() {
    const a = _auth(); if (!a) return null;
    const c = a.client(); const u = a.getUser();
    if (!c || !u) return null;
    try {
      const res = await c.from("user_state").select("state").eq("user_id", u.id).maybeSingle();
      if (res.error) return null;
      return res.data ? res.data.state : null;
    } catch { return null; }
  }
  async function push(state) {
    const a = _auth(); if (!a) return;
    const c = a.client(); const u = a.getUser();
    if (!c || !u) return;
    try {
      const res = await c.from("user_state").upsert({ user_id: u.id, state: state, updated_at: new Date().toISOString() });
      _dirty = !!res.error;
    } catch { _dirty = true; }
  }
  function schedulePush() {
    if (!_loggedIn()) return;
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () { if (_store()) push(_store().snapshot()); }, 2500);
  }
  async function onLogin() {
    const st = _store(); if (!st) return;
    const local = st.snapshot();
    const server = await pull();
    const merged = server ? merge(local, server) : local;
    st.replaceAll(merged, { silent: true });
    if (_applyCb) { try { _applyCb(); } catch {} }
    await push(merged);
  }
  function start() {
    const st = _store(); if (!st || !st.onChange) return;
    st.onChange(function (key) { if (key !== "*" && _loggedIn()) schedulePush(); });
    if (root.addEventListener) root.addEventListener("online", function () { if (_dirty && _loggedIn() && _store()) push(_store().snapshot()); });
  }
```
Cập nhật `return`:
```js
  return { merge, pull, push, schedulePush, onLogin, start, setApplyCallback };
```

- [ ] **Step 2: Boot wiring trong `app.js`** — thêm `reloadFromStore` + nối sync.

Thêm hàm (cạnh `updateAuthUI`):
```js
  function reloadFromStore() {
    State.lang = LS.get("lang", "vi");
    State.track = LS.get("track", null);
    State.progress = LS.get("progress", {});
    State.cards = LS.get("cards", {});
    State.quizBest = LS.get("quizBest", {});
    document.querySelectorAll(".lang-toggle button").forEach(x => x.classList.toggle("active", x.dataset.lang === State.lang));
    document.documentElement.lang = State.lang;
    IP.theme.apply();
    syncStaticText();
    render();
  }
```
Trong boot, mở rộng phần auth wiring (Task 5 Step 4) thành:
```js
    IP.sync.setApplyCallback(reloadFromStore);
    IP.sync.start();
    updateAuthUI(IP.auth.getUser());
    IP.auth.onChange((user) => {
      updateAuthUI(user);
      if (user) IP.sync.onLogin();
    });
    IP.auth.init();
```

- [ ] **Step 3: Regression test**

Run: `node --test tests/`
Expected: 34 PASS (sync.js mở rộng không phá merge test; `node --check assets/js/sync.js` parse OK).
Run: `node --check assets/js/sync.js && node --check assets/js/app.js` → OK.

- [ ] **Step 4: Kiểm thử thủ công CÓ KEY** (yêu cầu user đã tạo Supabase + Google creds + áp migration; điền `config.js`)

- [ ] Đăng nhập Google thành công, quay về app, hiện avatar/tên; nút Sign-in ẩn.
- [ ] Học/bookmark vài thứ khi CHƯA đăng nhập (local), rồi đăng nhập tài khoản đã có dữ liệu khác → **gộp đúng** (không mất tiến độ).
- [ ] Đổi tiến độ khi đã đăng nhập → mở trình duyệt khác (đăng nhập cùng tài khoản) → thấy dữ liệu đã đồng bộ.
- [ ] Tắt mạng, đổi state, bật lại mạng → đẩy lại thành công (kiểm tra bảng `user_state`).
- [ ] Thử (SQL) đọc dòng user khác → RLS chặn.

- [ ] **Step 5: Commit**
```bash
git add assets/js/sync.js assets/js/app.js
git commit -m "feat: IP.sync pull/push/debounce/offline + onLogin wiring"
```

---

## Task 7: Account deletion — Edge Function + `IP.account` + wiring

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Create: `assets/js/account.js` (`IP.account`) — hoặc gộp vào sync.js; plan dùng file riêng cho rõ ranh giới
- Modify: `index.html` (nạp `account.js`)
- Modify: `assets/js/app.js` (đã gọi `IP.account.deleteAccount()` ở Task 5 Step 4)

**Interfaces:**
- Consumes: `IP.auth.client/getUser`, `IP.store.clearAll`.
- Produces: `IP.account.deleteAccount()` → gọi Edge Function, xoá cache local, đăng xuất, reload.

- [ ] **Step 1: Viết Edge Function** `supabase/functions/delete-account/index.ts`

```ts
// Deletes the calling user's account (auth user + cascading rows). Deno.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "no token" }), { status: 401, headers: cors });

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // identify caller from their JWT
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: cors });

    const uid = userData.user.id;
    const { error: delErr } = await admin.auth.admin.deleteUser(uid); // cascades profiles + user_state
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: cors });

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
```
> Deploy: `supabase functions deploy delete-account` + đặt secret `SERVICE_ROLE_KEY` (KHÔNG dùng tên `SUPABASE_*` cho secret tự đặt nếu Supabase cấm; dùng `SERVICE_ROLE_KEY`). `SUPABASE_URL` có sẵn trong môi trường function.

- [ ] **Step 2: Viết `assets/js/account.js`**

```js
/* IP.account — self-service account deletion via Edge Function */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.account = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  async function deleteAccount() {
    const a = root.IP && root.IP.auth;
    const c = a && a.client();
    if (!c) return;
    try {
      const { error } = await c.functions.invoke("delete-account", { method: "POST" });
      if (error) { alert("Delete failed: " + error.message); return; }
      if (root.IP.store) root.IP.store.clearAll();
      await a.signOut();
      location.reload();
    } catch (e) { alert("Delete failed: " + e); }
  }
  return { deleteAccount };
});
```

- [ ] **Step 3: Nạp trong `index.html`** — sau `sync.js`, trước `app.js`:
```html
<script src="assets/js/sync.js"></script>
<script src="assets/js/account.js"></script>
<script src="assets/js/app.js"></script>
```

- [ ] **Step 4: Kiểm tra thủ công**

- [ ] Config trống: mở app → không lỗi; `node --test tests/` vẫn 34 PASS.
- [ ] CÓ KEY + deploy function: đăng nhập → menu hồ sơ có "Xoá tài khoản" → xác nhận → tài khoản + dữ liệu (`profiles`/`user_state`) bị xoá; app về trạng thái chưa đăng nhập; không đăng nhập lại được bằng phiên cũ.

- [ ] **Step 5: Commit**
```bash
git add supabase/functions/delete-account/index.ts assets/js/account.js index.html
git commit -m "feat: account deletion (Edge Function + IP.account) — GDPR erasure"
```

---

## Final verification
- [ ] `node --test tests/` → all PASS (28 Phase A + 6 store-ext + 8 sync-merge = 42).
- [ ] Config trống → app local-only chạy đủ, không lỗi console, Phase A không hồi quy.
- [ ] CÓ KEY (user cấp): đăng nhập Google → gộp → đồng bộ 2 trình duyệt → offline/online đẩy lại → RLS chặn người khác → xoá tài khoản đầy đủ.
- [ ] No-build: mở `index.html` qua `file://` vẫn chạy (auth/sync chỉ kích hoạt khi có config + online).
- [ ] Không secret trong repo (`git grep -i "service_role\|client secret"` → chỉ trong tài liệu/biến môi trường, không phải giá trị thật).

---

## Self-Review (đã thực hiện)

**1. Spec coverage:**
- §3 no-build/self-host client/modules → Tasks 1,5,6,7. ✔
- §4 auth (Google, optional, IP.auth, UI) → Task 5. ✔
- §5 data model + RLS + profile trigger → Task 4. ✔
- §6 sync (pull/push/debounce/offline/onLogin) → Task 6; `IP.store` snapshot/onChange/replaceAll → Task 2. ✔
- §7 merge rules → Task 3 (pure + tests). ✔
- §8 account deletion + Edge Function + GDPR → Task 7. ✔
- §9 config/secret (placeholder, public-only) → Task 1 + manual checklists. ✔
- §11 edge cases (config trống, offline, token, merge méo) → Tasks 3,5,6 code + checklists. ✔
- §12 testing (merge + store-ext unit; auth/sync/RLS/edge manual) → Tasks 2,3 + checklists. ✔
- §13 acceptance → Final verification. ✔

**2. Placeholder scan:** Không TBD/TODO. `config.js` rỗng là giá trị thật (placeholder công khai, có chú thích). Giá trị key do user cấp ở runtime (ghi rõ).

**3. Type consistency:** Tên khớp xuyên suốt — `IP.store.{snapshot,onChange,replaceAll,set,defaults,clearAll}`, `IP.auth.{enabled,client,getUser,onChange,init,signInWithGoogle,signOut}`, `IP.sync.{merge,pull,push,schedulePush,onLogin,start,setApplyCallback}`, `IP.account.deleteAccount`. App dùng `reloadFromStore`/`updateAuthUI`. Cột `user_state(user_id,state,updated_at)` khớp giữa migration ↔ pull/push. Edge Function tên `delete-account` khớp `functions.invoke("delete-account")`.
