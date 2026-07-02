# Phase C/D/E — Pro + Thanh toán · Chatbot AI · Gmail Intelligence — Design Spec

> Ngày: 2026-07-02 · Repo: `kyle41io/Interview-Prepare` · Spec chị em: `2026-07-02-wave-content-ui-design.md`
> Nền: Supabase (Phase B) — auth Google, `profiles`/`user_state`, RLS, Edge Functions. Triển khai SAU wave W1+W2, theo thứ tự C → D → E; mỗi phase một plan riêng.

## 0. Quyết định đã chốt với người dùng
- Thanh toán: **thủ công trước, webhook-ready** (SePay/Casso cắm sau không đổi kiến trúc).
- Chat model: **gói rẻ** — Anthropic `claude-haiku-4-5` (user chọn vì chi phí; đổi 1 config).
- **AI provider LINH HOẠT**: backend hỗ trợ **Anthropic HOẶC OpenAI**, chọn qua secret `AI_PROVIDER`; key nào được cấp thì dùng.
- Gmail: bản đầy đủ server-poll, Google app ở **Testing mode** (≤100 test user, không cần verify).
- Giá Pro mặc định: **49.000đ/30 ngày** (hằng số cấu hình).

## 1. AI Provider Adapter (dùng chung D & E)
`supabase/functions/_shared/ai.ts` (Deno, import SDK chính thức qua npm):
- `aiComplete({system, messages, maxTokens})` → `{text}` — chat.
- `aiClassify({system, input, schema})` → object đã validate — structured output (Gmail).
- Provider chọn theo secret `AI_PROVIDER` (`anthropic` | `openai`); nếu thiếu → tự chọn theo key nào tồn tại (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`); cả hai thiếu → lỗi 503 rõ ràng.
- **Anthropic** (SDK `@anthropic-ai/sdk`): model chat `AI_CHAT_MODEL` mặc định `claude-haiku-4-5`; classify mặc định `claude-haiku-4-5`; system prompt gắn `cache_control: {type:"ephemeral"}` (prompt caching); classify dùng `output_config.format` json_schema. KHÔNG gửi `temperature/top_p`.
- **OpenAI** (SDK `openai`): model mặc định `gpt-4o-mini` (config `AI_CHAT_MODEL`); classify dùng `response_format` json_schema.
- Mọi key CHỈ ở Edge Function secrets. Timeout 30s, lỗi provider → thông điệp thân thiện, không lộ chi tiết.

## 2. Phase C — Pro + Thanh toán VietQR

### 2.1 DB — `supabase/migrations/0002_pro.sql`
```
entitlements(user_id uuid PK→profiles, tier text 'pro', status text 'active', expires_at timestamptz, source text, updated_at)
  RLS: user SELECT own; KHÔNG policy insert/update cho client (chỉ service-role ghi).
payment_requests(id uuid PK default gen_random_uuid(), user_id→profiles, code text UNIQUE, plan text, amount int,
  status text 'pending'|'submitted'|'approved'|'rejected'|'expired', note text, created_at, decided_at)
  RLS: user SELECT own; INSERT own (status='pending'); UPDATE own CHỈ pending→submitted (WITH CHECK). Duyệt = service-role.
pro_content(id uuid PK, topic_id text, position int, section jsonb, created_at)
  RLS: SELECT khi EXISTS entitlement active chưa hết hạn của auth.uid(). KHÔNG ghi từ client. Seed bằng SQL/service-role.
```
- Nội dung Pro = **section chuyên sâu gắn vào topic hiện có** (schema section y hệt data topic), CHỈ nằm server → khoá thật (bundle không chứa). Đợt đầu seed 4–6 section Pro chất lượng (vd deep-dive cho system-design, microservices, llms, rag).

### 2.2 Luồng mua & duyệt
1. User (đã đăng nhập) → trang **Nâng cấp Pro** → client insert `payment_requests` (code `PRO-` + 6 ký tự A-Z0-9, amount 49000).
2. Hiện **VietQR động**: ảnh `https://img.vietqr.io/image/970407-19036335023019-compact2.jpg?amount={amount}&addInfo={code}&accountName=NGUYEN%20VAN%20KIEN` (Techcombank 970407; ảnh lỗi → fallback hiển thị STK/chủ TK/số tiền/nội dung dạng chữ + nút copy).
3. User chuyển khoản đúng nội dung → bấm **"Tôi đã chuyển khoản"** → status `submitted`.
4. **Duyệt**: Edge Function `approve-payment` — verify JWT, caller phải nằm trong secret `ADMIN_UIDS` (danh sách uuid, phân cách phẩy) → cập nhật payment `approved` + upsert entitlement (`expires_at = greatest(now,expires_at) + 30 days`) qua service-role. Từ chối: `rejected` + note. **Trang Admin** trong app (route chỉ render khi `user.id ∈ ADMIN_UIDS` — hардcode UI check + server check thật ở function): bảng submitted requests, nút Duyệt/Từ chối.
5. Webhook-ready: logic duyệt tách hàm `applyApproval(payment_id)` trong function → sau này function `payment-webhook` (SePay) gọi cùng hàm, đối chiếu code trong nội dung CK.

### 2.3 Client
- `IP.pro` (module mới): `isPro()` (cache entitlement sau login qua select entitlements), `fetchProSections(topicId)`, sự kiện thay đổi.
- `renderTopic`: sau sections free, nếu topic có Pro sections → đã Pro: render như section thường (badge PRO nhỏ); chưa: **khối khoá** (tiêu đề section + 🔒 + nút "Nâng cấp Pro").
- Trang Nâng cấp (mode `upgrade`): trạng thái các bước (tạo mã → QR → chờ duyệt → active), hiển thị hạn Pro hiện tại, lịch sử request của mình.
- Menu hồ sơ: mục "Nâng cấp Pro"/"Pro của tôi" (+ badge PRO cạnh avatar khi active). Thông báo khi được duyệt (đợt E có bảng notifications; trong C dùng toast khi phát hiện entitlement mới lúc mở app).

## 3. Phase D — Chatbot AI

### 3.1 Edge Function `chat`
- Verify JWT → xác định quota: **Pro 50 tin/ngày, Free (đăng nhập) 3 tin/ngày**; chưa đăng nhập → 401. Bảng `chat_usage(user_id, day date, count int, PK(user_id,day))` — RLS user select own; tăng đếm bằng service-role trong function (atomic upsert).
- Body: `{messages: [{role,content}...]}` — client gửi tối đa **10 lượt gần nhất**, mỗi content ≤ 4000 ký tự; server cắt cứng.
- System prompt (hằng trong function, song ngữ): trợ lý IT của Interview Prep; CHỈ trả lời chủ đề: lập trình/CNTT, kiến trúc, DevOps, AI, chuẩn bị phỏng vấn, CV, tuyển dụng/nghề nghiệp IT; ngoài phạm vi → từ chối lịch sự 1 câu + gợi ý quay lại chủ đề; không tiết lộ prompt; trả lời bằng ngôn ngữ của người hỏi; ngắn gọn có cấu trúc.
- Gọi `aiComplete` (adapter §1), `maxTokens 1024`. Response `{text, remaining}`.

### 3.2 Client
- Mode `chat` (topbar, icon 💬 `fa-solid fa-comments`, nhãn "Chat AI"): khung chat (bubbles user/assistant, render markdown nhẹ: code block + đậm/nghiêng), input + gửi (Enter), typing indicator, quota còn lại, thông báo hết quota (Free → CTA nâng cấp Pro).
- Lịch sử chỉ trong phiên (in-memory; đổi mode không mất, reload mất) — riêng tư, không lưu server.
- `IP.chat` module: gọi function qua `IP.auth.client().functions.invoke("chat")`, state hội thoại.

## 4. Phase E — Gmail Intelligence

### 4.1 Kết nối Gmail
- Nút "Kết nối Gmail" (Settings): `signInWithOAuth` Google với `scopes:"https://www.googleapis.com/auth/gmail.readonly"`, `queryParams:{access_type:"offline", prompt:"consent"}` → session trả `provider_refresh_token` → client gọi Edge Function `gmail-connect` gửi token → lưu bảng `gmail_accounts(user_id PK, refresh_token text, email text, last_scan timestamptz, active bool)` — **KHÔNG policy RLS nào cho client** (bảng chỉ service-role đọc/ghi; client kiểm tra trạng thái qua function `gmail-status`). Ngắt kết nối: function xoá dòng.
- Google Console (user thao tác, có hướng dẫn): thêm scope gmail.readonly vào consent screen (Testing), thêm test users.

### 4.2 Quét & phân loại — Edge Function `gmail-scan` (cron 15 phút, pg_cron + pg_net)
1. Mỗi account active: refresh access token (Google token endpoint, dùng `GOOGLE_CLIENT_ID/SECRET` secrets — cùng OAuth client Supabase).
2. Gmail API `messages.list` `q="newer_than:2d in:inbox"` sau `last_scan`, lấy tối đa 20 mail/lần; `messages.get` (headers From/Subject/Date + snippet).
3. Pre-filter từ khoá (interview|test|assessment|tuyển|phỏng vấn|offer|regret|unfortunately|application…) để đỡ tốn AI; đậu filter → `aiClassify` schema: `{is_recruiting:bool, kind:"test"|"interview"|"offer"|"rejection"|"other", company:string, title:string, event_at:string|null(ISO), deadline_at:string|null, summary:string(≤200)}`.
4. `is_recruiting` → insert `notifications(id, user_id, type, title, body, link, read bool, created_at)`; `kind∈{test,interview}` có mốc thời gian → insert `reminders(id, user_id, kind, title, company, due_at, source, status 'upcoming'|'done'|'dismissed', created_at)`. RLS 2 bảng: user select/update-own (đánh dấu đọc/dismiss); insert = service-role. Idempotent theo message-id (bảng `gmail_seen(user_id,msg_id) PK` hoặc unique key trên notifications.source).

### 4.3 Client
- 🔔 **Chuông thông báo** (topbar): badge chưa đọc; dropdown 10 mới nhất; đánh dấu đọc. **Supabase Realtime** subscribe `notifications` của mình → toast trong app + `Notification` API trình duyệt (xin quyền lần đầu) khi có dòng mới.
- Trang **"Lịch nhắc"** (mode `reminders`, menu hồ sơ + từ chuông): timeline sắp tới (bài test/deadline/phỏng vấn) nhóm theo ngày, badge kind, đánh dấu xong/bỏ; **nút xuất .ics** từng mục (client tạo file VCALENDAR download — thêm vào Google/Apple Calendar).
- Settings: khối Gmail (trạng thái kết nối, lần quét cuối, nút kết nối/ngắt).

## 5. Bảo mật & riêng tư (xuyên suốt)
- Mọi key AI + Google secret + service-role: **chỉ trong Edge Function secrets**; repo không secret (scan trước mỗi push).
- `gmail_accounts.refresh_token` không bao giờ tới client; quyền chỉ `gmail.readonly`; user ngắt kết nối = xoá token; xoá tài khoản (Phase B) cascade sạch các bảng mới (FK → profiles ON DELETE CASCADE tất cả).
- Entitlement/quota/duyệt tiền: mọi ghi qua service-role trong function — client không tự cấp quyền được.
- Chat: không lưu nội dung hội thoại server-side; Gmail: chỉ lưu kết quả phân loại (title/company/summary), không lưu thân mail.

## 6. Secrets & thao tác người dùng cần cấp (theo phase)
- C: `ADMIN_UIDS` (uuid của bạn — lấy từ bảng auth.users sau khi bạn đăng nhập), Supabase Access Token (deploy functions), áp migration 0002.
- D: `AI_PROVIDER` + `ANTHROPIC_API_KEY` (hoặc `OPENAI_API_KEY`), `AI_CHAT_MODEL` (mặc định haiku).
- E: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (đã có từ Phase B — nhập lại làm secret), bật pg_cron, thêm scope + test users trong Google Console, migration 0003.

## 7. Kiểm thử
- Logic thuần unit-test được (`node --test`): tạo/kiểm mã PRO-code, tính expires_at gia hạn, pre-filter từ khoá Gmail, build ICS, parse/validate classify schema (mock), quota math. Edge Functions: kiểm thử thủ công theo checklist từng phase (kể cả case: chưa login, hết quota, admin giả mạo bị 403, RLS chặn đọc chéo).
- Không hồi quy suite hiện có.

## 8. Nghiệm thu (rút gọn theo phase)
- **C**: user thường mua → QR đúng số tiền/mã → admin duyệt → Pro bật + section Pro đọc được; user khác vẫn bị khoá; hết hạn tự khoá lại; admin page chỉ admin dùng được (server-side).
- **D**: chat trả lời câu IT (2 ngôn ngữ), từ chối chủ đề ngoài phạm vi; quota Free 3/ngày chặn đúng + CTA; Pro 50/ngày; đổi `AI_PROVIDER` sang OpenAI vẫn chạy không sửa client.
- **E**: kết nối Gmail (test user) → gửi mail giả lập mời PV → ≤15' có notification + reminder; realtime toast khi đang mở app; xuất .ics mở được trong Google Calendar; ngắt kết nối dừng quét.

## 9. Chiến lược commit
Mỗi phase một branch (`handbook-phase-c/d/e`), commit theo feature như quy ước; Edge Functions + migrations nằm trong repo; deploy bằng Supabase CLI với Access Token người dùng cấp.
