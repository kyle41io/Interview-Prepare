# 🚀 DEPLOY — Phase D (Chatbot AI)

> Chatbot đã code xong (nhánh merge vào `main`). App vẫn chạy bình thường khi chưa deploy — nút **Chat AI** mở được, nhưng gửi tin sẽ hiện toast "chưa cấu hình". Làm các bước dưới để chat hoạt động thật.

## 1. Migration
Supabase Dashboard → **SQL Editor** → dán & chạy nội dung `supabase/migrations/0003_chat.sql` (tạo bảng `chat_usage` + RPC `bump_chat_usage`, RLS).

## 2. Chọn AI provider + set secrets
Chỉ cần **một** trong hai provider. Qua Supabase CLI (`supabase login` bằng Access Token trước):

**Dùng Claude (mặc định, gói rẻ `claude-haiku-4-5`):**
```bash
supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...
# tuỳ chọn đổi model: supabase secrets set AI_CHAT_MODEL=claude-haiku-4-5
```

**Hoặc dùng OpenAI (`gpt-4o-mini`):**
```bash
supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sk-...
```

> `SERVICE_ROLE_KEY` (secret) cũng phải có — dùng chung với các function khác. Nếu chưa set:
> `supabase secrets set SERVICE_ROLE_KEY=<service_role key ở Settings → API>`
> Adapter tự chọn provider theo key nào tồn tại nếu bỏ trống `AI_PROVIDER`; thiếu cả hai key → function trả 503 và UI hiện "chưa cấu hình".

## 3. Deploy function
```bash
supabase functions deploy chat
```
(Function tự bundle `supabase/functions/_shared/ai.ts`.)

## 4. Test end-to-end
- [ ] Đăng nhập → mở **Chat AI** (nút trên thanh mode).
- [ ] Hỏi câu IT bằng **tiếng Việt** → trả lời tiếng Việt; hỏi bằng **English** → trả lời English.
- [ ] Hỏi lạc đề (vd "công thức nấu phở") → từ chối lịch sự 1 câu, kéo về chủ đề IT.
- [ ] Tài khoản **Free**: gửi tới tin thứ 4 trong ngày → chặn (429) + gợi ý nâng cấp Pro.
- [ ] Tài khoản **Pro**: giới hạn 50 tin/ngày.
- [ ] (Tuỳ chọn) Đổi `AI_PROVIDER` sang provider kia, `supabase functions deploy chat` lại → chat vẫn chạy, **không cần sửa client**.

## Bảo mật
- API key AI **chỉ** nằm trong Supabase secrets, không bao giờ vào repo/bundle.
- Nội dung hội thoại **không lưu** server-side (chỉ đếm số lượt trong `chat_usage`).
- Lịch sử chat chỉ ở bộ nhớ trình duyệt (reload là mất) — riêng tư.
