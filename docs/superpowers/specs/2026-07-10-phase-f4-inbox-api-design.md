# Phase F4 — Gmail intelligence / inbox → NestJS API + DynamoDB — Design Spec

> Ngày: 2026-07-10 · Repo: `kyle41io/Interview-Prepare`
> Sub-project cuối của **Phase F** (refactor backend). Nối tiếp F1 (progress) + F2 (billing) + F3 (chat), đã merge. F4 chuyển **Gmail intelligence** (kết nối Gmail, quét inbox tuyển dụng định kỳ, phân loại bằng AI → thông báo + nhắc lịch) từ Supabase Edge Functions/pg_cron sang **NestJS API**. Sau F4, toàn bộ 4 domain đã ở API/DynamoDB → sẵn cho phase AWS.

## 1. Mục tiêu F4
API "chuẩn" sở hữu domain **inbox/assistant-gmail**: kết nối Gmail của user (OAuth, refresh token giữ server-side), quét inbox định kỳ (cron ngoài → endpoint có bảo vệ), phân loại email tuyển dụng bằng AI (test/interview/offer/rejection) → tạo **notifications** (chuông) + **reminders** (lịch), idempotent. Dữ liệu inbox trên DynamoDB. Ranh giới domain rõ để phase AWS tách "inbox service" (+ SQS/EventBridge).

## 2. Phi mục tiêu / thay đổi có chủ đích
- **Không** realtime push cho chuông: bỏ Supabase Realtime, chuông **poll khi mở** (DynamoDB không push sẵn; nhịp quét 15' nên không đáng kể; DynamoDB Streams có thể khôi phục push ở phase AWS).
- **Không** dùng pg_cron: cron ngoài (GitHub Actions ~15') gọi endpoint scan có `CRON_SECRET`.
- Không streaming, không đổi hosting frontend, không đụng progress/billing/chat (F1-F3). **Không Fable.**
- Cải tiến có chủ đích: **OAuth code exchange phía server** — frontend lấy auth code (offline) → API đổi lấy refresh token bằng `GOOGLE_CLIENT_SECRET` (server-side) → lưu. Giữ client secret ở server.

## 3. Kiến trúc
```
IP.gmail ──/v1 REST (Bearer JWT)──▶ InboxModule (NestJS, Render)
   ├─ gmail status/connect/disconnect  (connect: đổi auth code → refresh token, server-side)
   ├─ notifications (list / read / read-all)
   └─ reminders (list upcoming / setStatus)
External cron (GitHub Actions ~15') ──POST /v1/gmail/scan (header x-cron-secret)──▶ ScanService:
   for each active account: refresh access token → list inbox (newer_than:2d) → prefilter →
   ProviderService.classify (recruiting) → insert notification (+ reminder), idempotent qua gmail_seen
DynamoDB ip_inbox. Fallback: IP_CONFIG.API_URL rỗng ⇒ IP.gmail dùng Supabase Edge Functions như cũ.
```
- **Module mới**: `InboxModule` (`GmailController` connect/status/disconnect/scan, `NotificationsController`, `RemindersController`, `GmailAccountService`, `ScanService`, `InboxService` [notif/reminder/seen CRUD], `GoogleService` [OAuth exchange + token refresh + Gmail list/get]). Dùng lại `JwtAuthGuard` (F1) + `ProviderService` (F3, thêm `classify`). Bảng F1-F3 không đụng.
- **Authz**: `/v1/gmail/status|connect|disconnect`, `/v1/notifications*`, `/v1/reminders*` cần JWT, khoá theo `USER#<sub>`. `POST /v1/gmail/scan` KHÔNG dùng JWT — gác bằng `CRON_SECRET` (header `x-cron-secret`); quét mọi active account (máy gọi). Refresh token không bao giờ tới client.

## 4. Data model DynamoDB (`ip_inbox`, một bảng)
`PK=USER#<userId>`, SK theo loại:
| SK | Ý nghĩa | Attributes |
|---|---|---|
| `GMAIL_ACCOUNT` | tài khoản Gmail đã nối | `refresh_token` (SECRET, không trả client), `email`, `active` (bool), `last_scan`, `updated_at` |
| `NOTIF#<created_at>#<id>` | 1 thông báo | `id`, `type` (kind), `title`, `body`, `read` (bool), `source` (gmail msgId), `created_at` |
| `REMINDER#<id>` | 1 nhắc lịch | `id`, `kind`, `title`, `company`, `due_at`, `deadline_at`, `status` (`upcoming`/`done`/`dismissed`), `source`, `created_at` |
| `SEEN#<msgId>` | idempotency | `ttl` (epoch, ~7 ngày; bật DynamoDB TTL trên `ttl` để tự dọn) |

- Notifications: `Query pk=USER#id begins_with(sk,"NOTIF#")`, `ScanIndexForward=false`, limit 30 → mới nhất trước (SK có `created_at` nên sort theo thời gian). markRead: client gửi `{created_at,id}` → dựng SK → `UpdateItem set read=true`. markAllRead: Query các item chưa đọc → cập nhật (chunk).
- Reminders: `Query begins_with(sk,"REMINDER#")`, lọc `status==="upcoming"`, sort theo `due_at` (client hoặc server). setStatus: `UpdateItem`.
- gmail_seen: check tồn tại (`GetItem`) trước khi xử lý; ghi `PutItem` với `ttl`. Chống xử lý lại 1 email.
- `ip_inbox` `PAY_PER_REQUEST`; tạo bảng + bật TTL bằng `create-inbox-table.ts` idempotent.

## 5. AI classify (thêm vào ProviderService của F3)
`ProviderService.classify({ system, input }) → object`:
- Dựng prompt = `system` (SYS phân loại tuyển dụng, port verbatim) + hướng dẫn "Respond with ONLY a JSON object with keys: is_recruiting(bool), kind(test|interview|offer|rejection|other), company(string), title(string), event_at(ISO|null), deadline_at(ISO|null), summary(string)". Gọi `complete()` (anthropic/openai/mock qua fetch, F3), `JSON.parse` text; parse lỗi → `{ is_recruiting:false }`.
- `AI_PROVIDER=mock` → trả object canned (vd `{is_recruiting:true, kind:"interview", company:"Acme", title:"Interview", event_at:null, deadline_at:null, summary:"[mock]"}`) để test/scan không cần key thật.
- SYS (verbatim): "You classify a recruiting-related email for an IT job seeker... kind: test/interview/offer/rejection/other... event_at/deadline_at ISO or null... summary <=200 chars, in the email's language." (nguyên văn từ `gmail-scan`).

## 6. Google OAuth + Gmail (GoogleService, `fetch`)
- **connect**: `exchangeCode(code, redirectUri) → { refresh_token, email }` — `POST https://oauth2.googleapis.com/token` với `client_id`/`client_secret`/`code`/`grant_type=authorization_code`/`redirect_uri`; lấy `refresh_token` + gọi userinfo/`id_token` để lấy email. Lưu vào `GMAIL_ACCOUNT`.
- **refreshAccessToken(refresh) → access_token**: `POST oauth2.googleapis.com/token` `grant_type=refresh_token` (port từ gmail-scan). Không lưu access token (ephemeral).
- **listRecent(access) / getMeta(access, id)**: Gmail REST `users/me/messages?q=newer_than:2d in:inbox&maxResults=20`, `messages/<id>?format=metadata` (From/Subject/Date). `GMAIL_MODE=mock` → trả danh sách message canned (test/scan không cần OAuth thật).
- Secret Google chỉ ở env; không tới client.

## 7. API surface F4 (`/v1`)
| Method | Path | Auth | Ý nghĩa |
|---|---|---|---|
| GET | `/v1/gmail/status` | JWT | `{connected, email, last_scan}` |
| POST | `/v1/gmail/connect` | JWT | body `{code, redirect_uri}` → server đổi code→refresh token → lưu → `{connected, email}` |
| POST | `/v1/gmail/disconnect` | JWT | xoá/deactivate `GMAIL_ACCOUNT` |
| GET | `/v1/notifications?limit=30` | JWT | list mới nhất |
| POST | `/v1/notifications/read` | JWT | body `{created_at, id}` → set read |
| POST | `/v1/notifications/read-all` | JWT | set read cho mọi item chưa đọc |
| GET | `/v1/reminders?status=upcoming` | JWT | list |
| PUT | `/v1/reminders/:id` | JWT | body `{status}` |
| POST | `/v1/gmail/scan` | **CRON_SECRET** (header `x-cron-secret`) | quét mọi active account → phân loại → tạo notif/reminder idempotent → `{scanned, accounts}` |
- Body có array/nested → dùng **interface** (whitelist pipe strip DTO class — bài học F1/F2). CORS như F1-F3.

## 7b. Scheduler (cron ngoài)
- `.github/workflows/gmail-scan.yml`: `schedule: cron ~*/15`, chạy `curl -fsS -X POST "$API_URL/v1/gmail/scan" -H "x-cron-secret: $CRON_SECRET"`. `API_URL` + `CRON_SECRET` là **GitHub repo secrets**. Zero-cost, repo-native; map sang AWS EventBridge→Lambda sau. (Người dùng cũng có thể dùng cron-job.org thay thế.)

## 8. Frontend đổi (giữ no-build vanilla JS)
- **`IP.gmail`**: khi `IP.api.configured()` → route status/connect/disconnect/notifications/reminders qua `IP.api`. **connect**: đổi flow sang lấy Google auth **code** (offline) rồi `POST /v1/gmail/connect {code, redirect_uri}` (thay vì tự đổi token). Khi `API_URL` rỗng → giữ nguyên đường Supabase Edge Functions cũ (không regression). **Bỏ Supabase Realtime**; chuông refresh khi mở dropdown (+ có thể poll nhẹ). Giữ helper thuần `buildICS`/`notifIcon`/`looksRecruiting`/`icsDate` + test.
- **KHÔNG đổi** progress/billing/chat (F1-F3).

## 9. Cấu trúc thư mục API (thêm)
```
api/src/inbox/ (inbox.module.ts, gmail.controller.ts, notifications.controller.ts, reminders.controller.ts,
  gmail-account.service.ts, scan.service.ts, inbox.service.ts, google.service.ts, inbox-keys.ts, cron.guard.ts,
  classify.ts [SYS prompt], *.spec.ts)
api/src/chat/provider.service.ts (thêm classify())
api/scripts/ (create-inbox-table.ts, backfill-inbox.ts)
.github/workflows/gmail-scan.yml
```

## 10. Migration/backfill
- Backfill (script tay): `notifications` + `reminders` từ Postgres → `ip_inbox` (giữ lịch sử). `gmail_accounts` (refresh token) **tuỳ chọn**: có thể backfill (server→server, token không lộ) HOẶC để user re-connect (re-OAuth nhẹ, tránh di trú secret). `gmail_seen` bỏ qua (chỉ có thể trùng vài notif lần quét đầu). Idempotent, `--dry`.
- Giữ Edge Functions + bảng Supabase trong giai đoạn chuyển tiếp (fallback), deprecate sau.

## 11. Bảo mật & cấu hình
- Env API (Render, thêm): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `GMAIL_MODE` (rỗng|`mock`), `DDB_INBOX_TABLE` (mặc định `ip_inbox`). Dùng lại `SUPABASE_JWT_SECRET`, AWS creds, `ALLOWED_ORIGINS`, và env AI của F3 (classify). GitHub repo secrets: `API_URL` (URL scan) + `CRON_SECRET`.
- Refresh token + Google client secret + AI key **chỉ ở server**, không repo, không tới client. Scan gác bằng `CRON_SECRET` (không lộ trong repo). Notifications/reminders khoá theo `USER#<sub>`. IAM least-privilege cho `ip_inbox` (Query/GetItem/PutItem/UpdateItem/DeleteItem/BatchWriteItem/DescribeTable/CreateTable/UpdateTimeToLive).

## 12. Test
- **Unit (Jest)**: `inbox-keys` (SK builders/parse); `InboxService` (mock DynamoService: list notif newest-first, markRead/markAllRead, reminders filter, seen check/put); `GoogleService`/`ScanService` với `GMAIL_MODE=mock` + `AI_PROVIDER=mock` (scan tạo notif/reminder đúng, idempotent — quét lại không nhân đôi); `CronGuard` (đúng/sai CRON_SECRET); `ProviderService.classify` (mock + parse-fail → is_recruiting:false).
- **e2e (supertest, gate `DDB_ENDPOINT`, `AI_PROVIDER=mock`, `GMAIL_MODE=mock`)**: `/v1/notifications` 401 no token; scan không secret → 403; scan có secret (+ 1 mock account đã seed) → tạo notif; `GET /v1/notifications` trả về; read/read-all; reminders; cách ly user; scan chạy lại idempotent.
- **Live DynamoDB Local + mock Gmail + mock provider** trước merge.
- **Frontend `node --test`**: giữ suite xanh; thêm test `IP.gmail` route qua API khi configured (mock IP.api) + fallback; giữ helper thuần.

## 13. Nghiệm thu F4
1. `api/` chạy local + Docker; tạo `ip_inbox` + TTL OK.
2. Connect Gmail (code→refresh token server-side) → status `connected`; scan (mock) tạo notifications; chuông hiện; reminders cho interview/test có ngày.
3. Scan idempotent (quét lại không nhân đôi qua `gmail_seen`).
4. read/read-all/setReminderStatus hoạt động; cách ly theo user; refresh token không lộ ra client.
5. Scan không CRON_SECRET → 403.
6. `API_URL` rỗng ⇒ IP.gmail vẫn chạy đường Supabase cũ (không regression).
7. Cron GitHub Actions gọi scan định kỳ (sau khi set secrets). Suite frontend + API unit/e2e (live) xanh. Deploy Render xanh.

## 14. Chiến lược commit
1. `feat(api): inbox DynamoDB table + keys + create-inbox-table (TTL)`
2. `feat(api): notifications + reminders module + endpoints (+Jest)`
3. `feat(api): gmail account connect/status/disconnect (OAuth code exchange) (+Jest)`
4. `feat(api): provider classify + Google/scan service + POST /v1/gmail/scan (CRON gate, mock modes) (+e2e)`
5. `feat(web): IP.gmail routes through API (Supabase fallback, poll bell)`
6. `feat(api): notifications+reminders → ip_inbox backfill script`
7. `docs+ci: DEPLOY-PHASE-F4 + gmail-scan GitHub Actions cron`

## 15. Sau F4 → phase AWS
Cả 4 domain (progress/billing/chat/inbox) đã trên NestJS API + DynamoDB. Phase AWS: Docker→App Runner/ECS/Lambda; DynamoDB đã là AWS-native; scan → EventBridge→Lambda + SQS; tách từng module thành microservice + API Gateway. F4 khép lại Phase F.
