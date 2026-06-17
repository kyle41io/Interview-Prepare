# Phase A — Polish & Learning Tracks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến app ôn phỏng vấn static thành handbook học theo lộ trình cấp bậc, đồng thời nâng cấp icon/theme/i18n — không backend, giữ no-build.

**Architecture:** Mở rộng `window.PREP` (data) và thêm namespace `window.IP` (logic) gom các module nhỏ nạp bằng `<script>`. Logic thuần (store-migrate, i18n-pick, tracks, streak, bookmarks, theme-resolve) viết **dual-export** (browser + Node) để unit-test bằng `node --test`. DOM/CSS kiểm thử bằng checklist thủ công. App vẫn deploy static GitHub Pages.

**Tech Stack:** HTML/CSS/Vanilla JS (no build, no framework), Font Awesome (self-host), `node --test` (built-in Node ≥18) cho unit test, Playwright **không bắt buộc**.

## Global Constraints

- **No build step**: chỉ `<script>`/`<link>`; không bundler/framework. Mọi commit phải để `index.html` mở được trực tiếp.
- **No-dependency tests**: unit test chạy bằng `node --test` (Node ≥18, đã có v20.20.2). Không thêm `package.json`/`node_modules` cho test.
- **Repo scope**: chỉ sửa trong repo `Interview-Prepare/`; nhánh `handbook-phase-a`.
- **Commit theo từng feature** (conventional commits), mỗi task = 1 commit, site luôn chạy được.
- **Song ngữ**: mọi chuỗi UI mới đi qua `IP.i18n` (`{vi,en}`), có fallback; không hardcode chuỗi hiển thị.
- **localStorage prefix** giữ nguyên `ip_`; không đổi tên/format khoá cũ (`ip_lang`, `ip_progress`, `ip_cards`, `ip_quizBest`).
- **Tier ở Phase A chỉ là badge** — nội dung Pro **vẫn mở** (khoá thật ở Phase C).
- **Dual-export module pattern** (dùng cho mọi module logic thuần):
  ```js
  (function (root, factory) {
    const api = factory();
    root.IP = root.IP || {};
    root.IP.<name> = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  })(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";
    /* pure functions here */
    return { /* exported */ };
  });
  ```

> **Scope note (cố ý hoãn):** Spec mục 3.1 liệt kê `render.js`. Plan này **không** tách `render.js` riêng vì không feature nào của Phase A cần (YAGNI); logic render giữ trong `app.js`. Sẽ tách ở Phase B nếu cần. Mọi module khác trong 3.1 đều được tạo.

---

## File Structure

**Tạo mới:**
- `assets/js/store.js` — `IP.store`: get/set localStorage có prefix, defaults, `migrate()` (pure). Khoá mới: `theme`, `track`, `bookmarks`, `streak`, `schemaVersion`.
- `assets/js/i18n.js` — `IP.i18n`: `pick(node,lang)` (pure), `t(node)`, bảng `STR`, đổi ngôn ngữ.
- `assets/js/theme.js` — `IP.theme`: `resolve(pref,prefersDark)` (pure), `apply()`, `toggle()`.
- `assets/js/tracks.js` — `IP.tracks`: `getTrack/resolveItems/progressOf/nextTopic` (pure).
- `assets/js/onboarding.js` — `IP.onboarding`: render màn chọn role→level (DOM).
- `assets/js/bookmarks.js` — `IP.bookmarks`: `toggle/has` (pure) + UI helpers.
- `assets/js/dashboard.js` — `IP.dashboard`: "Tiếp tục học" + % track + streak (DOM + dùng IP.tracks).
- `assets/data/tracks.js` — đăng ký `PREP.roles`, `PREP.levels`, `PREP.tracks` qua `PREP.registerTrack`.
- `assets/fonts/fontawesome/` — Font Awesome self-host (css + webfonts subset).
- `tests/*.test.js` — unit test cho các module thuần.

**Sửa:**
- `index.html` — thêm `<link>` FA, thứ tự `<script>` module mới, script init theme sớm (chống FOUC), thêm nút theme + menu hồ sơ vào topbar.
- `assets/js/app.js` — dùng `IP.store`/`IP.i18n`; thêm chế độ track-aware cho sidebar/nav; render badge PRO; gọi onboarding/dashboard/bookmark.
- `assets/css/styles.css` — biến hoá màu hardcode, thêm palette `[data-theme="light"]`, style cho onboarding/track-card/badge/bookmark/streak.
- `assets/data/microservices.js` — gắn `tier:"pro"` (1 dòng) làm ví dụ badge.

---

## Task 1: `IP.store` + test harness

**Files:**
- Create: `assets/js/store.js`
- Create: `tests/store.test.js`
- Modify: `index.html` (thêm `<script src="assets/js/store.js">` trước `app.js`)
- Modify: `assets/js/app.js:28-39` (thay `LS`/`State` init bằng `IP.store`)

**Interfaces:**
- Produces:
  - `IP.store.migrate(stored)` → object đầy đủ khoá (pure; điền default cho khoá thiếu, giữ giá trị có sẵn).
  - `IP.store.defaults()` → object default.
  - `IP.store.get(key, fallback)` / `IP.store.set(key, value)` — đọc/ghi `localStorage["ip_"+key]` (JSON, an toàn lỗi).
  - `IP.store.reset(key)` — xoá 1 khoá; `IP.store.clearAll()` — xoá mọi khoá `ip_`.
  - Khoá hợp lệ: `lang, theme, track, progress, cards, quizBest, bookmarks, streak, schemaVersion`.

- [ ] **Step 1: Viết test thất bại** — `tests/store.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const store = require("../assets/js/store.js");

test("defaults() has all keys with safe values", () => {
  const d = store.defaults();
  assert.strictEqual(d.lang, "vi");
  assert.strictEqual(d.theme, "system");
  assert.strictEqual(d.track, null);
  assert.deepStrictEqual(d.progress, {});
  assert.deepStrictEqual(d.bookmarks, []);
  assert.deepStrictEqual(d.streak, { count: 0, lastActiveDate: null, dailyGoal: 1 });
  assert.strictEqual(d.schemaVersion, 1);
});

test("migrate() keeps existing values and fills missing", () => {
  const out = store.migrate({ lang: "en", progress: { dsa: true } });
  assert.strictEqual(out.lang, "en");                 // kept
  assert.deepStrictEqual(out.progress, { dsa: true }); // kept
  assert.strictEqual(out.theme, "system");            // filled
  assert.deepStrictEqual(out.bookmarks, []);          // filled
});

test("migrate() does not mutate input", () => {
  const input = { lang: "en" };
  store.migrate(input);
  assert.deepStrictEqual(input, { lang: "en" });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/store.test.js`
Expected: FAIL — `Cannot find module '../assets/js/store.js'`.

- [ ] **Step 3: Viết `assets/js/store.js`**

```js
/* IP.store — localStorage wrapper + pure state migration (no build) */
(function (root, factory) {
  const api = factory();
  root.IP = root.IP || {};
  root.IP.store = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const PREFIX = "ip_";
  const SCHEMA_VERSION = 1;

  function defaults() {
    return {
      lang: "vi",
      theme: "system",
      track: null,
      progress: {},
      cards: {},
      quizBest: {},
      bookmarks: [],
      streak: { count: 0, lastActiveDate: null, dailyGoal: 1 },
      schemaVersion: SCHEMA_VERSION,
    };
  }

  // pure: fill any missing key from defaults without mutating input
  function migrate(stored) {
    const d = defaults();
    const src = stored && typeof stored === "object" ? stored : {};
    const out = {};
    Object.keys(d).forEach((k) => { out[k] = k in src ? src[k] : d[k]; });
    out.schemaVersion = SCHEMA_VERSION;
    return out;
  }

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  }
  function reset(key) { try { localStorage.removeItem(PREFIX + key); } catch {} }
  function clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.indexOf(PREFIX) === 0)
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  return { defaults, migrate, get, set, reset, clearAll, PREFIX, SCHEMA_VERSION };
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/store.test.js`
Expected: PASS (3 test).

- [ ] **Step 5: Nạp module trong `index.html`** — thêm ngay trước dòng `<script src="assets/js/app.js"></script>` (hiện ở dòng 68):

```html
<!-- ===== IP modules (logic) ===== -->
<script src="assets/js/store.js"></script>

<!-- ===== App ===== -->
<script src="assets/js/app.js"></script>
```

- [ ] **Step 6: Rewire `app.js` dùng `IP.store`** — thay nguyên khối `assets/js/app.js:28-39`:

```js
  /* ---------- State (backed by IP.store) ---------- */
  const LS = { get: (k, d) => IP.store.get(k, d), set: (k, v) => IP.store.set(k, v) };
  const State = {
    lang: LS.get("lang", "vi"),
    mode: "learn",            // learn | cards | quiz
    topic: null,              // current topic id (learn mode)
    progress: LS.get("progress", {}),
    cards: LS.get("cards", {}),
    quizBest: LS.get("quizBest", {}),
  };
```

- [ ] **Step 7: Kiểm tra thủ công (no regression)**

Mở `index.html` trong trình duyệt. Expected: app hoạt động y như trước (3 mode, đánh dấu đã học, thẻ, quiz). Mở DevTools Console: không lỗi. `IP.store.get("lang","vi")` trả về ngôn ngữ hiện tại.

- [ ] **Step 8: Commit**

```bash
git add assets/js/store.js tests/store.test.js index.html assets/js/app.js
git commit -m "refactor: extract IP.store + add node --test harness"
```

---

## Task 2: `IP.i18n` (pick + fallback + STR registry)

**Files:**
- Create: `assets/js/i18n.js`
- Create: `tests/i18n.test.js`
- Modify: `index.html` (nạp `i18n.js` sau `store.js`)
- Modify: `assets/js/app.js:41-70` (dùng `IP.i18n.pick`; chuyển `UI` → `IP.i18n.STR`)

**Interfaces:**
- Consumes: `IP.store`.
- Produces:
  - `IP.i18n.pick(node, lang)` → string (pure). `node` là string hoặc `{vi,en}`. Fallback: `node[lang] ?? node.en ?? node.vi ?? ""`.
  - `IP.i18n.t(node)` → dùng ngôn ngữ hiện tại (`IP.store.get("lang","vi")`).
  - `IP.i18n.STR` → object các chuỗi UI dạng `{vi,en}` (mở rộng dần qua các task).

- [ ] **Step 1: Viết test thất bại** — `tests/i18n.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const i18n = require("../assets/js/i18n.js");

test("pick returns string node as-is", () => {
  assert.strictEqual(i18n.pick("hello", "vi"), "hello");
});
test("pick returns requested language", () => {
  assert.strictEqual(i18n.pick({ vi: "Xin chào", en: "Hello" }, "en"), "Hello");
});
test("pick falls back en->vi when lang missing", () => {
  assert.strictEqual(i18n.pick({ vi: "Chỉ VI" }, "en"), "Chỉ VI");
});
test("pick falls back vi->en when lang missing", () => {
  assert.strictEqual(i18n.pick({ en: "Only EN" }, "vi"), "Only EN");
});
test("pick handles null/undefined", () => {
  assert.strictEqual(i18n.pick(null, "vi"), "");
  assert.strictEqual(i18n.pick(undefined, "en"), "");
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/i18n.test.js`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `assets/js/i18n.js`**

```js
/* IP.i18n — bilingual picker + UI string registry */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.i18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  // pure: choose a language string with fallback
  function pick(node, lang) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    if (node[lang] != null) return node[lang];
    if (node.en != null) return node.en;
    if (node.vi != null) return node.vi;
    return "";
  }

  function currentLang() {
    try { return (root.IP && root.IP.store) ? root.IP.store.get("lang", "vi") : "vi"; }
    catch { return "vi"; }
  }
  function t(node) { return pick(node, currentLang()); }

  // UI strings (extended by later tasks). vi/en pairs only.
  const STR = {
    learn: { vi: "Học", en: "Learn" },
    cards: { vi: "Thẻ ghi nhớ", en: "Flashcards" },
    quiz: { vi: "Trắc nghiệm", en: "Quiz" },
    search: { vi: "Tìm kiếm…", en: "Search…" },
  };

  return { pick, t, STR };
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/i18n.test.js`
Expected: PASS (5 test).

- [ ] **Step 5: Nạp trong `index.html`** (sau `store.js`):

```html
<script src="assets/js/store.js"></script>
<script src="assets/js/i18n.js"></script>
```

- [ ] **Step 6: Rewire `app.js`** — thay hàm `t` (dòng 43-47) bằng delegate, và đổi `const UI = {...}` (dòng 48-70) thành tham chiếu `IP.i18n.STR` mở rộng:

Thay dòng 43-47:
```js
  function t(node) { return IP.i18n.pick(node, State.lang); }
```
Thay dòng 48 (`const UI = {`) — giữ nguyên nội dung object nhưng gán vào STR để dùng chung:
```js
  const UI = Object.assign(IP.i18n.STR, {
    markLearned: { vi: "✓ Đánh dấu đã học", en: "✓ Mark as learned" },
    markedLearned: { vi: "✓ Đã học (bấm để bỏ)", en: "✓ Learned (click to undo)" },
    next: { vi: "Tiếp theo →", en: "Next →" },
    prev: { vi: "← Trước", en: "← Previous" },
    flip: { vi: "Bấm để lật / phím cách", en: "Click to flip / Space" },
    again: { vi: "Lại", en: "Again" }, hard: { vi: "Khó", en: "Hard" },
    good: { vi: "Được", en: "Good" }, easy: { vi: "Dễ", en: "Easy" },
    allTopics: { vi: "Tất cả chủ đề", en: "All topics" },
    due: { vi: "thẻ cần ôn", en: "cards due" },
    startQuiz: { vi: "Bắt đầu", en: "Start" },
    submit: { vi: "Kiểm tra", en: "Check" },
    finish: { vi: "Xem kết quả", en: "See result" },
    retry: { vi: "Làm lại", en: "Retry" },
    noCards: { vi: "Tuyệt vời! Không còn thẻ nào cần ôn lúc này.", en: "All done! No cards due right now." },
    studyAgain: { vi: "Ôn lại tất cả", en: "Study all again" },
    cheatTitle: { vi: "🎯 Cheat sheet ngày phỏng vấn", en: "🎯 Interview-day cheat sheet" },
    cheatSub: { vi: "Những câu nói \"ăn điểm\" — đọc lướt 5 phút trước khi vào phỏng vấn.", en: "Soundbites to skim 5 minutes before you walk in." },
  });
```
> Lưu ý: `learn/cards/quiz/search` giờ nằm trong `IP.i18n.STR`, `Object.assign` gộp phần còn lại — `UI.learn` v.v. vẫn dùng được như cũ.

- [ ] **Step 7: Kiểm tra thủ công**

Mở `index.html`. Expected: đổi ngôn ngữ VI/EN vẫn hoạt động; mọi nhãn hiển thị đúng; Console không lỗi.

- [ ] **Step 8: Commit**

```bash
git add assets/js/i18n.js tests/i18n.test.js index.html assets/js/app.js
git commit -m "refactor: extract IP.i18n with bilingual fallback"
```

---

## Task 3: Self-hosted Font Awesome + emoji→icon map

**Files:**
- Create: `assets/fonts/fontawesome/css/all.min.css` + `assets/fonts/fontawesome/webfonts/*` (tải subset Free)
- Modify: `index.html` (thêm `<link>` FA trong `<head>`; đổi icon emoji ở topbar markup)
- Modify: `assets/js/app.js` (bảng `ICON` + thay emoji ở các chỗ render chính)
- Modify: `assets/css/styles.css` (canh chỉnh icon FA nếu cần)

**Interfaces:**
- Produces: `const ICON = { ... }` trong app.js — map khoá ngữ nghĩa → class FA (vd `ICON.learn = "fa-solid fa-book-open"`).

- [ ] **Step 1: Tải Font Awesome Free (self-host)**

Run (từ thư mục repo):
```bash
cd assets/fonts
curl -L -o fa.zip https://use.fontawesome.com/releases/v6.5.1/fontawesome-free-6.5.1-web.zip
unzip -q fa.zip && mv fontawesome-free-6.5.1-web fontawesome && rm fa.zip
ls fontawesome/css/all.min.css fontawesome/webfonts | head
cd ../..
```
Expected: thấy `fontawesome/css/all.min.css` và các file `.woff2` trong `webfonts/`.
> Nếu môi trường chặn mạng: tải thủ công bản "Free for Web" v6.5.1 từ fontawesome.com, giải nén, đặt vào `assets/fonts/fontawesome/` sao cho có `css/all.min.css` + `webfonts/`.

- [ ] **Step 2: Nhúng FA trong `<head>` của `index.html`** — thêm trên dòng `<link rel="stylesheet" href="assets/css/styles.css">`:

```html
<link rel="stylesheet" href="assets/fonts/fontawesome/css/all.min.css">
<link rel="stylesheet" href="assets/css/styles.css">
```

- [ ] **Step 3: Thêm bảng `ICON` vào `app.js`** — ngay sau khối `CATS` (sau dòng 25):

```js
  /* ---------- Icon map (Font Awesome classes) ---------- */
  const ICON = {
    brand: "fa-solid fa-bullseye",
    home: "fa-solid fa-house",
    learn: "fa-solid fa-book-open",
    cards: "fa-regular fa-clone",
    quiz: "fa-solid fa-pen-to-square",
    search: "fa-solid fa-magnifying-glass",
    menu: "fa-solid fa-bars",
    check: "fa-solid fa-check",
    allTopics: "fa-solid fa-layer-group",
    change: "fa-solid fa-rotate",
    profile: "fa-solid fa-circle-user",
    themeDark: "fa-solid fa-moon",
    themeLight: "fa-solid fa-sun",
    bookmark: "fa-solid fa-bookmark",
    bookmarkO: "fa-regular fa-bookmark",
    streak: "fa-solid fa-fire",
    pro: "fa-solid fa-crown",
    cardsCount: "fa-regular fa-clone",
    quizCount: "fa-solid fa-pen-to-square",
    // categories
    foundations: "fa-solid fa-brain", architecture: "fa-solid fa-sitemap",
    api: "fa-solid fa-plug", data: "fa-solid fa-database",
    frontend: "fa-solid fa-palette", backend: "fa-solid fa-gears",
    devops: "fa-solid fa-cloud", project: "fa-solid fa-briefcase",
    behavioral: "fa-solid fa-comments",
    // roles
    swe: "fa-solid fa-code", "ai-engineer": "fa-solid fa-robot",
  };
  function fa(cls) { return `<i class="${cls}"></i>`; }
```

- [ ] **Step 4: Đổi icon emoji ở topbar markup** — trong `index.html`, thay khối `.topbar` modes/brand/search (dòng 14-29):

```html
  <button class="icon-btn menu-btn" id="menuBtn"><i class="fa-solid fa-bars"></i></button>
  <div class="brand" id="brand" style="cursor:pointer">
    <span class="logo"><i class="fa-solid fa-bullseye"></i></span>
    <span class="grad">Interview Prep</span>
  </div>
  <div class="modes">
    <button data-mode="learn" class="active"><i class="fa-solid fa-book-open"></i> <span>Học</span></button>
    <button data-mode="cards"><i class="fa-regular fa-clone"></i> <span>Thẻ ghi nhớ</span></button>
    <button data-mode="quiz"><i class="fa-solid fa-pen-to-square"></i> <span>Trắc nghiệm</span></button>
  </div>
  <div class="spacer"></div>
  <div class="search-box">
    <span class="si"><i class="fa-solid fa-magnifying-glass"></i></span>
    <input id="search" type="text" placeholder="Tìm kiếm…" autocomplete="off">
    <kbd>/</kbd>
  </div>
```

- [ ] **Step 5: Đổi icon trong render chính của `app.js`**

(a) `renderSidebar` (dòng 364-374): đổi `🏠` → `fa(ICON.home)`, `cat.icon` → `fa(ICON[cat.id] || "")`, `tp.icon || "📘"` → `fa(catIcon(tp))`, `✓` (ni-check) → `fa(ICON.check)`. Thêm helper:
```js
  function catIcon(tp) { return ICON[tp.category] || "fa-solid fa-book"; }
```
Sửa từng dòng:
```js
    let html = `<div class="nav-item ${State.mode === "learn" && !State.topic ? "active" : ""}" data-home="1">
      <span class="ni-icon">${fa(ICON.home)}</span><span class="ni-label">${State.lang === "vi" ? "Trang chủ" : "Home"}</span></div>`;
    CATS.forEach(cat => {
      const topics = PREP.order.filter(id => PREP.topics[id].category === cat.id);
      if (!topics.length) return;
      html += `<div class="cat"><div class="cat-label">${fa(ICON[cat.id] || "")} ${t(cat)}</div>`;
      topics.forEach(id => {
        const tp = PREP.topics[id];
        const active = State.mode === "learn" && State.topic === id;
        html += `<div class="nav-item ${active ? "active" : ""} ${State.progress[id] ? "done" : ""}" data-topic="${id}">
          <span class="ni-icon">${fa(catIcon(tp))}</span><span class="ni-label">${t(tp.title)}</span><span class="ni-check">${fa(ICON.check)}</span></div>`;
      });
      html += `</div>`;
    });
```
(b) Home cards (dòng 169-174): `tp.icon || "📘"` → `fa(catIcon(tp))`; `✓` (tc-done) → `fa(ICON.check)`; `📇`/`✍️` meta → `fa(ICON.cardsCount)` / `fa(ICON.quizCount)`.
(c) `renderTopic` head (dòng 138): `${topic.icon || "📘"}` → `${fa(catIcon(topic))}`.

> Giữ emoji trong **nội dung bài học/callout** (các file data) — chỉ đổi icon ở "chrome" UI. `cheatTitle` STR vẫn giữ 🎯 (nội dung, không bắt buộc đổi).

- [ ] **Step 6: Kiểm tra thủ công (checklist)**

Mở `index.html`. Expected:
- [ ] Topbar: menu, logo bullseye, 3 mode, kính lúp = icon FA nét (không phải ô vuông tofu).
- [ ] Sidebar: Home + icon danh mục + tick = icon FA.
- [ ] Home cards & tiêu đề topic: icon FA.
- [ ] Tắt mạng rồi reload → icon vẫn hiển thị (self-host hoạt động).
- [ ] Console không lỗi 404 cho FA.

- [ ] **Step 7: Commit**

```bash
git add assets/fonts/fontawesome index.html assets/js/app.js assets/css/styles.css
git commit -m "feat: self-hosted Font Awesome + emoji->icon map for UI chrome"
```

---

## Task 4: Light/Dark theme

**Files:**
- Create: `assets/js/theme.js`
- Create: `tests/theme.test.js`
- Modify: `index.html` (nạp `theme.js`; script init theme sớm; nút theme ở topbar)
- Modify: `assets/css/styles.css` (palette light + biến hoá màu hardcode)
- Modify: `assets/js/app.js` (bind nút theme)

**Interfaces:**
- Consumes: `IP.store`.
- Produces:
  - `IP.theme.resolve(pref, prefersDark)` → `"light"|"dark"` (pure). `pref ∈ {light,dark,system}`.
  - `IP.theme.apply()` → đặt `document.documentElement.dataset.theme` theo `ip_theme` + media query; cập nhật `<meta name="theme-color">`.
  - `IP.theme.toggle()` → vòng `system→light→dark→system`? Không — chỉ `light↔dark`: nếu đang dark→set "light", ngược lại→"dark"; lưu `ip_theme`; gọi `apply()`; trả pref mới.
  - `IP.theme.current()` → theme đang hiển thị (`"light"|"dark"`).

- [ ] **Step 1: Viết test thất bại** — `tests/theme.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const theme = require("../assets/js/theme.js");

test("resolve honors explicit light/dark", () => {
  assert.strictEqual(theme.resolve("light", true), "light");
  assert.strictEqual(theme.resolve("dark", false), "dark");
});
test("resolve('system') follows prefersDark", () => {
  assert.strictEqual(theme.resolve("system", true), "dark");
  assert.strictEqual(theme.resolve("system", false), "light");
});
test("resolve defaults unknown pref to system behavior", () => {
  assert.strictEqual(theme.resolve(undefined, true), "dark");
  assert.strictEqual(theme.resolve("weird", false), "light");
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/theme.test.js`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `assets/js/theme.js`**

```js
/* IP.theme — light/dark with system default */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.theme = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  const META = { dark: "#0d1117", light: "#f4f5f8" };

  // pure
  function resolve(pref, prefersDark) {
    if (pref === "light" || pref === "dark") return pref;
    return prefersDark ? "dark" : "light"; // pref === "system" or unknown
  }

  function prefersDark() {
    try { return root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches; }
    catch { return true; }
  }
  function pref() {
    try { return (root.IP && root.IP.store) ? root.IP.store.get("theme", "system") : "system"; }
    catch { return "system"; }
  }
  function current() { return resolve(pref(), prefersDark()); }

  function apply() {
    const eff = current();
    if (root.document) {
      root.document.documentElement.dataset.theme = eff;
      const m = root.document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", META[eff]);
    }
    return eff;
  }
  function toggle() {
    const next = current() === "dark" ? "light" : "dark";
    if (root.IP && root.IP.store) root.IP.store.set("theme", next);
    apply();
    return next;
  }
  return { resolve, apply, toggle, current, pref };
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/theme.test.js`
Expected: PASS (3 test).

- [ ] **Step 5: CSS — thêm palette light + biến hoá màu hardcode** trong `assets/css/styles.css`

(a) Sau khối `:root{…}` (kết thúc dòng 28) thêm palette sáng + meta:
```css
/* default :root above = DARK palette. data-theme makes it explicit. */
html[data-theme="light"]{
  --bg:#f4f5f8; --bg2:#eceef3; --panel:#ffffff; --panel2:#f3f5f9; --panel3:#e9edf3;
  --line:#e1e5ec; --line2:#d3d9e3; --txt:#1f2430; --muted:#5b6472; --muted2:#7c8694;
  --accent:#4f46e5; --accent-d:#4338ca; --green:#0f9d58; --orange:#d97706;
  --purple:#7c3aed; --pink:#db2777; --yellow:#b45309; --red:#dc2626; --cyan:#0891b2;
  --shadow:0 10px 30px #1f243018;
}
```
(b) Biến hoá màu hardcode trong `body` (dòng 31-40): thay khối `background:` gradient + giữ `var(--bg)`:
```css
body{
  font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;
  background:var(--bg);
  color:var(--txt);
  line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
html[data-theme="dark"] body{
  background:
    radial-gradient(1100px 700px at 88% -12%, #1b2a4a44, transparent),
    radial-gradient(900px 700px at -10% 8%, #3b1b4a33, transparent),
    var(--bg);
}
```
(c) `.topbar` (dòng 56-60) `background:#0d1117e6` → dùng biến với độ mờ; thay bằng:
```css
  background:color-mix(in srgb, var(--panel) 90%, transparent);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--line);
```
(d) Scrollbar (dòng 49-50): thay `#2d3748`/`#3d4a5e` → `var(--line)` / `var(--line2)`.
> Quét thêm các hex hardcode còn lại trong file (vd `#0d1117`, `#58a6ff…`) ở các selector lớn và thay bằng biến tương ứng khi gặp trong lúc test mục Step 8.

- [ ] **Step 6: Init theme sớm (chống FOUC) + meta** trong `index.html`

Trong `<head>` thêm `<meta name="theme-color">` và một inline script **ngay sau** khi nạp `store.js`+`theme.js` là không kịp (chúng ở cuối body). Vì vậy đặt inline init tối thiểu trong `<head>` (không phụ thuộc module):
```html
<meta name="theme-color" content="#0d1117">
<script>
  (function(){
    try{
      var p = JSON.parse(localStorage.getItem("ip_theme")) || "system";
      var dark = (p==="dark") || (p!=="light" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    }catch(e){ document.documentElement.dataset.theme = "dark"; }
  })();
</script>
```
Và nạp `theme.js` cùng nhóm module (sau `i18n.js`):
```html
<script src="assets/js/store.js"></script>
<script src="assets/js/i18n.js"></script>
<script src="assets/js/theme.js"></script>
```

- [ ] **Step 7: Nút theme ở topbar + bind** 

(a) `index.html` — thêm nút trước `.lang-toggle` (dòng 30):
```html
  <button class="icon-btn" id="themeBtn" title="Theme"><i class="fa-solid fa-moon"></i></button>
  <div class="lang-toggle">
```
(b) `app.js` `bind()` — thêm trong hàm (sau dòng 455 `document.getElementById("brand").onclick = goHome;`):
```js
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.onclick = () => {
      IP.theme.toggle();
      themeBtn.firstElementChild.className = IP.theme.current() === "dark" ? ICON.themeDark : ICON.themeLight;
    };
```
(c) `app.js` boot (sau dòng 559 `syncStaticText();`): đồng bộ icon nút theme:
```js
    IP.theme.apply();
    const tb = document.getElementById("themeBtn");
    if (tb) tb.firstElementChild.className = IP.theme.current() === "dark" ? ICON.themeDark : ICON.themeLight;
```

- [ ] **Step 8: Kiểm tra thủ công (checklist)**

Mở `index.html`. Expected:
- [ ] Bấm nút theme → toàn app đổi sáng/tối tức thì; icon đổi moon/sun.
- [ ] Reload → giữ theme đã chọn.
- [ ] Xoá `ip_theme` (DevTools) + đổi OS sang light → app mở ở light (theo hệ thống).
- [ ] Không có "nháy" theme khi load (FOUC) nhờ inline init.
- [ ] Cả 2 theme: chữ đọc rõ, không vùng nào còn nền tối lạc lõng trong light mode (sửa hex sót nếu thấy).

- [ ] **Step 9: Commit**

```bash
git add assets/js/theme.js tests/theme.test.js index.html assets/css/styles.css assets/js/app.js
git commit -m "feat: light/dark theme with system default + persistence"
```

---

## Task 5: Tracks data model + `IP.tracks` + PRO badge

**Files:**
- Create: `assets/js/tracks.js` (logic, pure)
- Create: `assets/data/tracks.js` (data: roles/levels/tracks)
- Create: `tests/tracks.test.js`
- Modify: `index.html` (nạp `assets/js/tracks.js` trong nhóm module; `assets/data/tracks.js` sau các data khác)
- Modify: `assets/js/app.js` (mở rộng `PREP` với `roles/levels/tracks/registerTrack`; render badge PRO)
- Modify: `assets/data/microservices.js` (thêm `tier:"pro"`)

**Interfaces:**
- Consumes: `PREP` (data), `IP.store` (progress).
- Produces:
  - `PREP.roles` (array), `PREP.levels` (object), `PREP.tracks` (array), `PREP.registerTrack(track)`.
  - `IP.tracks.getTrack(role, level, tracks)` → track | null.
  - `IP.tracks.resolveItems(track, validIds)` → string[] (topic ids hợp lệ, đúng thứ tự).
  - `IP.tracks.progressOf(track, progressMap, validIds)` → `{done,total,pct}`.
  - `IP.tracks.nextTopic(track, progressMap, validIds)` → topic id | null.

- [ ] **Step 1: Viết test thất bại** — `tests/tracks.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const tracks = require("../assets/js/tracks.js");

const T = [
  { id: "swe-junior", role: "swe", level: "junior", items: ["dsa", "databases", "ghost", "system-design"] },
  { id: "devops", role: "devops", level: "", items: ["docker-k8s", "cicd"] },
];
const VALID = ["dsa", "databases", "system-design", "docker-k8s", "cicd"]; // 'ghost' missing

test("getTrack matches role+level", () => {
  assert.strictEqual(tracks.getTrack("swe", "junior", T).id, "swe-junior");
  assert.strictEqual(tracks.getTrack("devops", "", T).id, "devops");
  assert.strictEqual(tracks.getTrack("swe", "senior", T), null);
});
test("resolveItems drops unknown ids, keeps order", () => {
  assert.deepStrictEqual(
    tracks.resolveItems(T[0], VALID),
    ["dsa", "databases", "system-design"]
  );
});
test("progressOf computes done/total/pct over resolved items", () => {
  const p = tracks.progressOf(T[0], { dsa: true, databases: true }, VALID);
  assert.deepStrictEqual(p, { done: 2, total: 3, pct: 67 });
});
test("nextTopic returns first unlearned, else last", () => {
  assert.strictEqual(tracks.nextTopic(T[0], { dsa: true }, VALID), "databases");
  assert.strictEqual(tracks.nextTopic(T[0], { dsa: true, databases: true, "system-design": true }, VALID), "system-design");
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/tracks.test.js`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `assets/js/tracks.js`**

```js
/* IP.tracks — pure track resolution & progress */
(function (root, factory) {
  const api = factory();
  root.IP = root.IP || {};
  root.IP.tracks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function getTrack(role, level, tracks) {
    const lv = level || "";
    return (tracks || []).find((t) => t.role === role && (t.level || "") === lv) || null;
  }
  function resolveItems(track, validIds) {
    const items = (track && track.items) || [];
    if (!validIds) return items.slice();
    const set = Array.isArray(validIds) ? new Set(validIds) : validIds;
    return items.filter((id) => set.has(id));
  }
  function progressOf(track, progressMap, validIds) {
    const items = resolveItems(track, validIds);
    const total = items.length;
    const done = items.filter((id) => progressMap && progressMap[id]).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function nextTopic(track, progressMap, validIds) {
    const items = resolveItems(track, validIds);
    for (const id of items) { if (!progressMap || !progressMap[id]) return id; }
    return items.length ? items[items.length - 1] : null;
  }
  return { getTrack, resolveItems, progressOf, nextTopic };
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/tracks.test.js`
Expected: PASS (4 test).

- [ ] **Step 5: Mở rộng `PREP` trong `app.js`** — sau khối `PREP.register` (dòng 12), thêm:

```js
  PREP.roles = [];
  PREP.levels = {};
  PREP.tracks = [];
  PREP.registerTrack = function (track) { PREP.tracks.push(track); };
```
> Vì `index.html` chạy `app.js` SAU các file data, mà data/tracks.js cần `PREP.registerTrack` lúc nạp — nên phải khai báo `roles/levels/tracks/registerTrack` trong **bootstrap inline** ở `index.html` (nơi đã định nghĩa `window.PREP`), KHÔNG trong app.js. Sửa lại: trong `index.html` dòng 46 mở rộng bootstrap:
```html
<script>
  window.PREP = { topics:{}, order:[], roles:[], levels:{}, tracks:[],
    register(t){ if(!this.topics[t.id]) this.order.push(t.id); this.topics[t.id]=t; },
    registerTrack(t){ this.tracks.push(t); } };
</script>
```
Và **bỏ** đoạn `PREP.roles=[]…registerTrack` khỏi app.js (app.js chỉ dùng, không khởi tạo). App.js dòng 9-12 giữ `PREP.register` gốc (an toàn, không ghi đè vì đã có).

- [ ] **Step 6: Viết `assets/data/tracks.js`**

```js
/* Roles, levels & learning tracks (Phase A) */
PREP.roles = [
  { id: "swe", icon: "fa-solid fa-code", title: { vi: "Software Engineer", en: "Software Engineer" }, levels: ["fresher", "junior", "senior"] },
  { id: "devops", icon: "fa-solid fa-server", title: { vi: "DevOps", en: "DevOps" }, levels: [] },
  { id: "ai-engineer", icon: "fa-solid fa-robot", title: { vi: "AI Engineer", en: "AI Engineer" }, levels: [], comingSoon: true },
];
PREP.levels = {
  fresher: { vi: "Fresher", en: "Fresher" },
  junior: { vi: "Junior", en: "Junior" },
  senior: { vi: "Senior", en: "Senior" },
};
[
  { id: "swe-fresher", role: "swe", level: "fresher",
    title: { vi: "SWE · Fresher", en: "SWE · Fresher" },
    blurb: { vi: "Nền tảng cốt lõi cho vòng phỏng vấn đầu tiên.", en: "Core fundamentals for your first interviews." },
    items: ["dsa", "databases", "rest-grpc", "design-patterns", "behavioral"] },
  { id: "swe-junior", role: "swe", level: "junior",
    title: { vi: "SWE · Junior", en: "SWE · Junior" },
    blurb: { vi: "Mở rộng sang framework và thiết kế hệ thống cơ bản.", en: "Add frameworks and intro system design." },
    items: ["dsa", "databases", "rest-grpc", "design-patterns", "react", "redux", "system-design", "behavioral"] },
  { id: "swe-senior", role: "swe", level: "senior",
    title: { vi: "SWE · Senior", en: "SWE · Senior" },
    blurb: { vi: "Tập trung kiến trúc, hệ thống lớn và dự án thực tế.", en: "Architecture-heavy, large systems and real projects." },
    items: ["system-design", "microservices", "design-patterns", "databases", "docker-k8s", "aws", "owork", "behavioral"] },
  { id: "devops", role: "devops", level: "",
    title: { vi: "DevOps", en: "DevOps" },
    blurb: { vi: "Container, CI/CD, cloud và vận hành hệ thống.", en: "Containers, CI/CD, cloud and operations." },
    items: ["docker-k8s", "cicd", "aws", "system-design", "databases", "behavioral"] },
  { id: "ai-engineer", role: "ai-engineer", level: "",
    title: { vi: "AI Engineer", en: "AI Engineer" },
    blurb: { vi: "Đang xây dựng nội dung.", en: "Content in progress." },
    items: [], comingSoon: true },
].forEach((trk) => PREP.registerTrack(trk));
```

- [ ] **Step 7: Nạp trong `index.html`**

Nhóm module logic (sau `theme.js`):
```html
<script src="assets/js/tracks.js"></script>
```
Data tracks (sau dòng `<script src="assets/data/behavioral.js"></script>`, dòng 65):
```html
<script src="assets/data/tracks.js"></script>
```

- [ ] **Step 8: Gắn `tier:"pro"` ví dụ** — `assets/data/microservices.js`, trong object `PREP.register({ id:"microservices", … })` thêm dòng (sau `category:`):
```js
  tier: "pro",
```

- [ ] **Step 9: Render badge PRO** — `app.js`

(a) helper sau `fa()` (Task 3):
```js
  function proBadge(tp) { return tp && tp.tier === "pro" ? `<span class="pro-badge">${fa(ICON.pro)} PRO</span>` : ""; }
```
(b) sidebar nav-item (renderSidebar): thêm `${proBadge(tp)}` trước `</div>` của ni-label dòng (Task 3 đã sửa): chèn sau `<span class="ni-label">…</span>`:
```js
          <span class="ni-icon">${fa(catIcon(tp))}</span><span class="ni-label">${t(tp.title)}</span>${proBadge(tp)}<span class="ni-check">${fa(ICON.check)}</span></div>`;
```
(c) home card (renderHome dòng 172): sau `<h3>${t(tp.title)}</h3>` thêm `${proBadge(tp)}`.
(d) topic head (renderTopic dòng 138): sau `<h1>…</h1>` thêm `${proBadge(topic)}`.

(e) CSS `assets/css/styles.css` (cuối file):
```css
.pro-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;
  color:#7a4d00;background:linear-gradient(90deg,#fde68a,#fbbf24);
  padding:1px 7px;border-radius:99px;margin-left:6px;letter-spacing:.03em}
html[data-theme="dark"] .pro-badge{color:#fde68a;background:#5a3d05}
```

- [ ] **Step 10: Kiểm tra thủ công (checklist)**

Mở `index.html`. Expected:
- [ ] Console: `PREP.tracks.length === 5`, `PREP.roles.length === 3`.
- [ ] Topic **Microservices** có badge **PRO** ở sidebar/home/tiêu đề; vẫn **mở** đọc bình thường.
- [ ] App không hồi quy (mode cũ chạy ổn).

- [ ] **Step 11: Commit**

```bash
git add assets/js/tracks.js assets/data/tracks.js tests/tracks.test.js index.html assets/js/app.js assets/data/microservices.js assets/css/styles.css
git commit -m "feat: tracks data model + IP.tracks + PRO badge"
```

---

## Task 6: Onboarding (single-screen role → level)

**Files:**
- Create: `assets/js/onboarding.js` (`IP.onboarding`)
- Modify: `index.html` (nạp `onboarding.js`)
- Modify: `assets/js/app.js` (gọi onboarding khi `ip_track` null; ghi `ip_track`)
- Modify: `assets/css/styles.css` (style onboarding — hướng B)

**Interfaces:**
- Consumes: `PREP.roles`, `PREP.levels`, `IP.i18n.t`, `IP.store`, hằng `ICON`.
- Produces:
  - `IP.onboarding.shouldShow()` → bool (`IP.store.get("track",null)` falsy).
  - `IP.onboarding.render({t, fa, ICON})` → HTML string màn chọn (hướng B: danh sách role, role có level mở chip inline).
  - `IP.onboarding.pickRole(roleId)` / state nội bộ cho role đang mở.
  - Phát sự kiện chọn xong qua callback: `IP.onboarding.onPick(cb)` với `cb({role, level})`.

- [ ] **Step 1: Viết `assets/js/onboarding.js`**

```js
/* IP.onboarding — single-screen role->level picker (Phase A, direction B) */
(function (root, factory) {
  const api = factory();
  root.IP = root.IP || {};
  root.IP.onboarding = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  let _expanded = null;     // role id currently expanded
  let _level = {};          // {roleId: levelId} selected chip
  let _cb = null;

  function onPick(cb) { _cb = cb; }

  function render(ctx) {
    const { t, fa } = ctx;
    const L = (root.IP && root.IP.store) ? root.IP.store.get("lang", "vi") : "vi";
    const roles = (root.PREP && root.PREP.roles) || [];
    const levels = (root.PREP && root.PREP.levels) || {};
    const rows = roles.map((r) => {
      const soon = !!r.comingSoon;
      const hasLevels = (r.levels || []).length > 0;
      const expanded = _expanded === r.id && !soon;
      const chips = hasLevels ? `<div class="ob-chips">${r.levels.map((lv) =>
        `<button class="ob-chip ${_level[r.id] === lv ? "on" : ""}" data-ob-level="${lv}" data-ob-role="${r.id}">${t(levels[lv])}</button>`
      ).join("")}<button class="ob-go" data-ob-start="${r.id}">${L === "vi" ? "Bắt đầu" : "Start"}</button></div>` : "";
      return `<div class="ob-row ${expanded ? "exp" : ""} ${soon ? "soon" : ""}" ${soon ? "" : `data-ob-role-row="${r.id}"`}>
        <span class="ob-ic">${fa(r.icon)}</span>
        <span class="ob-grow"><span class="ob-rt">${t(r.title)}</span>
          <span class="ob-rd">${soon ? (L === "vi" ? "Đang xây dựng nội dung" : "Content in progress")
            : hasLevels ? (L === "vi" ? "Chọn cấp bậc của bạn" : "Choose your level")
            : (L === "vi" ? "Một lộ trình" : "Single track")}</span></span>
        ${soon ? `<span class="ob-soon">${L === "vi" ? "Sắp ra mắt" : "Coming soon"}</span>`
          : hasLevels ? "" : `<button class="ob-go" data-ob-start="${r.id}">${L === "vi" ? "Bắt đầu" : "Start"}</button>`}
        ${expanded ? chips : ""}
      </div>`;
    }).join("");
    return `<div class="ob-wrap fade-in">
      <div class="ob-brand">${fa("fa-solid fa-bullseye")} <span class="grad">Interview Prep</span></div>
      <h1 class="ob-h">${L === "vi" ? "Chọn lộ trình của bạn" : "Choose your path"}</h1>
      <p class="ob-sub">${L === "vi" ? "Mở rộng vai trò để chọn cấp bậc — có thể đổi lại sau." : "Expand a role to choose a level — you can change later."}</p>
      ${rows}
    </div>`;
  }

  // Event handling (delegated). Returns true if it handled the event.
  function handleClick(target) {
    const roleRow = target.closest("[data-ob-role-row]");
    const chip = target.closest("[data-ob-level]");
    const start = target.closest("[data-ob-start]");
    if (start) {
      const role = start.dataset.obStart;
      const r = (root.PREP.roles || []).find((x) => x.id === role);
      const hasLevels = r && (r.levels || []).length > 0;
      const level = hasLevels ? (_level[role] || r.levels[0]) : "";
      if (_cb) _cb({ role, level });
      return true;
    }
    if (chip) { _level[chip.dataset.obRole] = chip.dataset.obLevel; return "rerender"; }
    if (roleRow) { _expanded = (_expanded === roleRow.dataset.obRoleRow) ? null : roleRow.dataset.obRoleRow; return "rerender"; }
    return false;
  }
  function shouldShow() {
    return !((root.IP && root.IP.store) ? root.IP.store.get("track", null) : null);
  }
  return { render, handleClick, shouldShow, onPick };
});
```

- [ ] **Step 2: Nạp trong `index.html`** (nhóm module, sau `tracks.js`):
```html
<script src="assets/js/onboarding.js"></script>
```

- [ ] **Step 3: Tích hợp vào `app.js` `render()`** — sửa hàm `render` (dòng 381-392) để ưu tiên onboarding:

```js
  function render() {
    const main = document.getElementById("content");
    if (IP.onboarding.shouldShow()) {
      main.innerHTML = IP.onboarding.render({ t, fa, ICON });
      document.getElementById("sidebar").innerHTML = "";
      window.scrollTo(0, 0);
      return;
    }
    if (State.mode === "cards") { main.innerHTML = renderCards(); updateCardProgress(); }
    else if (State.mode === "quiz") main.innerHTML = renderQuiz();
    else if (State.topic) main.innerHTML = renderTopic(State.topic);
    else main.innerHTML = renderHome();
    document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("active", b.dataset.mode === State.mode));
    renderSidebar();
    document.getElementById("content").scrollTop = 0;
    window.scrollTo(0, 0);
  }
```

- [ ] **Step 4: Đăng ký callback + click handling** — `app.js`

(a) Trong `bind()`, đầu hàm thêm:
```js
    IP.onboarding.onPick(({ role, level }) => {
      State.track = { role, level };
      LS.set("track", State.track);
      State.topic = null; State.mode = "learn";
      render();
    });
```
(b) Trong delegated click listener (đầu `document.body.addEventListener("click", e => {`, dòng 458) thêm trước các nhánh khác:
```js
      const ob = IP.onboarding.handleClick(e.target);
      if (ob === "rerender") { render(); return; }
      if (ob === true) return;
```
(c) Thêm `track` vào `State` (dòng ~32, cạnh các field khác):
```js
    track: LS.get("track", null),
```

- [ ] **Step 5: CSS onboarding** — `assets/css/styles.css` (cuối file):

```css
.ob-wrap{max-width:560px;margin:40px auto;padding:0 16px}
.ob-brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px;margin-bottom:18px}
.ob-brand i{color:var(--accent)}
.ob-h{font-size:24px;font-weight:800;margin-bottom:4px}
.ob-sub{color:var(--muted);font-size:14px;margin-bottom:20px}
.ob-row{background:var(--panel);border:1.5px solid var(--line);border-radius:12px;
  padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:14px;
  cursor:pointer;flex-wrap:wrap;transition:.15s}
.ob-row:hover{border-color:var(--accent)}
.ob-row.exp{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.ob-row.soon{opacity:.55;cursor:not-allowed}
.ob-ic{font-size:20px;color:var(--accent);width:26px;text-align:center}
.ob-grow{flex:1;display:flex;flex-direction:column}
.ob-rt{font-weight:700;font-size:14px}
.ob-rd{color:var(--muted);font-size:12px}
.ob-soon{font-size:10px;font-weight:800;color:var(--yellow);
  background:color-mix(in srgb,var(--yellow) 18%,transparent);padding:2px 8px;border-radius:99px}
.ob-chips{display:flex;gap:8px;width:100%;margin-top:12px;padding-top:12px;
  border-top:1px dashed var(--line);flex-wrap:wrap}
.ob-chip{flex:1;min-width:80px;font-size:13px;font-weight:600;padding:9px;border-radius:9px;
  border:1.5px solid var(--line);background:var(--panel2);color:var(--txt);cursor:pointer}
.ob-chip.on{border-color:var(--green);background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green)}
.ob-go{background:linear-gradient(90deg,var(--green),var(--accent));color:#fff;border:none;
  font-size:13px;font-weight:700;padding:9px 16px;border-radius:9px;cursor:pointer}
```

- [ ] **Step 6: Kiểm tra thủ công (checklist)**

DevTools → Application → xoá `ip_track`. Reload `index.html`. Expected:
- [ ] Hiện màn onboarding một màn; sidebar trống.
- [ ] Bấm hàng **Software Engineer** → mở chip Fresher/Junior/Senior; chọn 1 chip → highlight; **Bắt đầu** → vào app, sidebar hiện.
- [ ] **DevOps** → nút Bắt đầu trực tiếp (không chip).
- [ ] **AI Engineer** → mờ, "Sắp ra mắt", không bấm được.
- [ ] Reload → KHÔNG hiện lại onboarding (đã lưu `ip_track`).
- [ ] Đổi ngôn ngữ trên onboarding hiển thị đúng (nếu vào lại onboarding).

- [ ] **Step 7: Commit**

```bash
git add assets/js/onboarding.js index.html assets/js/app.js assets/css/styles.css
git commit -m "feat: single-screen onboarding (role -> level)"
```

---

## Task 7: Track-aware sidebar/nav + profile menu (reset/change)

**Files:**
- Modify: `assets/js/app.js` (`renderSidebar` chế độ track; menu hồ sơ; "Tất cả chủ đề"; reset/đổi)
- Modify: `index.html` (nút hồ sơ topbar — đã thêm icon ở Task 3; thêm dropdown container)
- Modify: `assets/css/styles.css` (track card, progress bar, numbered items, profile menu)

**Interfaces:**
- Consumes: `IP.tracks`, `PREP.roles/levels/tracks`, `State.track`, `IP.store`.
- Produces: biến điều hướng `State.browseAll` (bool) — true = hiện sidebar danh mục cũ; false = hiện sidebar track.

- [ ] **Step 1: Thêm state + helper** — `app.js`

(a) `State` thêm `browseAll: false` (cạnh `track`).
(b) helper sau `catOf` (dòng 154):
```js
  function validTopicIds() { return PREP.order; }
  function currentTrack() {
    if (!State.track) return null;
    return IP.tracks.getTrack(State.track.role, State.track.level, PREP.tracks);
  }
  function roleLabel() {
    if (!State.track) return "";
    const r = (PREP.roles || []).find(x => x.id === State.track.role);
    const lv = State.track.level ? PREP.levels[State.track.level] : null;
    return (r ? t(r.title) : "") + (lv ? " · " + t(lv) : "");
  }
```

- [ ] **Step 2: Viết `renderSidebar` chế độ track** — thay nguyên hàm `renderSidebar` (dòng 362-379):

```js
  function renderSidebar() {
    const sb = document.getElementById("sidebar");
    const L = State.lang;
    // Browse-all mode = original category sidebar
    if (State.browseAll || !State.track) {
      let html = `<div class="nav-item ${State.mode === "learn" && !State.topic ? "active" : ""}" data-home="1">
        <span class="ni-icon">${fa(ICON.home)}</span><span class="ni-label">${L === "vi" ? "Trang chủ" : "Home"}</span></div>`;
      if (State.track) {
        html += `<div class="nav-item back-track" data-track-mode="1"><span class="ni-icon">${fa(ICON.change)}</span><span class="ni-label">${L === "vi" ? "← Về lộ trình" : "← Back to track"}</span></div>`;
      }
      CATS.forEach(cat => {
        const topics = PREP.order.filter(id => PREP.topics[id].category === cat.id);
        if (!topics.length) return;
        html += `<div class="cat"><div class="cat-label">${fa(ICON[cat.id] || "")} ${t(cat)}</div>`;
        topics.forEach(id => {
          const tp = PREP.topics[id];
          const active = State.mode === "learn" && State.topic === id;
          html += `<div class="nav-item ${active ? "active" : ""} ${State.progress[id] ? "done" : ""}" data-topic="${id}">
            <span class="ni-icon">${fa(catIcon(tp))}</span><span class="ni-label">${t(tp.title)}</span>${proBadge(tp)}<span class="ni-check">${fa(ICON.check)}</span></div>`;
        });
        html += `</div>`;
      });
      sb.innerHTML = html;
      return;
    }
    // Track mode
    const track = currentTrack();
    const items = IP.tracks.resolveItems(track, validTopicIds());
    const prog = IP.tracks.progressOf(track, State.progress, validTopicIds());
    let html = `<div class="track-card">
      <div class="tk-top"><span class="tk-ic">${fa((PREP.roles.find(r=>r.id===State.track.role)||{}).icon||ICON.swe)}</span>
        <span class="tk-name">${roleLabel()}</span>
        <button class="tk-change" data-change-track="1">${fa(ICON.change)} ${L==="vi"?"Đổi":"Change"}</button></div>
      <div class="tk-bar"><i style="width:${prog.pct}%"></i></div>
      <div class="tk-meta">${prog.done}/${prog.total} ${L==="vi"?"chủ đề":"topics"} · ${prog.pct}%</div></div>
      <div class="cat-label">${L==="vi"?"Lộ trình của bạn":"Your path"}</div>`;
    items.forEach((id, i) => {
      const tp = PREP.topics[id];
      const active = State.mode === "learn" && State.topic === id;
      const done = !!State.progress[id];
      html += `<div class="nav-item track-item ${active ? "active" : ""} ${done ? "done" : ""}" data-topic="${id}">
        <span class="tk-num">${done ? fa(ICON.check) : (i + 1)}</span>
        <span class="ni-label">${t(tp.title)}</span>${proBadge(tp)}</div>`;
    });
    html += `<div class="nav-item all-topics" data-browse-all="1"><span class="ni-icon">${fa(ICON.allTopics)}</span><span class="ni-label">${t(UI.allTopics)} →</span></div>`;
    sb.innerHTML = html;
  }
```

- [ ] **Step 3: Profile menu trong `index.html`** — thay nút hồ sơ (đã có icon ở Task 3? nếu chưa, thêm). Thêm sau `.lang-toggle` (dòng 33):

```html
  <div class="profile">
    <button class="icon-btn" id="profileBtn" title="Menu"><i class="fa-solid fa-circle-user"></i></button>
    <div class="profile-menu" id="profileMenu" hidden>
      <button data-menu="change-track"><i class="fa-solid fa-rotate"></i> <span data-i18n="changeTrack">Đổi lộ trình</span></button>
      <button data-menu="bookmarks"><i class="fa-solid fa-bookmark"></i> <span data-i18n="saved">Đã lưu</span></button>
      <button data-menu="clear"><i class="fa-solid fa-trash"></i> <span data-i18n="clearData">Xoá dữ liệu</span></button>
    </div>
  </div>
```

- [ ] **Step 4: i18n cho menu** — thêm vào `UI` (Task 2 block) trong app.js:
```js
    changeTrack: { vi: "Đổi lộ trình", en: "Change path" },
    saved: { vi: "Đã lưu", en: "Saved" },
    clearData: { vi: "Xoá toàn bộ dữ liệu", en: "Clear all data" },
    confirmClear: { vi: "Xoá toàn bộ tiến độ, lộ trình, thẻ và bookmark? Không thể hoàn tác.", en: "Clear all progress, path, cards and bookmarks? This cannot be undone." },
```
Và trong `syncStaticText()` cập nhật nhãn menu:
```js
    const setI = (k, node) => { const el = document.querySelector(`[data-i18n="${k}"]`); if (el) el.textContent = t(node); };
    setI("changeTrack", UI.changeTrack); setI("saved", UI.saved); setI("clearData", UI.clearData);
```

- [ ] **Step 5: Bind events** — `app.js` `bind()` thêm:

```js
    // profile menu
    const pBtn = document.getElementById("profileBtn");
    const pMenu = document.getElementById("profileMenu");
    if (pBtn) pBtn.onclick = (e) => { e.stopPropagation(); pMenu.hidden = !pMenu.hidden; };
    document.addEventListener("click", () => { if (pMenu) pMenu.hidden = true; });
    if (pMenu) pMenu.addEventListener("click", (e) => {
      const b = e.target.closest("[data-menu]"); if (!b) return;
      const action = b.dataset.menu;
      if (action === "change-track") { State.track = null; LS.set("track", null); State.topic = null; render(); }
      else if (action === "bookmarks") { State.mode = "learn"; State.topic = null; State.browseAll = true; render(); /* Task 9 refines */ }
      else if (action === "clear") {
        if (confirm(t(UI.confirmClear))) { IP.store.clearAll(); location.reload(); }
      }
    });
```
Và trong delegated click listener thêm các nhánh điều hướng track (sau nhánh onboarding):
```js
      if (e.target.closest("[data-browse-all]")) { State.browseAll = true; State.topic = null; render(); return; }
      if (e.target.closest("[data-track-mode]") || e.target.closest("[data-change-track]")) {
        if (e.target.closest("[data-change-track]")) { State.track = null; LS.set("track", null); }
        State.browseAll = false; render(); return;
      }
```
> `data-change-track` (nút "Đổi" trên thẻ track) → quay lại onboarding; `data-track-mode` ("← Về lộ trình" trong browse-all) → tắt browseAll.

- [ ] **Step 6: CSS track sidebar + profile menu** — `assets/css/styles.css` (cuối file):

```css
.track-card{background:color-mix(in srgb,var(--accent) 12%,var(--panel));border:1px solid var(--accent);
  border-radius:11px;padding:11px 12px;margin:4px 0 14px}
.tk-top{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px}
.tk-ic{color:var(--accent)}
.tk-name{flex:1}
.tk-change{margin-left:auto;font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;display:flex;gap:4px;align-items:center}
.tk-bar{height:6px;background:var(--line);border-radius:99px;margin-top:10px;overflow:hidden}
.tk-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--accent))}
.tk-meta{font-size:11px;color:var(--muted);margin-top:6px}
.track-item{display:flex;align-items:center;gap:10px}
.tk-num{width:20px;height:20px;border-radius:99px;background:var(--panel2);color:var(--muted);
  font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.track-item.done .tk-num{background:var(--green);color:#fff}
.track-item.active .tk-num{background:var(--accent);color:#fff}
.all-topics{color:var(--accent);font-weight:600;margin-top:8px;border-top:1px dashed var(--line);padding-top:12px}
.profile{position:relative}
.profile-menu{position:absolute;right:0;top:42px;background:var(--panel);border:1px solid var(--line);
  border-radius:10px;box-shadow:var(--shadow);padding:6px;min-width:190px;z-index:60;display:flex;flex-direction:column}
.profile-menu button{display:flex;align-items:center;gap:10px;background:none;border:none;color:var(--txt);
  font-size:13px;padding:9px 10px;border-radius:7px;cursor:pointer;text-align:left}
.profile-menu button:hover{background:var(--panel2)}
```

- [ ] **Step 7: Kiểm tra thủ công (checklist)**

Mở `index.html` (đã chọn track ở Task 6). Expected:
- [ ] Sidebar hiện thẻ track + thanh tiến độ đúng (`x/N`), danh sách topic **đánh số**, topic đã học tick xanh.
- [ ] Bấm "Tất cả chủ đề →" → sidebar chuyển về danh mục cũ + có "← Về lộ trình".
- [ ] Nút hồ sơ → menu mở/đóng; "Đổi lộ trình" → về onboarding; "Đổi" trên thẻ track → về onboarding.
- [ ] "Xoá dữ liệu" → confirm → reload về onboarding trống.
- [ ] Đánh dấu đã học 1 topic trong track → thanh tiến độ tăng.

- [ ] **Step 8: Commit**

```bash
git add index.html assets/js/app.js assets/css/styles.css
git commit -m "feat: track-aware sidebar/nav + profile menu (reset/change)"
```

---

## Task 8: "Tiếp tục học" + dashboard tiến độ

**Files:**
- Modify: `assets/js/app.js` (`renderHome` chèn khối Continue + % track khi có track)
- Modify: `assets/css/styles.css` (style continue card)

**Interfaces:**
- Consumes: `IP.tracks.nextTopic/progressOf`, `currentTrack()`, `roleLabel()`.

- [ ] **Step 1: Thêm khối Continue vào `renderHome`** — `app.js`, trong `renderHome` ngay sau `const L = State.lang;` (dòng 188) tạo HTML continue và chèn vào đầu return (sau `<div class="fade-in">`):

```js
    let continueHtml = "";
    if (State.track) {
      const track = currentTrack();
      const prog = IP.tracks.progressOf(track, State.progress, PREP.order);
      const nextId = IP.tracks.nextTopic(track, State.progress, PREP.order);
      const nextTp = nextId ? PREP.topics[nextId] : null;
      continueHtml = `<div class="continue-card" ${nextId ? `data-go="${nextId}"` : ""}>
        <div class="cc-left">
          <div class="cc-eyebrow">${roleLabel()} · ${prog.done}/${prog.total} (${prog.pct}%)</div>
          <div class="cc-title">${nextTp ? (L === "vi" ? "Tiếp tục: " : "Continue: ") + t(nextTp.title) : (L === "vi" ? "Đã hoàn thành lộ trình! 🎉" : "Track complete! 🎉")}</div>
          <div class="cc-bar"><i style="width:${prog.pct}%"></i></div>
        </div>
        ${nextId ? `<div class="cc-go">${fa("fa-solid fa-arrow-right")}</div>` : ""}
      </div>`;
    }
```
Sửa dòng return mở (dòng 189-195) thành:
```js
    return `<div class="fade-in">
      ${continueHtml}
      <div class="hero">
```

- [ ] **Step 2: CSS** — `assets/css/styles.css` (cuối file):

```css
.continue-card{display:flex;align-items:center;gap:16px;cursor:pointer;
  background:color-mix(in srgb,var(--accent) 10%,var(--panel));border:1px solid var(--accent);
  border-radius:14px;padding:16px 18px;margin-bottom:20px;transition:.15s}
.continue-card:hover{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 20%,transparent)}
.cc-left{flex:1}
.cc-eyebrow{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700}
.cc-title{font-size:17px;font-weight:800;margin:4px 0 10px}
.cc-bar{height:6px;background:var(--line);border-radius:99px;overflow:hidden}
.cc-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--accent))}
.cc-go{font-size:22px;color:var(--accent)}
```

- [ ] **Step 3: Kiểm tra thủ công (checklist)**

Về Home (bấm brand). Expected:
- [ ] Có thẻ "Tiếp tục: <topic kế tiếp chưa học>" + % + thanh tiến độ.
- [ ] Bấm thẻ → mở đúng topic kế tiếp.
- [ ] Khi học hết track → thẻ hiện "Đã hoàn thành lộ trình 🎉", không có mũi tên.
- [ ] Đang ở chế độ "Tất cả chủ đề" nhưng vẫn có track → thẻ vẫn hiện (vì dựa `State.track`).

- [ ] **Step 4: Commit**

```bash
git add assets/js/app.js assets/css/styles.css
git commit -m "feat: continue-learning card + track progress on home"
```

---

## Task 9: Bookmarks

**Files:**
- Create: `assets/js/bookmarks.js` (`IP.bookmarks`)
- Create: `tests/bookmarks.test.js`
- Modify: `index.html` (nạp `bookmarks.js`)
- Modify: `assets/js/app.js` (nút bookmark trên topic; trang "Đã lưu")
- Modify: `assets/css/styles.css` (style nút bookmark)

**Interfaces:**
- Consumes: `IP.store`.
- Produces:
  - `IP.bookmarks.toggle(list, id)` → array mới (pure; thêm nếu chưa có, bỏ nếu có).
  - `IP.bookmarks.has(list, id)` → bool (pure).
  - `IP.bookmarks.all()` → array từ `ip_bookmarks`; `IP.bookmarks.toggleStored(id)` → array mới đã lưu.

- [ ] **Step 1: Viết test thất bại** — `tests/bookmarks.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const bm = require("../assets/js/bookmarks.js");

test("has() detects membership", () => {
  assert.strictEqual(bm.has(["a", "b"], "b"), true);
  assert.strictEqual(bm.has(["a"], "z"), false);
  assert.strictEqual(bm.has(null, "z"), false);
});
test("toggle() adds when missing", () => {
  assert.deepStrictEqual(bm.toggle(["a"], "b"), ["a", "b"]);
});
test("toggle() removes when present", () => {
  assert.deepStrictEqual(bm.toggle(["a", "b"], "a"), ["b"]);
});
test("toggle() does not mutate input", () => {
  const input = ["a"];
  bm.toggle(input, "b");
  assert.deepStrictEqual(input, ["a"]);
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/bookmarks.test.js`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `assets/js/bookmarks.js`**

```js
/* IP.bookmarks — saved topics */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.bookmarks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  function has(list, id) { return Array.isArray(list) && list.indexOf(id) !== -1; }
  function toggle(list, id) {
    const arr = Array.isArray(list) ? list.slice() : [];
    const i = arr.indexOf(id);
    if (i === -1) arr.push(id); else arr.splice(i, 1);
    return arr;
  }
  function store() { return root.IP && root.IP.store; }
  function all() { return store() ? store().get("bookmarks", []) : []; }
  function toggleStored(id) {
    const next = toggle(all(), id);
    if (store()) store().set("bookmarks", next);
    return next;
  }
  return { has, toggle, all, toggleStored };
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/bookmarks.test.js`
Expected: PASS (4 test).

- [ ] **Step 5: Nạp trong `index.html`** (sau `onboarding.js`):
```html
<script src="assets/js/bookmarks.js"></script>
```

- [ ] **Step 6: Nút bookmark trên topic** — `app.js` `renderTopic`, trong `.learn-bar` (dòng 143-147) thêm nút:

```js
      <div class="learn-bar">
        <button class="btn ${done ? "green" : ""}" id="learnBtn">${done ? t(UI.markedLearned) : t(UI.markLearned)}</button>
        <button class="btn subtle" id="bookmarkBtn">${fa(IP.bookmarks.has(IP.bookmarks.all(), id) ? ICON.bookmark : ICON.bookmarkO)} ${IP.bookmarks.has(IP.bookmarks.all(), id) ? (State.lang==="vi"?"Đã lưu":"Saved") : (State.lang==="vi"?"Lưu":"Save")}</button>
        <button class="btn subtle" id="goCards">${fa(ICON.cards)} ${t(UI.cards)}</button>
        <button class="btn subtle" id="goQuiz">${fa(ICON.quizCount)} ${t(UI.quiz)}</button>
      </div>`;
```

- [ ] **Step 7: Handler bookmark + trang "Đã lưu"** — `app.js`

(a) Trong delegated click listener thêm:
```js
      if (e.target.closest("#bookmarkBtn")) { IP.bookmarks.toggleStored(State.topic); render(); return; }
```
(b) Sửa nhánh menu "bookmarks" (Task 7 Step 5) để render trang "Đã lưu" thật. Thay `State.browseAll = true; render();` bằng:
```js
        State.mode = "saved"; State.topic = null; render();
```
(c) Trong `render()`, thêm nhánh `saved` (trước nhánh cards):
```js
    if (State.mode === "saved") { main.innerHTML = renderSaved(); renderSidebar(); window.scrollTo(0,0); return; }
```
(d) Thêm hàm `renderSaved` (cạnh `renderHome`):
```js
  function renderSaved() {
    const L = State.lang;
    const ids = IP.bookmarks.all().filter(id => PREP.topics[id]);
    const head = `<div class="page-head"><h1>${fa(ICON.bookmark)} ${L === "vi" ? "Đã lưu" : "Saved"}</h1>
      <div class="blurb">${ids.length} ${L === "vi" ? "chủ đề" : "topics"}</div></div>`;
    if (!ids.length) return `<div class="fade-in">${head}<div class="empty-hint">${L === "vi" ? "Chưa lưu chủ đề nào. Bấm \"Lưu\" trong một bài học." : "No saved topics yet. Hit \"Save\" on a topic."}</div></div>`;
    const cards = ids.map(id => { const tp = PREP.topics[id];
      return `<div class="tcard" data-go="${id}" style="margin-bottom:12px"><div class="tc-icon">${fa(catIcon(tp))}</div>
        <h3>${t(tp.title)}</h3>${proBadge(tp)}<p>${t(tp.blurb)}</p></div>`; }).join("");
    return `<div class="fade-in">${head}${cards}</div>`;
  }
```

- [ ] **Step 8: Kiểm tra thủ công (checklist)**

Expected:
- [ ] Trong 1 topic, bấm "Lưu" → đổi thành "Đã lưu" + icon đặc.
- [ ] Hồ sơ → "Đã lưu" → liệt kê đúng các topic đã lưu; bấm card mở topic.
- [ ] Bỏ lưu → biến mất khỏi danh sách.
- [ ] Reload giữ nguyên bookmark.

- [ ] **Step 9: Commit**

```bash
git add assets/js/bookmarks.js tests/bookmarks.test.js index.html assets/js/app.js assets/css/styles.css
git commit -m "feat: bookmarks (save topics + Saved page)"
```

---

## Task 10: Streak / mục tiêu hằng ngày

**Files:**
- Create: `assets/js/streak.js` (`IP.streak`)
- Create: `tests/streak.test.js`
- Modify: `index.html` (nạp `streak.js`)
- Modify: `assets/js/app.js` (ghi nhận hoạt động khi đánh dấu đã học; hiện streak ở Home stat-grid)
- Modify: `assets/css/styles.css` (nếu cần style nhỏ)

**Interfaces:**
- Consumes: `IP.store`.
- Produces:
  - `IP.streak.compute(prev, todayStr)` → state mới `{count,lastActiveDate,dailyGoal}` (pure). `todayStr` định dạng `YYYY-MM-DD`. Cùng ngày → giữ nguyên; liền ngày (diff 1) → `count+1`; cách quãng → `count=1`.
  - `IP.streak.todayStr(date)` → `YYYY-MM-DD` theo local (pure, nhận `Date`).
  - `IP.streak.bump()` → cập nhật `ip_streak` theo hôm nay, trả state mới.
  - `IP.streak.get()` → state hiện tại.

- [ ] **Step 1: Viết test thất bại** — `tests/streak.test.js`

```js
const test = require("node:test");
const assert = require("node:assert");
const streak = require("../assets/js/streak.js");

const base = { count: 3, lastActiveDate: "2026-06-16", dailyGoal: 1 };

test("same day keeps count", () => {
  const out = streak.compute({ ...base, lastActiveDate: "2026-06-17" }, "2026-06-17");
  assert.strictEqual(out.count, 3);
  assert.strictEqual(out.lastActiveDate, "2026-06-17");
});
test("consecutive day increments", () => {
  const out = streak.compute(base, "2026-06-17");
  assert.strictEqual(out.count, 4);
  assert.strictEqual(out.lastActiveDate, "2026-06-17");
});
test("gap resets to 1", () => {
  const out = streak.compute(base, "2026-06-20");
  assert.strictEqual(out.count, 1);
});
test("first ever activity sets count 1", () => {
  const out = streak.compute({ count: 0, lastActiveDate: null, dailyGoal: 1 }, "2026-06-17");
  assert.strictEqual(out.count, 1);
  assert.strictEqual(out.lastActiveDate, "2026-06-17");
});
test("todayStr formats YYYY-MM-DD", () => {
  assert.strictEqual(streak.todayStr(new Date(2026, 5, 7)), "2026-06-07"); // month 5 = June
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test tests/streak.test.js`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `assets/js/streak.js`**

```js
/* IP.streak — daily learning streak */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.streak = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function todayStr(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function dayDiff(a, b) {
    // a,b = "YYYY-MM-DD"; returns whole days b-a (UTC-safe)
    const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
    const ua = Date.UTC(pa[0], pa[1] - 1, pa[2]), ub = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((ub - ua) / 86400000);
  }
  // pure
  function compute(prev, today) {
    const p = prev || { count: 0, lastActiveDate: null, dailyGoal: 1 };
    if (p.lastActiveDate === today) return { ...p };
    let count;
    if (!p.lastActiveDate) count = 1;
    else count = dayDiff(p.lastActiveDate, today) === 1 ? (p.count || 0) + 1 : 1;
    return { count, lastActiveDate: today, dailyGoal: p.dailyGoal || 1 };
  }
  function store() { return root.IP && root.IP.store; }
  function get() { return store() ? store().get("streak", { count: 0, lastActiveDate: null, dailyGoal: 1 }) : { count: 0, lastActiveDate: null, dailyGoal: 1 }; }
  function bump() {
    const next = compute(get(), todayStr());
    if (store()) store().set("streak", next);
    return next;
  }
  return { compute, todayStr, get, bump };
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `node --test tests/streak.test.js`
Expected: PASS (5 test).

- [ ] **Step 5: Nạp trong `index.html`** (sau `bookmarks.js`):
```html
<script src="assets/js/streak.js"></script>
```

- [ ] **Step 6: Gọi `bump()` khi đánh dấu đã học** — `app.js` nhánh `learnBtn` (dòng 470-473):

```js
      if (e.target.id === "learnBtn") {
        State.progress[State.topic] = !State.progress[State.topic];
        LS.set("progress", State.progress);
        if (State.progress[State.topic]) IP.streak.bump();
        render(); return;
      }
```

- [ ] **Step 7: Hiện streak ở Home** — `app.js` `renderHome`, trong `.stat-grid` (dòng 197-203) thêm 1 ô:

```js
        <div class="stat"><div class="num o">${fa(ICON.streak)} ${IP.streak.get().count}</div><div class="lbl">${L === "vi" ? "Ngày liên tiếp" : "Day streak"}</div></div>
```
(chèn trước ô "Cards due" hoặc thay ô phù hợp; giữ tổng số ô gọn — có thể thay ô "Cards due" nếu muốn 4 ô).

- [ ] **Step 8: Kiểm tra thủ công (checklist)**

Expected:
- [ ] Đánh dấu "đã học" 1 topic hôm nay → Home hiện streak = 1 (icon lửa).
- [ ] Đánh dấu thêm topic khác cùng ngày → streak vẫn = 1 (không tăng nhiều lần/ngày).
- [ ] (Mô phỏng) Sửa `ip_streak.lastActiveDate` thành hôm qua trong DevTools rồi đánh dấu học → streak +1.
- [ ] Unit test streak PASS.

- [ ] **Step 9: Commit**

```bash
git add assets/js/streak.js tests/streak.test.js index.html assets/js/app.js assets/css/styles.css
git commit -m "feat: daily learning streak"
```

---

## Final verification

- [ ] **Chạy toàn bộ unit test:** `node --test` (từ repo root) → tất cả PASS.
- [ ] **Smoke thủ công toàn luồng:** xoá `ip_track` → onboarding (hướng B) → chọn SWE·Junior → track sidebar + tiến độ → mở topic → Lưu/đánh dấu học → Home thấy Continue + streak → đổi theme → đổi ngôn ngữ → "Tất cả chủ đề" → "Đổi lộ trình". Mode cũ (Thẻ/Trắc nghiệm) không hồi quy.
- [ ] **No-build check:** mở `index.html` bằng `file://` trực tiếp, không cần server — hoạt động.
- [ ] **Console sạch:** không lỗi JS/404.

---

## Self-Review (đã thực hiện khi viết plan)

**1. Spec coverage:**
- §3 no-build/module split → Tasks 1,2,5,6,9,10 tạo `IP.*`; render.js cố ý hoãn (ghi rõ ở Scope note). ✔
- §4 content model (roles/levels/tracks/tier) → Task 5. ✔
- §5 state/persistence/reset → Task 1 (store) + Task 7 (reset/clear). ✔
- §6 onboarding hướng B → Task 6. ✔
- §7 điều hướng track + "Tất cả chủ đề" + menu hồ sơ → Task 7. ✔
- §8 theming → Task 4. ✔
- §9 Font Awesome self-host → Task 3. ✔
- §10 i18n + fallback → Task 2 (+ chuỗi mới rải theo task). ✔
- §11 continue/dashboard + bookmark + streak → Tasks 8,9,10. ✔
- §13 edge cases: track/role không tồn tại (Task 7 `getTrack` trả null → onboarding), topic id sai (Task 5 `resolveItems` lọc), fallback ngôn ngữ (Task 2), localStorage lỗi (Task 1 try/catch). ✔
- §14 testing: unit test thuần + checklist thủ công. ✔
- §16 acceptance: phủ bởi Final verification. ✔

**2. Placeholder scan:** không còn TBD/TODO; mọi step có code/lệnh thật.

**3. Type consistency:** tên hàm khớp xuyên suốt — `IP.store.{get,set,migrate,defaults,clearAll}`, `IP.i18n.{pick,t,STR}`, `IP.theme.{resolve,apply,toggle,current}`, `IP.tracks.{getTrack,resolveItems,progressOf,nextTopic}`, `IP.bookmarks.{has,toggle,all,toggleStored}`, `IP.streak.{compute,todayStr,get,bump}`. `fa()`, `ICON`, `proBadge()`, `catIcon()`, `currentTrack()`, `roleLabel()`, `validTopicIds()` dùng nhất quán.
