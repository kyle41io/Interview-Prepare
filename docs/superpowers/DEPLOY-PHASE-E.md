# 🚀 DEPLOY — Phase E (Gmail Intelligence)

> Đã code xong. App vẫn chạy khi chưa deploy — chuông thông báo & trang Lịch nhắc hiện nhưng rỗng, nút "Kết nối Gmail" trong Cài đặt sẽ báo lỗi im lặng. Làm các bước dưới để tính năng hoạt động thật. (Yêu cầu Phase D đã có adapter AI + secrets AI.)

## 1. Migration
Supabase Dashboard → **SQL Editor** → chạy `supabase/migrations/0004_gmail.sql` (tạo `gmail_accounts`, `notifications`, `reminders`, `gmail_seen` + RLS + realtime publication cho `notifications`).

## 2. Google Console — thêm scope Gmail (Testing mode)
Dùng LẠI OAuth client của Phase B (không tạo mới):
- APIs & Services → **Enabled APIs** → bật **Gmail API**.
- **OAuth consent screen** → Scopes → thêm `.../auth/gmail.readonly`.
- Consent screen ở chế độ **Testing** → **Test users** → thêm email của bạn (và bạn bè muốn thử). Testing mode cho ≤100 test user, không cần Google verify.

## 3. Secrets (Supabase CLI — `supabase login` bằng Access Token trước)
```bash
supabase secrets set GOOGLE_CLIENT_ID=<client-id> GOOGLE_CLIENT_SECRET=<client-secret>
supabase secrets set CRON_SECRET=$(openssl rand -hex 24)   # lưu lại giá trị này cho bước 5
```
> `SERVICE_ROLE_KEY` và AI provider key (Phase D) phải đã có. `gmail-scan` dùng `aiClassify` nên cần `AI_PROVIDER` + `ANTHROPIC_API_KEY` (hoặc `OPENAI_API_KEY`).

## 4. Deploy functions
```bash
supabase functions deploy gmail-connect gmail-status gmail-scan
```

## 5. Lịch quét định kỳ (pg_cron)
SQL Editor → chạy `supabase/seed/cron_gmail.sql` sau khi thay `<PROJECT_REF>` (= `tbihofgqjrwfgjtfjyrg`) và `<CRON_SECRET>` (giá trị ở bước 3). Quét mỗi 15 phút.
> Gọi thủ công để test ngay (không đợi 15'):
> ```bash
> curl -X POST https://tbihofgqjrwfgjtfjyrg.functions.supabase.co/gmail-scan -H "x-cron-secret: <CRON_SECRET>"
> ```

## 6. Test end-to-end
- [ ] Đăng nhập (bằng test user) → **Cài đặt tài khoản** → **Kết nối Gmail** → cấp quyền (màn hình Google có cảnh báo "unverified" ở Testing mode — bấm Advanced → Continue).
- [ ] Gửi cho chính mình một email giả lập "Thư mời phỏng vấn — vòng kỹ thuật, 10/07 9:30".
- [ ] Gọi `gmail-scan` thủ công (lệnh ở bước 5) hoặc đợi ≤15'.
- [ ] 🔔 Chuông có thông báo mới; đang mở app → toast + Web Notification (nếu đã cho phép).
- [ ] Trang **Lịch nhắc** có mục phỏng vấn; bấm **Xuất .ics** → mở được trong Google/Apple Calendar.
- [ ] Đánh dấu **Xong/Bỏ qua** hoạt động.
- [ ] Tài khoản khác không thấy dữ liệu của bạn (RLS).
- [ ] **Ngắt kết nối** trong Cài đặt → lần quét sau dừng lại.

## Bảo mật
- Refresh token Gmail + Google client secret **chỉ ở server** (bảng `gmail_accounts` không có policy client + Edge secret). Scope chỉ `gmail.readonly`.
- **Không lưu thân email** — chỉ lưu kết quả phân loại (công ty/tiêu đề/tóm tắt/thời gian). Idempotent theo message-id (`gmail_seen`).
- `gmail-scan` chỉ chạy khi có đúng `x-cron-secret`.
- Xoá tài khoản (Phase B) cascade xoá sạch toàn bộ dữ liệu Gmail/thông báo/lịch nhắc.
