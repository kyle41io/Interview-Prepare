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
- **API**: NestJS monorepo 1 app, chia **module theo domain**. F1 gồm: `AppModule` → `ConfigModule`, `DynamoModule` (shared DB client, global), `AuthModule` (guard + decorator), `ProgressModule`, `HealthModule`. Module billing/assistant/inbox thêm ở F2–F4 (ranh giới định sẵn).
- **DB**: **DynamoDB** (NoSQL, AWS-native) cho domain progress — một datastore RIÊNG, đúng pattern *database-per-service* của microservices. Supabase Postgres GIỮ NGUYÊN cho Auth + các bảng cũ (profiles/entitlements/payments/chat/gmail); F1 không đụng. Không FK chéo DB. API dùng AWS SDK v3 (`@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`). Dev local qua **DynamoDB Local** (Docker). *(Đổi từ Postgres/Prisma sang DynamoDB theo quyết định 2026-07-10: dev muốn học NoSQL + AWS; xem [[project-aws-saa-cv]].)*
- **Auth**: `JwtAuthGuard` verify JWT Supabase bằng **JWT secret** (Supabase → Settings → API → JWT Secret, HS256) — verify chữ ký + `exp`, lấy `sub` = user id. `@CurrentUser()` decorator trả `{ id, email }`. Không endpoint nào (trừ `/health`) chạy khi thiếu/invalid JWT → 401.
- **Authz**: mọi truy vấn DynamoDB khoá theo partition key `USER#<currentUser.id>` (lấy từ JWT đã verify, KHÔNG tin body/param). Partition key chính là ranh giới cách ly user — không có RLS như Postgres, nên tuyệt đối không có đường lấy dữ liệu chéo user.

## 4. DynamoDB single-table design (`ip_progress`)
Một bảng duy nhất, khoá tổng hợp — snapshot của một user = **một Query** theo partition:
- **PK** `pk` (String) = `USER#<userId>`
- **SK** `sk` (String) = phân loại entity:

| SK | Entity | Attributes |
|---|---|---|
| `TOPIC#<topicId>` | topic đã học | `status` (default `learned`), `learned_at`, `updated_at` |
| `CARD#<cardKey>` | flashcard SM-2 | `due_at`, `interval` (num), `ease` (num), `reps` (num), `updated_at` |
| `QUIZ#<topicId>` | điểm quiz | `best_pct` (num), `attempts` (num), `updated_at` |
| `BOOK#<topicId>` | bookmark | `created_at` |
| `STREAK` | chuỗi ngày | `current`, `longest`, `last_day`, `updated_at` |
| `SETTINGS` | tuỳ chọn | `lang`, `theme`, `track_role`, `track_level`, `updated_at` |

- **Billing**: `PAY_PER_REQUEST` (on-demand) — hợp free-tier, không quản capacity.
- **Cách ly**: mọi thao tác khoá theo `pk` ⇒ không đọc/ghi được partition user khác. Không có blob JSONB — mỗi topic/card/quiz là một item riêng (đúng tinh thần "backend chuẩn" thay cho `user_state`).
- Tạo bảng bằng script idempotent `scripts/create-table.ts` (dùng cho DynamoDB Local + AWS).
**Giữ** `user_state` (JSONB) trên Postgres tạm thời để backfill + fallback; đánh dấu deprecated, xoá ở phase dọn dẹp sau khi F1 ổn định trên production.

## 5. Backfill 1 lần
Script (chạy tay, có hướng dẫn trong DEPLOY doc): đọc mọi `user_state` JSONB **từ Supabase Postgres** (qua `pg`, connection string pooler) → ghi vào DynamoDB thành các item (`BatchWriteCommand`, chunk 25). Idempotent (`PutCommand` ghi đè theo pk+sk), chạy lại an toàn. Trên client, lần đăng nhập đầu sau F1: nếu server progress rỗng nhưng localStorage có dữ liệu → `POST /v1/progress/sync` đẩy state local lên (một lần), tránh mất tiến độ người đang dùng.

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
- **`IP.sync`**: khi `IP.api.configured()` → route `pull`/`push` qua `IP.api` (`GET /v1/progress` khi login; push debounce qua `POST /v1/progress/sync`, server merge). Khi API_URL rỗng → GIỮ NGUYÊN pull/push Supabase cũ (không regression cho user đang dùng trước khi API deploy). Vì shape store (frontend) và Snapshot API khác nhau, thêm **adapter thuần** `toApiSnapshot`/`fromApiSnapshot` (anti-corruption layer, có test round-trip): `progress↔topics`, `cards.due↔due_at`, `streak{count,lastActiveDate,dailyGoal}↔{current,longest,last_day}` (dailyGoal chỉ ở client, longest chỉ ở API), `lang/theme/track{role,level}↔settings{...,track_role,track_level}`. Giữ hàm `merge` thuần (đã có + test).
- Các module `IP.store/bookmarks/streak` giữ localStorage làm cache tức thời (UX offline-first), nhưng nguồn chân lý là server; đồng bộ qua `IP.api`.
- **KHÔNG đổi** `IP.pro/chat/gmail` ở F1 (vẫn gọi Supabase Edge Functions).
- `config.js` thêm `API_URL: ""` (điền URL Render khi deploy; rỗng = local-only, không phá site khi chưa deploy).

## 8. Cấu trúc thư mục API (mới, trong repo)
```
api/                     ← NestJS app (riêng package.json, không ảnh hưởng site tĩnh)
  src/
    main.ts, app.module.ts
    config/
    db/ (keys.ts, keys.spec.ts, dynamo.service.ts, dynamo.module.ts)
    auth/ (jwt.guard.ts, current-user.decorator.ts, auth.module.ts)
    progress/ (progress.controller.ts, progress.service.ts, merge.ts, dto.ts, progress.module.ts)
    health/
  scripts/ (create-table.ts, backfill.ts)
  test/ (e2e)
  docker-compose.dev.yml ← DynamoDB Local cho dev
  Dockerfile            ← sẵn cho phase AWS
  render.yaml           ← deploy Render
```
Frontend tĩnh vẫn ở root như cũ; `api/` là workspace tách biệt (GitHub Pages chỉ serve root, bỏ qua `api/`).

## 9. Bảo mật & cấu hình
- Secrets/config API (Render env): `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (prod có thể dùng IAM role), `DDB_TABLE`, `DDB_ENDPOINT` (chỉ set khi dùng DynamoDB Local), `SUPABASE_JWT_SECRET` (verify JWT), `ALLOWED_ORIGINS`. Không secret trong repo. IAM user dùng policy least-privilege chỉ trên bảng `ip_progress`.
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
6. Deploy Render xanh; DynamoDB (AWS) trả dữ liệu; CORS chỉ cho Pages + localhost.
7. Suite frontend 60/60 + API unit/e2e xanh.

## 12. Lộ trình sau F1 (không thuộc spec này)
F2 billing → F3 assistant → F4 inbox (chuyển dần khỏi Edge Functions) → phase AWS (Docker→App Runner/ECS/Lambda; progress đã trên DynamoDB nên bước AWS gọn hơn; tách 1 module thành microservice + API Gateway + SQS cho gmail scan). F1 chuyển progress sang DynamoDB đã đặt sẵn một chân lên AWS.

## 13. Chiến lược commit
1. `chore(api): scaffold NestJS app + config + health + Dockerfile/render.yaml`
2. `feat(api): DynamoDB single-table progress store + keys + create-table (replaces Prisma)`
3. `feat(api): JWT auth guard (Supabase) + CurrentUser`
4. `feat(api): progress module — snapshot/sync/CRUD on DynamoDB (+ Jest)`
5. `feat(api): user_state → DynamoDB backfill script`
6. `feat(web): IP.api client + config API_URL`
7. `refactor(web): IP.sync/store use API for progress (fallback local)`
8. `docs: DEPLOY-PHASE-F1 (Render + secrets + backfill + CORS)`
