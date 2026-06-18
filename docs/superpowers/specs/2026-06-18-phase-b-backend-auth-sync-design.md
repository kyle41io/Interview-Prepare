# Mảng B — Backend + Google OAuth + Đồng bộ tài khoản — Design Spec

> Ngày: 2026-06-18 · Repo: `kyle41io/Interview-Prepare` · Lộ trình tổng thể: `2026-06-17-handbook-roadmap.md`
> Ngôn ngữ: tiếng Việt cho mô tả, English cho identifier/key/đường dẫn.

## 1. Bối cảnh & mục tiêu
Sau Phase A, app là static no-build trên GitHub Pages với các module `window.IP.*` và state trong `localStorage` (`IP.store`: `lang, theme, track, progress, cards, quizBest, bookmarks, streak, schemaVersion`). Phase B thêm **nền tảng tài khoản**: đăng nhập **Google OAuth**, lưu hồ sơ người dùng, và **đồng bộ state đa thiết bị** lên server. Đây là nền cho C (Pro/thanh toán), D (AI), E (Gmail).

Quyết định kiến trúc: dùng **Supabase (BaaS)** — Postgres + Auth (GoTrue) + Row-Level Security + Edge Functions, region **EU**, free tier. Frontend **giữ static no-build**; client Supabase **self-host** (không CDN). Không tự dựng/vận hành server.

## 2. Mục tiêu / Phi mục tiêu
**Trong phạm vi B:**
- Đăng nhập **chỉ Google OAuth**, **tùy chọn** (app vẫn chạy đầy đủ khi chưa đăng nhập).
- Bảng `profiles` + `user_state` (JSONB) với RLS.
- Đồng bộ 2 chiều: pull/gộp khi đăng nhập, đẩy có debounce khi thay đổi, hàng đợi offline.
- **Gộp thông minh** khi đăng nhập lần đầu (không mất tiến độ).
- **Xoá tài khoản đầy đủ** (dữ liệu + auth user) qua 1 Edge Function (GDPR).

**Ngoài phạm vi (để mảng sau, chỉ chừa "seam"):**
- Nội dung Pro / thanh toán / entitlement (C) — chỉ chừa chỗ; **không** thêm bảng subscription ở B.
- Chatbot AI (D), Gmail (E) — nhưng Edge Function ở B là bước tập dượt cho chúng.
- Email/password hay provider khác ngoài Google.
- Realtime đồng bộ tức thời nhiều thiết bị cùng lúc (chỉ pull khi load + push debounce; KHÔNG dùng Supabase Realtime ở B — YAGNI).
- Migrate frontend sang full-stack host; giữ GitHub Pages.

## 3. Nguyên tắc kiến trúc
- **Giữ no-build static** trên GitHub Pages; chỉ thêm `<script>`/`<link>`.
- **Self-host Supabase JS** (bản UMD v2) tại `assets/vendor/supabase.js` (expose `window.supabase`) — giống cách self-host Font Awesome; không phụ thuộc CDN. Nạp trước các module `IP.*`.
- Thêm 2 module client theo pattern `IP.*` + 1 module config; 1 Edge Function phía Supabase; SQL migration trong repo.
- **Bảo mật:** Client Secret (Google) chỉ ở dashboard Supabase; service-role key chỉ ở secret của Edge Function. Frontend chỉ chứa **Supabase URL + anon key (public)** — an toàn nhờ RLS. Không secret nào vào repo.

### 3.1 Cấu trúc file mới
```
assets/
  vendor/supabase.js          # Supabase JS UMD self-host (vendored)
  js/
    config.js                 # window.IP_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY }  (public)
    auth.js                   # IP.auth — bọc Supabase Auth (Google OAuth, session)
    sync.js                   # IP.sync — pull/push/merge state; merge() là hàm THUẦN
supabase/
  migrations/0001_init.sql    # profiles + user_state + RLS policies
  functions/delete-account/index.ts   # Edge Function (Deno) xoá tài khoản đầy đủ
tests/
  sync-merge.test.js          # unit test cho IP.sync.merge (node --test)
```
Sửa: `index.html` (nạp vendor + config + auth + sync; nút Sign in; account UI), `assets/js/app.js` (tích hợp auth state vào menu hồ sơ; gọi IP.sync khi state đổi), `assets/css/styles.css` (nút sign-in/account).

## 4. Đăng nhập (Auth)
- **`IP.auth`** (`assets/js/auth.js`) — tạo client: `supabase.createClient(IP_CONFIG.SUPABASE_URL, IP_CONFIG.SUPABASE_ANON_KEY)`. Interface:
  - `client()` → trả Supabase client (singleton).
  - `signInWithGoogle()` → `client().auth.signInWithOAuth({ provider:"google", options:{ redirectTo: location.href.split("#")[0] } })`.
  - `signOut()` → `client().auth.signOut()` (giữ cache local).
  - `getUser()` → user hiện tại hoặc `null` (từ session).
  - `onChange(cb)` → đăng ký `client().auth.onAuthStateChange`; gọi `cb(user|null)`.
  - Khi `IP_CONFIG` thiếu/không hợp lệ → `IP.auth` ở trạng thái "disabled" (app chạy local-only, nút sign-in ẩn) — không vỡ.
- **Luồng**: nút "Sign in with Google" (topbar) → `signInWithGoogle()` → Supabase + Google xử lý → quay về URL Pages với session → `onChange` bắn → app cập nhật UI + `IP.sync.onLogin()`.
- **UI**: chưa đăng nhập → nút "Sign in with Google" ở topbar. Đã đăng nhập → menu hồ sơ hiện avatar + tên + "Đăng xuất" + "Xoá tài khoản".
- Đăng nhập **tùy chọn**; không gate nội dung free.

## 5. Mô hình dữ liệu & RLS (`supabase/migrations/0001_init.sql`)
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text, avatar_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table user_state (
  user_id uuid primary key references profiles(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
alter table user_state enable row level security;
-- policies: chủ sở hữu mới đọc/ghi
create policy "own profile sel" on profiles for select using (auth.uid() = id);
create policy "own profile ins" on profiles for insert with check (auth.uid() = id);
create policy "own profile upd" on profiles for update using (auth.uid() = id);
create policy "own state sel" on user_state for select using (auth.uid() = user_id);
create policy "own state ins" on user_state for insert with check (auth.uid() = user_id);
create policy "own state upd" on user_state for update using (auth.uid() = user_id);
create policy "own state del" on user_state for delete using (auth.uid() = user_id);
```
- **Tạo `profiles` lần đầu**: dùng DB trigger `on auth.users insert` để chèn `profiles` (email/avatar từ `raw_user_meta_data`), hoặc upsert từ frontend sau đăng nhập. Spec chọn **trigger** (chuẩn, không phụ thuộc frontend) — viết trong migration.
- `user_state.state` JSONB khớp đúng shape `IP.store`.

## 6. Đồng bộ (`IP.sync`, `assets/js/sync.js`)
Giữ `IP.store` làm cache cục bộ; `IP.sync` cầu nối Supabase. Interface:
- `merge(local, server)` → **hàm THUẦN**, trả state đã gộp (mục 7). Không side-effect.
- `pull()` → đọc `user_state` của user hiện tại; trả `state` hoặc `null` nếu chưa có dòng.
- `push(state)` → `upsert` `user_state` (`user_id`, `state`, `updated_at=now()`).
- `schedulePush()` → debounce ~2500ms gọi `push(IP.store.snapshot())`.
- `onLogin()` → `pull()`; nếu `null` → `push(local)`; nếu có → `merged = merge(local, server)` → ghi `merged` vào `IP.store` + `push(merged)` + re-render.
- `start()` → khi đã đăng nhập, mỗi lần `IP.store` ghi (qua hook/sự kiện) → `schedulePush()`. Khi chưa đăng nhập → no-op.
- **Offline / lỗi**: `push` lỗi → giữ local, đặt cờ `dirty`, thử lại khi `onChange`/online/lần đổi sau. App không vỡ khi Supabase không reachable (degrade local-only).
- Cần `IP.store.snapshot()` (đọc toàn bộ keys) và một cơ chế **phát sự kiện khi store đổi** (thêm `IP.store.onChange`/`set` phát event) — bổ sung nhỏ vào `IP.store`.

## 7. Quy tắc gộp (`merge(local, server)`) — lõi unit-test
Với mỗi field (thiếu một bên → lấy bên còn lại; thiếu cả hai → default):
- `progress` (object id→bool): **hợp** — `result[id] = !!(local[id] || server[id])`.
- `bookmarks` (mảng id): **hợp + khử trùng**.
- `quizBest` (object topic→số): **max** theo từng topic.
- `cards` (object cardKey→SRS): theo từng cardKey, giữ entry có **`reps` lớn hơn**; bằng nhau → `due` muộn hơn; chỉ một bên có → lấy bên đó.
- `streak`: chọn object có **`count` lớn hơn**; bằng nhau → `lastActiveDate` muộn hơn; `dailyGoal` = lấy của bản được chọn.
- `track`, `theme`, `lang` (lựa chọn đơn): **local (máy hiện tại) thắng** nếu có giá trị; không thì lấy server.
- `schemaVersion`: **max**.
⇒ Bảo đảm **không mất tiến độ/bookmark/điểm** ở bất kỳ thiết bị nào; tôn trọng lựa chọn của máy đang dùng.

## 8. Tài khoản & GDPR
- **Xoá tài khoản** (menu hồ sơ → xác nhận) → frontend gọi `client().functions.invoke("delete-account")`.
- **Edge Function `delete-account`** (`supabase/functions/delete-account/index.ts`, Deno): xác thực JWT người gọi → dùng **service-role key** (secret của function) tạo admin client → `auth.admin.deleteUser(uid)` (cascade xoá `profiles`+`user_state` nhờ `on delete cascade`). Trả 200; frontend xoá cache local + đăng xuất.
- **Xuất dữ liệu**: tái dùng khả năng export state của app (đủ cho quyền truy cập dữ liệu).
- Region **EU**; chỉ lưu email/tên/avatar (Google) + state học. Tối thiểu hoá dữ liệu.

## 9. Cấu hình & secret (người dùng cung cấp lúc triển khai)
1. Tạo project Supabase **region EU** → cung cấp **Project URL** + **anon key** (public → `assets/js/config.js`).
2. Google Cloud → **OAuth Client ID (Web)**: redirect URI = `https://<project>.supabase.co/auth/v1/callback`; JS origin = `https://kyle41io.github.io`. → dán **Client ID + Secret** vào Supabase (Auth→Providers→Google).
3. Supabase: **Site URL / redirect allow-list** = `https://kyle41io.github.io/Interview-Prepare/`.
4. Áp `supabase/migrations/0001_init.sql` (SQL editor hoặc CLI). Deploy Edge Function + đặt secret service-role.
- `assets/js/config.js` chứa **chỉ URL + anon key (public)** — commit được; nếu thiếu → app chạy local-only.

## 10. Ranh giới module (isolation)
- `IP.auth`: làm gì = quản lý phiên/đăng nhập Google; dùng = `signInWithGoogle/signOut/getUser/onChange/client`; phụ thuộc = `window.supabase` + `IP_CONFIG`.
- `IP.sync`: làm gì = đồng bộ state local↔server; dùng = `merge/pull/push/onLogin/start`; phụ thuộc = `IP.auth.client`, `IP.store`.
- `IP.store` (mở rộng nhỏ): thêm `snapshot()` + phát sự kiện khi `set` → cho `IP.sync` biết để đẩy.
- `config.js`: hằng public.
- Edge Function: tách biệt, chỉ dùng service-role để xoá tài khoản.

## 11. Edge cases & xử lý lỗi
- `IP_CONFIG` thiếu → auth disabled, app local-only, không lỗi.
- Đăng nhập thất bại / người dùng huỷ → trở lại trạng thái chưa đăng nhập, báo nhẹ.
- Supabase không reachable / project "ngủ" → `pull/push` lỗi → degrade local-only, hàng đợi đẩy lại.
- Token hết hạn → Supabase tự refresh; nếu hết phiên → coi như đăng xuất (giữ cache local).
- `merge` với input méo/thiếu field → default an toàn (không throw).
- Xoá tài khoản: Edge Function lỗi → báo lỗi, không xoá cache local nửa vời; cho thử lại.
- RLS từ chối (không nên xảy ra với policy đúng) → log, degrade.

## 12. Chiến lược kiểm thử
- **`IP.sync.merge` là hàm thuần → TDD `node --test`** (`tests/sync-merge.test.js`): union progress/bookmarks, max quizBest, cards theo reps, streak theo count/date, scalar local-wins, thiếu-field → default, không mutate input.
- **Auth/sync/RLS/Edge Function → checklist thủ công**: đăng nhập Google; đồng bộ giữa 2 trình duyệt; dùng offline rồi online (đẩy lại); thử đọc dòng người khác (RLS chặn); xoá tài khoản (dữ liệu + auth user biến mất).
- Không phá test/luồng Phase A (28 test hiện có vẫn xanh).

## 13. Tiêu chí nghiệm thu
1. Nút "Sign in with Google" → đăng nhập thành công, quay về app, hiện avatar/tên.
2. App **vẫn chạy đầy đủ khi chưa đăng nhập** (local-only) và khi Supabase offline.
3. Đăng nhập lần đầu (cả local & server có dữ liệu) → **gộp thông minh** đúng mục 7, không mất tiến độ.
4. Thay đổi state khi đã đăng nhập → đẩy lên server (debounce); mở ở thiết bị/trình duyệt khác → thấy dữ liệu đã gộp.
5. RLS: không đọc/ghi được dữ liệu người khác.
6. "Xoá tài khoản" → xoá cả dữ liệu lẫn auth user; app về trạng thái chưa đăng nhập.
7. Không secret trong repo; chỉ URL + anon key public.
8. `node --test` xanh (gồm `sync-merge` + 28 test Phase A); giữ no-build, GitHub Pages chạy.

## 14. Chiến lược commit (incremental theo feature)
Mỗi commit để site vẫn load (no-build). Thứ tự đề xuất:
1. `chore: vendor self-hosted Supabase JS + config.js placeholder`
2. `feat: IP.auth (Google OAuth, optional sign-in) + topbar sign-in UI`
3. `feat(db): supabase migration — profiles + user_state + RLS + profile trigger`
4. `feat: IP.store snapshot + change events`
5. `feat: IP.sync.merge (pure) + unit tests`
6. `feat: IP.sync pull/push/debounce/offline + onLogin wiring`
7. `feat: account menu (avatar/sign-out) + delete-account Edge Function + UI`
Ràng buộc: (1)→(2); (4),(5) trước (6); (3) trước khi test sync thật.

## 15. Câu hỏi mở
Không còn. (Giá trị `IP_CONFIG` thật sẽ do người dùng cung cấp lúc triển khai; placeholder cho tới khi có.)
