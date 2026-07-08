# 🚀 DEPLOY RUNBOOK — toàn bộ backend (Phase B→E)

> Chạy 1 lần theo thứ tự. Site tĩnh đã live trên GitHub Pages; runbook này bật phần backend (auth/Pro/chat/Gmail).
> ⚠️ **KHÔNG commit secret nào vào repo.** Tất cả secret đặt bằng `supabase secrets set` (kho của Supabase) hoặc trong dashboard.

## 0. Chuẩn bị (một lần)
```bash
# Cài Supabase CLI nếu chưa có, rồi đăng nhập bằng Access Token
supabase login                      # dán Access Token (Account → Access Tokens)
supabase link --project-ref tbihofgqjrwfgjtfjyrg
```
Giá trị cần có sẵn (lấy từ Dashboard → Project Settings → API):
- **SERVICE_ROLE_KEY** = `service_role` secret
- **UUID admin của bạn** = `2c2cc2cf-9ced-4642-bdda-dcf7182b3f3a` (đã điền vào `config.js`)
- **Google OAuth**: Client ID `743270219955-apnj1bi0640t00r98289q46fhb4fk473.apps.googleusercontent.com` + Client Secret (bạn có) — dùng cho cả Phase B redirect và Gmail.

## 1. Database — chạy trong SQL Editor (đúng thứ tự)
1. `supabase/migrations/0001_init.sql`  — (Phase B: profiles + user_state) *nếu chưa chạy*
2. `supabase/migrations/0002_pro.sql`   — Pro (entitlements, payments, pro_content)
3. `supabase/migrations/0003_chat.sql`  — chat_usage + RPC
4. `supabase/migrations/0004_gmail.sql` — Gmail (accounts, notifications, reminders) + realtime
5. `supabase/seed/pro_content_seed.sql` — 4 section Pro mẫu

## 2. Secrets — một lệnh (thay <...> bằng giá trị thật)
```bash
supabase secrets set \
  SERVICE_ROLE_KEY=<service_role key> \
  ADMIN_UIDS=2c2cc2cf-9ced-4642-bdda-dcf7182b3f3a \
  AI_PROVIDER=anthropic \
  ANTHROPIC_API_KEY=<anthropic key>          # HOẶC: AI_PROVIDER=openai OPENAI_API_KEY=<...> \
  GOOGLE_CLIENT_ID=743270219955-apnj1bi0640t00r98289q46fhb4fk473.apps.googleusercontent.com \
  GOOGLE_CLIENT_SECRET=<google client secret> \
  CRON_SECRET=$(openssl rand -hex 24)        # LƯU LẠI giá trị này cho bước 4
```
> Chỉ cần **một** AI key (Anthropic *hoặc* OpenAI). Chat mặc định `claude-haiku-4-5` (rẻ).

## 3. Deploy tất cả Edge Functions
```bash
supabase functions deploy delete-account approve-payment chat gmail-connect gmail-status gmail-scan
```

## 4. Cron quét Gmail — SQL Editor
Mở `supabase/seed/cron_gmail.sql`, thay `<PROJECT_REF>` = `tbihofgqjrwfgjtfjyrg` và `<CRON_SECRET>` = giá trị ở bước 2, rồi chạy. (Quét 15'/lần.)

## 5. Google Console — một lần
- APIs & Services → bật **Gmail API**.
- OAuth consent screen (Testing) → thêm scope `.../auth/gmail.readonly` → thêm **Test users** (email bạn + bạn bè thử).
- Authorized redirect: đảm bảo Supabase callback + `https://kyle41io.github.io/Interview-Prepare/` đã có (từ Phase B).

## 6. Kiểm tra nhanh (smoke test)
| Tính năng | Cách thử | Kỳ vọng |
|-----------|----------|---------|
| Auth | Đăng nhập Google | Vào được, avatar hiện |
| Pro | Nâng cấp Pro → tạo mã → (admin) Duyệt | Section Pro mở khoá |
| Admin | Menu **Admin** hiện (vì UUID bạn ∈ ADMIN_UIDS) | Thấy danh sách yêu cầu |
| Chat | Chat AI hỏi câu IT (VI/EN) | Trả lời đúng ngôn ngữ; lạc đề → từ chối |
| Gmail | Cài đặt → Kết nối Gmail → gửi mail mời PV cho mình → `curl -X POST https://tbihofgqjrwfgjtfjyrg.functions.supabase.co/gmail-scan -H "x-cron-secret: <CRON_SECRET>"` | 🔔 có thông báo + Lịch nhắc có mục |

## Ghi chú
- Đổi provider AI: `supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=<...>` rồi `supabase functions deploy chat` — client không cần sửa.
- Đổi giá Pro: sửa `PRICE_VND`/`PLAN_DAYS` trong `assets/js/pro.js`.
- Ngân hàng nhận tiền Pro: Techcombank `19036335023019` — NGUYEN VAN KIEN (hardcode trong `pro.js`/QR).
