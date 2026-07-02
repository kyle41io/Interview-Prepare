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
    { id: "cs", icon: "🖥️", vi: "Khoa học máy tính", en: "Computer Science" },
    { id: "architecture", icon: "🏗️", vi: "Kiến trúc", en: "Architecture" },
    { id: "api", icon: "🔌", vi: "Giao tiếp API", en: "APIs" },
    { id: "data", icon: "💾", vi: "Dữ liệu", en: "Data" },
    { id: "frontend", icon: "🎨", vi: "Frontend", en: "Frontend" },
    { id: "backend", icon: "⚙️", vi: "Backend", en: "Backend" },
    { id: "ai", icon: "🤖", vi: "AI & Data", en: "AI & Data" },
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
    foundations: "fa-solid fa-brain", cs: "fa-solid fa-microchip", architecture: "fa-solid fa-sitemap",
    api: "fa-solid fa-plug", data: "fa-solid fa-database",
    frontend: "fa-solid fa-palette", backend: "fa-solid fa-gears",
    devops: "fa-solid fa-cloud", project: "fa-solid fa-briefcase",
    ai: "fa-solid fa-robot",
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

  /* ---- device-local UI prefs (raw localStorage; bypass IP.store so they
     never sync to the server and never trigger a sync push) ---- */
  function uiGet(k, d) { try { const v = localStorage.getItem("ip_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function uiSet(k, v) { try { localStorage.setItem("ip_" + k, JSON.stringify(v)); } catch (e) {} }
  function saveView() {
    if (IP.onboarding.shouldShow()) return;
    uiSet("view", { mode: State.mode, topic: State.topic, scrollY: window.scrollY || 0 });
  }
  function loadView() { return uiGet("view", null); }

  const State = {
    lang: LS.get("lang", "vi"),
    mode: "learn",            // learn | cards | quiz
    topic: null,              // current topic id (learn mode)
    track: LS.get("track", null),        // {role, level} or null
    browseAll: false,         // true = show category sidebar even when track set
    progress: LS.get("progress", {}),   // {topicId:true}
    cards: LS.get("cards", {}),         // {cardKey:{due,interval,ease,reps}}
    quizBest: LS.get("quizBest", {}),   // {topicId: pct}
  };

  /* ---------- i18n helper ---------- */
  // t(node): node is string OR {vi,en}. Delegates to IP.i18n.pick with current lang.
  function t(node) { return IP.i18n.pick(node, State.lang); }
  const UI = Object.assign(IP.i18n.STR, {
    changeTrack: { vi: "Đổi lộ trình", en: "Change path" },
    saved: { vi: "Đã lưu", en: "Saved" },
    clearData: { vi: "Xoá dữ liệu", en: "Clear data" },
    confirmClear: { vi: "Xoá toàn bộ dữ liệu học? Không thể hoàn tác.", en: "Clear all study data? This cannot be undone." },
    signIn: { vi: "Đăng nhập", en: "Sign in" },
    signOut: { vi: "Đăng xuất", en: "Sign out" },
    deleteAccount: { vi: "Xoá tài khoản", en: "Delete account" },
    confirmDelete: { vi: "Xoá tài khoản và toàn bộ dữ liệu? Không thể hoàn tác.", en: "Delete account and all data? This cannot be undone." },
    settings: { vi: "Cài đặt tài khoản", en: "Account settings" },
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
    cheat: { vi: "Cheat sheet", en: "Cheat sheet" },
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
        return `<div class="code-wrap"><pre class="code"><code>${esc(b.code)}</code></pre>` +
          `<button class="code-copy" title="Copy">${fa("fa-regular fa-copy")}</button></div>` +
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

    const tocItems = (topic.sections || []).map((s, i) =>
      `<a class="toc-item" data-toc="${i}">${i + 1}. ${t(s.title)}</a>`).join("");
    const toc = (topic.sections || []).length >= 4
      ? `<nav class="topic-toc" id="topicToc"><div class="toc-label">${State.lang === "vi" ? "TRONG BÀI NÀY" : "ON THIS PAGE"}</div>${tocItems}</nav>` : "";

    const counts = `<div class="tc-meta" style="margin-bottom:16px;color:var(--muted2);font-size:12px">
      ${fa(ICON.cardsCount)} ${(topic.flashcards || []).length} ${State.lang === "vi" ? "thẻ" : "cards"} ·
      ${fa(ICON.quizCount)} ${(topic.quiz || []).length} ${State.lang === "vi" ? "câu hỏi" : "questions"}</div>`;

    const track = currentTrack();
    const navItems = track ? IP.tracks.resolveItems(track, PREP.order) : PREP.order;
    const navIdx = navItems.indexOf(id);
    const prevId = navIdx > 0 ? navItems[navIdx - 1] : null;
    const nextId = navIdx >= 0 && navIdx < navItems.length - 1 ? navItems[navIdx + 1] : null;
    const topicNav = (prevId || nextId) ? `<div class="topic-nav">
        ${prevId ? `<div class="tn prev" data-go="${prevId}">${t(UI.prev)}<br>${t(PREP.topics[prevId].title)}</div>` : `<div></div>`}
        ${nextId ? `<div class="tn next" data-go="${nextId}">${t(UI.next)}<br>${t(PREP.topics[nextId].title)}</div>` : `<div></div>`}
      </div>` : "";

    return `<div class="fade-in topic-layout"><div class="topic-main">
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
        ${(function() {
          var bSaved = IP.bookmarks && IP.bookmarks.has(IP.bookmarks.all(), id);
          return `<button class="btn ${bSaved ? "bookmarked" : "subtle"}" id="bookmarkBtn">${fa(bSaved ? ICON.bookmark : ICON.bookmarkO)} ${bSaved ? (State.lang === "vi" ? "Đã lưu" : "Saved") : (State.lang === "vi" ? "Lưu" : "Save")}</button>`;
        })()}
      </div>
      ${topicNav}
    </div>${toc}</div>`;
  }

  function catOf(topic) {
    const c = CATS.find(c => c.id === topic.category);
    return c ? c : { vi: "", en: "" };
  }

  function renderSaved() {
    const L = State.lang;
    const ids = (IP.bookmarks ? IP.bookmarks.all() : []).filter(id => PREP.topics[id]);
    if (!ids.length) {
      return `<div class="fade-in">
        <div class="page-head">
          <h1>${fa(ICON.bookmark)} ${L === "vi" ? "Đã lưu" : "Saved"}</h1>
        </div>
        <div class="empty-hint">${L === "vi" ? "Chưa có chủ đề nào được lưu. Mở một chủ đề và bấm \"Lưu\" để thêm vào đây." : "No saved topics yet. Open a topic and click \"Save\" to add it here."}</div>
      </div>`;
    }
    const cards = ids.map(id => {
      const tp = PREP.topics[id];
      return `<div class="tcard ${State.progress[id] ? "done" : ""}" data-go="${id}">
        <div class="tc-done">${fa(ICON.check)}</div>
        <div class="tc-icon">${fa(catIcon(tp))}</div>
        <h3>${t(tp.title)}</h3>${proBadge(tp)}
        <p>${t(tp.blurb)}</p>
        <div class="tc-meta"><span>${fa(ICON.cardsCount)} ${(tp.flashcards || []).length}</span><span>${fa(ICON.quizCount)} ${(tp.quiz || []).length}</span></div>
      </div>`;
    }).join("");
    return `<div class="fade-in">
      <div class="page-head">
        <h1>${fa(ICON.bookmark)} ${L === "vi" ? "Đã lưu" : "Saved"}</h1>
        <div class="blurb">${ids.length} ${L === "vi" ? "chủ đề đã lưu" : "saved topics"}</div>
      </div>
      <div class="home-grid">${cards}</div>
    </div>`;
  }

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

  function renderSettings() {
    const L = State.lang;
    const u = IP.auth ? IP.auth.getUser() : null;
    const md = (u && u.user_metadata) || {};
    const acct = u
      ? `<div class="settings-acct">
           ${md.avatar_url ? `<img class="settings-avatar" src="${md.avatar_url}" alt="" referrerpolicy="no-referrer">` : `<span style="font-size:40px;color:var(--muted)">${fa(ICON.profile)}</span>`}
           <div><div class="sa-name">${esc(md.full_name || md.name || "")}</div><div class="sa-email">${esc(u.email || "")}</div></div>
         </div>`
      : `<div class="empty-hint">${L === "vi" ? "Bạn chưa đăng nhập. Đăng nhập với Google để đồng bộ tiến độ giữa các thiết bị." : "You're not signed in. Sign in with Google to sync your progress across devices."}</div>`;
    const delItem = u
      ? `<div class="danger-item">
           <div><div class="di-title">${t(UI.deleteAccount)}</div><div class="di-desc">${L === "vi" ? "Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu trên máy chủ." : "Permanently delete your account and all server-side data."}</div></div>
           <button class="btn danger-btn" id="deleteAccountBtn">${t(UI.deleteAccount)}</button>
         </div>`
      : "";
    return `<div class="fade-in settings-page">
      <div class="page-head"><h1>${fa("fa-solid fa-gear")} ${L === "vi" ? "Cài đặt tài khoản" : "Account settings"}</h1></div>
      ${acct}
      <div class="danger-zone">
        <div class="dz-label">${L === "vi" ? "Vùng nguy hiểm" : "Danger zone"}</div>
        <div class="danger-item">
          <div><div class="di-title">${t(UI.clearData)}</div><div class="di-desc">${L === "vi" ? "Xoá dữ liệu học lưu trên trình duyệt này. Dữ liệu đã đồng bộ trên máy chủ không bị ảnh hưởng." : "Clear study data stored in this browser. Server-synced data is unaffected."}</div></div>
          <button class="btn danger-btn" id="clearDataBtn">${t(UI.clearData)}</button>
        </div>
        ${delItem}
      </div>
    </div>`;
  }

  /* ---------- Track helpers (Step 1) ---------- */
  function validTopicIds() { return PREP.order; }
  function currentTrack() {
    if (!State.track) return null;
    return IP.tracks.getTrack(State.track.role, State.track.level, PREP.tracks) || null;
  }
  function roleLabel() {
    if (!State.track) return "";
    const role = (PREP.roles || []).find(r => r.id === State.track.role);
    const roleTitle = role ? t(role.title) : State.track.role;
    const lvId = State.track.level;
    const lvObj = lvId ? (PREP.levels || {})[lvId] : null;
    const lvLabel = lvObj ? t(lvObj) : (lvId || "");
    return lvLabel ? roleTitle + " · " + lvLabel : roleTitle;
  }

  /* ============================================================
     CHEAT SHEET — collect soundbite callouts across topics
     ============================================================ */
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

    const L = State.lang;
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
    return `<div class="fade-in">
      ${continueHtml}
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
        <div class="stat"><div class="num o">${fa(ICON.streak)} ${IP.streak.get().count}</div><div class="lbl">${L === "vi" ? "Ngày liên tiếp" : "Day streak"}</div></div>
      </div>

      <div class="section-title">${L === "vi" ? "Chủ đề" : "Topics"}</div>
      <div class="home-grid">${cards}</div>

      <div class="cheat-cta" data-go-cheat="1">
        <span class="cc-ic">🎯</span>
        <span class="cc-txt"><b>${L === "vi" ? "Cheat sheet ngày phỏng vấn" : "Interview-day cheat sheet"}</b>
        <span class="cc-sub">${collectCheats(false).reduce((n,g)=>n+g.items.length,0)} ${L === "vi" ? "câu ăn điểm" : "soundbites"}</span></span>
        <span class="cc-arrow">${fa("fa-solid fa-arrow-right")}</span>
      </div>
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
    const L = State.lang;

    // --- Mode A: browse-all OR no track → category sidebar ---
    if (State.browseAll || !State.track) {
      let html = `<div class="nav-item ${State.mode === "learn" && !State.topic ? "active" : ""}" data-home="1">
        <span class="ni-icon">${fa(ICON.home)}</span><span class="ni-label">${L === "vi" ? "Trang chủ" : "Home"}</span></div>`;
      // "← Back to track" item when a track exists but we are browsing all
      if (State.track) {
        html += `<div class="nav-item nav-item--back" data-track-mode="1">
          <span class="ni-icon">${fa("fa-solid fa-arrow-left")}</span>
          <span class="ni-label">${L === "vi" ? "← Về lộ trình" : "← Back to track"}</span></div>`;
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

    // --- Mode B: track mode ---
    const track = currentTrack();
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

    // Numbered topic items
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

    // "All topics →" item
    html += `<div class="nav-item all-topics-item" data-browse-all="1">
      <span class="ni-icon">${fa(ICON.allTopics)}</span>
      <span class="ni-label">${L === "vi" ? "Tất cả chủ đề →" : "All topics →"}</span></div>`;

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
    else if (State.mode === "saved") main.innerHTML = renderSaved();
    else if (State.mode === "settings") main.innerHTML = renderSettings();
    else if (State.mode === "cheat") main.innerHTML = renderCheatsheet();
    else if (State.topic) main.innerHTML = renderTopic(State.topic);
    else main.innerHTML = renderHome();
    // sync mode buttons
    document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("active", b.dataset.mode === State.mode));
    renderSidebar();
    setupToc();
    // NOTE: do not force scroll here — render() also runs for in-place updates
    // (mark-learned, flip card, answer quiz, sync apply). Scroll-to-top happens
    // only on real navigation (goTopic/goHome/setMode) via toTop().
  }

  function toTop() { document.getElementById("content").scrollTop = 0; window.scrollTo(0, 0); }

  let _tocObserver = null;
  function setupToc() {
    if (_tocObserver) { _tocObserver.disconnect(); _tocObserver = null; }
    const toc = document.getElementById("topicToc");
    if (!toc) return;
    const secs = document.querySelectorAll(".section[data-sec]");
    _tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) {
        toc.querySelectorAll(".toc-item").forEach(a => a.classList.toggle("active", a.dataset.toc === en.target.dataset.sec));
      }});
    }, { rootMargin: "-15% 0px -70% 0px" });
    secs.forEach(s => _tocObserver.observe(s));
  }

  function goTopic(id) { State.mode = "learn"; State.topic = id; closeSidebar(); render(); toTop(); saveView(); }
  function goHome() { State.mode = "learn"; State.topic = null; closeSidebar(); render(); toTop(); saveView(); }
  function setMode(m) {
    State.mode = m;
    if (m === "cards") { buildCardQueue(); }
    if (m === "quiz") { Quiz.topic = null; }
    closeSidebar(); render(); toTop(); saveView();
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
  // Menu button: mobile → slide-in drawer; desktop → collapse/expand (persisted).
  function toggleSidebar() {
    if (window.matchMedia && window.matchMedia("(max-width:900px)").matches) {
      const sb = document.getElementById("sidebar"), ov = document.getElementById("overlay");
      const open = sb.classList.toggle("open");
      if (ov) ov.classList.toggle("show", open);
    } else {
      const collapsed = document.documentElement.classList.toggle("sb-collapsed");
      uiSet("sbCollapsed", collapsed);
    }
  }

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
    document.getElementById("menuBtn").onclick = toggleSidebar;
    document.getElementById("overlay").onclick = closeSidebar;
    document.getElementById("brand").onclick = goHome;

    // theme
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.onclick = () => {
      IP.theme.toggle();
      themeBtn.firstElementChild.className = IP.theme.current() === "dark" ? ICON.themeDark : ICON.themeLight;
    };

    // sign-in button
    const sBtn = document.getElementById("signinBtn");
    if (sBtn) sBtn.onclick = () => IP.auth.signInWithGoogle();

    // profile menu toggle
    const pBtn = document.getElementById("profileBtn");
    const pMenu = document.getElementById("profileMenu");
    if (pBtn && pMenu) {
      pBtn.onclick = (e) => { e.stopPropagation(); pMenu.hidden = !pMenu.hidden; };
      document.addEventListener("click", () => { if (pMenu) pMenu.hidden = true; });
      pMenu.addEventListener("click", (e) => {
        const b = e.target.closest("[data-menu]");
        if (!b) return;
        const action = b.dataset.menu;
        if (action === "change-track") {
          State.track = null; LS.set("track", null);
          State.topic = null; State.browseAll = false;
          pMenu.hidden = true; render();
        } else if (action === "bookmarks") {
          State.mode = "saved"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
        } else if (action === "cheat") {
          State.mode = "cheat"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
        } else if (action === "settings") {
          State.mode = "settings"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
        } else if (action === "signout") {
          pMenu.hidden = true; IP.auth.signOut();
        }
      });
    }

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

      if (e.target.closest("[data-toc]")) {
        const i = e.target.closest("[data-toc]").dataset.toc;
        const sec = document.querySelector(`.section[data-sec="${i}"]`);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (e.target.closest(".code-copy")) {
        const btn = e.target.closest(".code-copy");
        const code = btn.closest(".code-wrap")?.querySelector("code")?.innerText || "";
        navigator.clipboard.writeText(code).then(() => {
          btn.innerHTML = fa("fa-solid fa-check");
          setTimeout(() => { btn.innerHTML = fa("fa-regular fa-copy"); }, 1500);
        });
        return;
      }

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

      // section collapse
      const tog = e.target.closest("[data-toggle]");
      if (tog) { tog.parentElement.classList.toggle("collapsed"); return; }

      // learn buttons
      if (e.target.id === "learnBtn") {
        State.progress[State.topic] = !State.progress[State.topic];
        if (State.progress[State.topic]) IP.streak.bump();
        LS.set("progress", State.progress); render(); return;
      }
      if (e.target.id === "bookmarkBtn") { IP.bookmarks.toggleStored(State.topic); render(); return; }
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
      if (e.target.id === "goCards") { Cards.topic = State.topic; setMode("cards"); return; }
      if (e.target.id === "goQuiz") { setMode("quiz"); buildQuiz(State.topic); render(); return; }

      // settings page danger-zone actions
      if (e.target.closest("#clearDataBtn")) {
        if (confirm(t(UI.confirmClear))) { IP.store.clearAll(); location.reload(); }
        return;
      }
      if (e.target.closest("#deleteAccountBtn")) {
        if (confirm(t(UI.confirmDelete))) { if (IP.account) IP.account.deleteAccount(); }
        return;
      }

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

  /* ---------- auth UI ---------- */
  function updateAuthUI(user) {
    const signin = document.getElementById("signinBtn");
    const acctRow = document.getElementById("acctRow");
    const sep = document.getElementById("acctSep");
    const mOut = document.getElementById("menuSignout");
    const on = !!user;
    const md = (user && user.user_metadata) || {};
    if (signin) signin.hidden = on || !IP.auth.enabled();
    [acctRow, sep, mOut].forEach(function (el) { if (el) el.hidden = !on; });
    // Topbar profile button: show the real avatar when signed in, else the icon.
    const pBtn = document.getElementById("profileBtn");
    if (pBtn) {
      if (on && md.avatar_url) pBtn.innerHTML = '<img class="pfp" src="' + md.avatar_url + '" alt="" referrerpolicy="no-referrer">';
      else pBtn.innerHTML = '<i class="' + ICON.profile + '"></i>';
    }
    if (on && acctRow) {
      const nameEl = document.getElementById("acctName");
      if (nameEl) nameEl.textContent = md.full_name || md.name || user.email || "";
      const av = document.getElementById("acctAvatar");
      if (av) {
        if (md.avatar_url) { av.referrerPolicy = "no-referrer"; av.src = md.avatar_url; av.style.display = ""; }
        else { av.style.display = "none"; }
      }
    }
    // Keep an open settings page in sync with auth state.
    if (State.mode === "settings") render();
  }

  /* ---------- static UI text (topbar) ---------- */
  function syncStaticText() {
    const L = State.lang;
    document.querySelector('[data-mode="learn"] span').textContent = t(UI.learn);
    document.querySelector('[data-mode="cards"] span').textContent = t(UI.cards);
    document.querySelector('[data-mode="quiz"] span').textContent = t(UI.quiz);
    document.getElementById("search").placeholder = t(UI.search);
    // profile menu i18n labels
    function setI(key, str) {
      const el = document.querySelector(`[data-i18n="${key}"]`);
      if (el) el.textContent = t(str);
    }
    setI("changeTrack", UI.changeTrack);
    setI("saved", UI.saved);
    setI("cheat", UI.cheat);
    setI("settings", UI.settings);
    setI("signIn", UI.signIn);
    setI("signOut", UI.signOut);
  }

  /* ---------- reloadFromStore ---------- */
  function reloadFromStore() {
    State.lang     = LS.get("lang", "vi");
    State.track    = LS.get("track", null);
    State.progress = LS.get("progress", {});
    State.cards    = LS.get("cards", {});
    State.quizBest = LS.get("quizBest", {});
    document.querySelectorAll(".lang-toggle button").forEach(x => x.classList.toggle("active", x.dataset.lang === State.lang));
    document.documentElement.lang = State.lang;
    IP.theme.apply();
    syncStaticText();
    render();
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

    // Auth + sync boot wiring (setApplyCallback + start BEFORE init)
    IP.sync.setApplyCallback(reloadFromStore);
    IP.sync.start();
    updateAuthUI(IP.auth.getUser());
    let _wasAuthed = false;
    IP.auth.onChange(function (user) {
      updateAuthUI(user);
      if (user) { _wasAuthed = true; IP.sync.onLogin(); }
      else if (_wasAuthed) { _wasAuthed = false; IP.store.clearAll(); location.reload(); }
    });
    IP.auth.init();

    // Restore device-local UI state: collapsed sidebar + last view + scroll.
    if (uiGet("sbCollapsed", false)) document.documentElement.classList.add("sb-collapsed");
    const _v = loadView();
    if (_v && typeof _v === "object" && !IP.onboarding.shouldShow()) {
      if (_v.mode === "cards") { State.mode = "cards"; buildCardQueue(); }
      else if (_v.mode === "quiz") { State.mode = "quiz"; Quiz.topic = null; }
      else if (_v.mode === "saved") { State.mode = "saved"; }
      else if (_v.mode === "cheat") { State.mode = "cheat"; }
      else if (_v.topic && PREP.topics[_v.topic]) { State.mode = "learn"; State.topic = _v.topic; }
    }

    render();
    if (_v && _v.scrollY) window.scrollTo(0, _v.scrollY);

    // Persist scroll position + current view so a reload/return restores place.
    let _svTimer = null;
    window.addEventListener("scroll", function () {
      if (_svTimer) return;
      _svTimer = setTimeout(function () { _svTimer = null; saveView(); }, 400);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") saveView(); });
    window.addEventListener("pagehide", saveView);
  });
})();
