# Interview Prep → Handbook — Lộ trình tổng thể (5 mảng)

> Ngày: 2026-06-17 · Repo: `kyle41io/Interview-Prepare`
> Tài liệu này cho **bức tranh lớn**. Mỗi mảng sẽ có brainstorm → spec → plan → code **riêng**. Chi tiết của B/C/D/E sẽ được làm rõ ở vòng brainstorm của chính mảng đó; phần dưới chỉ là định hướng để chốt thứ tự & phụ thuộc.

## Tầm nhìn
Biến app ôn phỏng vấn (static, song ngữ) hiện tại thành **handbook thực dụng có người dùng thật**: học theo lộ trình cấp bậc, có nội dung Pro trả phí, trợ lý AI, và tích hợp Gmail thông minh.

## Hiện trạng (điểm xuất phát)
- Static site thuần, **không build step**, deploy GitHub Pages (`.nojekyll`).
- `index.html` + `assets/css/styles.css` + `assets/js/app.js` + `assets/data/*.js` tự đăng ký topic qua `window.PREP`.
- **Đã song ngữ** (`{vi,en}` + hàm `t()`), state trong `localStorage`, 3 mode: Học / Thẻ / Trắc nghiệm.
- **Không có** backend, tài khoản, database, thanh toán.

## Vì sao phải chia nhỏ
Yêu cầu là **5–6 hệ thống độc lập**. Bước nhảy lớn nhất: gần như mọi tính năng mới **bắt buộc có backend** (gate Pro, OAuth, key AI, Gmail). Nhồi một lần làm sẽ rối, dễ sai, khó kiểm thử. Vì vậy chia theo **thứ tự phụ thuộc**.

## Năm mảng & thứ tự

| Mảng | Tên | Cần backend? | Phụ thuộc | Ghi chú rủi ro |
|---|---|---|---|---|
| **A** | Polish + Lộ trình cấp bậc | Không | — | Thấp. Ship nhanh, 0 chi phí. Định hình content model. **← đang làm** |
| **B** | Backend + Đăng nhập Google | Có | A | Quyết định stack/hosting/chi phí hạ tầng. Cân nhắc migrate kiến trúc 1 lần ở đây. |
| **C** | Kiếm tiền (Pro + thanh toán) | Có | B | Gate nội dung **ở server**. Chọn cổng thanh toán phù hợp thị trường VN. |
| **D** | Trợ lý AI (chatbot IT) | Có | B | **Không để API key ở client** — proxy qua backend. Rate-limit, lọc chủ đề, kiểm duyệt. |
| **E** | Gmail Intelligence | Có | B | **Khó & nhạy cảm nhất.** Gmail OAuth scope nhạy cảm → Google verify app (mất tuần), web push, xử lý nền, quyền riêng tư. |

## Mảng A — phạm vi đã chốt (chi tiết ở `2026-06-17-phase-a-polish-and-tracks-design.md`)
- Icon **Font Awesome (self-host)** thay emoji; **light/dark mode**; hoàn thiện **i18n EN/VI**.
- **Lộ trình theo vai trò (Tracks)**: SWE (Fresher/Junior/Senior) + DevOps; AI Engineer & vai trò khác = **"Sắp ra mắt"**.
- Onboarding **một màn** (hướng B): chọn vai trò → cấp bậc ngay trong dòng; có **reset/đổi lộ trình**.
- Cờ **`tier: free|pro`** + badge "Pro" (nội dung **vẫn mở** ở A; khoá thật ở C).
- Phụ: **"Tiếp tục học" + dashboard tiến độ**, **Bookmark**, **Streak/mục tiêu ngày**.
- Giữ **no-build**; tách `app.js` thành module nhỏ.

## Định hướng (chưa chốt) cho B–E — sẽ brainstorm riêng
- **B**: backend + Google OAuth + tài khoản; đồng bộ `selectedTrack`/tiến độ/bookmark/streak từ localStorage lên server (giữ localStorage làm cache/offline).
- **C**: server-side entitlement; chọn cổng thanh toán (cân nhắc VN: ví/nội địa + thẻ quốc tế); quản lý gói Free/Pro; chuyển badge "Pro" (A) thành **khoá + luồng nâng cấp**.
- **D**: backend proxy gọi Claude/ChatGPT; system prompt giới hạn chủ đề IT + kiểm duyệt; rate-limit theo user/gói; chỉ Pro.
- **E**: Gmail OAuth (scope đọc mail), trích lịch họp/bài test bằng AI → trang dashboard, export file, **web push real-time**; cần consent rõ ràng + tuân thủ chính sách Google.

## Khoá/khoản cần người dùng cung cấp theo từng mảng (tham khảo, lấy đúng lúc)
- **A**: không cần key gì.
- **B**: Google OAuth Client ID/Secret; chọn & cấp quyền hosting backend + DB.
- **C**: tài khoản cổng thanh toán + khóa API.
- **D**: API key Claude/OpenAI (đặt ở backend, không ở client).
- **E**: Google Cloud project bật Gmail API + quy trình verify app; hạ tầng job nền + web push.

## Nguyên tắc xuyên suốt
1. Mỗi mảng = 1 spec + 1 plan + 1 chu trình code, kiểm thử trước khi sang mảng sau.
2. **Bảo mật:** secret/keys không bao giờ ở client.
3. **Riêng tư:** với Gmail, xin đồng thuận tối thiểu & minh bạch.
4. Giữ song ngữ và khả năng dùng offline ở mức tối đa có thể.
