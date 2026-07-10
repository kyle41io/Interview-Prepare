# Phase F2 — Billing/Pro domain → NestJS API + DynamoDB — Design Spec

> Ngày: 2026-07-10 · Repo: `kyle41io/Interview-Prepare`
> Sub-project thứ 2 của **Phase F** (refactor backend). Nối tiếp F1 (progress → API/DynamoDB, đã merge `6cc2dc4`). F2 chuyển **billing/Pro** (entitlement + thanh toán + duyệt admin + nội dung Pro) từ Supabase Edge Functions/RLS sang **NestJS API + DynamoDB**. F3 assistant · F4 inbox · rồi phase AWS — mỗi phần spec riêng.

## 1. Mục tiêu F2
Cho API "chuẩn" sở hữu domain **billing/Pro**: trạng thái entitlement (Pro/free + hạn), vòng đời thanh toán VietQR (tạo → submit → admin duyệt/từ chối → cấp Pro), và phục vụ **nội dung Pro** có kiểm tra entitlement phía server. Dữ liệu billing nằm trên DynamoDB (như F1); nội dung Pro tĩnh được bundle trong API. Ranh giới domain rõ để phase AWS sau có thể tách thành "billing service".

## 2. Phi mục tiêu (phase sau)
Không đụng progress (F1 đã xong), assistant/chat (F3), gmail (F4). Không dựng AWS. Không đổi hosting frontend (GitHub Pages). Không đổi luồng đăng nhập Google (Supabase Auth). Không đổi mô hình giá (49k/30 ngày, VietQR thủ công) — chỉ đổi *nơi xử lý*.

## 3. Kiến trúc
```
GitHub Pages (frontend tĩnh) ──HTTPS /v1 REST (Bearer JWT)──▶ NestJS API (Render) ──▶ DynamoDB (ip_billing + GSI)
        └── supabase-js CHỈ để login + lấy access_token ───────────────────────────▶ Supabase Auth
        └── (fallback) khi API_URL rỗng: IP.pro vẫn dùng Supabase như hiện tại (không regression)
Nội dung Pro tĩnh: bundle JSON trong api/ (không DB) — API check entitlement rồi mới trả.
```
- **Module API mới**: `BillingModule` (entitlement + payments + admin duyệt), `ProContentModule` (catalog công khai + content gated). Dùng lại `JwtAuthGuard` của F1; thêm `AdminGuard`.
- **DB**: bảng DynamoDB mới `ip_billing` (user-scoped) + GSI `status-index` cho admin list. Bảng `ip_progress` của F1 không đụng. Supabase Postgres giữ Auth + bảng cũ (entitlements/payment_requests/pro_* để backfill + fallback, deprecate sau).
- **Authz**: mọi route `/v1/*` cần JWT (guard F1). Query billing khoá theo `USER#<sub>`. Route admin thêm `AdminGuard` (chỉ uid trong `ADMIN_UIDS` env, lấy từ JWT `sub` đã verify — KHÔNG tin client). Nội dung Pro chỉ trả khi entitlement active.

## 4. Data model DynamoDB (`ip_billing`)
Single-table, user-scoped:
- **PK** `pk` (S) = `USER#<userId>`; **SK** `sk` (S):

| SK | Ý nghĩa | Attributes |
|---|---|---|
| `ENTITLEMENT` | trạng thái Pro | `tier` ("free"/"pro"), `status` ("active"/"expired"/"none"), `expires_at` (ISO/null), `source` ("manual"), `updated_at` |
| `PAYMENT#<code>` | 1 yêu cầu thanh toán | `code` (unique), `plan`, `amount` (num), `status` ("pending"/"submitted"/"approved"/"rejected"), `note`, `created_at`, `decided_at` |

- **GSI `status-index`**: `gsi1pk` (S) = `PAYSTATUS#<status>`, `gsi1sk` (S) = `created_at`. Chỉ item PAYMENT ghi `gsi1pk/gsi1sk` ⇒ admin `Query(gsi1pk=PAYSTATUS#pending)` liệt kê chéo user. Item ENTITLEMENT không có GSI keys ⇒ không lọt vào index.
- **Billing tách bảng riêng** (không dùng chung `ip_progress`) để bounded-context billing dễ tách microservice sau + IAM/backup riêng.
- Billing `PAY_PER_REQUEST`. Tạo bảng + GSI bằng script idempotent (mở rộng `create-table.ts` hoặc `create-billing-table.ts`).
- **isPro** = có ENTITLEMENT với `status="active"` và (`expires_at` null hoặc > now). Tính ở server.

## 5. Nội dung Pro (bundle tĩnh trong API)
- Chuyển 1 lần `supabase/seed/pro_content_seed.sql` → file dữ liệu tĩnh trong repo API, ví dụ `api/src/pro/content.data.ts` (mảng `{ topic_id, position, title, body }`). Đây là **thao tác build-time của dev**, không phải backfill runtime.
- `GET /v1/pro/catalog` → trả `[{topic_id, position, title}]` (teaser, không body) — mọi user đã đăng nhập.
- `GET /v1/pro/content/:topicId` → API check entitlement (ip_billing); nếu Pro active → trả `[{position, title, body}]`; nếu không → 403. **Body không bao giờ tới client không-Pro** (khác hiện tại: hiện RLS chặn phía Supabase; giờ API chặn).
- Không cần bảng DynamoDB cho content, không Scan. API không đụng Postgres.

## 6. API surface F2 (`/v1`, đều cần JWT; admin thêm AdminGuard)
| Method | Path | Ý nghĩa |
|---|---|---|
| GET | `/v1/billing/entitlement` | `{tier,status,expires_at,isPro}` của user hiện tại |
| POST | `/v1/billing/payment` | tạo payment_request `pending` (server sinh `code`); trả `{code, amount, plan, vietqr:{bankCode,acct,name,url}, created_at}` |
| POST | `/v1/billing/payment/:code/submit` | user báo đã chuyển khoản → `status="submitted"` (chỉ chủ sở hữu; chỉ khi đang pending) |
| GET | `/v1/billing/admin/payments?status=pending\|submitted` | (admin) Query GSI liệt kê chéo user; mỗi item trả đủ `{userId, code, amount, status, created_at, note}` |
| POST | `/v1/billing/admin/payment/approve` | (admin) body `{userId, code}` → conditional-claim (status ∈ pending/submitted → approved) + gia hạn entitlement 30 ngày; idempotent |
| POST | `/v1/billing/admin/payment/reject` | (admin) body `{userId, code}` → conditional-claim → rejected |
| GET | `/v1/pro/catalog` | list teaser (title/position) |
| GET | `/v1/pro/content/:topicId` | content section (403 nếu chưa Pro) |
- Admin approve/reject nhận `{userId, code}` trong body (lấy từ item liệt kê ở GSI) — tránh nhập nhằng mã hoá khoá tổng hợp trong path. Là conditional `UpdateItem` trên item `PK=USER#<userId>, SK=PAYMENT#<code>` với `ConditionExpression` trên `status` để idempotent + an toàn double-approve (thay cho conditional update Postgres của Phase C).
- VietQR: tham số (bank `970407`/Techcombank, acct `19036335023019`, name `NGUYEN VAN KIEN`, `PRICE_VND=49000`, `PLAN_DAYS=30`) đặt ở **API env/config** (server-authoritative); API dựng URL VietQR + trả cho client render. Client không tự đặt giá.
- CORS: `https://kyle41io.github.io` + `http://localhost:8000` (như F1). Lỗi chuẩn `{error}` + HTTP status.

## 7. Frontend đổi (giữ no-build vanilla JS)
- **`IP.pro`**: khi `IP.api.configured()` → route qua `IP.api`: `isPro()`/entitlement ← `GET /v1/billing/entitlement`; mua ← `POST /v1/billing/payment` (nhận VietQR để render) + `submit`; catalog/sections ← `/v1/pro/catalog` + `/v1/pro/content/:id`; admin list/approve/reject ← `/v1/billing/admin/*`. Khi `API_URL` rỗng → **giữ nguyên đường Supabase hiện tại** (không regression cho user đang chạy trước khi deploy API).
- Menu admin (ẩn/hiện) vẫn dựa `ADMIN_UIDS` public trong `config.js` (chỉ UI); enforcement thật ở API.
- Giữ helper thuần `genProCode`/`extendExpiry`/`vietqrUrl` + test; logic entitlement/duyệt giờ ở server.
- **KHÔNG đổi** `IP.sync`/progress (F1), chat/gmail (F3/F4).

## 8. Migration/backfill
- **Billing backfill** (script tay, có trong DEPLOY doc): đọc `entitlements` + `payment_requests` từ Supabase Postgres (qua `pg`, `SUPABASE_DB_URL`) → ghi item `ip_billing` (ENTITLEMENT + PAYMENT#code, kèm gsi1pk/gsi1sk cho payment) bằng `BatchWriteCommand` ≤25, idempotent, `--dry`.
- **Pro content**: convert `pro_content_seed.sql` → `content.data.ts` (build-time, trong lúc code; không phải script runtime).
- Giữ bảng Supabase (entitlements/payment_requests/pro_*) trong giai đoạn chuyển tiếp; xoá ở phase dọn dẹp sau khi F2 ổn định.

## 9. Cấu trúc thư mục API (thêm)
```
api/src/
  billing/ (billing.module.ts, billing.service.ts, billing.controller.ts, admin.guard.ts, dto.ts, entitlement.ts [expiry math thuần], entitlement.spec.ts)
  pro/ (pro.module.ts, pro.controller.ts, pro.service.ts, content.data.ts)
  db/ (dùng lại DynamoService; thêm keys billing vào keys.ts hoặc billing-keys.ts)
  scripts/ (create-billing-table.ts, backfill-billing.ts)
```

## 10. Bảo mật & cấu hình
- Env API (Render): thêm `ADMIN_UIDS` (csv uid), `VIETQR_BANK`/`VIETQR_ACCT`/`VIETQR_NAME`/`PRICE_VND`/`PLAN_DAYS` (không bí mật, nhưng để server-authoritative), `DDB_BILLING_TABLE` (mặc định `ip_billing`). Dùng lại `SUPABASE_JWT_SECRET`, AWS creds, `ALLOWED_ORIGINS`. Backfill cần `SUPABASE_DB_URL` (chỉ lúc chạy tay).
- Admin enforce ở server (ADMIN_UIDS + `sub` verified). Entitlement check ở server trước khi trả content. Conditional write cho approve. Không secret trong repo.
- IAM: policy least-privilege cho `ip_billing` + `ip_billing/index/status-index` (Query/GetItem/PutItem/UpdateItem/BatchWriteItem/DescribeTable/CreateTable).

## 11. Test
- **Unit (Jest)**: `entitlement.ts` (isPro/extendExpiry thuần — hết hạn, gia hạn cộng dồn), VietQR builder, approve conditional-claim (mock DynamoService: pending→approved cấp Pro; approved lần 2 idempotent; rejected không cấp), AdminGuard (uid trong/ngoài ADMIN_UIDS).
- **e2e (supertest, gate `DDB_ENDPOINT` = DynamoDB Local)**: `/v1/billing/entitlement` free mặc định; payment create→submit→admin approve→entitlement active + hạn +30d; non-admin gọi admin → 403; `/v1/pro/content/:id` → 403 khi free, 200 khi Pro; cách ly user (A không thấy payment của B; approve của admin nhắm đúng user). Health/401 vẫn chạy khi không có DB.
- **Live DynamoDB Local** trước merge (như F1): tạo `ip_billing`+GSI, chạy e2e thật + smoke luồng mua→duyệt→content.
- **Frontend `node --test`**: giữ suite xanh; thêm test `IP.pro` route qua API khi configured (mock IP.api) + fallback Supabase khi rỗng; giữ helper thuần.

## 12. Nghiệm thu F2
1. `api/` chạy local + Docker; tạo `ip_billing`+GSI OK.
2. Login → `GET /v1/billing/entitlement` = free; mua (VietQR hiện) → submit → admin duyệt → entitlement active, `isPro()` true, reload/đổi thiết bị vẫn Pro.
3. Nội dung Pro: user free gọi `/v1/pro/content/:id` → 403; user Pro → 200 (body không lọt tới client free).
4. Admin: non-admin gọi admin endpoint → 403; double-approve idempotent (không double-grant).
5. `API_URL` rỗng ⇒ IP.pro vẫn chạy đường Supabase cũ (không regression).
6. Backfill: user Pro cũ (có entitlement Postgres) vẫn Pro sau F2; payment cũ hiện đúng.
7. Cách ly + suite frontend xanh + API unit/e2e (live DynamoDB Local) xanh. Deploy Render xanh, CORS đúng.

## 13. Chiến lược commit
1. `feat(api): billing DynamoDB table + keys + create-billing-table (+GSI)`
2. `feat(api): AdminGuard + billing entitlement/payment create+submit (+Jest)`
3. `feat(api): billing admin list/approve/reject (GSI + conditional claim)`
4. `feat(api): pro content module (bundled data, entitlement-gated)`
5. `feat(web): IP.pro routes billing/pro through API (Supabase fallback)`
6. `feat(api): entitlements+payments → ip_billing backfill script`
7. `docs: DEPLOY-PHASE-F2 (billing table + GSI + IAM + ADMIN_UIDS + backfill)`

## 14. Lộ trình sau F2
F3 assistant (chat quota/provider → API) → F4 inbox (gmail → API + có thể SQS ở phase AWS) → phase AWS (Docker→App Runner/ECS/Lambda; billing đã trên DynamoDB nên tách "billing service" gọn).
