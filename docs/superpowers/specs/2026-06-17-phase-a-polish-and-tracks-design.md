# Mảng A — Polish + Lộ trình cấp bậc — Design Spec

> Ngày: 2026-06-17 · Repo: `kyle41io/Interview-Prepare` · Lộ trình tổng thể: `2026-06-17-handbook-roadmap.md`
> Ngôn ngữ: tiếng Việt cho mô tả, English cho identifier/key/đường dẫn (vì là code).

## 1. Bối cảnh & hiện trạng
App static song ngữ, **không build step**, deploy GitHub Pages. `index.html` nạp lần lượt `assets/data/*.js` (mỗi file tự `PREP.register(topic)`), rồi `assets/js/app.js` render 3 mode (Học/Thẻ/Trắc nghiệm) từ `window.PREP`. State (ngôn ngữ, tiến độ học, SRS thẻ, điểm quiz) lưu `localStorage` với prefix `ip_`. Nội dung là các block (`prose/list/table/code/callout/qa/chips`) với node `{vi,en}` + hàm `t()`. Icon hiện là emoji.

## 2. Mục tiêu mảng A
Chuyển app từ "kho chủ đề phẳng" → **handbook theo lộ trình cấp bậc**, đồng thời nâng cấp diện mạo (icon/theme) và hoàn thiện i18n. Đặt **content model** làm nền cho các mảng B–E. **Không** đụng backend, **giữ no-build**.

### 2.1 Phi mục tiêu (Out of scope — để mảng sau)
- Đăng nhập / tài khoản / đồng bộ server (mảng B).
- Khoá nội dung Pro thật & thanh toán (mảng C) — mảng A chỉ **gắn cờ + badge**, nội dung **vẫn mở**.
- Chatbot AI (D), Gmail (E).
- Viết mới giáo trình AI Engineer hay nội dung DevOps nâng cao — AI Engineer & vai trò khác chỉ là placeholder **"Sắp ra mắt"**.
- Framework/bundler — quyết định ở mảng B.

## 3. Nguyên tắc kiến trúc
- **Giữ no-build static**: mọi thứ nạp bằng `<script>`/`<link>`; GitHub Pages chạy nguyên.
- **Mở rộng `window.PREP`** thay vì viết lại; dữ liệu tiếp tục theo mẫu self-register.
- **Tách `app.js` (28KB) thành module nhỏ** nạp tuần tự bằng `<script>` (không ES module để khỏi cần server/build). Mỗi module gắn vào một namespace toàn cục `window.IP` để rõ ranh giới.

### 3.1 Cấu trúc file mới (đề xuất)
```
assets/
  js/
    store.js        # IP.store — đọc/ghi localStorage, schema, migrate, reset
    i18n.js         # IP.i18n — t(), đổi ngôn ngữ, cập nhật <html lang>
    theme.js        # IP.theme — light/dark, prefers-color-scheme, lưu lựa chọn
    tracks.js       # IP.tracks — resolve track, thứ tự topic, % tiến độ (PURE, dễ test)
    onboarding.js   # IP.onboarding — màn chọn vai trò → cấp bậc (hướng B)
    dashboard.js    # IP.dashboard — "Tiếp tục học", % theo track, streak
    bookmarks.js    # IP.bookmarks — lưu/bỏ lưu chủ đề, mục "Đã lưu"
    render.js       # IP.render — render block (tách từ app.js hiện tại)
    app.js          # bootstrap: ráp các module, điều phối route/mode
  data/
    tracks.js       # đăng ký PREP.tracks (taxonomy + nội dung từng track)
  fonts/
    fontawesome/    # self-host subset Font Awesome (css + webfonts)
  css/
    styles.css      # thêm biến theme + style cho track/onboarding/badge
```
> Việc tách module là refactor có chủ đích phục vụ mảng A và dọn nền cho B. Không refactor ngoài phạm vi.

## 4. Content model

### 4.1 Taxonomy vai trò & cấp bậc
```js
PREP.roles = [
  { id:"swe",         icon:"fa-code",       title:{vi:"Software Engineer", en:"Software Engineer"},
    levels:["fresher","junior","senior"] },
  { id:"devops",      icon:"fa-server",     title:{vi:"DevOps", en:"DevOps"},
    levels:[] },                              // không chia cấp ở A
  { id:"ai-engineer", icon:"fa-robot",      title:{vi:"AI Engineer", en:"AI Engineer"},
    levels:[], comingSoon:true },
];
PREP.levels = {
  fresher:{vi:"Fresher",en:"Fresher"}, junior:{vi:"Junior",en:"Junior"}, senior:{vi:"Senior",en:"Senior"}
};
```
Thêm vai trò "Sắp ra mắt" khác (Data, Mobile…) chỉ cần thêm entry `comingSoon:true` — không bắt buộc ở A.

### 4.2 Track schema
```js
PREP.registerTrack({
  id:"swe-junior", role:"swe", level:"junior",
  title:{vi:"SWE · Junior", en:"SWE · Junior"},
  blurb:{vi:"…", en:"…"},
  items:["dsa","databases","rest-grpc","design-patterns","react","redux","system-design","behavioral"],
  comingSoon:false
});
```
- **Granularity = nguyên topic** (không re-tag từng block trong A).
- `items` = danh sách **topic id có thứ tự**; tham chiếu topic đã có.
- Track `comingSoon:true` có `items:[]`, hiện trong UI nhưng disabled.

### 4.3 Nội dung track đề xuất (dùng id chủ đề hiện có — bạn có thể chỉnh)
Topic id hiện có: `dsa, databases, rest-grpc, design-patterns, system-design, microservices, react, redux, vue, django, dotnet, docker-k8s, cicd, aws, owork, behavioral`.

| Track | items (thứ tự học) |
|---|---|
| **swe-fresher** | dsa → databases → rest-grpc → design-patterns → behavioral |
| **swe-junior** | dsa → databases → rest-grpc → design-patterns → react → redux → system-design → behavioral |
| **swe-senior** | system-design → microservices → design-patterns → databases → docker-k8s → aws → owork → behavioral |
| **devops** | docker-k8s → cicd → aws → system-design → databases → behavioral |

- Các topic stack-specific còn lại (`vue, django, dotnet`) **không nằm trong track lõi**, vẫn truy cập qua **"Tất cả chủ đề"**. Biến thể track theo stack có thể thêm sau (ngoài A).
- Cùng một topic có thể xuất hiện ở nhiều track (vd `behavioral`, `system-design`).

### 4.4 Cờ tier (Pro)
- Thêm trường tuỳ chọn `tier:"free"|"pro"` cho topic (mặc định `"free"`).
- Render **badge "PRO"** ở sidebar/tiêu đề khi `tier==="pro"`; nội dung **vẫn mở** (mảng A).
- Đánh dấu **một tập minh hoạ nhỏ** là pro để badge xuất hiện (đề xuất: `microservices`). **Danh mục Pro thật sự sẽ chốt ở mảng C.**

## 5. State & persistence (`IP.store`)
Khoá `localStorage` (prefix `ip_`, giữ tương thích khoá cũ):
| Khoá | Ý nghĩa |
|---|---|
| `ip_lang` | `"vi"\|"en"` (đã có) |
| `ip_theme` | `"light"\|"dark"\|"system"` (mới) |
| `ip_track` | `{role, level}` đã chọn, hoặc `null` (mới) |
| `ip_progress` | tiến độ học theo topic (đã có — tái dùng) |
| `ip_bookmarks` | mảng topic id đã lưu (mới) |
| `ip_streak` | `{count, lastActiveDate, dailyGoal}` (mới) |
| (SRS thẻ, điểm quiz) | giữ nguyên |

- `IP.store` bọc get/set có versioning (`ip_schema_version`) + **migrate** không phá dữ liệu cũ.
- **Reset/đổi lộ trình** = set `ip_track=null` → app hiện onboarding. Không xoá tiến độ/bookmark trừ khi người dùng xác nhận "xoá toàn bộ".

## 6. Onboarding (hướng B — một màn)
- **Kích hoạt khi** `ip_track === null` (lần đầu, hoặc sau reset).
- Một màn: danh sách vai trò; vai trò có `levels` → mở rộng hiện chip cấp bậc trong dòng + nút **Bắt đầu**; vai trò không cấp → nút Bắt đầu trực tiếp; `comingSoon` → disabled + badge "Sắp ra mắt".
- Chọn xong → ghi `ip_track` → vào giao diện học theo track.
- Truy cập lại từ **menu hồ sơ** (topbar) → "Đổi lộ trình".

## 7. Điều hướng & giao diện học theo track
- Giữ bố cục 3 phần (topbar / sidebar / content).
- **Topbar** thêm: nút **đổi theme** (mặt trăng/trời), **menu hồ sơ** (chứa "Đổi lộ trình", "Đã lưu", "Xoá dữ liệu"); giữ modes, search, lang toggle.
- **Sidebar (chế độ track)**: thẻ track (icon + `Role · Level`) + **thanh tiến độ** (`x/N` topic) + link **"Đổi"**; danh sách topic **đánh số theo thứ tự**, topic đã học tick xanh, topic hiện tại tô sáng; badge **PRO**; cuối là **"Tất cả chủ đề →"** (chế độ duyệt tự do = sidebar cũ theo danh mục).
- **Content**: thêm breadcrumb `Role · Level › topic k/N`; nội dung topic giữ nguyên cơ chế render.
- Hành vi "đã học" tái dùng `ip_progress` hiện có; % track = (số topic trong `items` đã học) / `items.length`.

## 8. Theming (light/dark) (`IP.theme`)
- Dùng **CSS custom properties**; `data-theme="light|dark"` trên `<html>`.
- Mặc định **theo `prefers-color-scheme`**; người dùng override → lưu `ip_theme`.
- Toàn bộ màu hiện tại chuyển sang biến; bổ sung bảng màu dark (tham chiếu mockup `track-view.html`).
- Cập nhật `<meta name="theme-color">` theo theme.

## 9. Icon Font Awesome (self-host)
- **Self-host subset** trong `assets/fonts/fontawesome/` (không CDN — môi trường có thể chặn CDN; offline & ổn định hơn). Chỉ kèm các icon thực dùng.
- Lập **bảng map** emoji → FA: brand `fa-bullseye`, Học `fa-book-open`, Thẻ `fa-clone`, Trắc nghiệm `fa-pen-to-square`, search `fa-magnifying-glass`, theme `fa-moon`/`fa-sun`, hồ sơ `fa-circle-user`, vai trò (`fa-code`/`fa-server`/`fa-robot`), callout `fa-lightbulb`, "Tất cả chủ đề" `fa-layer-group`, đổi lộ trình `fa-rotate`, bookmark `fa-bookmark`, streak `fa-fire`.
- Định nghĩa icon trong **data/markup**, không hardcode emoji rải rác.

## 10. i18n (EN/VI) (`IP.i18n`)
- Mọi chuỗi UI **mới** (onboarding, track, badge, dashboard, bookmark, streak, menu) đi qua bảng `STR` + `t()`; **không hardcode**.
- Title/blurb track & tên vai trò/cấp bậc đều `{vi,en}`.
- Đổi ngôn ngữ cập nhật `<html lang>`; lựa chọn đã lưu `ip_lang`.
- Có **fallback**: thiếu `en` → dùng `vi` và ngược lại (không vỡ UI).

## 11. Tính năng phụ (đã chốt)
1. **"Tiếp tục học" + dashboard tiến độ** (`IP.dashboard`): nút nhảy tới topic dở trong track hiện tại; trang/ô tổng quan % hoàn thành theo track (tái dùng `ip_progress`).
2. **Bookmark** (`IP.bookmarks`): nút sao trên mỗi topic; mục "Đã lưu" trong menu hồ sơ; lưu `ip_bookmarks`.
3. **Streak / mục tiêu ngày** (`IP.dashboard` hoặc module riêng): đếm chuỗi ngày học liên tiếp (`fa-fire`), mục tiêu số topic/ngày; cập nhật khi đánh dấu đã học; lưu `ip_streak`.
> Không làm command palette ở A.

## 12. Ranh giới module (isolation)
Mỗi module trả lời được: *làm gì / dùng thế nào / phụ thuộc gì*.
- `IP.store`: **làm gì** đọc/ghi/migrate state; **interface** `get(k,def)/set(k,v)/reset()/clearAll()`; **phụ thuộc** không (chỉ localStorage).
- `IP.i18n`: t() & đổi ngôn ngữ; phụ thuộc `store`.
- `IP.theme`: áp/đổi theme; phụ thuộc `store`.
- `IP.tracks`: **hàm thuần** — `getTrack(role,level)`, `topicsOf(track)`, `progressOf(track)`, `nextTopic(track)`; phụ thuộc `PREP.tracks` + `store` (đọc progress).
- `IP.onboarding`: render màn chọn; phụ thuộc `i18n`, `store`, `PREP.roles`.
- `IP.dashboard`/`IP.bookmarks`: phụ thuộc `store`, `tracks`, `i18n`.
- `IP.render`: render block topic (tách từ app.js); phụ thuộc `i18n`.
- `app.js`: bootstrap & điều phối; phụ thuộc tất cả.

## 13. Edge cases & xử lý lỗi
- `ip_track` trỏ tới role/level **không còn tồn tại** → coi như chưa chọn → onboarding (không crash).
- Track tham chiếu **topic id không tồn tại** → bỏ qua item đó + log cảnh báo dev; UI không vỡ.
- Track rỗng / `comingSoon` → không cho chọn; hiện trạng thái phù hợp.
- Thiếu node `{en}`/`{vi}` → fallback ngôn ngữ còn lại.
- localStorage không dùng được (private mode/đầy) → fallback in-memory, app vẫn chạy (mất lưu trữ, có cảnh báo nhẹ).
- Streak qua mốc nửa đêm/đổi ngày → so sánh theo ngày lịch local; nghỉ >1 ngày → reset count.
- Font Awesome lỗi tải → vẫn hiển thị (text/label), không vỡ layout.

## 14. Chiến lược kiểm thử
- **Logic thuần** (`tracks`, `progressOf`, `nextTopic`, streak, i18n fallback, store migrate) viết dạng **pure function** → **unit test** được; áp dụng **TDD** cho nhóm này (test trước).
- **E2E smoke** bằng Playwright trên site tĩnh (serve thư mục, không cần build): onboarding chọn track → thấy sidebar theo track; toggle theme đổi `data-theme`; toggle ngôn ngữ đổi chuỗi; bookmark thêm/bỏ; badge PRO hiển thị.
- **Checklist thủ công** cho thẩm mỹ (icon/theme/responsive) — kèm trong plan.
- Không phá test/luồng hiện có (3 mode, SRS, quiz).

## 15. Tương thích ngược (migration)
- Người dùng cũ có `ip_lang`/`ip_progress`/SRS/quiz: **giữ nguyên**. `IP.store` thêm khoá mới với mặc định an toàn; `ip_track=null` → họ thấy onboarding một lần.
- Không đổi tên/định dạng khoá cũ. Có `ip_schema_version` để migrate về sau.

## 16. Tiêu chí nghiệm thu (Acceptance)
1. Lần đầu vào → onboarding (hướng B); chọn vai trò+cấp → vào giao diện học theo track; reload giữ lựa chọn.
2. Sidebar hiện track có thứ tự + thanh tiến độ chính xác; "Tất cả chủ đề" duyệt tự do được.
3. SWE có 3 cấp (fresher/junior/senior) + DevOps 1 track; AI Engineer & vai trò khác hiện "Sắp ra mắt" (disabled).
4. "Đổi lộ trình"/reset hoạt động; không mất tiến độ trừ khi xác nhận xoá.
5. Light/dark mode toggle + lưu + mặc định theo hệ thống.
6. Icon là Font Awesome **self-host** (không phụ thuộc CDN); không còn emoji ở chrome UI chính.
7. Toàn bộ UI mới song ngữ EN/VI, đổi ngôn ngữ tức thì, có fallback.
8. Badge "PRO" hiển thị trên topic `tier:"pro"`; nội dung **vẫn mở**.
9. "Tiếp tục học" + dashboard %; Bookmark; Streak hoạt động và bền qua reload.
10. App vẫn **no-build**, deploy GitHub Pages chạy; 3 mode cũ + SRS + quiz không hồi quy.

## 17. Câu hỏi mở
Không còn. (Nội dung track ở 4.3 là đề xuất; người dùng có thể tinh chỉnh trong lúc triển khai mà không đổi kiến trúc.)
