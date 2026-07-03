# ⚙️ PENDING SETUP — Thông tin & token cần thu thập

> File tổng hợp mọi thứ cần **bạn cung cấp / thao tác trên hạ tầng** để các phần đã code chạy thật.
> Điền giá trị vào đây (hoặc báo tôi) khi sẵn sàng. **KHÔNG commit secret thật vào repo** — cột "Nơi đặt" cho biết chỗ an toàn (Supabase secrets / dashboard). File này chỉ là checklist; xoá giá trị nhạy cảm sau khi đã set xong.

---

## 1. Supabase — chung (cần cho mọi deploy)

| Cần | Lấy ở đâu | Nơi đặt | Giá trị (điền tạm để dùng, rồi xoá) |
|-----|-----------|---------|----|
| **Access Token** (cho `supabase login` / CLI deploy) | supabase.com → Account → Access Tokens → Generate | Máy bạn / đưa tôi tạm khi deploy | `________` |
| **SERVICE_ROLE_KEY** | Dashboard → Project Settings → API → `service_role` secret | Edge Function secret (KHÔNG vào repo) | `________` |
| **Project ref** | Dashboard URL `https://<ref>.supabase.co` | (đã có: `tbihofgqjrwfgjtfjyrg`) | ✅ tbihofgqjrwfgjtfjyrg |
| **UUID tài khoản của bạn** (để làm admin) | Dashboard → Authentication → Users → copy `id` | Edge secret `ADMIN_UIDS` + `assets/js/config.js` (public) | `________` |

---

## 2. Phase C — Pro + thanh toán (code XONG, chờ deploy)

Chi tiết từng bước: `docs/superpowers/DEPLOY-PHASE-C.md`

- [ ] SQL Editor: chạy `supabase/migrations/0002_pro.sql`
- [ ] SQL Editor: chạy `supabase/seed/pro_content_seed.sql`
- [ ] `supabase functions deploy approve-payment`
- [ ] `supabase functions deploy delete-account`  ← của Phase B, **vẫn chưa deploy**
- [ ] `supabase secrets set SERVICE_ROLE_KEY=<...> ADMIN_UIDS=<uuid-của-bạn>`
- [ ] `assets/js/config.js` → thêm UUID vào `ADMIN_UIDS: []` (public, chỉ để ẩn/hiện menu)
- [ ] Test: mua → admin duyệt → mở khoá Pro → user khác vẫn bị khoá

**Thông tin thanh toán (đã hardcode, xác nhận đúng):**
- Ngân hàng: Techcombank (mã `970407`)
- Số TK: `19036335023019` · Chủ TK: `NGUYEN VAN KIEN`
- Giá gói: `49.000đ` / 30 ngày  → nếu muốn đổi, báo tôi (sửa `PRICE_VND`/`PLAN_DAYS` trong `assets/js/pro.js`)

---

## 3. Phase D — Chatbot AI (đang code)

| Cần | Ghi chú | Nơi đặt | Giá trị |
|-----|---------|---------|----|
| **AI_PROVIDER** | `anthropic` hoặc `openai` (adapter tự chọn nếu để trống) | Edge secret | `________` |
| **ANTHROPIC_API_KEY** | nếu dùng Claude (mặc định `claude-haiku-4-5` — gói rẻ) | Edge secret | `________` |
| **OPENAI_API_KEY** | nếu dùng OpenAI (mặc định `gpt-4o-mini`) | Edge secret | `________` |
| **AI_CHAT_MODEL** | (tuỳ chọn) đổi model mặc định | Edge secret | `________` |
| Deploy | `supabase functions deploy chat` | | |

> Bạn chỉ cần **một trong hai** key (Anthropic hoặc OpenAI). Chưa có key → nút Chat AI hiện thông báo "chưa cấu hình", app vẫn chạy bình thường.

---

## 4. Phase E — Gmail Intelligence (chưa code)

| Cần | Ghi chú | Nơi đặt |
|-----|---------|---------|
| **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** | dùng lại OAuth client của Phase B | Edge secret |
| Bật scope `gmail.readonly` trong Google Console (Testing mode) | + thêm email test users | Google Cloud Console |
| Bật `pg_cron` + `pg_net` extension | để quét mail định kỳ | Supabase Dashboard → Database → Extensions |
| Deploy `gmail-scan`, `gmail-connect`, `gmail-status` | | `supabase functions deploy ...` |

---

_Cập nhật lần cuối: 2026-07-02 (sau khi Phase C merge, bắt đầu Phase D)._
