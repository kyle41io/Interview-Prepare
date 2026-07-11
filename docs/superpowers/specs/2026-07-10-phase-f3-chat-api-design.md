# Phase F3 — AI assistant / chat → NestJS API + DynamoDB — Design Spec

> Ngày: 2026-07-10 · Repo: `kyle41io/Interview-Prepare`
> Sub-project thứ 3 của **Phase F** (refactor backend). Nối tiếp F1 (progress) + F2 (billing/Pro), đã merge vào main. F3 chuyển **chatbot AI** (proxy gọi provider, quota, system-prompt scope) từ Supabase Edge Function sang **NestJS API**, quota trên DynamoDB, key AI ở server. F4 inbox · rồi phase AWS.

## 1. Mục tiêu F3
API "chuẩn" sở hữu domain **assistant/chat**: proxy gọi AI provider (Anthropic/OpenAI) với key giữ **server-side**, quota theo ngày theo tier (Pro 50 / free 3) cưỡng chế phía server bằng bộ đếm DynamoDB nguyên tử, giữ system-prompt giới hạn phạm vi (SWE). Đây là **faithful move**: giữ nguyên hành vi hiện tại (non-streaming, lịch sử chat ephemeral do client gửi mỗi request — KHÔNG lưu). Ranh giới domain rõ để phase AWS sau tách "assistant service".

## 2. Phi mục tiêu (phase sau / không làm)
Không streaming (SSE) — giữ non-streaming như hiện tại. Không lưu lịch sử chat (vẫn ephemeral). Không đụng progress (F1), billing (F2), gmail (F4). Không dựng AWS. Không đổi hosting frontend. Không đổi provider/model mặc định (chỉ đổi *nơi chạy*). Không dùng model **Fable** ở bất kỳ đâu.

## 3. Kiến trúc
```
IP.chat.send() ──POST /v1/chat (Bearer JWT)──▶ ChatModule (NestJS, Render)
   ├─ BillingService.getEntitlement(uid).isPro  → limit (Pro 50 / free 3)   [reuse F2 BillingModule]
   ├─ ChatQuotaService: atomic UpdateItem trên ip_chat                        [cưỡng chế quota]
   └─ ProviderService.complete(): fetch tới AI provider, key từ env           → { text, remaining }
Fallback: IP_CONFIG.API_URL rỗng ⇒ IP.chat gọi Supabase Edge Function `chat` như hiện tại (không regression)
```
- **Module mới**: `ChatModule` (`ChatController`, `ChatService`, `ChatQuotaService`, `ProviderService`, scope prompt). Dùng lại `JwtAuthGuard` (F1) + `BillingService` (F2, cần export). Bảng `ip_progress`/`ip_billing` KHÔNG đụng.
- **DB**: bảng DynamoDB mới `ip_chat` (chỉ chứa bộ đếm quota theo ngày, có TTL tự dọn). Supabase giữ Edge Function `chat` + bảng `chat_usage` trong giai đoạn chuyển tiếp (fallback), deprecate sau.
- **Authz**: `/v1/chat*` cần JWT; quota + provider chạy theo `USER#<sub>` đã verify. Key AI KHÔNG bao giờ tới client.

## 4. Data model DynamoDB (`ip_chat`)
Chỉ lưu bộ đếm quota theo ngày (per-user, ephemeral):
- **PK** `pk` (S) = `USER#<userId>`; **SK** `sk` (S) = `CHATUSAGE#<YYYY-MM-DD>` (ngày UTC).
- Attrs: `count` (num), `ttl` (num, epoch giây — hết hạn cuối ngày hôm sau; bật DynamoDB **TTL** trên thuộc tính `ttl` để tự xoá bộ đếm cũ).
- **Atomic bump** (thay `bump_chat_usage` RPC): `UpdateItem` Key=`{pk, sk:CHATUSAGE#day}`, `UpdateExpression: "ADD #c :one SET #ttl = if_not_exists(#ttl, :ttl)"`, `ConditionExpression: "attribute_not_exists(#c) OR #c < :limit"`, `ReturnValues: "UPDATED_NEW"`. Thành công → `remaining = limit - newCount`. `ConditionalCheckFailedException` → quá quota → **HTTP 429** `{error:"quota", remaining:0}`.
- `PAY_PER_REQUEST`. Tạo bảng + bật TTL bằng script idempotent `create-chat-table.ts` (`UpdateTimeToLive` trên `ttl`).

## 5. Provider adapter (port từ `supabase/functions/_shared/ai.ts`, dùng `fetch`)
`ProviderService.complete({ system, messages, maxTokens })` → `{ text }`:
- `pickProvider()`: `AI_PROVIDER` (`anthropic`|`openai`|`mock`). Nếu để trống → chọn provider theo key nào tồn tại (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`); không có key → ném `AiUnavailable("no AI provider configured")` (API trả lỗi rõ; frontend hiện thông báo "chưa cấu hình" như cũ — không regression khi thiếu key).
- `chatModel(provider)`: `AI_CHAT_MODEL` || (`openai` → `gpt-4o-mini` : `anthropic` → `claude-haiku-4-5`). NEVER Fable.
- **Anthropic**: `fetch("https://api.anthropic.com/v1/messages", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: { model, max_tokens, system, messages } })` → `data.content[0].text`.
- **OpenAI**: `fetch("https://api.openai.com/v1/chat/completions", { headers: { Authorization: "Bearer "+key, "content-type": "application/json" }, body: { model, max_tokens, messages: [{role:"system",content:system}, ...messages] } })` → `data.choices[0].message.content`.
- **mock** (`AI_PROVIDER=mock`, cho test/e2e/live smoke không cần key thật): trả chuỗi canned (vd `"[mock] " + last user message`), không gọi mạng.
- Không thêm SDK npm (dùng `fetch` thuần, ít phụ thuộc). Lỗi mạng/provider → ném lỗi có message; controller map sang HTTP status.

## 6. API surface F3 (`/v1`, cần JWT)
| Method | Path | Ý nghĩa |
|---|---|---|
| POST | `/v1/chat` | body `{messages:[{role,content}]}` → clamp (MAX_TURNS=10, maxChars=4000), validate last role=`user`, đọc limit theo entitlement, **atomic quota bump (sau khi validate)**, gọi provider với SCOPE prompt → `{text, remaining}`; quá quota → 429; thiếu message hợp lệ → 400; provider chưa cấu hình → 503 `{error:"ai-unconfigured"}` |
| GET | `/v1/chat/quota` | `{limit, used, remaining, day}` cho user hôm nay (không bump) |
- **Thứ tự cưỡng chế** (giữ fix Phase D): validate body/message TRƯỚC khi bump quota (không tiêu quota cho request rác). SCOPE system prompt (chỉ trả lời chủ đề SWE/phỏng vấn/CV/IT) port nguyên văn từ edge fn.
- CORS: `https://kyle41io.github.io` + `http://localhost:8000` (như F1/F2). Lỗi chuẩn `{error}` + HTTP status.

## 7. Frontend đổi (giữ no-build vanilla JS)
- **`IP.chat`**: khi `IP.api.configured()` → `send(text)` gọi `IP.api.post("/v1/chat", { messages: truncateHistory(_hist,10,4000) })`; dùng `data.text` + `data.remaining` như cũ. Khi `API_URL` rỗng → **giữ nguyên** đường gọi Supabase Edge Function `chat` (không regression). Giữ helper thuần `truncateHistory`/`quotaLimit`/`escapeHtml`/`mdLite` + test; server là nguồn chân lý cho quota (client `quotaLimit` chỉ để gợi ý UI).
- **KHÔNG đổi** `IP.sync`/progress (F1), `IP.pro`/billing (F2), gmail (F4).

## 8. Cấu trúc thư mục API (thêm)
```
api/src/
  chat/ (chat.module.ts, chat.controller.ts, chat.service.ts, quota.service.ts, provider.service.ts, scope.ts [system prompt + clamp consts], dto.ts, quota.spec.ts, provider.spec.ts)
  db/ (dùng lại DynamoService; thêm chatTable = DDB_CHAT_TABLE)
  scripts/ (create-chat-table.ts)
```
Không backfill (quota ephemeral). Bảng `ip_chat` chỉ chứa bộ đếm ngày.

## 9. Bảo mật & cấu hình
- Env API (Render, thêm): `AI_PROVIDER` (`anthropic`|`openai`|`mock`|rỗng=auto), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AI_CHAT_MODEL` (tuỳ chọn), `DDB_CHAT_TABLE` (mặc định `ip_chat`). Dùng lại `SUPABASE_JWT_SECRET`, AWS creds, `ALLOWED_ORIGINS`. Key AI **chỉ ở env**, không repo.
- Quota + scope cưỡng chế server-side (client không bypass được). Provider key không tới client. IAM: least-privilege cho `ip_chat` (GetItem/UpdateItem/DescribeTable/CreateTable/UpdateTimeToLive).
- Chỉ **một trong hai** key (Anthropic hoặc OpenAI) là đủ; không key → chat trả lỗi "chưa cấu hình", app vẫn chạy.

## 10. Test
- **Unit (Jest)**: `quota.service` (mock DynamoService: bump dưới limit → remaining giảm; đúng limit → 429/`ConditionalCheckFailedException`; item mới set ttl); `provider.service` (mock `fetch`: pickProvider theo AI_PROVIDER/key; chatModel default; parse response Anthropic vs OpenAI; mock provider; thiếu key → AiUnavailable); clamp/scope consts thuần.
- **e2e (supertest, gate `DDB_ENDPOINT` = DynamoDB Local, `AI_PROVIDER=mock`)**: `POST /v1/chat` không token → 401; free tier: 3 request OK, request thứ 4 → 429; body rỗng/last≠user → 400 và KHÔNG tiêu quota; `GET /v1/chat/quota` phản ánh đúng used/remaining; cách ly user (quota A ≠ B).
- **Live DynamoDB Local + mock provider** trước merge (như F1/F2): tạo `ip_chat`, chạy e2e thật + smoke luồng chat→quota→429.
- **Frontend `node --test`**: giữ suite xanh; thêm test `IP.chat.send` route qua API khi configured (mock IP.api) + fallback Supabase khi rỗng; giữ helper thuần.

## 11. Nghiệm thu F3
1. `api/` chạy local + Docker; tạo `ip_chat` + TTL OK.
2. Login → gửi chat qua API → nhận trả lời; quota giảm; hết quota (free 3) → 429 `chưa đủ lượt`; Pro (50) nhiều hơn.
3. Body rác → 400, không tiêu quota. `GET /v1/chat/quota` đúng.
4. Thiếu key AI → 503 "chưa cấu hình", app không vỡ. Chỉ 1 key vẫn chạy.
5. `API_URL` rỗng ⇒ IP.chat vẫn chạy đường Supabase cũ (không regression).
6. Cách ly quota theo user; key AI không lộ ra client. Suite frontend + API unit/e2e (live DynamoDB Local + mock provider) xanh. Deploy Render xanh, CORS đúng.

## 12. Chiến lược commit
1. `feat(api): chat quota DynamoDB table + keys + create-chat-table (TTL)`
2. `feat(api): chat quota service (atomic bump + entitlement limit) (+Jest)`
3. `feat(api): AI provider adapter (anthropic/openai/mock via fetch) (+Jest)`
4. `feat(api): chat module + POST /v1/chat + GET /v1/chat/quota (+e2e)`
5. `feat(web): IP.chat routes through API (Supabase fallback)`
6. `docs: DEPLOY-PHASE-F3 (ip_chat + TTL + IAM + AI keys)`

## 13. Lộ trình sau F3
F4 inbox (gmail → API; có thể SQS ở phase AWS) → phase AWS (Docker→App Runner/ECS/Lambda; assistant đã tách domain nên dễ thành microservice + có thể thêm streaming/history khi lên AWS).
