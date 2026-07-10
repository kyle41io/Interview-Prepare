# Phase F1 — NestJS API skeleton + Progress domain — Design Spec

> Ngày: 2026-07-10 · Repo: `kyle41io/Interview-Prepare`
> Sub-project đầu của **Phase F** (refactor backend). Tổng thể: frontend tĩnh (GitHub Pages) chuyển từ gọi Supabase trực tiếp sang gọi **REST API NestJS** (modular monolith trên Render), Postgres của Supabase làm DB, giữ Supabase Auth. F1 dựng nền + domain **progress** (bỏ blob JSONB). F2 billing · F3 assistant · F4 inbox · rồi phase AWS/microservices — mỗi phần spec riêng.

## 1. Mục tiêu F1
Có backend "chuẩn" cho **dữ liệu học** (progress, flashcard SM-2, quiz score, bookmarks, streak, settings): schema chuẩn hoá thay blob JSONB, merge phía server, API REST versioned, frontend gọi API qua JWT. Deploy API công khai (Render) để site live dùng được.

## 2. Phi mục tiêu (để phase sau)
Không đụng billing/Pro, AI chat, Gmail (vẫn chạy qua Edge Functions như hiện tại — F2/F3/F4 mới chuyển). Không dựng AWS. Không đổi hosting frontend (giữ Pages). Không đổi luồng đăng nhập Google (giữ Supabase Auth).

## 3. Kiến trúc
```
GitHub Pages (frontend tĩnh)  ──HTTPS /v1 REST (Bearer JWT)──▶  NestJS API (Render)  ──▶ Supabase Postgres
        └── supabase-js CHỈ để login Google + lấy access_token (JWT) ─────────────────────▶ Supabase Auth
```
- **API**: NestJS monorepo 1 app, chia **module theo domain**. F1 gồm: `AppModule` → `ConfigModule`, `PrismaModule` (shared DB), `AuthModule` (guard + decorator), `ProgressModule`, `HealthModule`. Module billing/assistant/inbox thêm ở F2–F4 (ranh giới định sẵn).
- **DB**: Postgres của Supabase. Prisma quản lý schema các bảng progress mới; các bảng cũ (profiles/entitlements/…) được Prisma **introspect adopt** (không tái tạo, không migrate phá). API kết nối bằng connection string Postgres đặc quyền (Supabase → Settings → Database → Connection string, dùng pooler `?pgbouncer=true`).
- **Auth**: `JwtAuthGuard` verify JWT Supabase bằng **JWT secret** (Supabase → Settings → API → JWT Secret, HS256) — verify chữ ký + `exp`, lấy `sub` = user id. `@CurrentUser()` decorator trả `{ id, email }`. Không endpoint nào (trừ `/health`) chạy khi thiếu/invalid JWT → 401.
- **Authz**: mọi query gắn `where user_id = currentUser.id`. RLS trên DB giữ nguyên làm phòng thủ phụ (API dùng role đặc quyền nên RLS không chặn API, nhưng chặn nếu ai đó lộ anon key).

## 4. Schema chuẩn hoá (Prisma migration `f1_progress`)
Tạo mới (khoá phụ → `profiles.id` ON DELETE CASCADE):
```
topic_progress(user_id uuid, topic_id text, status text default 'learned', learned_at timestamptz, updated_at timestamptz, PK(user_id,topic_id))
flashcard_reviews(user_id uuid, card_key text, due_at timestamptz, interval int, ease real, reps int, updated_at timestamptz, PK(user_id,card_key))
quiz_scores(user_id uuid, topic_id text, best_pct int, attempts int default 0, updated_at timestamptz, PK(user_id,topic_id))
bookmarks(user_id uuid, topic_id text, created_at timestamptz, PK(user_id,topic_id))
streak(user_id uuid PK, current int default 0, longest int default 0, last_day date, updated_at timestamptz)
user_settings(user_id uuid PK, lang text, theme text, track_role text, track_level text, updated_at timestamptz)
```
RLS: bật + policy `select/insert/update/delete` own-row (`auth.uid() = user_id`) cho phòng thủ phụ; API dùng service connection nên không phụ thuộc RLS.
**Giữ** `user_state` (JSONB) tạm thời để backfill + fallback; đánh dấu deprecated, xoá ở phase dọn dẹp sau khi F1 ổn định trên production.

## 5. Backfill 1 lần
Script (chạy tay, có hướng dẫn trong DEPLOY doc): đọc mọi `user_state` JSONB → tách vào các bảng mới. Ưu tiên idempotent (`on conflict do nothing`/`do update`), chạy lại an toàn. Trên client, lần đăng nhập đầu sau F1: nếu server progress rỗng nhưng localStorage có dữ liệu → `POST /v1/progress/sync` đẩy state local lên (một lần), tránh mất tiến độ người đang dùng.

## 6. API surface F1 (`/v1`, tất cả cần JWT trừ health)
| Method | Path | Ý nghĩa |
|---|---|---|
| GET | `/health` | liveness (no auth) |
| GET | `/v1/progress` | snapshot đầy đủ: `{topics:{id:true}, cards:{key:{...}}, quizBest:{id:pct}, bookmarks:[id], streak:{...}, settings:{...}}` |
| POST | `/v1/progress/sync` | body = snapshot local; **server-side merge** (union topics/bookmarks; max quizBest; SM-2 lấy due_at trễ hơn / reps cao hơn; streak max) → trả snapshot đã merge |
| PUT | `/v1/progress/topic/:id` | body `{learned:bool}` → upsert/xoá topic_progress |
| POST | `/v1/progress/flashcard/:key` | body `{due_at,interval,ease,reps}` → upsert |
| PUT | `/v1/progress/quiz/:id` | body `{pct}` → cập nhật best_pct/attempts |
| PUT | `/v1/progress/bookmark/:id` | body `{on:bool}` → thêm/xoá |
| PUT | `/v1/progress/streak` | body `{current,longest,last_day}` → upsert |
| PUT | `/v1/settings` | body `{lang?,theme?,track_role?,track_level?}` |
CORS: cho phép origin GitHub Pages (`https://kyle41io.github.io`) + `http://localhost:8000` (dev). Trả JSON, lỗi chuẩn `{error}` + HTTP status.

## 7. Frontend đổi (giữ no-build, vanilla JS)
- Thêm `assets/js/api.js` (`IP.api`): base URL từ `IP_CONFIG.API_URL` (public, trong config.js); `IP.api.get/post/put(path, body)` tự đính `Authorization: Bearer <token>` lấy từ `IP.auth.client().auth.getSession()`. Lỗi mạng → reject; caller degrade (app vẫn chạy local nếu API/backend chưa cấu hình — `API_URL` rỗng ⇒ dùng local-only như cũ).
- **`IP.sync`**: thay pull/push Supabase bằng `IP.api` (`GET /v1/progress` khi login → apply; các thay đổi cục bộ → gọi endpoint tương ứng, debounce). Giữ hàm `merge` thuần (đã có + test) nhưng merge chính giờ ở server; client merge chỉ cho lần sync đầu.
- Các module `IP.store/bookmarks/streak` giữ localStorage làm cache tức thời (UX offline-first), nhưng nguồn chân lý là server; đồng bộ qua `IP.api`.
- **KHÔNG đổi** `IP.pro/chat/gmail` ở F1 (vẫn gọi Supabase Edge Functions).
- `config.js` thêm `API_URL: ""` (điền URL Render khi deploy; rỗng = local-only, không phá site khi chưa deploy).

## 8. Cấu trúc thư mục API (mới, trong repo)
```
api/                     ← NestJS app (riêng package.json, không ảnh hưởng site tĩnh)
  src/
    main.ts, app.module.ts
    config/
    prisma/ (schema.prisma, prisma.module.ts, prisma.service.ts)
    auth/ (jwt.guard.ts, current-user.decorator.ts, auth.module.ts)
    progress/ (progress.controller.ts, progress.service.ts, dto/, progress.module.ts)
    health/
  test/ (e2e)
  Dockerfile            ← sẵn cho phase AWS
  render.yaml           ← deploy Render
```
Frontend tĩnh vẫn ở root như cũ; `api/` là workspace tách biệt (GitHub Pages chỉ serve root, bỏ qua `api/`).

## 9. Bảo mật & cấu hình
- Secrets API (Render env): `DATABASE_URL` (Postgres đặc quyền), `SUPABASE_JWT_SECRET` (verify JWT), `ALLOWED_ORIGINS`. Không secret trong repo.
- `config.js` chỉ chứa `API_URL` (public).
- JWT verify bắt buộc chữ ký + hạn; reject khác.

## 10. Test
- **Unit (Jest)**: `ProgressService.mergeSnapshot()` (thuần — union/max rules, giống logic `IP.sync.merge` cũ), DTO validation, JWT guard (token hợp lệ/hết hạn/sai chữ ký).
- **e2e (supertest)**: `/health` 200; `/v1/progress` 401 khi thiếu token; với token giả (ký bằng secret test) → CRUD progress đúng, cách ly user.
- **Frontend**: giữ `node --test` 60/60; thêm test cho `IP.api` (build URL, đính header — mock fetch) + `IP.sync` gọi đúng endpoint.
- CI: chạy được `npm --prefix api test` + `node --test tests/`.

## 11. Nghiệm thu F1
1. `api/` chạy local (`npm --prefix api run start:dev`) + Docker; `/health` OK.
2. Login trên site (JWT Supabase) → `GET /v1/progress` trả dữ liệu; đánh dấu học/lật thẻ/quiz/bookmark/streak → lưu vào bảng chuẩn hoá (kiểm tra bằng SQL), reload/đổi thiết bị vẫn còn.
3. Backfill: user cũ (có `user_state`) thấy tiến độ nguyên vẹn sau F1.
4. `API_URL` rỗng ⇒ site vẫn chạy local-only, không lỗi.
5. Cách ly: user A không đọc được data user B (guard + query theo `sub`).
6. Deploy Render xanh; CORS chỉ cho Pages + localhost.
7. Suite frontend 60/60 + API unit/e2e xanh.

## 12. Lộ trình sau F1 (không thuộc spec này)
F2 billing → F3 assistant → F4 inbox (chuyển dần khỏi Edge Functions) → phase AWS (Docker→App Runner/ECS, RDS optional, tách 1 module thành microservice + API Gateway + SQS cho gmail scan).

## 13. Chiến lược commit
1. `chore(api): scaffold NestJS app + config + health + Dockerfile/render.yaml`
2. `feat(api): Prisma + adopt existing schema + f1_progress migration`
3. `feat(api): JWT auth guard (Supabase) + CurrentUser`
4. `feat(api): progress module — snapshot/sync/CRUD (+ Jest)`
5. `feat(api): backfill script user_state → normalized tables`
6. `feat(web): IP.api client + config API_URL`
7. `refactor(web): IP.sync/store use API for progress (fallback local)`
8. `docs: DEPLOY-PHASE-F1 (Render + secrets + backfill + CORS)`
