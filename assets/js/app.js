/* ============================================================
   Interview Prep — Core App (vanilla JS, no build step)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Topic registry (data files call PREP.register) ---------- */
  const PREP = (window.PREP = window.PREP || { topics: {}, order: [] });
  PREP.register = function (topic) {
    if (!PREP.topics[topic.id]) PREP.order.push(topic.id);
    PREP.topics[topic.id] = topic;
  };

  /* ---------- Categories (sidebar grouping + order) ---------- */
  const CATS = [
    { id: "foundations", icon: "🧠", vi: "Nền tảng", en: "Foundations" },
    { id: "architecture", icon: "🏗️", vi: "Kiến trúc", en: "Architecture" },
    { id: "api", icon: "🔌", vi: "Giao tiếp API", en: "APIs" },
    { id: "data", icon: "💾", vi: "Dữ liệu", en: "Data" },
    { id: "frontend", icon: "🎨", vi: "Frontend", en: "Frontend" },
    { id: "backend", icon: "⚙️", vi: "Backend", en: "Backend" },
    { id: "devops", icon: "☁️", vi: "DevOps & Cloud", en: "DevOps & Cloud" },
    { id: "project", icon: "💼", vi: "Dự án của tôi", en: "My Project" },
    { id: "behavioral", icon: "🗣️", vi: "Phỏng vấn hành vi", en: "Behavioral" },
  ];

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
  function proBadge(tp) { return tp && tp.tier === "pro" ? `<span class="pro-badge">${fa(ICON.pro)} PRO</span>` : ""; }
  function catIcon(tp) { return ICON[tp.category] || "fa-solid fa-book"; }

  /* ---------- State ---------- */
  const LS = {
    get: (k, d) => IP.store.get(k, d),
    set: (k, v) => IP.store.set(k, v),
  };
  const State = {
    lang: LS.get("lang", "vi"),
    mode: "learn",            // learn | cards | quiz
    topic: null,              // current topic id (learn mode)
    track: LS.get("track", null),        // {role, level} or null
    progress: LS.get("progress", {}),   // {topicId:true}
    cards: LS.get("cards", {}),         // {cardKey:{due,interval,ease,reps}}
    quizBest: LS.get("quizBest", {}),   // {topicId: pct}
  };

  /* ---------- i18n helper ---------- */
  // t(node): node is string OR {vi,en}. Delegates to IP.i18n.pick with current lang.
  function t(node) { return IP.i18n.pick(node, State.lang); }
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

  /* ============================================================
     RENDER: content blocks
     ============================================================ */
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  function renderBlock(b) {
    switch (b.type) {
      case "prose":
        return `<div class="block">${t(b)}</div>`;
      case "list": {
        const tag = b.ordered ? "ol" : "ul";
        const items = (b.items || []).map(it => `<li>${t(it)}</li>`).join("");
        return `<div class="block"><${tag}>${items}</${tag}></div>`;
      }
      case "table": {
        const head = (t(b.headers) || []).map(h => `<th>${h}</th>`).join("");
        const body = (b.rows || []).map(r => {
          const cells = t(r).map(c => `<td>${c}</td>`).join("");
          return `<tr>${cells}</tr>`;
        }).join("");
        return `<table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
      }
      case "code":
        return `<pre class="code"><code>${esc(b.code)}</code></pre>` +
          (b.caption ? `<div class="code-cap">${t(b.caption)}</div>` : "");
      case "callout": {
        const v = b.variant || "tip";
        const icons = { soundbite: "🎯", tip: "💡", warning: "⚠️", danger: "🛑", key: "🔑" };
        const tags = {
          soundbite: { vi: "Câu nói ăn điểm", en: "Soundbite" },
          tip: { vi: "Mẹo", en: "Tip" }, warning: { vi: "Lưu ý", en: "Watch out" },
          danger: { vi: "Bẫy", en: "Trap" }, key: { vi: "Điểm mấu chốt", en: "Key idea" },
        };
        return `<div class="callout ${v}"><div class="ci">${icons[v] || "💡"}</div>
          <div class="ctxt"><span class="ctag">${t(tags[v])}</span>${t(b)}</div></div>`;
      }
      case "qa":
        return `<div class="qa"><div class="q">${t(b.q)}</div><div class="a">${t(b.a)}</div></div>`;
      case "chips":
        return `<div class="kv">${(b.items || []).map(i => `<span class="chip">${t(i)}</span>`).join("")}</div>`;
      default:
        return "";
    }
  }

  function renderTopic(id) {
    const topic = PREP.topics[id];
    if (!topic) return `<div class="empty-hint">Topic not found.</div>`;
    const done = !!State.progress[id];
    const sections = (topic.sections || []).map((s, i) => {
      const blocks = (s.blocks || []).map(renderBlock).join("");
      return `<div class="section" data-sec="${i}">
        <div class="section-head" data-toggle="${i}">
          <h2>${t(s.title)}</h2><span class="chev">▼</span>
        </div>
        <div class="section-body">${blocks}</div>
      </div>`;
    }).join("");

    const counts = `<div class="tc-meta" style="margin-bottom:16px;color:var(--muted2);font-size:12px">
      ${fa(ICON.cardsCount)} ${(topic.flashcards || []).length} ${State.lang === "vi" ? "thẻ" : "cards"} ·
      ${fa(ICON.quizCount)} ${(topic.quiz || []).length} ${State.lang === "vi" ? "câu hỏi" : "questions"}</div>`;

    return `<div class="fade-in">
      <div class="page-head">
        <div class="eyebrow">${t(catOf(topic))}</div>
        <h1>${fa(catIcon(topic))} ${t(topic.title)}</h1>${proBadge(topic)}
        <div class="blurb">${t(topic.blurb)}</div>
      </div>
      ${counts}
      ${sections}
      <div class="learn-bar">
        <button class="btn ${done ? "green" : ""}" id="learnBtn">${done ? t(UI.markedLearned) : t(UI.markLearned)}</button>
        <button class="btn subtle" id="goCards">${fa(ICON.cards)} ${t(UI.cards)}</button>
        <button class="btn subtle" id="goQuiz">${fa(ICON.quiz)} ${t(UI.quiz)}</button>
      </div>
    </div>`;
  }

  function catOf(topic) {
    const c = CATS.find(c => c.id === topic.category);
    return c ? c : { vi: "", en: "" };
  }

  /* ============================================================
     RENDER: home dashboard
     ============================================================ */
  function renderHome() {
    const total = PREP.order.length;
    const learned = PREP.order.filter(id => State.progress[id]).length;
    const pct = total ? Math.round((learned / total) * 100) : 0;
    const dueCount = countDue();
    let totalCards = 0, totalQuiz = 0;
    PREP.order.forEach(id => { totalCards += (PREP.topics[id].flashcards || []).length; totalQuiz += (PREP.topics[id].quiz || []).length; });

    const cards = PREP.order.map(id => {
      const tp = PREP.topics[id];
      return `<div class="tcard ${State.progress[id] ? "done" : ""}" data-go="${id}">
        <div class="tc-done">${fa(ICON.check)}</div>
        <div class="tc-icon">${fa(catIcon(tp))}</div>
        <h3>${t(tp.title)}</h3>${proBadge(tp)}
        <p>${t(tp.blurb)}</p>
        <div class="tc-meta"><span>${fa(ICON.cardsCount)} ${(tp.flashcards || []).length}</span><span>${fa(ICON.quizCount)} ${(tp.quiz || []).length}</span></div>
      </div>`;
    }).join("");

    // cheat sheet = collect soundbites
    const cheats = [];
    PREP.order.forEach(id => {
      const tp = PREP.topics[id];
      (tp.sections || []).forEach(s => (s.blocks || []).forEach(b => {
        if (b.type === "callout" && b.variant === "soundbite") cheats.push({ topic: tp.title, text: b });
      }));
    });
    const cheatHtml = cheats.map(c => `<div class="cheat"><div class="cheat-topic">${t(c.topic)}</div><div class="cheat-text">"${t(c.text)}"</div></div>`).join("");

    const L = State.lang;
    return `<div class="fade-in">
      <div class="hero">
        <h1>${L === "vi" ? "Sẵn sàng cho buổi phỏng vấn 🚀" : "Get interview-ready 🚀"}</h1>
        <p>${L === "vi"
          ? "Toàn bộ kiến thức bạn cần — DSA, kiến trúc, hệ thống, frontend/backend, cloud và chính dự án của bạn — gói trong một app song ngữ. Học, lật thẻ ghi nhớ, và tự kiểm tra."
          : "Everything you need — DSA, architecture, system design, frontend/backend, cloud and your own project — in one bilingual app. Read, flip flashcards, and quiz yourself."}</p>
      </div>

      <div class="stat-grid">
        <div class="stat"><div class="num a">${total}</div><div class="lbl">${L === "vi" ? "Chủ đề" : "Topics"}</div></div>
        <div class="stat"><div class="num g">${learned}/${total}</div><div class="lbl">${L === "vi" ? "Đã học" : "Learned"}</div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>
        <div class="stat"><div class="num p">${totalCards}</div><div class="lbl">${L === "vi" ? "Thẻ ghi nhớ" : "Flashcards"}</div></div>
        <div class="stat"><div class="num o">${dueCount}</div><div class="lbl">${L === "vi" ? "Thẻ cần ôn" : "Cards due"}</div></div>
      </div>

      <div class="section-title">${L === "vi" ? "Chủ đề" : "Topics"}</div>
      <div class="home-grid">${cards}</div>

      ${cheats.length ? `<div class="section-title">${t(UI.cheatTitle)}</div>
        <p style="color:var(--muted);font-size:14px;margin-bottom:10px">${t(UI.cheatSub)}</p>${cheatHtml}` : ""}
    </div>`;
  }

  /* ============================================================
     FLASHCARDS — SM-2 (lite) spaced repetition
     ============================================================ */
  const DAY = 86400000;
  function cardKey(topicId, idx) { return topicId + "#" + idx; }
  function allCards() {
    const out = [];
    PREP.order.forEach(id => (PREP.topics[id].flashcards || []).forEach((c, i) => out.push({ key: cardKey(id, i), topicId: id, idx: i, card: c })));
    return out;
  }
  function countDue(topicId) {
    const now = Date.now();
    return allCards().filter(c => (!topicId || c.topicId === topicId)).filter(c => {
      const st = State.cards[c.key];
      return !st || st.due <= now;
    }).length;
  }
  function schedule(key, quality) {
    // quality: 0 again, 1 hard, 2 good, 3 easy
    let st = State.cards[key] || { interval: 0, ease: 2.5, reps: 0 };
    if (quality === 0) { st.reps = 0; st.interval = 0; st.ease = Math.max(1.3, st.ease - 0.2); }
    else {
      st.reps += 1;
      st.ease = Math.max(1.3, st.ease + (quality === 1 ? -0.15 : quality === 3 ? 0.15 : 0));
      if (st.reps === 1) st.interval = quality === 3 ? 2 : 1;
      else if (st.reps === 2) st.interval = quality === 1 ? 2 : 4;
      else st.interval = Math.round(st.interval * st.ease * (quality === 1 ? 0.6 : quality === 3 ? 1.3 : 1));
      if (quality === 1) st.interval = Math.max(1, Math.round(st.interval * 0.7));
    }
    st.due = Date.now() + (quality === 0 ? 30000 : st.interval * DAY); // "again" -> 30s
    State.cards[key] = st;
    LS.set("cards", State.cards);
  }

  const Cards = { queue: [], pos: 0, flipped: false, topic: "all" };
  function buildCardQueue() {
    const now = Date.now();
    let pool = allCards().filter(c => Cards.topic === "all" || c.topicId === Cards.topic);
    let due = pool.filter(c => { const st = State.cards[c.key]; return !st || st.due <= now; });
    if (due.length === 0) due = []; // empty -> show all-clear screen
    // shuffle
    for (let i = due.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[due[i], due[j]] = [due[j], due[i]]; }
    Cards.queue = due; Cards.pos = 0; Cards.flipped = false;
  }
  function renderCards() {
    const L = State.lang;
    const opts = `<option value="all">${t(UI.allTopics)} (${countDue()} ${t(UI.due)})</option>` +
      PREP.order.map(id => `<option value="${id}" ${Cards.topic === id ? "selected" : ""}>${t(PREP.topics[id].title)} (${countDue(id)})</option>`).join("");
    const head = `<div class="fc-controls">
        <select class="fc-select" id="fcTopic">${opts}</select>
        <span class="fc-progress" id="fcProg"></span>
      </div>`;

    if (Cards.queue.length === 0) {
      return `<div class="fc-wrap fade-in">${head}
        <div class="fc-empty"><div class="big">🎉</div><p>${t(UI.noCards)}</p>
        <button class="btn ghost" id="fcResetTopic" style="margin-top:18px">${t(UI.studyAgain)}</button></div></div>`;
    }
    const item = Cards.queue[Cards.pos];
    const tp = PREP.topics[item.topicId];
    const c = item.card;
    return `<div class="fc-wrap fade-in">
      ${head}
      <div class="flashcard ${Cards.flipped ? "flipped" : ""}" id="flashcard">
        <div class="fc-inner">
          <div class="fc-face fc-front">
            <div class="fc-topic">${tp.icon} ${t(tp.title)}</div>
            <div class="fc-q">${t(c.front)}</div>
            <div class="fc-hint">${t(UI.flip)}</div>
          </div>
          <div class="fc-face fc-back">
            <div class="fc-topic">${t(tp.title)}</div>
            <div class="fc-a">${t(c.back)}</div>
          </div>
        </div>
      </div>
      ${Cards.flipped ? `<div class="fc-rate">
        <button class="r-again" data-rate="0">${t(UI.again)}<small>&lt;1m</small></button>
        <button class="r-hard" data-rate="1">${t(UI.hard)}<small>~2d</small></button>
        <button class="r-good" data-rate="2">${t(UI.good)}<small>~4d</small></button>
        <button class="r-easy" data-rate="3">${t(UI.easy)}<small>+</small></button>
      </div>` : `<button class="btn lg" id="flipBtn" style="margin-top:8px">${L === "vi" ? "Lật thẻ" : "Flip card"}</button>`}
    </div>`;
  }
  function updateCardProgress() {
    const el = document.getElementById("fcProg");
    if (el) el.textContent = (Cards.pos + 1) + " / " + Cards.queue.length;
  }

  /* ============================================================
     QUIZ
     ============================================================ */
  const Quiz = { topic: null, questions: [], pos: 0, answered: false, correct: 0, picked: -1, finished: false };
  function buildQuiz(topicId) {
    Quiz.topic = topicId;
    let qs = [];
    if (topicId === "all") PREP.order.forEach(id => (PREP.topics[id].quiz || []).forEach(q => qs.push({ ...q, _topic: id })));
    else qs = (PREP.topics[topicId].quiz || []).map(q => ({ ...q, _topic: topicId }));
    for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[qs[i], qs[j]] = [qs[j], qs[i]]; }
    Quiz.questions = qs.slice(0, topicId === "all" ? 20 : qs.length);
    Quiz.pos = 0; Quiz.correct = 0; Quiz.answered = false; Quiz.picked = -1; Quiz.finished = false;
  }
  function renderQuiz() {
    const L = State.lang;
    if (!Quiz.topic) {
      const opts = `<option value="all">${t(UI.allTopics)}</option>` +
        PREP.order.map(id => `<option value="${id}">${t(PREP.topics[id].title)} (${(PREP.topics[id].quiz || []).length})</option>`).join("");
      return `<div class="quiz-wrap fade-in"><div class="quiz-q" style="text-align:center">
        <h2>${fa(ICON.quiz)} ${t(UI.quiz)}</h2>
        <p style="color:var(--muted);margin-bottom:18px">${L === "vi" ? "Chọn chủ đề rồi tự kiểm tra. Có giải thích cho mỗi câu." : "Pick a topic and test yourself. Every question has an explanation."}</p>
        <select class="fc-select" id="quizTopic" style="margin-bottom:18px">${opts}</select><br>
        <button class="btn lg" id="quizStart">${t(UI.startQuiz)} →</button>
      </div></div>`;
    }
    if (Quiz.finished) {
      const pct = Math.round((Quiz.correct / Quiz.questions.length) * 100);
      const grade = pct >= 80 ? (L === "vi" ? "Xuất sắc! 🏆" : "Excellent! 🏆") : pct >= 60 ? (L === "vi" ? "Khá tốt 👍" : "Solid 👍") : (L === "vi" ? "Cần ôn thêm 📚" : "Keep studying 📚");
      const color = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--yellow)" : "var(--orange)";
      return `<div class="quiz-wrap fade-in"><div class="quiz-q quiz-result">
        <div class="score" style="color:${color}">${pct}%</div>
        <div class="grade">${grade}</div>
        <p style="color:var(--muted)">${Quiz.correct} / ${Quiz.questions.length} ${L === "vi" ? "câu đúng" : "correct"}</p>
        <div style="margin-top:22px;display:flex;gap:10px;justify-content:center">
          <button class="btn" id="quizRetry">${t(UI.retry)}</button>
          <button class="btn subtle" id="quizBack">${L === "vi" ? "Đổi chủ đề" : "Change topic"}</button>
        </div>
      </div></div>`;
    }
    const q = Quiz.questions[Quiz.pos];
    const opts = q.options.map((o, i) => {
      let cls = "";
      if (Quiz.answered) { if (i === q.answer) cls = "correct"; else if (i === Quiz.picked) cls = "wrong"; }
      return `<button class="quiz-opt ${cls}" data-opt="${i}" ${Quiz.answered ? "disabled" : ""}>
        <span class="optk">${String.fromCharCode(65 + i)}</span>${t(o)}</button>`;
    }).join("");
    const last = Quiz.pos === Quiz.questions.length - 1;
    return `<div class="quiz-wrap fade-in"><div class="quiz-q">
      <div class="quiz-meta"><span>${fa(catIcon(PREP.topics[q._topic]))} ${t(PREP.topics[q._topic].title)}</span>
        <span>${Quiz.pos + 1} / ${Quiz.questions.length} · ${fa(ICON.check)} ${Quiz.correct}</span></div>
      <h2>${t(q.q)}</h2>
      ${opts}
      <div class="quiz-explain ${Quiz.answered ? "show" : ""}"><b>${Quiz.picked === q.answer ? (L === "vi" ? "Chính xác! " : "Correct! ") : (L === "vi" ? "Chưa đúng. " : "Not quite. ")}</b>${t(q.explain)}</div>
      ${Quiz.answered ? `<div class="quiz-foot"><span></span><button class="btn" id="quizNext">${last ? t(UI.finish) : t(UI.next)}</button></div>` : ""}
    </div></div>`;
  }

  /* ============================================================
     SIDEBAR + ROUTING
     ============================================================ */
  function renderSidebar() {
    const sb = document.getElementById("sidebar");
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
          <span class="ni-icon">${fa(catIcon(tp))}</span><span class="ni-label">${t(tp.title)}</span>${proBadge(tp)}<span class="ni-check">${fa(ICON.check)}</span></div>`;
      });
      html += `</div>`;
    });
    sb.innerHTML = html;
  }

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
    // sync mode buttons
    document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("active", b.dataset.mode === State.mode));
    renderSidebar();
    document.getElementById("content").scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function goTopic(id) { State.mode = "learn"; State.topic = id; closeSidebar(); render(); }
  function goHome() { State.mode = "learn"; State.topic = null; closeSidebar(); render(); }
  function setMode(m) {
    State.mode = m;
    if (m === "cards") { buildCardQueue(); }
    if (m === "quiz") { Quiz.topic = null; }
    closeSidebar(); render();
  }

  /* ============================================================
     SEARCH
     ============================================================ */
  function doSearch(qstr) {
    const q = qstr.trim().toLowerCase();
    const main = document.getElementById("content");
    if (!q) { State.mode = "learn"; render(); return; }
    const hits = [];
    PREP.order.forEach(id => {
      const tp = PREP.topics[id];
      const hay = JSON.stringify(tp).toLowerCase();
      if (hay.includes(q)) {
        // find matching section titles
        const secs = (tp.sections || []).filter(s => JSON.stringify(s).toLowerCase().includes(q)).slice(0, 4);
        hits.push({ tp, secs });
      }
    });
    if (!hits.length) { main.innerHTML = `<div class="empty-hint">${State.lang === "vi" ? "Không tìm thấy" : "No results"}: "${esc(qstr)}"</div>`; return; }
    main.innerHTML = `<div class="fade-in"><div class="page-head"><h1>${fa(ICON.search)} ${esc(qstr)}</h1>
      <div class="blurb">${hits.length} ${State.lang === "vi" ? "chủ đề khớp" : "matching topics"}</div></div>
      ${hits.map(h => `<div class="tcard" data-go="${h.tp.id}" style="margin-bottom:12px">
        <div class="tc-icon">${fa(catIcon(h.tp))}</div><h3>${t(h.tp.title)}</h3>
        <p>${t(h.tp.blurb)}</p>
        ${h.secs.length ? `<div style="margin-top:8px;font-size:12px;color:var(--muted2)">${h.secs.map(s => "• " + t(s.title)).join("<br>")}</div>` : ""}
      </div>`).join("")}</div>`;
  }

  /* ============================================================
     SIDEBAR (mobile)
     ============================================================ */
  function openSidebar() { document.getElementById("sidebar").classList.add("open"); document.getElementById("overlay").classList.add("show"); }
  function closeSidebar() { document.getElementById("sidebar").classList.remove("open"); document.getElementById("overlay").classList.remove("show"); }

  /* ============================================================
     EVENTS
     ============================================================ */
  function bind() {
    // onboarding pick callback
    IP.onboarding.onPick(({ role, level }) => {
      State.track = { role, level };
      LS.set("track", State.track);
      State.topic = null;
      State.mode = "learn";
      render();
    });

    // language
    document.querySelectorAll(".lang-toggle button").forEach(b => b.onclick = () => {
      State.lang = b.dataset.lang; LS.set("lang", State.lang);
      document.querySelectorAll(".lang-toggle button").forEach(x => x.classList.toggle("active", x.dataset.lang === State.lang));
      document.documentElement.lang = State.lang;
      syncStaticText(); render();
    });
    // modes
    document.querySelectorAll(".modes button").forEach(b => b.onclick = () => setMode(b.dataset.mode));
    // search
    const si = document.getElementById("search");
    si.oninput = () => doSearch(si.value);
    // mobile menu
    document.getElementById("menuBtn").onclick = openSidebar;
    document.getElementById("overlay").onclick = closeSidebar;
    document.getElementById("brand").onclick = goHome;

    // theme
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.onclick = () => {
      IP.theme.toggle();
      themeBtn.firstElementChild.className = IP.theme.current() === "dark" ? ICON.themeDark : ICON.themeLight;
    };

    // delegated clicks
    document.body.addEventListener("click", e => {
      // onboarding — must be first
      if (IP.onboarding.shouldShow()) {
        const ob = IP.onboarding.handleClick(e.target);
        if (ob === "rerender") { render(); return; }
        if (ob === true) return;
      }

      const topicEl = e.target.closest("[data-topic]");
      if (topicEl) return goTopic(topicEl.dataset.topic);
      const goEl = e.target.closest("[data-go]");
      if (goEl) { si.value = ""; return goTopic(goEl.dataset.go); }
      if (e.target.closest("[data-home]")) return goHome();

      // section collapse
      const tog = e.target.closest("[data-toggle]");
      if (tog) { tog.parentElement.classList.toggle("collapsed"); return; }

      // learn buttons
      if (e.target.id === "learnBtn") {
        State.progress[State.topic] = !State.progress[State.topic];
        LS.set("progress", State.progress); render(); return;
      }
      if (e.target.id === "goCards") { Cards.topic = State.topic; setMode("cards"); return; }
      if (e.target.id === "goQuiz") { setMode("quiz"); buildQuiz(State.topic); render(); return; }

      // flashcards
      if (e.target.closest("#flashcard") || e.target.id === "flipBtn") {
        if (!Cards.flipped) { Cards.flipped = true; render(); } return;
      }
      const rate = e.target.closest("[data-rate]");
      if (rate) { rateCard(parseInt(rate.dataset.rate, 10)); return; }
      if (e.target.id === "fcResetTopic") { resetTopicCards(); return; }

      // quiz
      if (e.target.id === "quizStart") { buildQuiz(document.getElementById("quizTopic").value); render(); return; }
      const opt = e.target.closest("[data-opt]");
      if (opt && !Quiz.answered) { answerQuiz(parseInt(opt.dataset.opt, 10)); return; }
      if (e.target.id === "quizNext") { nextQuiz(); return; }
      if (e.target.id === "quizRetry") { buildQuiz(Quiz.topic); render(); return; }
      if (e.target.id === "quizBack") { Quiz.topic = null; render(); return; }
    });

    // flashcard topic select (change)
    document.body.addEventListener("change", e => {
      if (e.target.id === "fcTopic") { Cards.topic = e.target.value; buildCardQueue(); render(); }
    });

    // keyboard
    document.addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "/") { e.preventDefault(); si.focus(); return; }
      if (State.mode === "cards" && Cards.queue.length) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!Cards.flipped) { Cards.flipped = true; render(); } }
        else if (Cards.flipped && ["1", "2", "3", "4"].includes(e.key)) { rateCard(parseInt(e.key, 10) - 1); }
      }
      if (State.mode === "quiz" && Quiz.topic && !Quiz.finished) {
        if (!Quiz.answered && ["1", "2", "3", "4"].includes(e.key)) {
          const i = parseInt(e.key, 10) - 1; if (Quiz.questions[Quiz.pos].options[i]) answerQuiz(i);
        } else if (Quiz.answered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); nextQuiz(); }
      }
    });
  }

  function rateCard(q) {
    const item = Cards.queue[Cards.pos];
    if (!item) return;
    schedule(item.key, q);
    Cards.pos++; Cards.flipped = false;
    if (Cards.pos >= Cards.queue.length) buildCardQueue();
    render();
  }
  function resetTopicCards() {
    // reschedule all in current topic to be due now
    allCards().filter(c => Cards.topic === "all" || c.topicId === Cards.topic).forEach(c => { if (State.cards[c.key]) State.cards[c.key].due = 0; });
    LS.set("cards", State.cards); buildCardQueue(); render();
  }
  function answerQuiz(i) {
    Quiz.answered = true; Quiz.picked = i;
    if (i === Quiz.questions[Quiz.pos].answer) Quiz.correct++;
    render();
  }
  function nextQuiz() {
    if (Quiz.pos >= Quiz.questions.length - 1) {
      Quiz.finished = true;
      const pct = Math.round((Quiz.correct / Quiz.questions.length) * 100);
      const prev = State.quizBest[Quiz.topic] || 0;
      if (pct > prev) { State.quizBest[Quiz.topic] = pct; LS.set("quizBest", State.quizBest); }
    } else { Quiz.pos++; Quiz.answered = false; Quiz.picked = -1; }
    render();
  }

  /* ---------- static UI text (topbar) ---------- */
  function syncStaticText() {
    const L = State.lang;
    document.querySelector('[data-mode="learn"] span').textContent = t(UI.learn);
    document.querySelector('[data-mode="cards"] span').textContent = t(UI.cards);
    document.querySelector('[data-mode="quiz"] span').textContent = t(UI.quiz);
    document.getElementById("search").placeholder = t(UI.search);
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lang-toggle button").forEach(x => x.classList.toggle("active", x.dataset.lang === State.lang));
    document.documentElement.lang = State.lang;
    syncStaticText();
    bind();
    IP.theme.apply();
    const tb = document.getElementById("themeBtn");
    if (tb) tb.firstElementChild.className = IP.theme.current() === "dark" ? ICON.themeDark : ICON.themeLight;
    render();
  });
})();
