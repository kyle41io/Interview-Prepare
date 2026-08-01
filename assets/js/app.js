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
    home: "fa-solid fa-house",
    cheat: "fa-solid fa-clipboard-list",
    learn: "fa-solid fa-book-open",
    cards: "fa-regular fa-clone",
    quiz: "fa-solid fa-pen-to-square",
    search: "fa-solid fa-magnifying-glass",
    menu: "fa-solid fa-bars",
    check: "fa-solid fa-check",
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
  function proBadge(tp) {
    if (!(tp && tp.tier === "pro")) return "";
    // Non-Pro viewers see a lock; Pro viewers see the plain PRO badge.
    const locked = !(IP.pro && IP.pro.isPro());
    return `<span class="pro-badge${locked ? " pro-badge--locked" : ""}">${fa(locked ? "fa-solid fa-lock" : ICON.pro)} PRO</span>`;
  }
  /* Topic cards and sidebar rows mark Pro with a gold frame + crown watermark
     instead of an inline PRO pill, which pushed their titles out of alignment.
     The lock (non-Pro viewers) is an absolutely positioned icon, also out of flow. */
  function isProTier(tp) { return !!(tp && tp.tier === "pro"); }
  function proClass(tp) { return isProTier(tp) ? " is-pro" : ""; }
  function proLock(tp, cls) {
    if (!isProTier(tp) || (IP.pro && IP.pro.isPro())) return "";
    return `<span class="${cls}" title="PRO">${fa("fa-solid fa-lock")}</span>`;
  }
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
    authView: "signin",       // signin | signup — logged-out only, kept apart from mode
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
    // Content lives in private S3 and is fetched after sign-in, so "no content"
    // is a real state on every study screen — distinct from "nothing left to do".
    contentUnavailable: { vi: "Chưa tải được nội dung. Hãy tải lại trang hoặc đăng nhập lại.", en: "Content could not be loaded. Reload the page, or sign in again." },
    contentLoading: { vi: "Đang tải nội dung…", en: "Loading content…" },
    quizNoBank: { vi: "Chủ đề này chưa có câu hỏi trắc nghiệm.", en: "This topic has no quiz questions yet." },
    cheat: { vi: "Cheat sheet", en: "Cheat sheet" },
    upgrade: { vi: "Nâng cấp Pro", en: "Upgrade to Pro" },
    proActiveUntil: { vi: "Pro của bạn có hiệu lực đến", en: "Your Pro is active until" },
    proTopicTitle: { vi: "Chủ đề Pro", en: "Pro topic" },
    proTopicDesc: { vi: "Chủ đề này thuộc gói Pro. Nâng cấp để mở khoá toàn bộ nội dung, thẻ ghi nhớ và trắc nghiệm của chủ đề.", en: "This topic is part of Pro. Upgrade to unlock its full content, flashcards and quizzes." },
    proUpgradeCta: { vi: "Nâng cấp Pro", en: "Upgrade to Pro" },
    payStep1: { vi: "Quét QR & chuyển khoản đúng nội dung", en: "Scan the QR & transfer with the exact note" },
    iPaid: { vi: "Tôi đã chuyển khoản", en: "I have transferred" },
    waitingApproval: { vi: "Đang chờ duyệt (thường trong vài giờ)", en: "Awaiting approval (usually within hours)" },
    payRejected: { vi: "Bị từ chối", en: "Rejected" },
    signInFirst: { vi: "Đăng nhập để nâng cấp Pro", en: "Sign in to upgrade" },
    copy: { vi: "Sao chép", en: "Copy" },
    admin: { vi: "Quản trị", en: "Admin" },
    approve: { vi: "Duyệt", en: "Approve" },
    reject: { vi: "Từ chối", en: "Reject" },
    noRequests: { vi: "Không có yêu cầu nào đang chờ.", en: "No pending requests." },
    notAuthorized: { vi: "Bạn không có quyền truy cập.", en: "Not authorized." },
    chatAI: { vi: "Chat AI", en: "AI Chat" },
    chatPlaceholder: { vi: "Hỏi về lập trình, phỏng vấn, CV…", en: "Ask about coding, interviews, CV…" },
    chatSend: { vi: "Gửi", en: "Send" },
    chatSignIn: { vi: "Đăng nhập để dùng Chat AI", en: "Sign in to use AI Chat" },
    chatQuota: { vi: "Còn lại hôm nay", en: "Left today" },
    chatQuotaOut: { vi: "Đã hết lượt hôm nay.", en: "Out of messages for today." },
    chatUpgradeCta: { vi: "Nâng cấp Pro để chat nhiều hơn (50/ngày)", en: "Upgrade to Pro for more (50/day)" },
    chatQuotaSession: { vi: "Đã dùng hết 5 lượt của phiên demo này. Đăng xuất rồi đăng nhập lại để bắt đầu phiên mới.", en: "You've used all 5 messages in this demo session. Sign out and back in to start a new one." },
    chatProTitle: { vi: "Chat AI là tính năng Pro", en: "AI Chat is a Pro feature" },
    chatProDesc: { vi: "Trợ lý AI song ngữ giúp bạn luyện phỏng vấn, giải thích khái niệm và góp ý CV. Nâng cấp Pro để mở khoá.", en: "The bilingual AI assistant helps you rehearse interviews, explain concepts and review your CV. Upgrade to Pro to unlock it." },
    chatEmpty: { vi: "Trợ lý IT — hỏi về lập trình, thuật toán, phỏng vấn, CV. Chỉ hỗ trợ chủ đề CNTT.", en: "IT assistant — ask about coding, algorithms, interviews, CV. IT topics only." },
    chatError: { vi: "Có lỗi, thử lại.", en: "Something went wrong, try again." },
    chatUnavailable: { vi: "Chat AI chưa được cấu hình.", en: "AI Chat is not configured yet." },
    reminders: { vi: "Lịch nhắc", en: "Reminders" },
    notifications: { vi: "Thông báo", en: "Notifications" },
    noNotifs: { vi: "Chưa có thông báo.", en: "No notifications." },
    noReminders: { vi: "Chưa có lịch nhắc nào.", en: "No reminders yet." },
    markAllRead: { vi: "Đánh dấu đã đọc hết", en: "Mark all read" },
    deleteRead: { vi: "Xoá đã đọc", en: "Delete read" },
    exportIcs: { vi: "Xuất .ics", en: "Export .ics" },
    markDone: { vi: "Xong", en: "Done" },
    dismiss: { vi: "Bỏ qua", en: "Dismiss" },
    gmailConnect: { vi: "Kết nối Gmail", en: "Connect Gmail" },
    gmailDisconnect: { vi: "Ngắt kết nối", en: "Disconnect" },
    gmailConnected: { vi: "Đã kết nối Gmail", en: "Gmail connected" },
    gmailBlurb: { vi: "Tự động phát hiện email tuyển dụng (bài test, phỏng vấn, offer) và nhắc lịch.", en: "Auto-detect recruiting emails (tests, interviews, offers) and remind you." },
    gmailProTitle: { vi: "Đồng bộ Gmail là tính năng Pro", en: "Gmail sync is a Pro feature" },
    gmailProDesc: { vi: "Tự động phát hiện email tuyển dụng, tạo lịch nhắc phỏng vấn/bài test và thông báo. Nâng cấp Pro để bật.", en: "Auto-detect recruiting emails, create interview/test reminders and notifications. Upgrade to Pro to enable." },
    calAdd: { vi: "Thêm", en: "Add" },
    calDelete: { vi: "Xoá", en: "Delete" },
    calToday: { vi: "Hôm nay", en: "Today" },
    calPrev: { vi: "Tháng trước", en: "Previous month" },
    calNext: { vi: "Tháng sau", en: "Next month" },
    calFieldTitle: { vi: "Tiêu đề", en: "Title" },
    calFieldType: { vi: "Loại", en: "Type" },
    calFieldCompany: { vi: "Công ty", en: "Company" },
    calFieldTime: { vi: "Giờ", en: "Time" },
    calKindInterview: { vi: "Phỏng vấn", en: "Interview" },
    calKindTest: { vi: "Online test", en: "Online test" },
    calKindDeadline: { vi: "Hạn nộp", en: "Deadline" },
    calKindOther: { vi: "Khác", en: "Other" },
    calNoEvents: { vi: "Không có sự kiện.", en: "No events." },
    calAddFailed: { vi: "Không lưu được, thử lại.", en: "Couldn't save, try again." },
  });

  /* ============================================================
     RENDER: content blocks
     ============================================================ */
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c])); }

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
        const icons = { soundbite: "🗣️", tip: "💡", warning: "⚠️", danger: "🛑", key: "🔑" };
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
      case "diagram":
        // IP.diagram returns "" for a spec it cannot draw, which falls through
        // to the same "render nothing" as an unknown block type.
        return (IP.diagram && IP.diagram.render(b, { lang: State.lang })) || "";
      default:
        return "";
    }
  }

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
      `<a class="toc-item" data-toc="${i}">${i + 1}. ${t(s.title).replace(/^\s*\d+\.\s*/, "")}</a>`).join("");
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
      <div id="proSections" data-topic="${id}"></div>
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

  async function hydrateProSections() {
    const host = document.getElementById("proSections");
    if (!host) return;
    const topicId = host.dataset.topic;
    const cat = await IP.pro.catalog(topicId);           // [{position,title}] or []
    if (document.getElementById("proSections")?.dataset.topic !== topicId) return;
    if (!cat.length) return;
    if (IP.pro.isPro()) {
      const secs = await IP.pro.sections(topicId);
      if (document.getElementById("proSections")?.dataset.topic !== topicId) return;
      if (!secs) return;
      host.innerHTML = secs.map((s, i) => `
        <div class="section pro-section" data-sec="pro${i}">
          <div class="section-head"><h2>${t(s.title)} <span class="pro-badge">${fa(ICON.pro)} PRO</span></h2></div>
          <div class="section-body">${(s.blocks || []).map(renderBlock).join("")}</div>
        </div>`).join("");
    } else {
      host.innerHTML = cat.map(c => `
        <div class="section pro-locked">
          <div class="section-head"><h2>${fa("fa-solid fa-lock")} ${t(c.title)} <span class="pro-badge">${fa(ICON.pro)} PRO</span></h2>
          <button class="btn" data-menu-go="upgrade">${t(UI.upgrade)}</button></div>
        </div>`).join("");
    }
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
      return `<div class="tcard ${State.progress[id] ? "done" : ""}${proClass(tp)}" data-go="${id}">
        <div class="tc-done">${fa(ICON.check)}</div>${proLock(tp, "tc-lock")}
        <div class="tc-icon">${fa(catIcon(tp))}</div>
        <h3>${t(tp.title)}</h3>
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
      <div class="page-head"><h1>${fa(ICON.cheat)} ${L === "vi" ? "Cheat sheet ngày phỏng vấn" : "Interview-day cheat sheet"}</h1>
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
    return `<div class="fade-in settings-page">
      <div class="page-head"><h1>${fa("fa-solid fa-gear")} ${L === "vi" ? "Cài đặt tài khoản" : "Account settings"}</h1></div>
      ${acct}
      ${gmailBlock}
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

  /* ---------- Toast ---------- */
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  /* ---------- AI Chat ---------- */
  const Chat = { sending: false };
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
    const bubbles = msgs.length ? msgs.map(m => `
      <div class="chat-msg ${m.role}">
        <div class="chat-bubble">${m.role === "assistant" ? IP.chat.mdLite(m.content) : esc(m.content)}</div>
      </div>`).join("") : `<div class="chat-empty">${t(UI.chatEmpty)}</div>`;
    return `<div class="fade-in chat-page">
      <div class="chat-scroll" id="chatScroll">${bubbles}
        ${Chat.sending ? `<div class="chat-msg assistant"><div class="chat-bubble typing"><span></span><span></span><span></span></div></div>` : ""}
      </div>
      <div class="chat-input-bar">
        <textarea id="chatInput" rows="1" placeholder="${t(UI.chatPlaceholder)}" ${Chat.sending ? "disabled" : ""}></textarea>
        <button class="btn" id="chatSendBtn" ${Chat.sending ? "disabled" : ""}>${fa("fa-solid fa-paper-plane")}</button>
      </div>
    </div>`;
  }
  async function sendChat() {
    const ta = document.getElementById("chatInput"); if (!ta) return;
    const text = ta.value.trim(); if (!text || Chat.sending) return;
    Chat.sending = true; render(); scrollChat();
    const res = await IP.chat.send(text);
    Chat.sending = false; render(); scrollChat();
    if (res.error === "not-signed-in") return;
    // Session cap first: Pro doesn't lift it, so the upgrade CTA below would be wrong.
    if (res.error === "quota-session") { toast(t(UI.chatQuotaSession)); return; }
    if (res.error === "quota") { toast(t(UI.chatQuotaOut) + (IP.pro.isPro() ? "" : " " + t(UI.chatUpgradeCta))); return; }
    if (res.error === "ai-unavailable") { toast(t(UI.chatUnavailable)); return; }
    if (res.error) { toast(t(UI.chatError)); return; }
  }
  function scrollChat() { const s = document.getElementById("chatScroll"); if (s) s.scrollTop = s.scrollHeight; }
  // Show PRO badge on Chat tab for signed-in non-Pro users; remove otherwise.
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

  /* ---------- Pro upgrade (VietQR) ---------- */
  const Upgrade = { pending: null, ent: null, loading: false };
  if (IP.pro && IP.pro.onChange) IP.pro.onChange(function (ent) { Upgrade.ent = ent; if (IP.auth && IP.auth.getUser) updateAuthUI(IP.auth.getUser()); });
  async function loadUpgradeData() {
    const u = IP.auth ? IP.auth.getUser() : null;
    if (u) {
      try { Upgrade.pending = await IP.pro.currentPayment(); } catch (e) { Upgrade.pending = null; }
    } else {
      Upgrade.pending = null;
    }
    await IP.pro.refresh();
    render();
  }

  function renderUpgrade() {
    const L = State.lang;
    const u = IP.auth ? IP.auth.getUser() : null;
    const head = `<div class="page-head"><h1>${fa(ICON.pro)} ${t(UI.upgrade)}</h1></div>`;

    const p = Upgrade.pending;
    const history = (p && (p.status === "pending" || p.status === "submitted"))
      ? `<table class="tbl">
           <thead><tr><th>${L === "vi" ? "Mã" : "Code"}</th><th>${L === "vi" ? "Ngày" : "Date"}</th><th>${L === "vi" ? "Trạng thái" : "Status"}</th></tr></thead>
           <tbody><tr><td>${esc(p.code)}</td><td>${new Date(p.created_at).toLocaleDateString(L === "vi" ? "vi-VN" : "en-US")}</td><td><span class="status-pill ${p.status}">${p.status}</span></td></tr></tbody>
         </table>`
      : "";

    if (!u) {
      return `<div class="fade-in upgrade-page">${head}
        <div class="empty-hint">${t(UI.signInFirst)}</div>
        <button class="btn lg" onclick="IP.auth.signInWithGoogle()">${t(UI.signIn)}</button>
      </div>`;
    }

    if (IP.pro.isPro()) {
      const ent = Upgrade.ent;
      const until = ent && ent.expires_at ? new Date(ent.expires_at).toLocaleDateString(L === "vi" ? "vi-VN" : "en-US") : "";
      return `<div class="fade-in upgrade-page">${head}
        <div class="qr-card">
          <div>${fa(ICON.pro)} <b>${t(UI.proActiveUntil)}${until ? ": " + until : ""}</b></div>
        </div>
        ${history}
      </div>`;
    }

    const pending = p && p.status === "pending" ? p : null;
    const submitted = p && p.status === "submitted" ? p : null;

    if (pending) {
      const qrUrl = (pending.vietqr && pending.vietqr.url) ? pending.vietqr.url : IP.pro.vietqrUrl(pending.amount, pending.code);
      return `<div class="fade-in upgrade-page">${head}
        <div class="qr-card">
          <div class="blurb">${t(UI.payStep1)}</div>
          <img src="${qrUrl}" alt="VietQR" onerror="this.hidden=true;document.getElementById('qrFallback').hidden=false">
          <table class="tbl" id="qrFallback" hidden>
            <tbody>
              <tr><td>${L === "vi" ? "Ngân hàng" : "Bank"}</td><td>Techcombank</td></tr>
              <tr><td>${L === "vi" ? "Số tài khoản" : "Account number"}</td><td>19036335023019 <button class="btn subtle" data-copy="19036335023019">${t(UI.copy)}</button></td></tr>
              <tr><td>${L === "vi" ? "Số tiền" : "Amount"}</td><td>49.000đ</td></tr>
              <tr><td>${L === "vi" ? "Nội dung" : "Note"}</td><td>${esc(pending.code)} <button class="btn subtle" data-copy="${esc(pending.code)}">${t(UI.copy)}</button></td></tr>
            </tbody>
          </table>
          <div class="pay-row"><span>${L === "vi" ? "Mã" : "Code"}</span><span>${esc(pending.code)} <button class="btn subtle" data-copy="${esc(pending.code)}">${t(UI.copy)}</button></span></div>
          <button class="btn lg" id="iPaidBtn">${t(UI.iPaid)}</button>
        </div>
        ${history}
      </div>`;
    }

    if (submitted) {
      return `<div class="fade-in upgrade-page">${head}
        <div class="qr-card">
          <div class="empty-hint">${t(UI.waitingApproval)}</div>
        </div>
        ${history}
      </div>`;
    }

    return `<div class="fade-in upgrade-page">${head}
      <div class="blurb">${L === "vi"
        ? "Mở khoá nội dung chuyên sâu, trợ lý Chat AI và nhắc lịch phỏng vấn qua Gmail."
        : "Unlock in-depth content, the AI Chat assistant, and Gmail interview reminders."}</div>
      <div class="qr-card">
        <div><b>${IP.pro.PRICE_VND.toLocaleString(L === "vi" ? "vi-VN" : "en-US")}đ / ${IP.pro.PLAN_DAYS} ${L === "vi" ? "ngày" : "days"}</b></div>
        <button class="btn lg" id="startUpgradeBtn">${t(UI.upgrade)}</button>
      </div>
      ${history}
    </div>`;
  }

  /* ---------- Admin approval page ---------- */
  const Admin = { reqs: null, loading: false, error: null };
  async function loadAdminData() {
    const u = IP.auth ? IP.auth.getUser() : null;
    if (!u) return;
    Admin.loading = true;
    try {
      const [pend, sub] = await Promise.all([IP.pro.adminListPayments("pending"), IP.pro.adminListPayments("submitted")]);
      const merged = [].concat(pend || [], sub || []);
      const seen = new Set();
      Admin.reqs = merged.filter(r => { if (seen.has(r.code)) return false; seen.add(r.code); return true; });
      Admin.error = null;
    } catch (e) {
      Admin.reqs = Admin.reqs || [];
      Admin.error = (e && e.message) || "error";
    }
    Admin.loading = false;
    render();
  }

  function renderAdmin() {
    const L = State.lang;
    const u = IP.auth ? IP.auth.getUser() : null;
    if (!IP.pro.isAdmin(u && u.id, (window.IP_CONFIG || {}).ADMIN_UIDS)) {
      return `<div class="fade-in"><div class="empty-hint">${t(UI.notAuthorized)}</div></div>`;
    }
    const head = `<div class="page-head"><h1>${fa("fa-solid fa-user-shield")} ${t(UI.admin)}</h1></div>`;
    const errHtml = Admin.error ? `<div class="empty-hint">${esc(Admin.error)}</div>` : "";
    const reqs = Admin.reqs || [];
    const rows = reqs.map(r => {
      const who = esc((r.profiles && (r.profiles.email || r.profiles.display_name)) || r.userId || r.user_id || "");
      const amount = (r.amount || 0).toLocaleString("vi-VN") + "đ";
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString(L === "vi" ? "vi-VN" : "en-US") : "";
      const actions = r.status === "submitted"
        ? `<button class="btn green" data-approve="${esc(r.code)}">${t(UI.approve)}</button> <button class="btn danger-btn" data-reject="${esc(r.code)}">${t(UI.reject)}</button>`
        : "";
      return `<tr>
        <td>${who}</td>
        <td>${esc(r.code)}</td>
        <td>${amount}</td>
        <td>${date}</td>
        <td><span class="status-pill ${r.status}">${r.status}</span></td>
        <td>${actions}</td>
      </tr>`;
    }).join("");
    const table = reqs.length
      ? `<table class="tbl admin-table">
           <thead><tr><th>${L === "vi" ? "Người dùng" : "User"}</th><th>${L === "vi" ? "Mã" : "Code"}</th><th>${L === "vi" ? "Số tiền" : "Amount"}</th><th>${L === "vi" ? "Ngày" : "Date"}</th><th>${L === "vi" ? "Trạng thái" : "Status"}</th><th></th></tr></thead>
           <tbody>${rows}</tbody>
         </table>`
      : `<div class="empty-hint">${t(UI.noRequests)}</div>`;
    return `<div class="fade-in">${head}${errHtml}${table}</div>`;
  }

  /* ---------- Notifications (bell) ---------- */
  const Notifs = { list: null };
  async function refreshBell() {
    if (!(IP.auth && IP.auth.getUser && IP.auth.getUser())) return;
    const list = await IP.gmail.fetchNotifications();
    Notifs.list = list;
    const unread = (list || []).filter((n) => !n.read).length;
    const badge = document.getElementById("bellBadge");
    if (badge) { badge.hidden = unread === 0; badge.textContent = unread > 9 ? "9+" : String(unread); }
    const menu = document.getElementById("notifMenu");
    if (menu) {
      menu.innerHTML = `<div class="notif-head">${t(UI.notifications)}<span class="notif-actions"><button class="link-btn" id="notifReadAll">${t(UI.markAllRead)}</button><button class="link-btn" id="notifDelRead">${t(UI.deleteRead)}</button></span></div>` +
        ((list || []).length
          ? list.slice(0, 12).map((n) => `<div class="notif-item ${n.read ? "" : "unread"}" data-notif="${n.id}"><span class="ni-ic">${IP.gmail.notifIcon(n.type)}</span><div class="ni-body"><div class="ni-title">${esc(n.title)}</div><div class="ni-sub">${esc(n.body || "")}</div></div></div>`).join("")
          : `<div class="empty-hint">${t(UI.noNotifs)}</div>`);
    }
  }

  /* ---------- Gmail settings ---------- */
  const GmailSettings = { status: null, loaded: false };
  async function loadGmailStatus() {
    GmailSettings.status = await IP.gmail.status();
    GmailSettings.loaded = true;
    if (State.mode === "settings") render();
  }
  // The consent redirect lands us back on the settings screen, which fetches
  // status while auth.js is still handing the refresh token to the server. That
  // race renders "not connected" for a connect that succeeded, so re-fetch once
  // the handoff actually lands.
  window.addEventListener("ip:gmail-connected", function () {
    GmailSettings.loaded = false;
    loadGmailStatus();
  });

  /* ---------- Reminders page (month calendar) ---------- */
  const Reminders = { list: null };
  const Calendar = { year: null, month: null, selected: null };
  function calPad2(n) { return String(n).padStart(2, "0"); }
  function calDateKey(d) { return d.getFullYear() + "-" + calPad2(d.getMonth() + 1) + "-" + calPad2(d.getDate()); }
  function remDateKey(r) {
    const w = r.due_at || r.deadline_at;
    if (!w) return null;
    // Reminder times are floating wall-clock stored in UTC (see IP.calendar.buildWhen);
    // take the day straight from the ISO date part so it never shifts with the
    // viewer's timezone.
    return String(w).slice(0, 10);
  }
  function calEnsureInit() {
    if (Calendar.year == null) {
      const now = new Date();
      Calendar.year = now.getFullYear();
      Calendar.month = now.getMonth();
      Calendar.selected = calDateKey(now);
    }
  }
  async function loadReminders() {
    Reminders.list = await IP.gmail.fetchReminders();
    if (State.mode === "reminders") render();
  }
  function calKindLabel(kind) {
    return t(kind === "interview" ? UI.calKindInterview
      : kind === "test" ? UI.calKindTest
      : kind === "deadline" ? UI.calKindDeadline
      : UI.calKindOther);
  }
  function renderCalNav(L, locale) {
    const label = new Date(Calendar.year, Calendar.month, 1)
      .toLocaleDateString(locale, { month: "long", year: "numeric" });
    return `<div class="cal-nav">
      <button class="btn" data-cal-prev aria-label="${t(UI.calPrev)}">${fa("fa-solid fa-chevron-left")}</button>
      <span class="cal-month-label">${esc(label)}</span>
      <button class="btn" data-cal-next aria-label="${t(UI.calNext)}">${fa("fa-solid fa-chevron-right")}</button>
      <button class="btn" data-cal-today>${t(UI.calToday)}</button>
    </div>`;
  }
  function renderCalHeader(locale) {
    // Jan 1 2023 was a Sunday — anchor to render Sunday..Saturday short names.
    let cells = "";
    for (let i = 0; i < 7; i++) {
      const wd = new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" });
      cells += `<div class="cal-th">${esc(wd)}</div>`;
    }
    return `<div class="cal-head">${cells}</div>`;
  }
  function renderCalGrid(byDay, todayKey) {
    const cells = IP.calendar.monthGrid(Calendar.year, Calendar.month);
    return `<div class="cal-grid">` + cells.map((c) => {
      if (!c.date) return `<div class="cal-cell cal-cell--out"></div>`;
      const events = byDay[c.date] || [];
      const shown = events.slice(0, 2).map((r) =>
        `<span class="cal-pill cal-pill--${esc(r.kind || "other")}${r.status === "done" ? " cal-pill--done" : ""}" title="${esc(r.title)}">${esc(r.title)}</span>`
      ).join("");
      const more = events.length > 2 ? `<span class="cal-more">+${events.length - 2}</span>` : "";
      const cls = "cal-cell"
        + (c.date === todayKey ? " cal-cell--today" : "")
        + (c.date === Calendar.selected ? " cal-cell--sel" : "");
      return `<div class="${cls}" data-cal-day="${c.date}">
        <div class="cal-daynum">${c.day}</div>${shown}${more}</div>`;
    }).join("") + `</div>`;
  }
  function renderCalPanel(byDay, locale) {
    const events = byDay[Calendar.selected] || [];
    const heading = Calendar.selected
      ? new Date(Calendar.selected + "T00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
      : "";
    const list = events.length
      ? events.map((r) => {
          const w = r.due_at || r.deadline_at;
          // timeZone:"UTC" — reminder times are floating wall-clock stored in UTC,
          // so render them in UTC to show exactly the time from the email/entry.
          const time = w ? new Date(w).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "";
          const del = r.source === "manual"
            ? `<button class="btn danger-btn" data-cal-del="${r.id}">${t(UI.calDelete)}</button>` : "";
          const done = r.status === "done";
          const doneBtn = done ? "" : `<button class="btn green" data-rem-done="${r.id}">${t(UI.markDone)}</button>`;
          return `<div class="cal-event${done ? " cal-event--done" : ""}" data-rem="${r.id}">
            <span class="rem-kind ${esc(r.kind || "")}">${IP.gmail.notifIcon(r.kind)}</span>
            <div class="rem-body">
              <div class="rem-title">${esc(r.title)}</div>
              <div class="rem-sub">${esc(r.company || "")}${r.company ? " · " : ""}${esc(time)}</div>
            </div>
            <div class="rem-actions">
              <button class="btn" data-ics="${r.id}">${t(UI.exportIcs)}</button>
              ${doneBtn}
              <button class="btn danger-btn" data-rem-dismiss="${r.id}">${t(UI.dismiss)}</button>
              ${del}
            </div>
          </div>`;
        }).join("")
      : `<div class="empty-hint">${t(UI.calNoEvents)}</div>`;
    const form = `<form class="cal-add-form" data-cal-add>
      <input name="title" required placeholder="${t(UI.calFieldTitle)}" />
      <select name="kind">
        <option value="interview">${t(UI.calKindInterview)}</option>
        <option value="test">${t(UI.calKindTest)}</option>
        <option value="deadline">${t(UI.calKindDeadline)}</option>
        <option value="other">${t(UI.calKindOther)}</option>
      </select>
      <input name="company" placeholder="${t(UI.calFieldCompany)}" />
      <input name="time" type="time" aria-label="${t(UI.calFieldTime)}" />
      <button type="submit" class="btn green">${t(UI.calAdd)}</button>
      <div class="cal-add-error" hidden>${t(UI.calAddFailed)}</div>
    </form>`;
    return `<div class="cal-panel">
      <div class="cal-panel-head">${esc(heading)}</div>
      <div class="cal-panel-list">${list}</div>${form}</div>`;
  }
  function renderReminders() {
    calEnsureInit();
    const L = State.lang;
    const locale = L === "vi" ? "vi-VN" : "en-US";
    const head = `<div class="page-head"><h1>${fa("fa-solid fa-calendar-check")} ${t(UI.reminders)}</h1></div>`;
    const byDay = {};
    (Reminders.list || []).forEach((r) => {
      const key = remDateKey(r);
      if (!key) return;
      (byDay[key] = byDay[key] || []).push(r);
    });
    const todayKey = calDateKey(new Date());
    const calendar = `<div class="cal-wrap">
      <div class="cal-main">${renderCalNav(L, locale)}${renderCalHeader(locale)}${renderCalGrid(byDay, todayKey)}</div>
      ${renderCalPanel(byDay, locale)}</div>`;
    return `<div class="fade-in reminders-page">${head}${calendar}</div>`;
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

  // Topic ids in current path, in track order. No track → empty (the
  // onboarding picker is shown instead, so only read when track exists).
  function pathTopicIds() {
    const track = currentTrack();
    return track ? IP.tracks.resolveItems(track, PREP.order) : [];
  }

  /* ============================================================
     RENDER: home dashboard
     ============================================================ */
  function renderHome() {
    // Stat tiles summarise the current path only — the same topic set the grid
    // below renders — not the whole catalog. countDue(id) draws from the study
    // pool, so Pro topics contribute 0 for non-Pro users (as they should).
    const pathIds = pathTopicIds();
    const total = pathIds.length;
    const learned = pathIds.filter(id => State.progress[id]).length;
    const pct = total ? Math.round((learned / total) * 100) : 0;
    const dueCount = pathIds.reduce((n, id) => n + countDue(id), 0);
    let totalCards = 0, totalQuiz = 0;
    pathIds.forEach(id => { totalCards += (PREP.topics[id].flashcards || []).length; totalQuiz += (PREP.topics[id].quiz || []).length; });

    const groupsHtml = CATS.map(cat => {
      const ids = pathIds.filter(id => PREP.topics[id] && PREP.topics[id].category === cat.id);
      if (!ids.length) return "";
      const cardsHtml = ids.map(id => { const tp = PREP.topics[id]; return `
      <div class="tcard ${State.progress[id] ? "done" : ""}${proClass(tp)}" data-go="${id}">
        <div class="tc-done">${fa(ICON.check)}</div>${proLock(tp, "tc-lock")}
        <div class="tc-icon">${fa(catIcon(tp))}</div>
        <h3>${t(tp.title)}</h3>
        <p>${t(tp.blurb)}</p>
        <div class="tc-meta"><span>${fa(ICON.cardsCount)} ${(tp.flashcards || []).length}</span><span>${fa(ICON.quizCount)} ${(tp.quiz || []).length}</span></div>
      </div>`; }).join("");
      return `<div class="home-cat"><div class="home-cat-head">${fa(ICON[cat.id] || "fa-solid fa-book")} <span>${t(cat)}</span><span class="hc-count">${ids.length}</span></div>
        <div class="home-grid">${cardsHtml}</div></div>`;
    }).join("");

    const L = State.lang;
    let continueHtml = "";
    if (!PREP.order.length) {
      // Same two-causes problem the flashcard and quiz screens handle: with an
      // empty registry progressOf() returns 0/0 and nextTopic() returns null, so
      // the continue-card below would congratulate the user on finishing a track
      // whose content never arrived. That state lasts from `terraform apply`
      // until the first content push, and recurs on any API/S3/CORS failure.
      continueHtml = `<div class="continue-card"><div class="cc-left">
        <div class="cc-title">⚠️ ${t(UI.contentUnavailable)}</div>
      </div></div>`;
    } else if (State.track) {
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
      <div class="hero hero-slim">
        <h1>${L === "vi" ? "Sẵn sàng cho buổi phỏng vấn 🚀" : "Get interview-ready 🚀"}</h1>
        <p>${L === "vi" ? "Học theo lộ trình, lật thẻ ghi nhớ, tự kiểm tra — song ngữ." : "Follow your track, flip flashcards, quiz yourself — bilingual."}</p>
      </div>

      <div class="stat-grid compact">
        <div class="stat"><div class="num a">${total}</div><div class="lbl">${L === "vi" ? "Chủ đề" : "Topics"}</div></div>
        <div class="stat"><div class="num g">${learned}/${total}</div><div class="lbl">${L === "vi" ? "Đã học" : "Learned"}</div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>
        <div class="stat"><div class="num p">${totalCards}</div><div class="lbl">${L === "vi" ? "Thẻ ghi nhớ" : "Flashcards"}</div></div>
        <div class="stat"><div class="num o">${dueCount}</div><div class="lbl">${L === "vi" ? "Thẻ cần ôn" : "Cards due"}</div></div>
        <div class="stat"><div class="num o">${fa(ICON.streak)} ${IP.streak.get().count}</div><div class="lbl">${L === "vi" ? "Ngày liên tiếp" : "Day streak"}</div></div>
      </div>

      ${groupsHtml}

      <div class="cheat-cta" data-go-cheat="1">
        <span class="cc-ic">${fa(ICON.cheat)}</span>
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
  // Topic ids the current user may study (Pro topics dropped for non-Pro).
  function studyPool() {
    return IP.gating.visibleTopicPool(PREP.order, PREP.topics, IP.pro && IP.pro.isPro());
  }
  function allCards() {
    const out = [];
    studyPool().forEach(id => (PREP.topics[id].flashcards || []).forEach((c, i) => out.push({ key: cardKey(id, i), topicId: id, idx: i, card: c })));
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
      studyPool().map(id => `<option value="${id}" ${Cards.topic === id ? "selected" : ""}>${t(PREP.topics[id].title)} (${countDue(id)})</option>`).join("");
    const head = `<div class="fc-controls">
        <select class="fc-select" id="fcTopic">${opts}</select>
        <span class="fc-progress" id="fcProg"></span>
      </div>`;

    if (Cards.queue.length === 0) {
      // An empty queue has two very different causes now that the banks are
      // fetched from private S3: everything is genuinely reviewed, or no content
      // ever arrived. The all-clear screen congratulates the user for finishing a
      // deck they never received — and its "Study all again" button does nothing.
      if (!studyPool().length) {
        return `<div class="fc-wrap fade-in">
          <div class="fc-empty"><div class="big">⚠️</div><p>${t(UI.contentUnavailable)}</p></div></div>`;
      }
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
    let qs = [];
    if (topicId === "all") studyPool().forEach(id => ((PREP.topics[id] || {}).quiz || []).forEach(q => qs.push({ ...q, _topic: id })));
    else qs = ((PREP.topics[topicId] || {}).quiz || []).map(q => ({ ...q, _topic: topicId }));
    for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[qs[i], qs[j]] = [qs[j], qs[i]]; }
    Quiz.questions = qs.slice(0, topicId === "all" ? 20 : qs.length);
    // A selected topic is what puts renderQuiz into the question view, where it
    // dereferences Quiz.questions[Quiz.pos] (and the 1-4 answer keys do the
    // same). With the banks in private S3 an empty question set is now reachable
    // — a failed content fetch leaves PREP empty, so "All topics" yields none —
    // so refuse to leave the picker rather than crash on the first paint.
    Quiz.topic = Quiz.questions.length ? topicId : null;
    Quiz.pos = 0; Quiz.correct = 0; Quiz.answered = false; Quiz.picked = -1; Quiz.finished = false;
  }
  /* buildQuiz refuses to enter the question view on an empty bank (it would
     crash on Quiz.questions[Quiz.pos]). Without a word that refusal reads as a
     dead Start button: the screen just snaps back to the picker. Every entry
     point into a quiz goes through here so the bounce is always explained. */
  function startQuiz(topicId) {
    buildQuiz(topicId);
    if (!Quiz.topic) toast(t(UI.quizNoBank));
  }
  function renderQuiz() {
    const L = State.lang;
    if (!Quiz.topic || !Quiz.questions.length) {
      const pool = studyPool();
      // Content is fetched from private S3 after sign-in; if that fetch failed
      // there is nothing to quiz on. Say so, rather than offer a Start button
      // whose only outcome is an empty question set.
      if (!pool.length) {
        return `<div class="quiz-wrap fade-in"><div class="quiz-q" style="text-align:center">
          <h2>${fa(ICON.quiz)} ${t(UI.quiz)}</h2>
          <p style="color:var(--muted)">${t(UI.contentUnavailable)}</p>
        </div></div>`;
      }
      const opts = `<option value="all">${t(UI.allTopics)}</option>` +
        pool.map(id => `<option value="${id}">${t(PREP.topics[id].title)} (${(PREP.topics[id].quiz || []).length})</option>`).join("");
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

    // Topic sidebar is a Learn-mode-only affordance — clear it in every other
    // mode so no stale list lingers behind the hidden column.
    if (State.mode !== "learn") { sb.innerHTML = ""; return; }

    // Path-scoped: always the current track's topics. A user with no track
    // sees the onboarding picker instead (render() short-circuits before
    // this point), so this branch is a defensive no-op in normal flow.
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

    // Numbered topic items
    items.forEach((id, idx) => {
      const tp = PREP.topics[id];
      if (!tp) return;
      const done = !!State.progress[id];
      const current = State.mode === "learn" && State.topic === id;
      html += `<div class="nav-item ${current ? "active" : ""} ${done ? "done" : ""}${proClass(tp)}" data-topic="${id}">
        <span class="ni-num">${idx + 1}</span>
        <span class="ni-icon">${fa(catIcon(tp))}</span>
        <span class="ni-label">${t(tp.title)}</span>${proLock(tp, "ni-lock")}<span class="ni-check">${fa(ICON.check)}</span></div>`;
    });

    sb.innerHTML = html;
  }

  function render() {
    const main = document.getElementById("content");
    // Hamburger toggles the topic sidebar, which only exists in Learn mode.
    // Hide it on the landing, during onboarding, and in cards/quiz/chat/etc.
    const _mb = document.getElementById("menuBtn");
    if (_mb) _mb.hidden = (IP.auth.enabled() && !IP.auth.getUser()) || IP.onboarding.shouldShow() || State.mode !== "learn";
    // The topic sidebar belongs to Learn only. On every other tab/view hide the
    // whole column (not just the drawer) and let content span full width.
    const _sidebarVisible = State.mode === "learn"
      && !(IP.auth.enabled() && !IP.auth.getUser())
      && !IP.onboarding.shouldShow();
    document.body.classList.toggle("no-sidebar", !_sidebarVisible);
    // Logged-out gate: when a backend is configured but nobody is signed in,
    // show only a small intro landing — no track picker, no learning UI.
    if (IP.auth.enabled() && !IP.auth.getUser()) {
      main.innerHTML = IP.authpages.render({ t, fa, lang: State.lang, authView: State.authView });
      document.getElementById("sidebar").innerHTML = "";
      window.scrollTo(0, 0);
      return;
    }
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
    else if (State.mode === "upgrade") main.innerHTML = renderUpgrade();
    else if (State.mode === "admin") main.innerHTML = renderAdmin();
    else if (State.mode === "reminders") {
      // A non-Pro user can only reach reminders via a stale saved view — redirect
      // to home and persist it so the redirect doesn't repeat on every reload.
      if (!IP.pro.isPro()) { State.mode = "learn"; State.topic = null; main.innerHTML = renderHome(); saveView(); }
      else main.innerHTML = renderReminders();
    }
    else if (State.mode === "chat") main.innerHTML = renderChat();
    else if (State.topic) {
      main.innerHTML = (PREP.isProTopic(State.topic) && !IP.pro.isPro())
        ? renderPaywall(State.topic)
        : renderTopic(State.topic);
    }
    else main.innerHTML = renderHome();
    // sync mode buttons
    document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("active", b.dataset.mode === State.mode));
    syncChatNavBadge();
    renderSidebar();
    setupToc();
    hydrateProSections();
    enhanceSelects();
    if (State.mode === "chat") scrollChat();
    // Track the entitlement this paint reflects, so updateAuthUI can re-render
    // #content when Pro resolves/changes under the same signed-in identity.
    _renderedPro = !!(IP.pro && IP.pro.isPro());
    // NOTE: do not force scroll here — render() also runs for in-place updates
    // (mark-learned, flip card, answer quiz, sync apply). Scroll-to-top happens
    // only on real navigation (goTopic/goHome/setMode) via toTop().
  }

  function toTop() { document.getElementById("content").scrollTop = 0; window.scrollTo(0, 0); }

  /* ============================================================
     CUSTOM DROPDOWN
     Progressive-enhance <select class="fc-select"> into a styled dropdown that
     matches the app's menus. The native <select> stays as the source of truth
     (visually hidden), so delegated `change` handlers and `.value` reads that
     other code relies on keep working unchanged.
     ============================================================ */
  function closeAllDropdowns(except) {
    document.querySelectorAll(".cdd.open").forEach(w => {
      if (w === except) return;
      w.classList.remove("open");
      const p = w.querySelector(".cdd-panel"); if (p) p.hidden = true;
      const tr = w.querySelector(".cdd-trigger"); if (tr) tr.setAttribute("aria-expanded", "false");
    });
  }
  function enhanceSelects() {
    document.querySelectorAll("select.fc-select:not([data-enhanced])").forEach(sel => {
      sel.setAttribute("data-enhanced", "1");
      const wrap = document.createElement("div");
      wrap.className = "cdd";
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "cdd-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = '<span class="cdd-value"></span><i class="fa-solid fa-chevron-down cdd-caret"></i>';
      const panel = document.createElement("div");
      panel.className = "cdd-panel";
      panel.setAttribute("role", "listbox");
      panel.hidden = true;
      const valEl = trigger.querySelector(".cdd-value");
      const sync = () => {
        const cur = sel.options[sel.selectedIndex];
        valEl.textContent = cur ? cur.textContent : "";
        panel.innerHTML = Array.from(sel.options).map((o, i) =>
          `<div class="cdd-opt ${i === sel.selectedIndex ? "selected" : ""}" role="option" data-i="${i}">${o.textContent}</div>`).join("");
      };
      sync();
      wrap.appendChild(trigger);
      wrap.appendChild(panel);
      trigger.addEventListener("click", e => {
        e.stopPropagation();
        const willOpen = panel.hidden;
        closeAllDropdowns(wrap);
        if (willOpen) { sync(); panel.hidden = false; trigger.setAttribute("aria-expanded", "true"); wrap.classList.add("open"); }
        else { panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); wrap.classList.remove("open"); }
      });
      panel.addEventListener("click", e => {
        const opt = e.target.closest(".cdd-opt"); if (!opt) return;
        e.stopPropagation();
        const i = +opt.dataset.i;
        if (i !== sel.selectedIndex) { sel.selectedIndex = i; sel.dispatchEvent(new Event("change", { bubbles: true })); }
        sync();
        panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); wrap.classList.remove("open");
      });
    });
  }

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

  /* Validate, call Supabase, paint errors. Shared by both auth forms and the
     demo cards. On success the Supabase auth listener re-renders for us.
     Returns { ok } so callers (e.g. the demo sign-in handler) can tell
     whether the attempt actually succeeded before acting on it. */
  async function submitAuth(kind, vals) {
    const AP = IP.authpages;
    const errs = kind === "signup" ? AP.validateSignUp(vals) : AP.validateSignIn(vals);
    document.querySelectorAll("[data-auth-err]").forEach((el) => { el.hidden = true; el.textContent = ""; });
    const alert = document.querySelector("[data-auth-alert]");
    if (alert) { alert.hidden = true; alert.textContent = ""; }

    if (Object.keys(errs).length) {
      Object.keys(errs).forEach((f) => {
        const el = document.querySelector(`[data-auth-err="${f}"]`);
        if (el) { el.textContent = t(errs[f]); el.hidden = false; }
      });
      return { ok: false };
    }

    const res = kind === "signup"
      ? await IP.auth.signUpWithPassword({ email: vals.email, username: vals.username, password: vals.password })
      : await IP.auth.signInWithPassword({ email: vals.email, password: vals.password });

    if (!res.ok && alert) {
      alert.textContent = t(AP.mapAuthError(res.code));
      alert.hidden = false;
    }
    return res;
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

    // State is private to this IIFE, so authpages reports screen switches back
    // rather than setting them. The delegated handler above does the render.
    IP.authpages.onViewChange((v) => { State.authView = v; });

    // Demo sign-in: seed a track so reviewers land in populated content rather
    // than the onboarding picker. State.track is read from storage once at
    // load, so writing only to storage would leave this session stale. Only
    // commit the seed once sign-in actually succeeds — if it fails (accounts
    // not seeded yet, Supabase unreachable), the visitor stays logged out and
    // a later real sign-up must still see the onboarding wizard.
    IP.authpages.onDemoSignIn(async ({ email, password, track }) => {
      const res = await submitAuth("signin", { email, password });
      if (res.ok) {
        State.track = { role: track.role, level: track.level };
        LS.set("track", State.track);
      }
    });

    // Form submit for both auth screens. Lives here, not in authpages, because
    // it needs IP.auth and render().
    document.body.addEventListener("submit", (e) => {
      const form = e.target.closest("[data-auth-form]");
      if (!form) return;
      e.preventDefault();
      const kind = form.dataset.authForm;
      const val = (n) => { const el = form.querySelector(`[name="${n}"]`); return el ? el.value : ""; };
      submitAuth(kind, {
        email: val("email").trim(),
        username: val("username").trim(),
        password: val("password"),
        confirm: val("confirm"),
      });
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
    // Close any open custom dropdown on outside-click / Escape.
    document.addEventListener("click", () => closeAllDropdowns());
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeAllDropdowns(); });

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
      document.addEventListener("click", () => {
        if (pMenu) pMenu.hidden = true;
        const nMenu = document.getElementById("notifMenu");
        if (nMenu) nMenu.hidden = true;
      });
      pMenu.addEventListener("click", (e) => {
        const b = e.target.closest("[data-menu]");
        if (!b) return;
        const action = b.dataset.menu;
        if (action === "change-track") {
          State.track = null; LS.set("track", null);
          State.topic = null;
          pMenu.hidden = true; render();
        } else if (action === "bookmarks") {
          State.mode = "saved"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
        } else if (action === "cheat") {
          State.mode = "cheat"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
        } else if (action === "reminders") {
          pMenu.hidden = true;
          if (!IP.pro.isPro()) { State.mode = "upgrade"; State.topic = null; render(); toTop(); saveView(); loadUpgradeData(); return; }
          State.mode = "reminders"; State.topic = null;
          render(); toTop(); saveView();
          loadReminders();
        } else if (action === "upgrade") {
          State.mode = "upgrade"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
          loadUpgradeData();
        } else if (action === "admin") {
          State.mode = "admin"; State.topic = null;
          pMenu.hidden = true; render(); toTop(); saveView();
          loadAdminData();
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
      // auth screens — must precede onboarding: a logged-out visitor has no
      // track, so shouldShow() would otherwise swallow every auth click.
      if (IP.auth.enabled() && !IP.auth.getUser()) {
        const ares = IP.authpages.handleClick(e.target);
        if (ares === "rerender") { e.preventDefault(); render(); return; }
        if (ares === true) { e.preventDefault(); return; }
      }

      // onboarding — must be first
      if (IP.onboarding.shouldShow()) {
        const ob = IP.onboarding.handleClick(e.target);
        if (ob === "rerender") { render(); return; }
        if (ob === true) return;
      }

      if (e.target.closest("[data-menu-go]")) {
        const m = e.target.closest("[data-menu-go]").dataset.menuGo;
        if (m === "upgrade") {
          State.mode = "upgrade"; State.topic = null;
          render(); toTop(); saveView();
          if (typeof loadUpgradeData === "function") loadUpgradeData();
        }
        return;
      }

      const topicEl = e.target.closest("[data-topic]");
      if (topicEl) return goTopic(topicEl.dataset.topic);
      const goEl = e.target.closest("[data-go]");
      if (goEl) { si.value = ""; return goTopic(goEl.dataset.go); }

      if (e.target.closest("[data-toc]")) {
        const i = e.target.closest("[data-toc]").dataset.toc;
        const sec = document.querySelector(`.section[data-sec="${i}"]`);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (e.target.closest(".code-copy")) {
        const btn = e.target.closest(".code-copy");
        const code = btn.closest(".code-wrap")?.querySelector("code")?.innerText || "";
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).then(() => {
            btn.innerHTML = fa("fa-solid fa-check");
            setTimeout(() => { btn.innerHTML = fa("fa-regular fa-copy"); }, 1500);
          }).catch(() => {});
        }
        return;
      }

      // "Change path" → clear track so onboarding picker takes over.
      if (e.target.closest("[data-change-track]")) {
        State.track = null; LS.set("track", null);
        State.topic = null; render(); return;
      }

      // section collapse
      const tog = e.target.closest("[data-toggle]");
      if (tog) { tog.parentElement.classList.toggle("collapsed"); return; }

      // diagrams: reveal a block's explanation, or step the walkthrough
      const dgHit = e.target.closest("[data-dg-detail]");
      if (dgHit) { IP.diagram.select(dgHit.closest(".dg"), dgHit.getAttribute("data-dg-detail")); return; }
      const dgWalk = e.target.closest("[data-dg-walk]");
      if (dgWalk) { IP.diagram.walk(dgWalk.closest(".dg"), Number(dgWalk.dataset.dgWalk)); return; }

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
      if (e.target.id === "goQuiz") { setMode("quiz"); startQuiz(State.topic); render(); return; }

      // settings page danger-zone actions
      if (e.target.closest("#clearDataBtn")) {
        // store.clearAll only sweeps the "ip_" prefix; the ~1.3 MB content
        // bundle is cached outside it and would survive a "clear all data".
        if (confirm(t(UI.confirmClear))) { contentClearCache(); IP.store.clearAll(); location.reload(); }
        return;
      }
      if (e.target.closest("#deleteAccountBtn")) {
        if (confirm(t(UI.confirmDelete))) { if (IP.account) IP.account.deleteAccount(); }
        return;
      }

      // pro upgrade page actions
      if (e.target.closest("#startUpgradeBtn")) {
        (async () => {
          const u = IP.auth.getUser();
          if (!u) return;
          await IP.pro.createPayment();
          await loadUpgradeData();
        })();
        return;
      }
      if (e.target.closest("#iPaidBtn")) {
        (async () => {
          const req = Upgrade.pending;
          if (!req || req.status !== "pending" || !req.code) return;
          await IP.pro.submitPayment(req.code);
          await loadUpgradeData();
        })();
        return;
      }
      if (e.target.closest("[data-copy]")) {
        const v = e.target.closest("[data-copy]").dataset.copy;
        if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {});
        return;
      }

      // admin approval actions
      if (e.target.closest("[data-approve]")) {
        const code = e.target.closest("[data-approve]").dataset.approve;
        if (!confirm(t(UI.approve) + "?")) return;
        (async () => {
          const item = (Admin.reqs || []).find(r => r.code === code);
          if (!item) return;
          try { await IP.pro.adminApprove(item); } catch (e) { alert((e && e.message) || "error"); }
          await loadAdminData();
        })();
        return;
      }
      if (e.target.closest("[data-reject]")) {
        const code = e.target.closest("[data-reject]").dataset.reject;
        if (!confirm(t(UI.reject) + "?")) return;
        (async () => {
          const item = (Admin.reqs || []).find(r => r.code === code);
          if (!item) return;
          try { await IP.pro.adminReject(item); } catch (e) { alert((e && e.message) || "error"); }
          await loadAdminData();
        })();
        return;
      }

      // Gmail settings
      if (e.target.closest("#gmailConnectBtn")) {
        IP.gmail.connect();
        return;
      }
      if (e.target.closest("#gmailDisconnectBtn")) {
        (async () => { await IP.gmail.disconnect(); GmailSettings.loaded = false; await loadGmailStatus(); })();
        return;
      }

      // notifications bell
      if (e.target.closest("#bellBtn")) {
        e.stopPropagation();
        const menu = document.getElementById("notifMenu");
        if (menu) { menu.hidden = !menu.hidden; if (!menu.hidden) refreshBell(); }
        return;
      }
      if (e.target.closest("#notifMenu")) e.stopPropagation();
      if (e.target.closest("#notifReadAll")) {
        (async () => { await IP.gmail.markAllRead(); await refreshBell(); })();
        return;
      }
      if (e.target.closest("#notifDelRead")) {
        (async () => { await IP.gmail.deleteReadNotifications(); await refreshBell(); })();
        return;
      }
      if (e.target.closest("[data-notif]")) {
        const id = e.target.closest("[data-notif]").dataset.notif;
        const notif = (Notifs.list || []).find((n) => String(n.id) === String(id)) || { id };
        (async () => { await IP.gmail.markRead(notif); await refreshBell(); })();
        return;
      }

      // calendar navigation + day selection + manual-event delete
      if (e.target.closest("[data-cal-prev]")) {
        if (Calendar.month === 0) { Calendar.month = 11; Calendar.year--; } else { Calendar.month--; }
        render(); return;
      }
      if (e.target.closest("[data-cal-next]")) {
        if (Calendar.month === 11) { Calendar.month = 0; Calendar.year++; } else { Calendar.month++; }
        render(); return;
      }
      if (e.target.closest("[data-cal-today]")) {
        const now = new Date();
        Calendar.year = now.getFullYear(); Calendar.month = now.getMonth();
        Calendar.selected = calDateKey(now);
        render(); return;
      }
      if (e.target.closest("[data-cal-del]")) {
        const id = e.target.closest("[data-cal-del]").dataset.calDel;
        (async () => { await IP.gmail.deleteReminder(id); await loadReminders(); })();
        return;
      }
      if (e.target.closest("[data-cal-day]")) {
        // Let action buttons inside a day/panel handle their own clicks first.
        if (!e.target.closest("[data-ics],[data-rem-done],[data-rem-dismiss],[data-cal-del]")) {
          Calendar.selected = e.target.closest("[data-cal-day]").dataset.calDay;
          render(); return;
        }
      }

      // reminders page actions
      if (e.target.closest("[data-ics]")) {
        const id = e.target.closest("[data-ics]").dataset.ics;
        const r = (Reminders.list || []).find((x) => String(x.id) === String(id));
        if (r && window.Blob && window.URL && document.createElement) {
          const ics = IP.gmail.buildICS(r);
          const blob = new Blob([ics], { type: "text/calendar" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "reminder.ics";
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }
        return;
      }
      if (e.target.closest("[data-rem-done]")) {
        const id = e.target.closest("[data-rem-done]").dataset.remDone;
        (async () => { await IP.gmail.setReminderStatus(id, "done"); await loadReminders(); })();
        return;
      }
      if (e.target.closest("[data-rem-dismiss]")) {
        const id = e.target.closest("[data-rem-dismiss]").dataset.remDismiss;
        (async () => { await IP.gmail.setReminderStatus(id, "dismissed"); await loadReminders(); })();
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
      if (e.target.id === "quizStart") { startQuiz(document.getElementById("quizTopic").value); render(); return; }
      const opt = e.target.closest("[data-opt]");
      if (opt && !Quiz.answered) { answerQuiz(parseInt(opt.dataset.opt, 10)); return; }
      if (e.target.id === "quizNext") { nextQuiz(); return; }
      if (e.target.id === "quizRetry") { buildQuiz(Quiz.topic); render(); return; }
      if (e.target.id === "quizBack") { Quiz.topic = null; render(); return; }
      if (e.target.closest("#chatSendBtn")) { sendChat(); return; }
    });

    // calendar add-event form
    document.addEventListener("submit", (e) => {
      const form = e.target.closest("[data-cal-add]");
      if (!form) return;
      e.preventDefault();
      const title = (form.querySelector("[name=title]").value || "").trim();
      if (!title) return;
      const kind = form.querySelector("[name=kind]").value;
      const company = (form.querySelector("[name=company]").value || "").trim();
      const time = form.querySelector("[name=time]").value || "";
      const errEl = form.querySelector(".cal-add-error");
      (async () => {
        const row = await IP.gmail.createReminder({ title, kind, company, date: Calendar.selected, time });
        if (!row) { if (errEl) errEl.hidden = false; return; }
        await loadReminders();
      })();
    });

    // flashcard topic select (change)
    document.body.addEventListener("change", e => {
      if (e.target.id === "fcTopic") { Cards.topic = e.target.value; buildCardQueue(); render(); }
    });

    // keyboard
    document.addEventListener("keydown", e => {
      if (e.target.id === "chatInput" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); return; }
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "/") { e.preventDefault(); si.focus(); return; }
      // Diagram blocks are role="button" — honour the keys that implies.
      if (e.key === "Enter" || e.key === " ") {
        const dg = e.target.closest && e.target.closest("[data-dg-detail]");
        if (dg) { e.preventDefault(); IP.diagram.select(dg.closest(".dg"), dg.getAttribute("data-dg-detail")); return; }
      }
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
  // Auth-driven render de-duplication. updateAuthUI + the onChange handler fire
  // on every Supabase auth event — INITIAL_SESSION, the duplicate getSession()
  // hydrate in auth.init(), hourly TOKEN_REFRESHED, and a SIGNED_IN each time the
  // tab regains focus. Most carry the same user; rebuilding #content on each is
  // the on-load / on-return "flashing" the user reported. Track the identity we
  // last rendered and only rebuild #content when it actually changes.
  let _authReady = false;    // false until the first auth state is known (or no backend)
  let _authEventSeen = false; // an auth event has arrived, even if its render is still waiting on content
  let _renderedUid;          // uid|null of the last content render; undefined = never rendered
  let _renderedPro = false;  // isPro() at the last content render — lets updateAuthUI re-render when entitlement flips under the same uid
  let _pendingScroll = null; // scroll-Y to restore on the first auth-driven render
  let _paintedMode = null;   // State.mode/topic as of the first paint; null = nothing painted yet
  let _paintedTopic = null;

  /* IP.content ships as its own <script>. If that file fails to load — CDN blip,
     blocked request, a syntax error — IP.content is undefined and every bare
     dereference of it throws. Two of those sit inside the auth listener, and
     auth.js swallows listener exceptions, so the throw is invisible and the page
     never paints. A missing content module must degrade to "no content", never
     take down the boot sequence. */
  function contentLoad() {
    try {
      return Promise.resolve(IP.content && IP.content.load())
        .catch(function (e) { console.warn("[boot] content load failed", e); return 0; });
    } catch (e) {
      console.warn("[boot] content load threw", e);
      return Promise.resolve(0);
    }
  }
  function contentClearCache() {
    try { if (IP.content) IP.content.clearCache(); }
    catch (e) { console.warn("[boot] content cache clear failed", e); }
  }

  /* The saved scroll belongs to a fully painted page. While content is still in
     flight — and after the CONTENT_WAIT_MS cap paints an empty app — the page is
     too short to hold it, so scrolling now lands at the top and consumes the
     restore for nothing. Hold it until the page it belongs to actually exists. */
  function applyPendingScroll() {
    if (_pendingScroll == null) return;
    const y = _pendingScroll;
    // Hold only while a signed-in page is still filling in. The logged-out
    // landing scrolls itself to the top and never honours a saved position, so
    // consuming it there leaves that path exactly as it was.
    if (y > 0 && IP.auth.enabled() && IP.auth.getUser()
        && (document.documentElement.scrollHeight - window.innerHeight) < y) return;
    _pendingScroll = null;
    window.scrollTo(0, y);
  }

  function updateAuthUI(user) {
    const signin = document.getElementById("signinBtn");
    const acctRow = document.getElementById("acctRow");
    const sep = document.getElementById("acctSep");
    const mOut = document.getElementById("menuSignout");
    const on = !!user;
    const md = (user && user.user_metadata) || {};
    if (signin) signin.hidden = on || !IP.auth.enabled();
    [acctRow, sep, mOut].forEach(function (el) { if (el) el.hidden = !on; });
    const proOn = on && IP.pro.isPro();
    // Topbar profile button: show the real avatar when signed in, else the icon.
    // Pro accounts also get a crown tilted onto the top-right corner.
    const pBtn = document.getElementById("profileBtn");
    if (pBtn) {
      const crown = proOn ? '<i class="pro-crown ' + ICON.pro + '"></i>' : "";
      if (on && md.avatar_url) pBtn.innerHTML = '<img class="pfp" src="' + md.avatar_url + '" alt="" referrerpolicy="no-referrer">' + crown;
      else pBtn.innerHTML = '<i class="' + ICON.profile + '"></i>' + crown;
      pBtn.classList.toggle("pro", proOn);
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
    const ma = document.getElementById("menuAdmin");
    if (ma) ma.hidden = !(user && IP.pro.isAdmin(user.id, (window.IP_CONFIG || {}).ADMIN_UIDS));
    const bell = document.getElementById("bellBtn");
    if (bell) bell.hidden = !proOn;
    const remBtn = document.querySelector('[data-menu="reminders"]');
    if (remBtn) remBtn.hidden = !proOn;
    if (proOn) refreshBell();
    // Logged-out: hide the profile button, learning tabs, search + hint bar —
    // only the Sign in button (+ theme/lang) remain. Show them when signed in.
    const gated = IP.auth.enabled() && !on;
    // Logged-out landing: drop the empty sidebar column + its reserved gutter
    // so the intro centers on the full viewport.
    document.body.classList.toggle("logged-out", gated);
    if (pBtn) pBtn.hidden = gated;
    const menuBtn = document.getElementById("menuBtn"); if (menuBtn) menuBtn.hidden = gated;
    const modes = document.querySelector(".modes"); if (modes) modes.hidden = gated;
    const searchBox = document.querySelector(".search-box"); if (searchBox) searchBox.hidden = gated;
    const kbdHelp = document.querySelector(".kbd-help"); if (kbdHelp) kbdHelp.hidden = gated;
    // Switch the page between the landing intro and the app. Rebuild #content
    // when the signed-in identity changes — and also when the Pro entitlement
    // flips under the same identity (async pro.init after first paint, or a
    // live purchase approval), so every isPro()-gated surface unlocks without a
    // reload. Repeat/refresh/refocus auth events carry the same uid AND the same
    // entitlement, so they still skip the rebuild (that was the flashing).
    const uid = on ? user.id : null;
    if (_authReady && (uid !== _renderedUid || proOn !== _renderedPro)) {
      _renderedUid = uid;
      render();
      // Remember what the first paint actually showed: if the user navigates away
      // from it while content is still loading, a late repaint must not drag them
      // back (see repaintLate).
      if (_paintedMode === null) { _paintedMode = State.mode; _paintedTopic = State.topic; }
      applyPendingScroll();
    }
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
    setI("reminders", UI.reminders);
    setI("upgrade", UI.upgrade);
    setI("admin", UI.admin);
    setI("settings", UI.settings);
    setI("signIn", UI.signIn);
    setI("signOut", UI.signOut);
    setI("chatAI", UI.chatAI);
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
    let _notifSubbed = false;
    // Content is fetched from private S3, not shipped in the page, so PREP must
    // be populated before the first signed-in render: the home dashboard and
    // both study modes walk every id in PREP.order synchronously. Load once,
    // then re-enter the normal handler.
    let _contentReady = false;   // the load has settled (even if it registered nothing)
    let _contentWait = null;     // single-flight: concurrent auth events share one load
    let _contentLate = false;    // the load overran the cap below and the page painted without it
    // load() never rejects, but a fetch that simply hangs would hold the first
    // paint forever, and the 1500 ms blank-page net below deliberately stands
    // down once an auth event has arrived. Cap the wait instead: on timeout the
    // app boots into the same empty-but-navigable state a failed load produces,
    // and repaints if the bundle turns up afterwards.
    const CONTENT_WAIT_MS = 8000;
    function whenContentReady() {
      if (_contentReady) return Promise.resolve();
      if (!_contentWait) {
        const loading = contentLoad().then(function (n) {
          if (_contentLate) { _contentLate = false; repaintLate(); }
          return n;
        });
        _contentWait = Promise.race([
          loading,
          new Promise(function (resolve) {
            setTimeout(function () { if (!_contentReady) _contentLate = true; resolve(); }, CONTENT_WAIT_MS);
          }),
        ]).then(function () { _contentReady = true; });
      }
      return _contentWait;
    }
    /* Nothing paints while the bundle is in flight, so a slow connection shows a
       bare topbar over an empty page for up to CONTENT_WAIT_MS. Fill #content
       with a legible wait state. It writes directly rather than going through
       render(), because updateAuthUI(user) has not run yet — render() would draw
       the logged-out landing. Reuses the chat typing dots, the only loading
       affordance this app has. */
    function paintContentLoading() {
      const main = document.getElementById("content");
      if (!main || main.innerHTML.trim()) return;   // never paint over a real render
      main.innerHTML = `<div class="fade-in" style="text-align:center;padding:64px 16px;color:var(--muted)">
        <div class="chat-bubble typing" style="display:inline-flex;margin-bottom:14px"><span></span><span></span><span></span></div>
        <p>${t(UI.contentLoading)}</p></div>`;
    }

    // Declared here rather than beside restoreContentBoundView below because
    // repaintLate also reads it, and repaintLate can run from a promise callback.
    // See the note above restoreContentBoundView for what it guards.
    let _restoreDone = false;

    /* The bundle arrived after the cap, so what is on screen was built without
       content and needs repainting. Two things must survive that repaint. */
    function repaintLate() {
      // The bundle can take arbitrarily long after the cap already let the page
      // paint, and the session can end in that stretch. render() hard-gates
      // logged-out, but the restore below still mutates State.mode/State.topic,
      // and saveView() would then persist a signed-in view over the landing.
      // Same re-check the deferred auth callback does, for the same reason.
      if (!IP.auth.getUser()) return;
      // 1. Navigation. The user had a live, navigable app during the dead window;
      //    if they opened another tab, re-applying the restored view would yank
      //    them out of it. The saved view lost that race — retire it.
      const navigated = _paintedMode !== null
        && (State.mode !== _paintedMode || State.topic !== _paintedTopic);
      if (navigated) {
        // Retire the saved view, but not the PREP-derived caches the current mode
        // needs: whatever the user navigated to was built against an empty PREP.
        // Flashcards is the one that cannot recover on its own — buildCardQueue
        // ran against no content, and renderCards reads that empty queue as "all
        // caught up" once studyPool() fills in, hiding a full deck that is due.
        // The reshuffle worry below does not apply: the queue is empty, so there
        // is no card on screen to swap out from under the user.
        _restoreDone = true;
        _restoreTopic = null;
        if (State.mode === "cards" && PREP.order.length) buildCardQueue();
      } else restoreContentBoundView();
      // 2. DOM-only state. render() rebuilds #content from State, so anything the
      //    DOM holds that State does not is destroyed — most concretely an unsent
      //    chat draft, which is never persisted.
      const ta = document.getElementById("chatInput");
      const draft = ta ? ta.value : "";
      const caret = ta ? ta.selectionStart : 0;
      render();
      if (draft) {
        const ta2 = document.getElementById("chatInput");
        if (ta2) {
          ta2.value = draft;
          try { ta2.setSelectionRange(caret, caret); ta2.focus(); } catch (e) { /* not focusable yet */ }
        }
      }
      applyPendingScroll();   // the page is populated now, so a held scroll can land
    }

    /* auth.js swallows exceptions thrown by its listeners, and the 1500 ms
       blank-page net below stands down the moment an auth event arrives. So an
       unhandled throw anywhere in the handler means the net never fires and
       nothing is ever painted — a permanently blank page, where before the wait
       was introduced the same throw still produced a paint at 1500 ms. Whatever
       failed, end on a usable page. */
    function bootFailsafe(e) {
      console.error("[boot] auth handler failed", e);
      _authReady = true;
      try { updateAuthUI(IP.auth.getUser()); }
      catch (e2) { console.error("[boot] failsafe auth UI failed", e2); }
      // updateAuthUI renders when the identity changed; if it threw before that,
      // _renderedUid is still undefined and nothing has been drawn.
      if (_renderedUid === undefined) {
        try { render(); } catch (e3) { console.error("[boot] failsafe render failed", e3); }
      }
      applyPendingScroll();
    }

    function handleAuthEvent(user) {
      _authEventSeen = true;
      // Record that a session existed here, at observation time, not where the
      // user is finally applied: applying a signed-in user is deferred behind
      // whenContentReady() for up to CONTENT_WAIT_MS, and a SIGNED_OUT (cross-tab
      // sign-out, refresh-token invalidation) can land inside that window. It
      // would reach the sign-out branch in onAuthChange with the flag still
      // false, so the wipe there would not run and the departing user's ip_*
      // progress and ~1.3 MB cached bundle would survive for whoever signs in
      // next on this device — the exact hand-off that wipe exists to prevent.
      if (user) _wasAuthed = true;
      try {
        if (user && !_contentReady) {
          paintContentLoading();
          whenContentReady().then(function () {
            // A SIGNED_OUT — or a switch to a different account — can land while
            // the bundle is in flight. That event already painted its own state;
            // applying this now-stale user on top would put signed-in chrome, an
            // avatar and a sign-out menu over the logged-out landing, and fire
            // sync.onLogin(), pro.init() and a notification prompt while signed
            // out. Re-check identity at the moment the callback actually runs.
            const cur = IP.auth.getUser();
            if (!cur || cur.id !== user.id) return;
            restoreContentBoundView();   // the saved view's PREP-dependent half
            onAuthChange(user);
          }).catch(bootFailsafe);
          return;
        }
        onAuthChange(user);
      } catch (e) {
        bootFailsafe(e);
      }
    }
    IP.auth.onChange(handleAuthEvent);
    function onAuthChange(user) {
      const uid = user ? user.id : null;
      // Did the signed-in identity actually change since our last render? The
      // first event flips _authReady, so it always counts as changed. Repeat
      // events (getSession hydrate, TOKEN_REFRESHED, tab-refocus SIGNED_IN) carry
      // the same uid — we skip all the heavy per-login work for those.
      const changed = !_authReady || uid !== _renderedUid;
      _authReady = true;
      updateAuthUI(user);                 // rebuilds #content iff the identity changed
      if (user) {
        if (!changed) return;             // duplicate hydrate / token refresh / tab refocus — no work
        // (_wasAuthed is set in handleAuthEvent, before the content wait can
        //  defer us past a sign-out; see the note there.)
        IP.sync.onLogin();
        // After pro status loads, refresh the topbar badge (no re-render — same
        // identity) and unlock any pro sections in place.
        IP.pro.init().then(() => { updateAuthUI(user); hydrateProSections(); });
        // The saved view is restored before Supabase finishes hydrating the
        // session, so screens whose data needs an authenticated fetch ran with
        // getUser() === null and rendered empty — a pending Pro request looked
        // like it had vanished on reload. Re-load the current screen now that a
        // user exists. Harmless if the restore already loaded it (one extra
        // GET); both callers are idempotent.
        if (State.mode === "upgrade") loadUpgradeData();
        else if (State.mode === "admin") loadAdminData();
        // onChange fires on every auth event (INITIAL_SESSION, SIGNED_IN,
        // hourly TOKEN_REFRESHED); prompt only once per session. There is no
        // realtime push behind the API — DynamoDB has no changefeed, so the
        // bell polls on open (refreshBell) instead of subscribing.
        if (!_notifSubbed) {
          _notifSubbed = true;
          if (window.Notification && Notification.permission === "default") Notification.requestPermission();
        }
      }
      // store.clearAll only sweeps the "ip_" prefix, so drop the content cache
      // explicitly — otherwise the next person to sign in on this device renders
      // the previous user's cached bundle before their own fetch returns.
      else if (_wasAuthed) { _wasAuthed = false; contentClearCache(); IP.store.clearAll(); location.reload(); }
    }
    IP.auth.init();

    // Restore device-local UI state: collapsed sidebar + last view + scroll.
    if (uiGet("sbCollapsed", false)) document.documentElement.classList.add("sb-collapsed");
    const _v = loadView();
    let _restoreTopic = null;   // saved last-read topic, held until PREP can confirm it exists
    if (_v && typeof _v === "object" && !IP.onboarding.shouldShow()) {
      if (_v.mode === "cards") { State.mode = "cards"; buildCardQueue(); }
      else if (_v.mode === "quiz") { State.mode = "quiz"; Quiz.topic = null; }
      else if (_v.mode === "saved") { State.mode = "saved"; }
      else if (_v.mode === "cheat") { State.mode = "cheat"; }
      else if (_v.mode === "upgrade") { State.mode = "upgrade"; loadUpgradeData(); }
      else if (_v.mode === "admin") { State.mode = "admin"; loadAdminData(); }
      else if (_v.mode === "reminders") { State.mode = "reminders"; loadReminders(); }
      else if (_v.mode === "chat") { State.mode = "chat"; }
      else if (_v.topic) { _restoreTopic = _v.topic; }   // validated against PREP once content lands
    }

    // The two restore steps that read PREP cannot run in the block above any
    // more: it is synchronous, and with the banks in private S3 PREP is empty
    // until IP.content.load() resolves — so the last-read topic never validated
    // and Cards restored onto an empty queue. Re-run them once content is in,
    // before the first auth-driven paint. A signed-out visitor never loads
    // content, so this stays a no-op for them and the landing is unchanged.
    //
    // Two guards. It waits for a non-empty PREP, because a miss against an empty
    // one means "content has not arrived", not "that topic is gone" — consuming
    // the saved topic there would discard it for good. And it runs at most once:
    // two auth events can both resolve off the same settled load, and
    // buildCardQueue reshuffles, so a second pass after the first paint would
    // swap the card already on screen.
    // (_restoreDone itself is declared above repaintLate, which also reads it.)
    function restoreContentBoundView() {
      if (_restoreDone || !PREP.order.length) return;
      _restoreDone = true;
      if (_restoreTopic && PREP.topics[_restoreTopic]) { State.mode = "learn"; State.topic = _restoreTopic; }
      _restoreTopic = null;
      if (State.mode === "cards") buildCardQueue();
    }

    // First paint. With a backend configured, the first onAuthStateChange event
    // (INITIAL_SESSION always fires, even logged out) drives the first render —
    // rendering here too would flash the logged-out landing before the session
    // resolves. Without a backend no auth event ever comes, so render now.
    const _scrollY = (_v && _v.scrollY) || 0;
    if (!IP.auth.enabled()) {
      _authReady = true;
      render();
      if (_scrollY) window.scrollTo(0, _scrollY);
    } else {
      _pendingScroll = _scrollY;   // applied on the first auth-driven render
      // Safety net: never leave the page blank if the SDK never reports. It must
      // stand down as soon as an event *has* arrived, even while that event's
      // render still waits on content. auth.js publishes _user before calling
      // listeners, so firing here would clear render()'s logged-out gate and
      // paint the signed-in app shell while updateAuthUI(user) has not run (so
      // body.logged-out and the hidden tabs/search/profile stay put) and PREP is
      // still empty (a continue-card reading "Track complete!" at 0/0) — and it
      // would drop the scroll restore mid-flight. A slow load is bounded by
      // CONTENT_WAIT_MS instead, which resumes the real render path.
      setTimeout(function () {
        if (_authReady || _authEventSeen) return;
        _authReady = true; render(); if (_scrollY) window.scrollTo(0, _scrollY); _pendingScroll = null;
      }, 1500);
    }

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
