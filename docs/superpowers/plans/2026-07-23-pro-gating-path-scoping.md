# Pro Gating + Path-Scoped Topics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the app a real Free/Pro boundary (Chat, Pro topics, Gmail suite) and scope the learn experience to the user's chosen path, with two new role paths to home every topic.

**Architecture:** Pure gating logic (`IP.gating`) and topic-tier data (`tier:"pro"`) are unit-tested with `node:test`. `PREP.isProTopic(id)` and `IP.pro.isPro()` are the two single-source signals every gate reads at render time. DOM/gate wiring lives in `assets/js/app.js` and is verified by keeping the full node suite green plus a manual/Playwright dual-state check (`isPro` stubbed both ways), per the spec.

**Tech Stack:** Vanilla ES5-style JS (IIFE modules, dual-export `root.IP.<mod>` + `module.exports`), no build step, static GitHub Pages frontend, Supabase/NestJS API seam. Tests: `node:test` + `node:assert`.

## Global Constraints

- No new backend endpoints, edge functions, or DB migrations — frontend + track data only.
- The 8 Pro topics (exact ids): `microservices`, `system-design`, `db-internals`, `docker-k8s`, `aws`, `llms`, `dl-nlp`, `elasticsearch`. All others stay free.
- A topic is Pro **iff** its registered data carries `tier: "pro"`. `PREP.isProTopic(id)` is the only topic-tier signal; `IP.pro.isPro()` is the only entitlement signal.
- Entitlement is server-sourced; the UI only gates off `IP.pro.isPro()`. Server-enforced assets (chat quota, Gmail edge fns, `pro_content` RLS) keep their own enforcement — do not duplicate or weaken it.
- Follow existing module idiom exactly: IIFE with `(function (root, factory) {...})`, `"use strict"`, dual-export, pure functions accessing `root.IP.*` only lazily at call time.
- Test runner is `node --test tests/*.test.js` (no `package.json`; 117 tests currently pass). Every task must leave the full suite green.
- Every module file must be added to `index.html` in the correct `<script>` order (data before `tracks.js`; app modules before `app.js`).
- Per-feature incremental commits: one feature per commit. Conventional-commit messages.
- Bilingual copy required on all user-facing strings: `{ vi: "...", en: "..." }`.

---

### Task 1: `IP.gating` pure module — `isProTopic` + `visibleTopicPool`

Introduces the single tier-check helper and the pool-exclusion helper as pure, testable functions, wires `PREP.isProTopic` to delegate to it, and loads the module in `index.html`.

**Files:**
- Create: `assets/js/gating.js`
- Create: `tests/gating.test.js`
- Modify: `index.html:80-84` (add `isProTopic` to the inline `PREP` object) and `index.html:128` area (add `<script>` tag)

**Interfaces:**
- Produces:
  - `IP.gating.isProTopic(topics, id)` → `boolean`. `topics` is a `{id → topicObj}` map (i.e. `PREP.topics`). Returns `true` iff `topics[id]` exists and `topics[id].tier === "pro"`.
  - `IP.gating.visibleTopicPool(order, topics, isPro)` → `string[]`. `order` is an array of topic ids (`PREP.order`). Returns `order` unchanged when `isPro` is truthy; otherwise returns `order` with every Pro topic id removed. Preserves order.
  - `PREP.isProTopic(id)` → `boolean`. Instance method on the global registry; delegates to `IP.gating.isProTopic(this.topics, id)` with an inline fallback.

- [ ] **Step 1: Write the failing test**

Create `tests/gating.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const gating = require("../assets/js/gating.js");

const TOPICS = {
  microservices: { id: "microservices", tier: "pro" },
  "system-design": { id: "system-design", tier: "pro" },
  dsa: { id: "dsa" },
  react: { id: "react", tier: "free" },
};

test("isProTopic true only when tier === 'pro'", () => {
  assert.strictEqual(gating.isProTopic(TOPICS, "microservices"), true);
  assert.strictEqual(gating.isProTopic(TOPICS, "system-design"), true);
  assert.strictEqual(gating.isProTopic(TOPICS, "dsa"), false);
  assert.strictEqual(gating.isProTopic(TOPICS, "react"), false);
});

test("isProTopic false for unknown id", () => {
  assert.strictEqual(gating.isProTopic(TOPICS, "nope"), false);
  assert.strictEqual(gating.isProTopic(null, "dsa"), false);
});

test("visibleTopicPool keeps everything for Pro users", () => {
  const order = ["dsa", "microservices", "react", "system-design"];
  assert.deepStrictEqual(gating.visibleTopicPool(order, TOPICS, true), order);
});

test("visibleTopicPool drops Pro topics for non-Pro, preserving order", () => {
  const order = ["dsa", "microservices", "react", "system-design"];
  assert.deepStrictEqual(
    gating.visibleTopicPool(order, TOPICS, false),
    ["dsa", "react"]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gating.test.js`
Expected: FAIL — `Cannot find module '../assets/js/gating.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `assets/js/gating.js`:

```js
/* IP.gating — pure Pro-topic tier checks & pool filtering.
   A topic is Pro iff its registered data has tier === "pro". Non-Pro users
   never see Pro topics in study pools. Dual-export: root.IP.gating + module.exports. */
(function (root, factory) {
  "use strict";
  var api = factory();
  root.IP = root.IP || {};
  root.IP.gating = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /* Pure: is topic `id` a Pro topic in the given topics map? */
  function isProTopic(topics, id) {
    return !!(topics && topics[id] && topics[id].tier === "pro");
  }

  /* Pure: topic-id pool visible to this user. Pro users see all; non-Pro users
     get Pro topics removed. Order preserved. */
  function visibleTopicPool(order, topics, isPro) {
    var ids = order || [];
    if (isPro) return ids.slice();
    return ids.filter(function (id) { return !isProTopic(topics, id); });
  }

  return { isProTopic: isProTopic, visibleTopicPool: visibleTopicPool };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gating.test.js`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Wire `PREP.isProTopic` + load the module in index.html**

In `index.html`, extend the inline `PREP` object (currently lines 80-84) to add an `isProTopic` method. Replace:

```html
<script>
  window.PREP = { topics:{}, order:[], roles:[], levels:{}, tracks:[],
    register(t){ if(!this.topics[t.id]) this.order.push(t.id); this.topics[t.id]=t; },
    registerTrack(t){ this.tracks.push(t); } };
</script>
```

with:

```html
<script>
  window.PREP = { topics:{}, order:[], roles:[], levels:{}, tracks:[],
    register(t){ if(!this.topics[t.id]) this.order.push(t.id); this.topics[t.id]=t; },
    registerTrack(t){ this.tracks.push(t); },
    isProTopic(id){
      return (window.IP && window.IP.gating)
        ? window.IP.gating.isProTopic(this.topics, id)
        : !!(this.topics[id] && this.topics[id].tier === "pro");
    } };
</script>
```

Then add the module `<script>` tag. It must load before `app.js` and after `tracks.js` (it has no dependency on data, but keep app modules grouped). Immediately after the `<script src="assets/js/tracks.js"></script>` line (currently line 128), add:

```html
<script src="assets/js/gating.js"></script>
```

- [ ] **Step 6: Run the full suite to confirm no regression**

Run: `node --test tests/*.test.js`
Expected: PASS — 121 tests pass (117 existing + 4 new).

- [ ] **Step 7: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/js/gating.js tests/gating.test.js index.html
git -C /workspaces/interview-prep/Interview-Prepare commit -m "feat(gating): add IP.gating.isProTopic + visibleTopicPool and PREP.isProTopic"
```

---

### Task 2: Tag the 8 Pro topics with `tier: "pro"`

`microservices` already carries `tier: "pro"`. Add it to the other seven so `PREP.isProTopic` returns true for exactly the 8 spec topics.

**Files:**
- Modify: `assets/data/system-design.js`, `assets/data/db-internals.js`, `assets/data/docker-k8s.js`, `assets/data/aws.js`, `assets/data/llms.js`, `assets/data/dl-nlp.js`, `assets/data/elasticsearch.js`
- Test: `tests/gating.test.js` (already covers the logic; this task's check is a grep count)

**Interfaces:**
- Consumes: none.
- Produces: each of the 8 data files registers a topic with `tier: "pro"`. No new symbols.

- [ ] **Step 1: Confirm the current count is 1**

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -rl 'tier: "pro"' assets/data/`
Expected: only `assets/data/microservices.js`.

- [ ] **Step 2: Add `tier: "pro",` to each of the seven files**

In every file, the registered object starts with `PREP.register({` then an `id: "..."` line (line 3 in each). Insert a `tier: "pro",` line immediately after the `id:` line, matching the file's existing indentation. For example, in `assets/data/system-design.js`:

```js
PREP.register({
  id: "system-design",
  tier: "pro",
  icon: "📐",
```

Apply the identical insertion (after the `id:` line) to: `db-internals.js`, `docker-k8s.js`, `aws.js`, `llms.js`, `dl-nlp.js`, `elasticsearch.js`. Match each file's own indentation exactly (some use 2-space, verify per file before editing).

- [ ] **Step 3: Verify exactly 8 topics are tagged**

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -rl 'tier: "pro"' assets/data/ | sort`
Expected: exactly these 8 files:
```
assets/data/aws.js
assets/data/db-internals.js
assets/data/dl-nlp.js
assets/data/docker-k8s.js
assets/data/elasticsearch.js
assets/data/llms.js
assets/data/microservices.js
assets/data/system-design.js
```

- [ ] **Step 4: Confirm no syntax breakage**

Run: `cd /workspaces/interview-prep/Interview-Prepare && for f in aws db-internals dl-nlp docker-k8s elasticsearch llms system-design; do node --check assets/data/$f.js && echo "$f OK"; done`
Expected: `OK` for all seven (each file parses; note these files reference the `PREP` global so they can only be `--check`ed, not executed, in Node).

- [ ] **Step 5: Run the full suite (regression guard)**

Run: `node --test tests/*.test.js`
Expected: PASS — 121 tests pass.

- [ ] **Step 6: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/data/system-design.js assets/data/db-internals.js assets/data/docker-k8s.js assets/data/aws.js assets/data/llms.js assets/data/dl-nlp.js assets/data/elasticsearch.js
git -C /workspaces/interview-prep/Interview-Prepare commit -m 'feat(data): tag the 8 Pro topics with tier:"pro"'
```

---

### Task 3: Two new level-less role paths (Frontend + Backend)

Add the Frontend Engineer and Backend Engineer roles + tracks so the six otherwise-orphaned topics (`vue`, `skeleton-loading`, `dotnet`, `django`, `ecommerce`, `elasticsearch`) each belong to at least one path.

**Files:**
- Modify: `assets/data/tracks.js`
- Test: `tests/tracks.test.js`

**Interfaces:**
- Consumes: `IP.tracks.getTrack(role, level, tracks)`, `IP.tracks.resolveItems(track, validIds)` (existing, unchanged).
- Produces: `PREP.roles` gains `{id:"frontend",...}` and `{id:"backend",...}` (both `levels: []`); `PREP.tracks` gains a `frontend` track and a `backend` track with the exact item lists below.

- [ ] **Step 1: Write the failing test**

Append to `tests/tracks.test.js`:

```js
/* ---- New level-less role paths (Frontend / Backend) ---- */
const trackData = require("../assets/data/tracks.js"); // registers into a shim PREP

test("frontend + backend tracks resolve to their full item lists", () => {
  const fe = tracks.getTrack("frontend", "", trackData.tracks);
  const be = tracks.getTrack("backend", "", trackData.tracks);
  assert.ok(fe, "frontend track exists");
  assert.ok(be, "backend track exists");
  assert.deepStrictEqual(
    tracks.resolveItems(fe, trackData.validIds),
    ["dsa", "react", "redux", "vue", "typescript", "fe-security", "skeleton-loading", "rest-grpc", "system-design", "behavioral"]
  );
  assert.deepStrictEqual(
    tracks.resolveItems(be, trackData.validIds),
    ["dsa", "oop", "databases", "rest-grpc", "nodejs", "dotnet", "django", "ecommerce", "elasticsearch", "db-internals", "system-design", "behavioral"]
  );
});

test("every previously-orphan topic is reachable from at least one track", () => {
  const reachable = new Set();
  trackData.tracks.forEach((trk) => (trk.items || []).forEach((id) => reachable.add(id)));
  ["vue", "skeleton-loading", "dotnet", "django", "ecommerce", "elasticsearch"].forEach((id) => {
    assert.ok(reachable.has(id), id + " should be reachable");
  });
});
```

`assets/data/tracks.js` currently references a bare global `PREP` and calls `PREP.registerTrack`, so `require`-ing it in Node throws. Step 3 makes it dual-export a testable shim WITHOUT changing browser behavior.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/tracks.test.js`
Expected: FAIL — `require('../assets/data/tracks.js')` throws `PREP is not defined` (or the new assertions fail once the require is shimmed).

- [ ] **Step 3: Add the roles + tracks and make the file Node-requireable**

Rewrite `assets/data/tracks.js` so it (a) works unchanged in the browser via the global `PREP`, and (b) exports `{ tracks, roles, levels, validIds }` in Node for the test. Full new content:

```js
/* Roles, levels & learning tracks (Phase A) */
(function () {
  "use strict";

  var roles = [
    { id: "swe", icon: "fa-solid fa-code", title: { vi: "Software Engineer", en: "Software Engineer" }, levels: ["fresher", "junior", "senior"] },
    { id: "devops", icon: "fa-solid fa-server", title: { vi: "DevOps", en: "DevOps" }, levels: [] },
    { id: "ai-engineer", icon: "fa-solid fa-robot", title: { vi: "AI Engineer", en: "AI Engineer" }, levels: [] },
    { id: "frontend", icon: "fa-solid fa-window-maximize", title: { vi: "Frontend Engineer", en: "Frontend Engineer" }, levels: [] },
    { id: "backend", icon: "fa-solid fa-layer-group", title: { vi: "Backend Engineer", en: "Backend Engineer" }, levels: [] },
  ];

  var levels = {
    fresher: { vi: "Fresher", en: "Fresher" },
    junior: { vi: "Junior", en: "Junior" },
    senior: { vi: "Senior", en: "Senior" },
  };

  var tracks = [
    { id: "swe-fresher", role: "swe", level: "fresher",
      title: { vi: "SWE · Fresher", en: "SWE · Fresher" },
      blurb: { vi: "Nền tảng cốt lõi cho vòng phỏng vấn đầu tiên.", en: "Core fundamentals for your first interviews." },
      items: ["dsa", "oop", "databases", "rest-grpc", "design-patterns", "os", "networking", "behavioral"] },
    { id: "swe-junior", role: "swe", level: "junior",
      title: { vi: "SWE · Junior", en: "SWE · Junior" },
      blurb: { vi: "Mở rộng sang framework và thiết kế hệ thống cơ bản.", en: "Add frameworks and intro system design." },
      items: ["dsa", "oop", "databases", "rest-grpc", "design-patterns", "react", "redux", "typescript", "nodejs", "os", "networking", "fe-security", "system-design", "behavioral"] },
    { id: "swe-senior", role: "swe", level: "senior",
      title: { vi: "SWE · Senior", en: "SWE · Senior" },
      blurb: { vi: "Tập trung kiến trúc, hệ thống lớn và dự án thực tế.", en: "Architecture-heavy, large systems and real projects." },
      items: ["system-design", "microservices", "design-patterns", "databases", "db-internals", "nodejs", "os", "networking", "logging", "docker-k8s", "aws", "owork", "behavioral"] },
    { id: "devops", role: "devops", level: "",
      title: { vi: "DevOps", en: "DevOps" },
      blurb: { vi: "Container, CI/CD, cloud và vận hành hệ thống.", en: "Containers, CI/CD, cloud and operations." },
      items: ["docker-k8s", "cicd", "aws", "networking", "logging", "system-design", "databases", "behavioral"] },
    { id: "ai-engineer", role: "ai-engineer", level: "",
      title: { vi: "AI Engineer", en: "AI Engineer" },
      blurb: { vi: "Nền tảng AI thực chiến: Python, ML và Deep Learning/NLP — sẽ mở rộng thêm.", en: "Practical AI foundations: Python, ML and Deep Learning/NLP — more coming." },
      items: ["python-ai", "ml-foundations", "dl-nlp", "llms", "system-design", "behavioral"] },
    { id: "frontend", role: "frontend", level: "",
      title: { vi: "Frontend Engineer", en: "Frontend Engineer" },
      blurb: { vi: "Giao diện hiện đại: framework, TypeScript, bảo mật FE và UX.", en: "Modern UI: frameworks, TypeScript, FE security and UX." },
      items: ["dsa", "react", "redux", "vue", "typescript", "fe-security", "skeleton-loading", "rest-grpc", "system-design", "behavioral"] },
    { id: "backend", role: "backend", level: "",
      title: { vi: "Backend Engineer", en: "Backend Engineer" },
      blurb: { vi: "Dịch vụ phía server: framework, dữ liệu, tìm kiếm và hệ thống.", en: "Server-side services: frameworks, data, search and systems." },
      items: ["dsa", "oop", "databases", "rest-grpc", "nodejs", "dotnet", "django", "ecommerce", "elasticsearch", "db-internals", "system-design", "behavioral"] },
  ];

  // Browser: register into the global PREP registry (unchanged behavior).
  if (typeof PREP !== "undefined" && PREP && typeof PREP.registerTrack === "function") {
    PREP.roles = roles;
    PREP.levels = levels;
    tracks.forEach(function (trk) { PREP.registerTrack(trk); });
  }

  // Node (tests): expose the raw data + a validIds convenience list.
  if (typeof module !== "undefined" && module.exports) {
    var validIds = [];
    tracks.forEach(function (trk) {
      (trk.items || []).forEach(function (id) { if (validIds.indexOf(id) === -1) validIds.push(id); });
    });
    module.exports = { roles: roles, levels: levels, tracks: tracks, validIds: validIds };
  }
})();
```

Note: `PREP.roles`/`PREP.levels` were previously assigned as bare statements; the browser path above reproduces that exactly (assign then register). `validIds` in the test is the union of all track items, so `resolveItems` keeps every listed id (its job is only to drop ids not in the valid set — here all are valid, so order is preserved verbatim, which is what the test asserts).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/tracks.test.js`
Expected: PASS — the 4 original tracks tests + the 2 new ones pass.

- [ ] **Step 5: Sanity-check the browser registration path parses**

Run: `cd /workspaces/interview-prep/Interview-Prepare && node --check assets/data/tracks.js && echo OK`
Expected: `OK`.

- [ ] **Step 6: Run the full suite (regression guard)**

Run: `node --test tests/*.test.js`
Expected: PASS — 123 tests pass.

- [ ] **Step 7: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/data/tracks.js tests/tracks.test.js
git -C /workspaces/interview-prep/Interview-Prepare commit -m "feat(tracks): add Frontend + Backend paths; home all orphan topics"
```

---

### Task 4: G2 — Pro-topic lock badge + paywall guard on topic open

Non-Pro users see a lock on Pro topic entries and hit a paywall screen (not the topic body) when they open one. Pro users are unchanged.

**Files:**
- Modify: `assets/js/app.js` — `proBadge` (line 61); `render()` topic-open branch (line 1142); add new `renderPaywall(id)` and new UI strings (near the `UI` block, lines 94-135).

**Interfaces:**
- Consumes: `PREP.isProTopic(id)` (Task 1), `IP.pro.isPro()`, `t(node)`, `fa(cls)`, `ICON.pro`, `State.topic`, `State.lang`.
- Produces: `renderPaywall(id)` → HTML string. `proBadge(tp)` now renders a lock glyph for non-Pro viewers of a Pro topic.

- [ ] **Step 1: Add the paywall UI strings**

In the `UI` object (inside `Object.assign(IP.i18n.STR, { ... })`, lines 94-135), add these keys (place them after the `proActiveUntil` line, 121):

```js
    proTopicTitle: { vi: "Chủ đề Pro", en: "Pro topic" },
    proTopicDesc: { vi: "Chủ đề này thuộc gói Pro. Nâng cấp để mở khoá toàn bộ nội dung, thẻ ghi nhớ và trắc nghiệm của chủ đề.", en: "This topic is part of Pro. Upgrade to unlock its full content, flashcards and quizzes." },
    proUpgradeCta: { vi: "Nâng cấp Pro", en: "Upgrade to Pro" },
```

- [ ] **Step 2: Update `proBadge` to show a lock for locked topics**

Replace `proBadge` (line 61):

```js
  function proBadge(tp) { return tp && tp.tier === "pro" ? `<span class="pro-badge">${fa(ICON.pro)} PRO</span>` : ""; }
```

with:

```js
  function proBadge(tp) {
    if (!(tp && tp.tier === "pro")) return "";
    // Non-Pro viewers see a lock; Pro viewers see the plain PRO badge.
    const locked = !(IP.pro && IP.pro.isPro());
    return `<span class="pro-badge${locked ? " pro-badge--locked" : ""}">${fa(locked ? "fa-solid fa-lock" : ICON.pro)} PRO</span>`;
  }
```

- [ ] **Step 3: Add `renderPaywall` and guard the topic-open branch**

Add the function just above `renderTopic` (line 219):

```js
  function renderPaywall(id) {
    const tp = PREP.topics[id];
    const title = tp ? t(tp.title) : "";
    return `<div class="fade-in paywall-page">
      <div class="page-head"><h1>${fa("fa-solid fa-lock")} ${title}</h1></div>
      <div class="qr-card paywall-card">
        <div class="pw-badge">${fa(ICON.pro)} ${t(UI.proTopicTitle)}</div>
        <p>${t(UI.proTopicDesc)}</p>
        <button class="btn lg" data-menu-go="upgrade">${fa(ICON.pro)} ${t(UI.proUpgradeCta)}</button>
      </div>
    </div>`;
  }
```

In `render()` (line 1142), replace the topic branch:

```js
    else if (State.topic) main.innerHTML = renderTopic(State.topic);
```

with:

```js
    else if (State.topic) {
      main.innerHTML = (PREP.isProTopic(State.topic) && !IP.pro.isPro())
        ? renderPaywall(State.topic)
        : renderTopic(State.topic);
    }
```

The existing `[data-menu-go="upgrade"]` delegated handler (line 1383) already routes to the upgrade view, so the paywall CTA works with no new handler.

- [ ] **Step 4: Verify the wiring is present**

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -n "renderPaywall\|pro-badge--locked\|isProTopic(State.topic)" assets/js/app.js`
Expected: matches for the new `renderPaywall` definition, its call in `render()`, and the locked-badge class.

- [ ] **Step 5: Manual/Playwright dual-state check**

Per the spec, DOM gates are verified with the Playwright self-audit (memory `reference-playwright-audit`). With `IP.pro.isPro` stubbed to `false`: opening a Pro topic (e.g. `microservices`) must show the paywall (title + "Pro topic" + upgrade button), and its sidebar/home entry shows the lock badge. Stubbed to `true`: the topic body renders normally. Record the result in the task report.

- [ ] **Step 6: Run the full suite (regression guard)**

Run: `node --test tests/*.test.js`
Expected: PASS — 123 tests pass (no new node tests; the suite must stay green).

- [ ] **Step 7: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/js/app.js
git -C /workspaces/interview-prep/Interview-Prepare commit -m "feat(pro): lock Pro topics behind a paywall for non-Pro users"
```

---

### Task 5: G2 — Exclude Pro topics from flashcard & quiz pools for non-Pro users

A locked topic must not be studiable sideways. Flashcards and Quiz build their pools from `PREP.order`; filter that through `IP.gating.visibleTopicPool` for non-Pro users, in both the pool builders and the topic `<select>` option lists.

**Files:**
- Modify: `assets/js/app.js` — `allCards()` (line 889-893), `renderCards()` option list (line 930-931), `buildQuiz()` (line 977-985), `renderQuiz()` option list (line 988-990).

**Interfaces:**
- Consumes: `IP.gating.visibleTopicPool(order, topics, isPro)` (Task 1), `PREP.order`, `PREP.topics`, `IP.pro.isPro()`.
- Produces: a local `studyPool()` helper returning the visible topic-id list for the current user.

- [ ] **Step 1: Add a `studyPool()` helper**

Add just above `allCards()` (line 889):

```js
  // Topic ids the current user may study (Pro topics dropped for non-Pro).
  function studyPool() {
    return IP.gating.visibleTopicPool(PREP.order, PREP.topics, IP.pro && IP.pro.isPro());
  }
```

- [ ] **Step 2: Filter the flashcard pool**

Replace `allCards()` (lines 889-893):

```js
  function allCards() {
    const out = [];
    PREP.order.forEach(id => (PREP.topics[id].flashcards || []).forEach((c, i) => out.push({ key: cardKey(id, i), topicId: id, idx: i, card: c })));
    return out;
  }
```

with:

```js
  function allCards() {
    const out = [];
    studyPool().forEach(id => (PREP.topics[id].flashcards || []).forEach((c, i) => out.push({ key: cardKey(id, i), topicId: id, idx: i, card: c })));
    return out;
  }
```

In `renderCards()` (line 931), replace the option-list source `PREP.order.map(...)`:

```js
      PREP.order.map(id => `<option value="${id}" ${Cards.topic === id ? "selected" : ""}>${t(PREP.topics[id].title)} (${countDue(id)})</option>`).join("");
```

with:

```js
      studyPool().map(id => `<option value="${id}" ${Cards.topic === id ? "selected" : ""}>${t(PREP.topics[id].title)} (${countDue(id)})</option>`).join("");
```

- [ ] **Step 3: Filter the quiz pool**

In `buildQuiz()` (line 980), replace:

```js
    if (topicId === "all") PREP.order.forEach(id => (PREP.topics[id].quiz || []).forEach(q => qs.push({ ...q, _topic: id })));
```

with:

```js
    if (topicId === "all") studyPool().forEach(id => (PREP.topics[id].quiz || []).forEach(q => qs.push({ ...q, _topic: id })));
```

In `renderQuiz()` (line 990), replace the option-list source:

```js
        PREP.order.map(id => `<option value="${id}">${t(PREP.topics[id].title)} (${(PREP.topics[id].quiz || []).length})</option>`).join("");
```

with:

```js
        studyPool().map(id => `<option value="${id}">${t(PREP.topics[id].title)} (${(PREP.topics[id].quiz || []).length})</option>`).join("");
```

- [ ] **Step 4: Verify the wiring is present**

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -n "function studyPool\|studyPool()" assets/js/app.js`
Expected: one definition + four call sites (allCards, renderCards option list, buildQuiz, renderQuiz option list).

- [ ] **Step 5: Manual/Playwright dual-state check**

With `IP.pro.isPro` stubbed `false`: the Flashcards and Quiz topic dropdowns must NOT list any of the 8 Pro topics, and "all" pools must exclude their cards/questions. Stubbed `true`: Pro topics appear. Record the result in the report.

- [ ] **Step 6: Run the full suite (regression guard)**

Run: `node --test tests/*.test.js`
Expected: PASS — 123 tests pass.

- [ ] **Step 7: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/js/app.js
git -C /workspaces/interview-prep/Interview-Prepare commit -m "feat(pro): exclude Pro topics from flashcard/quiz pools for non-Pro users"
```

---

### Task 6: G1 — Lock AI Chat for non-Pro users

The Chat nav button shows a PRO badge; opening Chat as non-Pro renders a locked panel (explainer + upgrade CTA, no input bar, no history fetch). Pro users are unchanged. Signed-out users keep the existing sign-in prompt.

**Files:**
- Modify: `assets/js/app.js` — `renderChat()` (line 417-436); `render()` to sync the nav badge (line 1145 area); add UI strings.

**Interfaces:**
- Consumes: `IP.auth.getUser()`, `IP.pro.isPro()`, `t`, `fa`, `ICON.pro`, `IP.chat.getHistory()`.
- Produces: a `syncChatNavBadge()` helper toggling a `.pro-badge` inside `[data-mode="chat"]`.

- [ ] **Step 1: Add Chat-lock UI strings**

In the `UI` object, add after the `chatUpgradeCta` line (139):

```js
    chatProTitle: { vi: "Chat AI là tính năng Pro", en: "AI Chat is a Pro feature" },
    chatProDesc: { vi: "Trợ lý AI song ngữ giúp bạn luyện phỏng vấn, giải thích khái niệm và góp ý CV. Nâng cấp Pro để mở khoá.", en: "The bilingual AI assistant helps you rehearse interviews, explain concepts and review your CV. Upgrade to Pro to unlock it." },
```

- [ ] **Step 2: Add the locked-panel branch to `renderChat`**

`renderChat()` currently starts (lines 417-423) with a signed-out guard. Insert a Pro guard immediately after it. Replace:

```js
  function renderChat() {
    if (!(IP.auth && IP.auth.getUser())) {
      return `<div class="fade-in chat-page">
        <div class="empty-hint">${t(UI.chatSignIn)}</div>
        <button class="btn lg" onclick="IP.auth.signInWithGoogle()">${t(UI.signIn)}</button>
      </div>`;
    }
    const msgs = IP.chat.getHistory();
```

with:

```js
  function renderChat() {
    if (!(IP.auth && IP.auth.getUser())) {
      return `<div class="fade-in chat-page">
        <div class="empty-hint">${t(UI.chatSignIn)}</div>
        <button class="btn lg" onclick="IP.auth.signInWithGoogle()">${t(UI.signIn)}</button>
      </div>`;
    }
    if (!IP.pro.isPro()) {
      return `<div class="fade-in chat-page">
        <div class="qr-card paywall-card">
          <div class="pw-badge">${fa(ICON.pro)} ${t(UI.chatProTitle)}</div>
          <p>${t(UI.chatProDesc)}</p>
          <button class="btn lg" data-menu-go="upgrade">${fa(ICON.pro)} ${t(UI.proUpgradeCta)}</button>
        </div>
      </div>`;
    }
    const msgs = IP.chat.getHistory();
```

This returns before `IP.chat.getHistory()`, so no history is fetched and no input bar is rendered for non-Pro. (`UI.proUpgradeCta` is added in Task 4; both tasks touch the same `UI` block — if executed out of order, add the key here.)

- [ ] **Step 3: Add and call the nav-badge sync**

Add the helper near `renderChat` (after line 436):

```js
  // Show a PRO badge on the Chat tab for non-Pro users; remove it for Pro.
  function syncChatNavBadge() {
    const btn = document.querySelector('[data-mode="chat"]');
    if (!btn) return;
    const locked = IP.auth && IP.auth.getUser() && !(IP.pro && IP.pro.isPro());
    let badge = btn.querySelector(".pro-badge");
    if (locked && !badge) {
      badge = document.createElement("span");
      badge.className = "pro-badge pro-badge--locked";
      badge.innerHTML = `${fa("fa-solid fa-lock")} PRO`;
      btn.appendChild(badge);
    } else if (!locked && badge) {
      badge.remove();
    }
  }
```

In `render()`, call it right after the modes-button active-sync (line 1145). Replace:

```js
    document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("active", b.dataset.mode === State.mode));
    renderSidebar();
```

with:

```js
    document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("active", b.dataset.mode === State.mode));
    syncChatNavBadge();
    renderSidebar();
```

- [ ] **Step 4: Verify the wiring is present**

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -n "syncChatNavBadge\|chatProTitle\|!IP.pro.isPro()" assets/js/app.js`
Expected: helper definition + call in `render()`, the new string, and the `renderChat` guard.

- [ ] **Step 5: Manual/Playwright dual-state check**

With `IP.pro.isPro` stubbed `false` (signed in): Chat tab shows a lock+PRO badge; opening Chat shows the locked panel with no textarea/send button. Stubbed `true`: badge gone, chat works. Signed out: existing sign-in prompt (unchanged). Record the result.

- [ ] **Step 6: Run the full suite (regression guard)**

Run: `node --test tests/*.test.js`
Expected: PASS — 123 tests pass. (`tests/chat.test.js` tests the pure `IP.chat` module, which is untouched.)

- [ ] **Step 7: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/js/app.js
git -C /workspaces/interview-prep/Interview-Prepare commit -m "feat(pro): gate AI Chat behind Pro with lock badge + upsell panel"
```

---

### Task 7: G3 — Gate the Gmail suite (bell, Reminders, Settings card) for non-Pro

Hide the notification bell and the Reminders menu entry for non-Pro users, guard the `reminders` mode so a stale saved view can't reach it, and replace the functional Settings Gmail card with a locked upsell card.

**Files:**
- Modify: `assets/js/app.js` — `updateAuthUI()` bell visibility (line 1726-1728); add reminders-menu hide in `updateAuthUI`; `reminders` mode guard in `render()` (line 1140); Settings `gmailBlock` (line 377-390); reminders-menu click handler (line 1353-1356); add UI strings.

**Interfaces:**
- Consumes: `IP.pro.isPro()`, `IP.auth.getUser()`, `State.mode`, `t`, `fa`.
- Produces: no new exported symbols. `updateAuthUI` now also gates the Reminders menu button and bell on `isPro()`; `render()` redirects `reminders` mode to home for non-Pro.

- [ ] **Step 1: Add Gmail-lock UI strings**

In the `UI` object, add (after the `gmailBlurb` line, ~155):

```js
    gmailProTitle: { vi: "Đồng bộ Gmail là tính năng Pro", en: "Gmail sync is a Pro feature" },
    gmailProDesc: { vi: "Tự động phát hiện email tuyển dụng, tạo lịch nhắc phỏng vấn/bài test và thông báo. Nâng cấp Pro để bật.", en: "Auto-detect recruiting emails, create interview/test reminders and notifications. Upgrade to Pro to enable." },
```

- [ ] **Step 2: Gate the bell + Reminders menu in `updateAuthUI`**

Replace the bell block (lines 1726-1728):

```js
    const bell = document.getElementById("bellBtn");
    if (bell) bell.hidden = !on;
    if (on) refreshBell();
```

with:

```js
    const proOn = on && IP.pro.isPro();
    const bell = document.getElementById("bellBtn");
    if (bell) bell.hidden = !proOn;
    const remBtn = document.querySelector('[data-menu="reminders"]');
    if (remBtn) remBtn.hidden = !proOn;
    if (proOn) refreshBell();
```

`updateAuthUI` is already re-invoked on `IP.pro.onChange` (entitlement change re-evaluates these), so a purchase unlocks the bell/Reminders without reload.

- [ ] **Step 3: Guard the `reminders` mode in `render()`**

In `render()` (line 1140), replace:

```js
    else if (State.mode === "reminders") main.innerHTML = renderReminders();
```

with:

```js
    else if (State.mode === "reminders") {
      if (!IP.pro.isPro()) { State.mode = "learn"; State.topic = null; main.innerHTML = renderHome(); }
      else main.innerHTML = renderReminders();
    }
```

This catches a stale saved view / hash that lands on `reminders` when the user is not Pro.

- [ ] **Step 4: Also guard the reminders menu click**

In the profile-menu handler (lines 1353-1356), replace:

```js
        } else if (action === "reminders") {
          State.mode = "reminders"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
          loadReminders();
```

with:

```js
        } else if (action === "reminders") {
          pMenu.hidden = true;
          if (!IP.pro.isPro()) { State.mode = "upgrade"; State.topic = null; render(); toTop(); saveView(); loadUpgradeData(); return; }
          State.mode = "reminders"; State.topic = null;
          render(); toTop(); saveView();
          loadReminders();
```

(The button is hidden for non-Pro from Step 2; this is defense-in-depth against a stale DOM.)

- [ ] **Step 5: Replace the Settings Gmail card with a locked upsell for non-Pro**

In `renderSettings()`, replace the `gmailBlock` IIFE (lines 377-390):

```js
    const gmailBlock = u ? (() => {
      if (!GmailSettings.loaded) loadGmailStatus();
      const st = GmailSettings.status;
      const connected = !!(st && st.connected);
      const scanTxt = st && st.last_scan ? new Date(st.last_scan).toLocaleString(L === "vi" ? "vi-VN" : "en-US") : (L === "vi" ? "chưa quét" : "not yet");
      return `<div class="settings-block gmail-block">
        <div class="sb-head"><h2>${fa("fa-solid fa-envelope")} Gmail</h2></div>
        <div class="di-desc">${t(UI.gmailBlurb)}</div>
        ${connected
          ? `<div class="gmail-connected-row"><span class="status-pill approved">${t(UI.gmailConnected)}</span> <span class="gmail-meta">${esc(st.email || "")} · ${L === "vi" ? "quét lần cuối" : "last scan"} ${esc(scanTxt)}</span></div>
             <button class="btn danger-btn" id="gmailDisconnectBtn">${t(UI.gmailDisconnect)}</button>`
          : `<button class="btn" id="gmailConnectBtn">${fa("fa-solid fa-envelope")} ${t(UI.gmailConnect)}</button>`}
      </div>`;
    })() : "";
```

with:

```js
    const gmailBlock = u ? (() => {
      // Non-Pro: a discoverable but locked upsell — no status fetch, no connect.
      if (!IP.pro.isPro()) {
        return `<div class="settings-block gmail-block gmail-block--locked">
          <div class="sb-head"><h2>${fa("fa-solid fa-lock")} Gmail</h2><span class="pro-badge pro-badge--locked">${fa(ICON.pro)} PRO</span></div>
          <div class="di-desc">${t(UI.gmailProTitle)}</div>
          <div class="di-desc">${t(UI.gmailProDesc)}</div>
          <button class="btn" data-menu-go="upgrade">${fa(ICON.pro)} ${t(UI.proUpgradeCta)}</button>
        </div>`;
      }
      if (!GmailSettings.loaded) loadGmailStatus();
      const st = GmailSettings.status;
      const connected = !!(st && st.connected);
      const scanTxt = st && st.last_scan ? new Date(st.last_scan).toLocaleString(L === "vi" ? "vi-VN" : "en-US") : (L === "vi" ? "chưa quét" : "not yet");
      return `<div class="settings-block gmail-block">
        <div class="sb-head"><h2>${fa("fa-solid fa-envelope")} Gmail</h2></div>
        <div class="di-desc">${t(UI.gmailBlurb)}</div>
        ${connected
          ? `<div class="gmail-connected-row"><span class="status-pill approved">${t(UI.gmailConnected)}</span> <span class="gmail-meta">${esc(st.email || "")} · ${L === "vi" ? "quét lần cuối" : "last scan"} ${esc(scanTxt)}</span></div>
             <button class="btn danger-btn" id="gmailDisconnectBtn">${t(UI.gmailDisconnect)}</button>`
          : `<button class="btn" id="gmailConnectBtn">${fa("fa-solid fa-envelope")} ${t(UI.gmailConnect)}</button>`}
      </div>`;
    })() : "";
```

The non-Pro branch never calls `loadGmailStatus()`, so no Gmail status request fires for free users. (`UI.proUpgradeCta` comes from Task 4.)

- [ ] **Step 6: Verify the wiring is present**

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -n "gmail-block--locked\|data-menu=\"reminders\"\|proOn\|renderHome(); }\s*$" assets/js/app.js`
Expected: matches for the locked Gmail card, the reminders-menu selector in `updateAuthUI`, the `proOn` gating, and the reminders-mode redirect.

- [ ] **Step 7: Manual/Playwright dual-state check**

With `IP.pro.isPro` stubbed `false` (signed in): the topbar bell is hidden, the "Reminders" profile-menu item is hidden, forcing `State.mode="reminders"` (e.g. via a stale saved view) lands on Home, and Settings shows the locked Gmail upsell card (no connect button, no status request). Stubbed `true`: bell visible, Reminders item visible and working, Settings shows the functional Gmail card. Record the result.

- [ ] **Step 8: Run the full suite (regression guard)**

Run: `node --test tests/*.test.js`
Expected: PASS — 123 tests pass. (`tests/gmail.test.js` tests the pure `IP.gmail` client, untouched.)

- [ ] **Step 9: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/js/app.js
git -C /workspaces/interview-prep/Interview-Prepare commit -m "feat(pro): gate Gmail suite (bell, Reminders, Settings card) behind Pro"
```

---

### Task 8: Path scoping (A) — home & sidebar show only the current path

Home and sidebar list only the current path's topics; remove the "browse all" affordance and `State.browseAll`; "Change path" opens the onboarding picker; a user with no track lands on the picker.

**Files:**
- Modify: `assets/js/app.js` — `State` (line 85, remove `browseAll`); `renderHome()` category grouping (lines 826-839); `renderSidebar()` (lines 1042-1104, remove browse-all branch + "All topics" item); the browse-all/track-mode/change-track click handlers (lines 1419-1428); the `change-track` menu handler (line 1345) and boot restore (line ~1845, any `browseAll` reference).

**Interfaces:**
- Consumes: `currentTrack()`, `IP.tracks.resolveItems(track, validIds)`, `PREP.order`, `PREP.topics`, `CATS`, `catIcon`, `proBadge`, `State.track`, `IP.onboarding.shouldShow()`.
- Produces: `renderHome` and `renderSidebar` render only path topics; `State.browseAll` and its handlers are removed.

- [ ] **Step 1: Add a `pathTopicIds()` helper**

Add just above `renderHome()` (line 818):

```js
  // Topic ids in the current path, in track order. No track → empty (the
  // onboarding picker is shown instead, so this is only read when a track exists).
  function pathTopicIds() {
    const track = currentTrack();
    return track ? IP.tracks.resolveItems(track, PREP.order) : [];
  }
```

- [ ] **Step 2: Scope `renderHome` category grid to the path**

In `renderHome()`, replace the `groupsHtml` block (lines 826-839) so each category lists only path topics, and categories with no path topics are dropped:

```js
    const pathIds = pathTopicIds();
    const inPath = new Set(pathIds);
    const groupsHtml = CATS.map(cat => {
      const ids = pathIds.filter(id => PREP.topics[id] && PREP.topics[id].category === cat.id);
      if (!ids.length) return "";
      const cardsHtml = ids.map(id => { const tp = PREP.topics[id]; return `
      <div class="tcard ${State.progress[id] ? "done" : ""}" data-go="${id}">
        <div class="tc-done">${fa(ICON.check)}</div>
        <div class="tc-icon">${fa(catIcon(tp))}</div>
        <h3>${t(tp.title)}</h3>${proBadge(tp)}
        <p>${t(tp.blurb)}</p>
        <div class="tc-meta"><span>${fa(ICON.cardsCount)} ${(tp.flashcards || []).length}</span><span>${fa(ICON.quizCount)} ${(tp.quiz || []).length}</span></div>
      </div>`; }).join("");
      return `<div class="home-cat"><div class="home-cat-head">${fa(ICON[cat.id] || "fa-solid fa-book")} <span>${t(cat)}</span><span class="hc-count">${ids.length}</span></div>
        <div class="home-grid">${cardsHtml}</div></div>`;
    }).join("");
```

(The `inPath` set is unused after this; do not add it — keep only `pathIds`. Remove the `inPath` line if you pasted it.) The top-of-`renderHome` stat counters (`total`, `learned`, `totalCards`, etc., lines 819-824) may stay as whole-catalog stats — the spec scopes the topic *grid*, not the stat tiles. Leave them unchanged.

- [ ] **Step 3: Simplify `renderSidebar` to path-only**

`render()` only shows the sidebar in `learn` mode, and `renderLanding`/onboarding short-circuit `render()` before the sidebar. Since a user with no track always sees the onboarding picker (Step 5), the sidebar's "no track" branch is dead. Replace the whole body of `renderSidebar()` (lines 1033-1105) with the track-only rendering, dropping the browse-all branch and the "All topics →" item:

```js
  function renderSidebar() {
    const sb = document.getElementById("sidebar");
    const L = State.lang;

    // Topic sidebar is a Learn-mode-only affordance — clear it in every other
    // mode so no stale list lingers behind the hidden column.
    if (State.mode !== "learn") { sb.innerHTML = ""; return; }

    // Path-scoped: always the current track's topics. A user with no track sees
    // the onboarding picker (render() short-circuits before this).
    const track = currentTrack();
    if (!track) { sb.innerHTML = ""; return; }
    const items = IP.tracks.resolveItems(track, validTopicIds());
    const prog = IP.tracks.progressOf(track, State.progress, validTopicIds());
    const role = (PREP.roles || []).find(r => r.id === State.track.role) || {};
    const roleIcon = role.icon || ICON.swe || "fa-solid fa-code";
    const pct = prog.pct;

    let html = `<div class="track-card">
      <div class="tk-top">
        <span class="tk-ic">${fa(roleIcon)}</span>
        <span class="tk-name">${roleLabel()}</span>
        <button class="tk-change" data-change-track="1">${fa(ICON.change)} ${L === "vi" ? "Đổi" : "Change"}</button>
      </div>
      <div class="tk-bar-wrap">
        <div class="tk-bar"><div class="tk-bar-fill" style="width:${pct}%"></div></div>
        <span class="tk-num">${prog.done}/${prog.total}</span>
      </div>
    </div>`;

    items.forEach((id, idx) => {
      const tp = PREP.topics[id];
      if (!tp) return;
      const done = !!State.progress[id];
      const current = State.mode === "learn" && State.topic === id;
      html += `<div class="nav-item ${current ? "active" : ""} ${done ? "done" : ""}" data-topic="${id}">
        <span class="ni-num">${idx + 1}</span>
        <span class="ni-icon">${fa(catIcon(tp))}</span>
        <span class="ni-label">${t(tp.title)}</span>${proBadge(tp)}<span class="ni-check">${fa(ICON.check)}</span></div>`;
    });

    sb.innerHTML = html;
  }
```

- [ ] **Step 4: Make "Change path" open the picker; remove browse-all handlers**

In the sidebar-nav click handlers (lines 1419-1428), the `data-browse-all` and `data-track-mode` branches are now dead (those elements no longer render). Replace the three branches:

```js
      // track nav branches
      if (e.target.closest("[data-browse-all]")) {
        State.browseAll = true; State.topic = null; render(); return;
      }
      if (e.target.closest("[data-track-mode]")) {
        State.browseAll = false; render(); return;
      }
      if (e.target.closest("[data-change-track]")) {
        State.track = null; LS.set("track", null);
        State.topic = null; State.browseAll = false; render(); return;
      }
```

with:

```js
      // "Change path" → clear the track so the onboarding picker takes over.
      if (e.target.closest("[data-change-track]")) {
        State.track = null; LS.set("track", null);
        State.topic = null; render(); return;
      }
```

- [ ] **Step 5: Remove `State.browseAll` and its remaining references**

- In `State` (line 85), delete the line: `browseAll: false, // true = show category sidebar even when track set`.
- In the `change-track` profile-menu handler (line 1345), replace `State.topic = null; State.browseAll = false;` with `State.topic = null;`.
- Search for any other `browseAll` reference and remove it:

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -n "browseAll" assets/js/app.js`
Expected after edits: **no matches**. If a boot/restore line (~1845) references `browseAll`, delete that reference too.

Clearing the track already triggers the picker: `render()` calls `IP.onboarding.shouldShow()` (true when no `track` in the store, line 1127) and renders the picker. `IP.onboarding.onPick` writes the track and re-renders — no extra wiring needed. Confirm the onboarding pick path is registered:

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -n "onboarding.onPick\|shouldShow()" assets/js/app.js`
Expected: an `IP.onboarding.onPick(...)` registration exists and `shouldShow()` is checked in `render()` (line 1127) and at boot (line 75).

- [ ] **Step 6: Verify no stray browse-all UI remains**

Run: `cd /workspaces/interview-prep/Interview-Prepare && grep -n "data-browse-all\|data-track-mode\|all-topics-item\|browseAll\|State.browseAll" assets/js/app.js`
Expected: **no matches**.

- [ ] **Step 7: Manual/Playwright dual-state check**

Signed in with a track: Home grid and sidebar show ONLY the current path's topics (verify count matches the track's item list). "Change" / "Change path" opens the onboarding picker. Picking a role/level shows that path. A brand-new user (no track / after clearing) lands directly on the picker. Confirm no "All topics →" entry and no "browse all" grid anywhere. Record the result.

- [ ] **Step 8: Run the full suite (regression guard)**

Run: `node --test tests/*.test.js`
Expected: PASS — 123 tests pass.

- [ ] **Step 9: Commit**

```bash
git -C /workspaces/interview-prep/Interview-Prepare add assets/js/app.js
git -C /workspaces/interview-prep/Interview-Prepare commit -m "feat(paths): scope home + sidebar to current path; remove browse-all"
```

---

## Notes for the executor

- **Line numbers drift.** After Task 4 adds `renderPaywall` and UI strings, later line references shift. Anchor every edit on the quoted code, not the line number.
- **Shared `UI` block.** Tasks 4, 6, 7 each add keys to the same `Object.assign(IP.i18n.STR, {...})` block, and `UI.proUpgradeCta` (Task 4) is reused by Tasks 6 & 7. If tasks run out of order, ensure the key exists before use.
- **`data-menu-go="upgrade"`** is an existing delegated handler (app.js ~1383) that routes to the upgrade view — every paywall/upsell CTA in this plan reuses it; no new click handlers are needed.
- **No CSS is strictly required** — reused classes (`.pro-badge`, `.qr-card`, `.btn`, `.settings-block`) already exist. New modifier classes (`.pro-badge--locked`, `.paywall-page`, `.paywall-card`, `.pw-badge`, `.gmail-block--locked`) will inherit base styles; if the visual polish needs dedicated rules, add them to the stylesheet in the same task, but that is optional and out of the spec's required scope.
- **Server enforcement is authoritative.** These are UI gates only; do not remove or weaken the chat-quota, Gmail edge-function, or `pro_content` RLS enforcement.
