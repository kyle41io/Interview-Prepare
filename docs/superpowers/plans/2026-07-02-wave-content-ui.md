# Wave W1+W2 — AI Engineer Content + UI/UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bật track AI Engineer với 6 topic mới song ngữ, và nâng cấp UX: cheat-sheet thành trang riêng, TOC trong bài, copy code, Home gọn, typography chuyên nghiệp.

**Architecture:** Thuần content + frontend trên kiến trúc hiện có (`window.PREP` data self-register, `window.IP.*`, app.js render). Không backend, không build step. Content theo schema bilingual chuẩn; UI mới là hàm render + CSS token-based trong app.js/styles.css.

**Tech Stack:** HTML/CSS/Vanilla JS (no build), `node --test` (giữ 42/42), `node --check` + smoke-load cho data files.

## Global Constraints

- **No build step**: chỉ `<script>`/`<link>`; `index.html` mở trực tiếp được sau MỌI commit.
- **Repo scope**: chỉ repo `Interview-Prepare/`, nhánh `handbook-wave-content-ui`. Commit theo feature (conventional commits), mỗi task = 1 commit.
- **Bilingual bắt buộc**: mọi text node trong data là `{vi,en}`; mọi chuỗi UI mới qua `t()`/ternary `L==="vi"` theo pattern hiện có.
- **Content schema** (y hệt `assets/data/nodejs.js`): `PREP.register({id, icon:"<emoji>", category, title:{vi,en}, blurb:{vi,en}, sections:[{id,title:{vi,en},blocks:[...]}], flashcards:[{front:{vi,en},back:{vi,en}}], quiz:[{q:{vi,en},options:[4×{vi,en}],answer:<0-based>,explain:{vi,en}}]})`. Block types: `prose|list|table|code|callout` (callout variant `tip|warning|key|info|soundbite`). Escape `<`/`>` thành `&lt;`/`&gt;` trong text HTML; `code.code` là plain string `\n`.
- **Verify content**: mỗi file mới phải pass `node --check` VÀ smoke-load (script §Task 1 Step 3) trước khi commit.
- **Test suite**: `node --test tests/` phải giữ **42/42** sau mọi task.
- **CSS**: thêm cuối `styles.css`, chỉ dùng token `var(--…)`, hoạt động cả light + dark; `[hidden]` override khi element có display riêng.
- **Line numbers trong plan là ước lượng** — LUÔN locate điểm sửa bằng content (grep chuỗi neo), không tin số dòng.

---

## File Structure

**Tạo mới:** `assets/data/python-ai.js`, `ml-foundations.js`, `dl-nlp.js`, `llms.js`, `rag.js`, `ai-engineering.js`.
**Sửa:** `index.html` (6 script tag), `assets/data/tracks.js` (bật ai-engineer), `assets/js/app.js` (CATS+ICON, renderCheatsheet, TOC/copy, renderHome mới), `assets/css/styles.css` (cheat page, TOC, copy btn, home, typography).

---

## Task 1: Content — `python-ai` + `ml-foundations`

**Files:** Create `assets/data/python-ai.js`, `assets/data/ml-foundations.js`; Modify `index.html` (thêm 2 script sau `<script src="assets/data/ecommerce.js"></script>`, TRƯỚC `tracks.js`).

**Interfaces:** Produces topic id `python-ai`, `ml-foundations` — category **`ai`** (category này được thêm vào CATS ở Task 4; trước đó topic vẫn hiện ở Home grid/search nhờ fallback, chấp nhận trạng thái interim).

- [ ] **Step 1: Author `python-ai`** — id `python-ai`, icon 🐍, category `ai`, title `{vi:"Python cho AI & Backend", en:"Python for AI & Backend"}`. 8 sections: (1) Vì sao Python cho AI + chạy code/REPL; (2) Biến, kiểu, chuỗi, f-string; (3) List/Tuple/Dict/Set + comprehension (bảng chọn cấu trúc); (4) Hàm, *args/**kwargs, lambda, scope; (5) OOP nhanh: class, dunder, dataclass; (6) Exception + context manager; (7) venv/pip/requirements + typing cơ bản; (8) numpy/pandas căn bản (array/DataFrame, vectorization) + async sơ lược. Mỗi section ≥1 `code` Python ngắn khi hợp lý; ~11 flashcards; ~10 quiz; kết topic bằng callout `soundbite` (câu chốt phỏng vấn).
- [ ] **Step 2: Author `ml-foundations`** — id `ml-foundations`, icon 📊, category `ai`, title `{vi:"Machine Learning Foundations", en:"Machine Learning Foundations"}`. 9 sections: (1) ML là gì, supervised vs unsupervised vs RL (bảng); (2) Quy trình: data→features→train→eval→deploy; (3) Train/val/test split, cross-validation, data leakage; (4) Bias-variance, overfitting/underfitting + regularization (L1/L2, early stopping); (5) Metrics: accuracy/precision/recall/F1/AUC, confusion matrix (bảng khi nào dùng gì); (6) Linear & logistic regression trực giác; (7) Tree/Random Forest/Gradient Boosting (so sánh); (8) Unsupervised: k-means, PCA; (9) Feature engineering + class imbalance. ~12 flashcards; ~10 quiz; kết `soundbite`.
- [ ] **Step 3: Verify cả hai**

```bash
node --check assets/data/python-ai.js && node --check assets/data/ml-foundations.js
cat > /tmp/vw.js <<'EOF'
global.PREP={topics:{},order:[],register(t){this.topics[t.id]=t;this.order.push(t.id);}};
for (const f of process.argv.slice(2)) (0,eval)(require("fs").readFileSync(f,"utf8"));
for (const id of Object.keys(PREP.topics)) { const t=PREP.topics[id];
  console.log(id, "cat="+t.category, "sec="+t.sections.length, "fc="+t.flashcards.length, "quiz="+t.quiz.length,
   (t.title.vi&&t.title.en&&t.sections.every(s=>s.title.vi&&s.title.en))?"OK":"BAD"); }
EOF
node /tmp/vw.js assets/data/python-ai.js assets/data/ml-foundations.js
```
Expected: cả hai `OK`, category `ai`, sec/fc/quiz đạt số lượng.

- [ ] **Step 4: Nạp trong `index.html`** — sau dòng `<script src="assets/data/ecommerce.js"></script>`:
```html
<script src="assets/data/python-ai.js"></script>
<script src="assets/data/ml-foundations.js"></script>
```
- [ ] **Step 5: Commit** — `git add assets/data/python-ai.js assets/data/ml-foundations.js index.html && git commit -m "content(ai): add Python for AI and ML Foundations topics"`

## Task 2: Content — `dl-nlp` + `llms`

**Files:** Create `assets/data/dl-nlp.js`, `assets/data/llms.js`; Modify `index.html` (2 script sau `ml-foundations.js`).

**Interfaces:** Produces topic id `dl-nlp`, `llms`, category `ai`.

- [ ] **Step 1: Author `dl-nlp`** — icon 🧠, title `{vi:"Deep Learning & NLP", en:"Deep Learning & NLP"}`. 8 sections: (1) Từ ML→DL: neuron, MLP, vì sao "deep"; (2) Backprop + gradient descent trực giác (không đạo hàm nặng); (3) Activation/loss/optimizer (bảng chọn); (4) CNN & RNN/LSTM ngắn gọn — dùng khi nào, hạn chế; (5) **Transformer & self-attention** (giải thích trực giác Q/K/V, positional encoding, vì sao thắng RNN); (6) Tokenization (BPE) + embeddings (word2vec→contextual); (7) Transfer learning & fine-tuning; (8) Training thực tế: batch, LR schedule, GPU, khi nào không cần DL. ~11 fc; ~10 quiz; `soundbite`.
- [ ] **Step 2: Author `llms`** — icon 🤖, title `{vi:"Large Language Models (LLMs)", en:"Large Language Models (LLMs)"}`. 9 sections: (1) LLM là gì, next-token prediction, scaling; (2) Pipeline huấn luyện: pretraining→SFT→RLHF/alignment; (3) Context window, token & chi phí (bảng ước lượng); (4) Sampling: temperature/top-p, vì sao output khác nhau; (5) Hallucination: nguyên nhân + giảm thiểu (grounding, citations); (6) Prompt vs Fine-tune vs RAG — bảng quyết định; (7) Đánh giá LLM: benchmark, LLM-as-judge, human eval; (8) Function calling / structured output / agents khái niệm; (9) An toàn & giới hạn: injection, jailbreak, data privacy. ~12 fc; ~10 quiz; `soundbite`.
- [ ] **Step 3: Verify** — `node --check` cả hai + `node /tmp/vw.js assets/data/dl-nlp.js assets/data/llms.js` → OK.
- [ ] **Step 4: Nạp `index.html`** (2 script tiếp theo, giữ thứ tự trước `tracks.js`).
- [ ] **Step 5: Commit** — `git add assets/data/dl-nlp.js assets/data/llms.js index.html && git commit -m "content(ai): add Deep Learning & NLP and LLMs topics"`

## Task 3: Content — `rag` + `ai-engineering`

**Files:** Create `assets/data/rag.js`, `assets/data/ai-engineering.js`; Modify `index.html` (2 script sau `llms.js`).

**Interfaces:** Produces topic id `rag`, `ai-engineering`, category `ai`.

- [ ] **Step 1: Author `rag`** — icon 📚, title `{vi:"RAG — Retrieval-Augmented Generation", en:"RAG — Retrieval-Augmented Generation"}`. 8 sections: (1) Vì sao RAG (knowledge cutoff, private data, hallucination); (2) Kiến trúc tổng: ingest→index→retrieve→augment→generate (code pseudo-flow); (3) Chunking chiến lược (size/overlap/semantic — bảng trade-off); (4) Embeddings & vector DB (cosine, HNSW khái niệm, chọn DB); (5) Retrieval: dense vs sparse (BM25) vs hybrid + rerank; (6) Ráp prompt: context stuffing, citation, "I don't know"; (7) Đánh giá RAG: faithfulness/answer relevance/context recall; (8) Pitfalls & production: stale index, chunk boundary, cost, caching. ~11 fc; ~10 quiz; `soundbite`.
- [ ] **Step 2: Author `ai-engineering`** — icon 🛠, title `{vi:"AI Engineering thực chiến", en:"Practical AI Engineering"}`. 9 sections: (1) AI Engineer làm gì (khác ML researcher/data scientist — bảng); (2) Prompt engineering patterns: role, few-shot, CoT, delimiters (ví dụ code); (3) Structured output + validate JSON schema; (4) Function calling & agent loop (tool→result→tiếp, ví dụ pseudo); (5) Guardrails: input/output filtering, injection defense, scope limiting; (6) Cost & latency: caching, model tiering, batch, token budget; (7) Serving & monitoring: API design, streaming, fallback provider, logging/eval liên tục (MLOps-lite); (8) Testing hệ AI: eval set, regression, A/B; (9) Ethics & trách nhiệm ngắn: bias, privacy, transparency. ~11 fc; ~10 quiz; `soundbite`.
- [ ] **Step 3: Verify** — `node --check` + `node /tmp/vw.js ...` cả hai → OK.
- [ ] **Step 4: Nạp `index.html`**.
- [ ] **Step 5: Commit** — `git add assets/data/rag.js assets/data/ai-engineering.js index.html && git commit -m "content(ai): add RAG and Practical AI Engineering topics"`

## Task 4: Bật track AI Engineer + category "AI & Data"

**Files:** Modify `assets/js/app.js` (CATS + ICON), `assets/data/tracks.js`.

**Interfaces:** Consumes 6 topic id Task 1–3. Produces category `ai` hiển thị sidebar/home; track `ai-engineer` chọn được từ onboarding.

- [ ] **Step 1: CATS** — trong `const CATS = [` (locate bằng grep `const CATS`), chèn sau dòng `backend`:
```js
    { id: "ai", icon: "🤖", vi: "AI & Data", en: "AI & Data" },
```
- [ ] **Step 2: ICON** — trong object `ICON` (grep `devops: "fa-solid fa-cloud"`), thêm cạnh các category icons:
```js
    ai: "fa-solid fa-robot",
```
- [ ] **Step 3: tracks.js** — (a) role: dòng `{ id: "ai-engineer", ... comingSoon: true }` → XOÁ `, comingSoon: true`; (b) track `ai-engineer`: thay `blurb` thành `{ vi: "Nền tảng AI thực chiến: Python, ML, LLMs, RAG và kỹ nghệ AI.", en: "Practical AI foundations: Python, ML, LLMs, RAG and AI engineering." }` và `items: ["python-ai","ml-foundations","dl-nlp","llms","rag","ai-engineering","system-design","behavioral"]`, xoá `, comingSoon: true`.
- [ ] **Step 4: Verify** — `node --check` 2 file; `node --test tests/` 42/42; mở app: onboarding (xoá `ip_track` DevTools) hiện AI Engineer chọn được → sidebar track 8 mục; category "AI & Data" trong chế độ browse-all.
- [ ] **Step 5: Commit** — `git add assets/js/app.js assets/data/tracks.js && git commit -m "feat: activate AI Engineer track + AI & Data category"`

## Task 5: Cheat sheet → trang riêng

**Files:** Modify `assets/js/app.js`, `index.html` (menu item), `assets/css/styles.css`.

**Interfaces:** Produces mode `"cheat"`, hàm `renderCheatsheet()`, helper `collectCheats()`. Home không còn danh sách cheat dài.

- [ ] **Step 1: Tách collector** — trong `renderHome` (grep `// cheat sheet = collect soundbites`), XOÁ khối tính `cheats`/`cheatHtml` VÀ khối render cuối `${cheats.length ? ...}` khỏi return. Thêm hàm mới TRÊN `renderHome`:
```js
  function collectCheats(trackOnly) {
    const ids = (trackOnly && State.track) ? IP.tracks.resolveItems(currentTrack(), PREP.order) : PREP.order;
    const groups = [];
    ids.forEach(id => {
      const tp = PREP.topics[id]; if (!tp) return;
      const items = [];
      (tp.sections || []).forEach(s => (s.blocks || []).forEach(b => {
        if (b.type === "callout" && b.variant === "soundbite") items.push(b);
      }));
      if (items.length) groups.push({ id, title: tp.title, icon: catIcon(tp), items });
    });
    return groups;
  }
```
- [ ] **Step 2: `renderCheatsheet()`** — thêm cạnh `renderSaved` (grep `function renderSaved`):
```js
  function renderCheatsheet() {
    const L = State.lang;
    const trackOnly = State.track ? uiGet("cheatTrackOnly", true) : false;
    const groups = collectCheats(trackOnly);
    const totalN = groups.reduce((n, g) => n + g.items.length, 0);
    const open = uiGet("cheatOpen", {});
    const rows = groups.map(g => `
      <div class="cheat-group ${open[g.id] ? "open" : ""}" data-cheat-group="${g.id}">
        <button class="cg-head" data-cheat-toggle="${g.id}">
          <span class="cg-ic">${fa(g.icon)}</span><span class="cg-title">${t(g.title)}</span>
          <span class="cg-count">${g.items.length}</span><span class="cg-chev">${fa("fa-solid fa-chevron-down")}</span>
        </button>
        <div class="cg-body">${g.items.map(b => `<div class="cheat-text">"${t(b)}"</div>`).join("")}</div>
      </div>`).join("");
    return `<div class="fade-in cheat-page">
      <div class="page-head"><h1>🎯 ${L === "vi" ? "Cheat sheet ngày phỏng vấn" : "Interview-day cheat sheet"}</h1>
        <div class="blurb">${totalN} ${L === "vi" ? "câu \"ăn điểm\" — đọc lướt trước khi vào phỏng vấn." : "soundbites — skim before you walk in."}</div></div>
      <div class="cheat-bar">
        ${State.track ? `<label class="cheat-filter"><input type="checkbox" id="cheatTrackOnly" ${trackOnly ? "checked" : ""}> ${L === "vi" ? "Chỉ lộ trình của tôi" : "My track only"}</label>` : ""}
        <span class="spacer"></span>
        <button class="btn subtle" id="cheatExpandAll">${L === "vi" ? "Mở tất cả" : "Expand all"}</button>
        <button class="btn subtle" id="cheatCollapseAll">${L === "vi" ? "Gập tất cả" : "Collapse all"}</button>
      </div>
      ${rows || `<div class="empty-hint">${L === "vi" ? "Chưa có câu nào." : "Nothing here yet."}</div>`}
    </div>`;
  }
```
- [ ] **Step 3: Wire dispatch + restore + handlers**
  (a) `render()` dispatch (grep `State.mode === "settings"`): thêm nhánh `else if (State.mode === "cheat") main.innerHTML = renderCheatsheet();` sau `settings`.
  (b) Restore (grep `_v.mode === "saved"`): thêm `else if (_v.mode === "cheat") { State.mode = "cheat"; }`.
  (c) Delegated click (grep `#bookmarkBtn` để đặt cạnh): thêm:
```js
      if (e.target.closest("[data-cheat-toggle]")) {
        const id = e.target.closest("[data-cheat-toggle]").dataset.cheatToggle;
        const open = uiGet("cheatOpen", {}); open[id] = !open[id]; uiSet("cheatOpen", open); render(); return;
      }
      if (e.target.closest("#cheatExpandAll") || e.target.closest("#cheatCollapseAll")) {
        const all = {}; if (e.target.closest("#cheatExpandAll")) collectCheats(false).forEach(g => all[g.id] = true);
        uiSet("cheatOpen", all); render(); return;
      }
      if (e.target.id === "cheatTrackOnly") { uiSet("cheatTrackOnly", e.target.checked); render(); return; }
      if (e.target.closest("[data-go-cheat]")) { State.mode = "cheat"; State.topic = null; render(); toTop(); saveView(); return; }
```
  (d) LƯU Ý: listener checkbox `change` không bubble như click với mọi browser? — `click` trên checkbox vẫn bubble, dùng `e.target.id === "cheatTrackOnly"` trong click OK.
- [ ] **Step 4: Home card + menu** — (a) trong `renderHome` return, chỗ vừa xoá khối cheat, thêm card nhỏ SAU `home-grid`:
```js
      <div class="cheat-cta" data-go-cheat="1">
        <span class="cc-ic">🎯</span>
        <span class="cc-txt"><b>${L === "vi" ? "Cheat sheet ngày phỏng vấn" : "Interview-day cheat sheet"}</b>
        <span class="cc-sub">${collectCheats(false).reduce((n,g)=>n+g.items.length,0)} ${L === "vi" ? "câu ăn điểm" : "soundbites"}</span></span>
        <span class="cc-arrow">${fa("fa-solid fa-arrow-right")}</span>
      </div>
```
  (b) `index.html` profile menu (sau nút `data-menu="bookmarks"`): `<button data-menu="cheat"><i class="fa-solid fa-bullseye"></i> <span data-i18n="cheat">Cheat sheet</span></button>`; app.js: UI string `cheat: { vi: "Cheat sheet", en: "Cheat sheet" }`, `setI("cheat", UI.cheat)` trong syncStaticText, nhánh menu `else if (action === "cheat") { State.mode = "cheat"; State.topic = null; pMenu.hidden = true; render(); toTop(); saveView(); }`.
- [ ] **Step 5: CSS** (cuối styles.css):
```css
/* Cheat sheet page */
.cheat-page{max-width:820px}
.cheat-bar{display:flex;align-items:center;gap:10px;margin:0 0 16px}
.cheat-filter{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--muted);cursor:pointer}
.cheat-group{border:1px solid var(--line);border-radius:11px;margin-bottom:10px;background:var(--panel);overflow:hidden}
.cg-head{display:flex;align-items:center;gap:10px;width:100%;padding:13px 16px;background:none;border:none;color:var(--txt);font-size:14px;font-weight:700;cursor:pointer;text-align:left}
.cg-head:hover{background:var(--panel2)}
.cg-ic{color:var(--accent)} .cg-title{flex:1}
.cg-count{font-size:11px;font-weight:800;background:var(--panel2);border-radius:99px;padding:2px 9px;color:var(--muted)}
.cg-chev{color:var(--muted2);transition:transform .18s}
.cheat-group.open .cg-chev{transform:rotate(180deg)}
.cg-body{display:none;padding:4px 16px 14px}
.cheat-group.open .cg-body{display:block}
/* Home CTA card */
.cheat-cta{display:flex;align-items:center;gap:14px;margin-top:22px;padding:16px 18px;border:1px dashed var(--line2);border-radius:12px;cursor:pointer;transition:.15s}
.cheat-cta:hover{border-color:var(--accent);background:var(--panel)}
.cheat-cta .cc-ic{font-size:22px}
.cheat-cta .cc-txt{flex:1;display:flex;flex-direction:column}
.cheat-cta .cc-sub{color:var(--muted);font-size:12.5px}
.cheat-cta .cc-arrow{color:var(--accent)}
```
- [ ] **Step 6: Verify** — `node --check assets/js/app.js`; `node --test tests/` 42/42; thủ công: Home không còn danh sách dài, card CTA → trang cheat; accordion mở/gập từng nhóm + tất cả; filter track bật/tắt persist; menu vào được; reload giữ mode cheat; cả 2 theme.
- [ ] **Step 7: Commit** — `git add assets/js/app.js index.html assets/css/styles.css && git commit -m "feat(ui): dedicated cheat-sheet page with accordions + track filter"`

## Task 6: TOC "Trong bài này" + copy code + prev/next

**Files:** Modify `assets/js/app.js`, `assets/css/styles.css`.

**Interfaces:** Consumes `renderTopic` hiện có (sections đã có `data-sec="${i}"`). Produces TOC panel `#topicToc`, nút `.code-copy` trên mỗi `pre.code`, prev/next theo track.

- [ ] **Step 1: TOC markup** — trong `renderTopic` (grep `function renderTopic`), sau khi build `sections`, thêm:
```js
    const tocItems = (topic.sections || []).map((s, i) =>
      `<a class="toc-item" data-toc="${i}">${i + 1}. ${t(s.title)}</a>`).join("");
    const toc = (topic.sections || []).length >= 4
      ? `<nav class="topic-toc" id="topicToc"><div class="toc-label">${State.lang === "vi" ? "TRONG BÀI NÀY" : "ON THIS PAGE"}</div>${tocItems}</nav>` : "";
```
  và trong return bọc: `return `<div class="fade-in topic-layout"><div class="topic-main"> ...(nội dung hiện có nguyên vẹn)... </div>${toc}</div>`;`
- [ ] **Step 2: TOC behavior** — thêm hàm (cạnh `toTop`):
```js
  let _tocObserver = null;
  function setupToc() {
    if (_tocObserver) { _tocObserver.disconnect(); _tocObserver = null; }
    const toc = document.getElementById("topicToc"); if (!toc) return;
    const secs = document.querySelectorAll(".section[data-sec]");
    _tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) {
        toc.querySelectorAll(".toc-item").forEach(a => a.classList.toggle("active", a.dataset.toc === en.target.dataset.sec));
      }});
    }, { rootMargin: "-15% 0px -70% 0px" });
    secs.forEach(s => _tocObserver.observe(s));
  }
```
  Gọi `setupToc();` cuối `render()` (sau `renderSidebar()`). Click: trong delegated listener thêm
```js
      if (e.target.closest("[data-toc]")) {
        const i = e.target.closest("[data-toc]").dataset.toc;
        const sec = document.querySelector(`.section[data-sec="${i}"]`);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
```
- [ ] **Step 3: Copy code** — trong `renderBlock` (grep `function renderBlock`), case `code`: bọc thêm nút. Locate chuỗi tạo `pre.code` và thêm `<button class="code-copy" title="Copy">${fa("fa-regular fa-copy")}</button>` vào trong wrapper của pre (wrapper `position:relative`). Handler trong delegated listener:
```js
      if (e.target.closest(".code-copy")) {
        const btn = e.target.closest(".code-copy");
        const code = btn.closest(".code-wrap")?.querySelector("code")?.innerText || "";
        navigator.clipboard.writeText(code).then(() => {
          btn.innerHTML = fa("fa-solid fa-check"); setTimeout(() => { btn.innerHTML = fa("fa-regular fa-copy"); }, 1500);
        });
        return;
      }
```
  (Nếu markup code hiện tại chưa có wrapper, thêm `<div class="code-wrap">` quanh `pre` trong renderBlock.)
- [ ] **Step 4: Prev/next theo track** — trong `renderTopic` phần nút next hiện có (grep trong learn-bar đoạn IIFE sau `goQuiz`): mở rộng thành cả prev — dùng `IP.tracks.resolveItems(currentTrack(), PREP.order)` tìm index hiện tại, render `← <tên topic trước>` (data-go) và `<tên topic sau> →` hai đầu một hàng `.topic-nav` dưới learn-bar. Không có track → dùng `PREP.order`.
- [ ] **Step 5: CSS**:
```css
/* Topic layout + TOC */
.topic-layout{display:flex;gap:28px;align-items:flex-start}
.topic-main{flex:1;min-width:0}
.topic-toc{position:sticky;top:calc(var(--topbar-h) + 24px);width:220px;flex-shrink:0;max-height:calc(100vh - var(--topbar-h) - 48px);overflow-y:auto;padding-left:14px;border-left:1px solid var(--line)}
.toc-label{font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--muted2);margin-bottom:8px}
.toc-item{display:block;font-size:12.5px;color:var(--muted);padding:4px 0;cursor:pointer;line-height:1.45;border-left:2px solid transparent;margin-left:-15px;padding-left:13px}
.toc-item:hover{color:var(--txt)}
.toc-item.active{color:var(--accent);border-left-color:var(--accent);font-weight:600}
@media(max-width:1279px){.topic-toc{display:none}}
/* Code copy */
.code-wrap{position:relative}
.code-copy{position:absolute;top:8px;right:8px;background:var(--panel2);border:1px solid var(--line);border-radius:7px;color:var(--muted);width:30px;height:30px;cursor:pointer;opacity:0;transition:.15s}
.code-wrap:hover .code-copy{opacity:1}
.code-copy:hover{color:var(--txt);border-color:var(--line2)}
/* Topic prev/next */
.topic-nav{display:flex;justify-content:space-between;gap:12px;margin-top:18px}
.topic-nav .tn{flex:1;max-width:48%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;cursor:pointer;color:var(--muted);font-size:13px;transition:.15s}
.topic-nav .tn:hover{border-color:var(--accent);color:var(--txt)}
.topic-nav .tn.next{text-align:right}
```
- [ ] **Step 6: Verify** — `node --check`; 42/42; thủ công: bài ≥4 section có TOC, highlight theo cuộn, click nhảy mượt; copy code hoạt động + feedback; prev/next đúng thứ tự track; <1280px TOC ẩn; không vỡ layout mobile.
- [ ] **Step 7: Commit** — `git add assets/js/app.js assets/css/styles.css && git commit -m "feat(ui): topic table-of-contents, code copy buttons, prev/next nav"`

## Task 7: Home restructure

**Files:** Modify `assets/js/app.js` (renderHome), `assets/css/styles.css`.

**Interfaces:** Consumes CATS (gồm `ai` từ Task 4), `collectCheats` (Task 5). Produces Home mới: hero 1 dòng, stats compact, grid nhóm theo category.

- [ ] **Step 1: Hero slim** — trong `renderHome` return, thay khối `.hero` (h1 + p dài) bằng:
```js
      <div class="hero hero-slim">
        <h1>${L === "vi" ? "Sẵn sàng cho buổi phỏng vấn 🚀" : "Get interview-ready 🚀"}</h1>
        <p>${L === "vi" ? "Học theo lộ trình, lật thẻ ghi nhớ, tự kiểm tra — song ngữ." : "Follow your track, flip flashcards, quiz yourself — bilingual."}</p>
      </div>
```
- [ ] **Step 2: Grid nhóm theo category** — thay biến `cards` (grep `const cards = PREP.order`): build theo nhóm:
```js
    const groupsHtml = CATS.map(cat => {
      const ids = PREP.order.filter(id => PREP.topics[id].category === cat.id);
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
  Trong return thay `<div class="section-title">…Chủ đề…</div><div class="home-grid">${cards}</div>` bằng `${groupsHtml}`.
- [ ] **Step 3: Stats compact** — giữ 5 stat nhưng đổi class `.stat-grid` → thêm class `compact`; CSS thu nhỏ (font num 20px, padding 12px, 1 hàng flex wrap).
- [ ] **Step 4: CSS**:
```css
.hero-slim{padding:18px 22px;margin-bottom:18px}
.hero-slim h1{font-size:22px;margin-bottom:4px}
.hero-slim p{font-size:13.5px;color:var(--muted);margin:0}
.stat-grid.compact{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}
.stat-grid.compact .stat{flex:1;min-width:120px;padding:12px 14px}
.stat-grid.compact .num{font-size:20px}
.home-cat{margin-bottom:26px}
.home-cat-head{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.home-cat-head i{color:var(--accent)}
.hc-count{font-size:11px;background:var(--panel2);border-radius:99px;padding:1px 8px;color:var(--muted2)}
```
- [ ] **Step 5: Verify** — `node --check`; 42/42; thủ công: Home = Continue → hero slim → stats 1 hàng → nhóm category (AI & Data có 6 topic) → cheat CTA; 2 theme + mobile.
- [ ] **Step 6: Commit** — `git add assets/js/app.js assets/css/styles.css && git commit -m "feat(ui): restructure home — slim hero, compact stats, category-grouped topics"`

## Task 8: Typography + polish pass

**Files:** Modify `assets/css/styles.css` (chủ yếu), `assets/js/app.js` (chỉ nếu cần class).

**Interfaces:** Không API mới — pass thẩm mỹ cuối.

- [ ] **Step 1: Reading measure & rhythm** — `.section-body` (locate): `max-width:72ch`. Prose `line-height:1.7`. Khoảng cách giữa block trong section chuẩn hoá `margin:14px 0` (prose/list/table/code/callout).
- [ ] **Step 2: Bảng** — `table.tbl`: `th` sticky nhẹ trong khung cuộn (`position:sticky;top:0;background:var(--panel2)`), row hover `background:var(--panel2)`; bảng rộng bọc cuộn ngang đã có → thêm `-webkit-overflow-scrolling:touch`.
- [ ] **Step 3: Callout đồng bộ** — mỗi variant (tip/warning/key/info/soundbite) 1 màu viền trái + icon nhất quán (đã có phần lớn — rà và thống nhất padding 12px 14px, radius 8px, font-size 13.5px).
- [ ] **Step 4: Focus & contrast** — thêm `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}` cho `button, a, input, .nav-item, .tcard`; light mode: nâng `--muted` nếu đo <4.5:1 trên `--panel` (đổi `#5b6472` → `#525a68` nếu cần).
- [ ] **Step 5: Verify** — 42/42; thủ công đọc 1 topic dài (microservices) + 1 topic AI mới: measure dễ đọc, bảng cuộn tốt trên mobile, callout đều nhau, tab-focus nhìn thấy; cả 2 theme.
- [ ] **Step 6: Commit** — `git add assets/css/styles.css assets/js/app.js && git commit -m "style(ui): typography pass — reading measure, tables, callouts, focus states"`

---

## Final verification
- [ ] `node --test tests/` → **42/42**.
- [ ] Smoke toàn luồng: onboarding chọn **AI Engineer** → học topic 1 → TOC + copy code + prev/next → đánh dấu học → Home mới (nhóm category, stats compact) → cheat page (filter track) → cards/quiz mode không hồi quy → cả light/dark + mobile → reload giữ vị trí.
- [ ] `git grep` không secret; site mở `file://` chạy.

## Self-Review (đã chạy)
1. **Spec coverage**: §3-5→T1-4; §6→T5; §7→T6; §8→T7; §9→T8; §10 (mode cheat hoà saveView/restore) → T5 Step 3b; §11-12 → Verify các task + Final. ✔
2. **Placeholder scan**: không TBD; content tasks có outline đầy đủ từng section + tiêu chí đo được (schema/verify là contract chuẩn đã dùng cho nodejs/ecommerce). ✔
3. **Consistency**: `collectCheats(trackOnly)` T5 dùng lại ở T7 CTA; mode `"cheat"` nhất quán dispatch/restore/menu; `data-sec` có sẵn trong renderTopic (đã xác minh) làm anchor TOC; CATS đã có `cs` nên `ai` chèn sau `backend` không đụng. ✔
