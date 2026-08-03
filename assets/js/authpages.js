/* IP.authpages — logged-out screens: sign-in, sign-up, demo accounts.
   Dual-export: sets root.IP.authpages AND exports via module.exports for tests. */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.authpages = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  /* ---- demo accounts ----
     Published credentials, deliberately not secret. The domain is example.com
     (IANA-reserved, unroutable), so these can never be a real login anywhere. */
  const DEMO_ACCOUNTS = Object.freeze([
    Object.freeze({
      id: "standard",
      email: "demo@example.com",
      password: "DemoPass123!",
      label: { vi: "Tài khoản thường", en: "Standard account" },
    }),
    Object.freeze({
      id: "pro",
      email: "demo.pro@example.com",
      password: "DemoPass123!",
      label: { vi: "Tài khoản Pro", en: "Pro account" },
    }),
  ]);

  /* Seeded so reviewers land in populated content instead of the onboarding
     picker. Must be the {role, level} object app.js stores — a track-id string
     would break currentTrack(). */
  const DEMO_TRACK = Object.freeze({ role: "swe", level: "junior" });

  const MIN_PASSWORD = 8;
  // Deliberately loose: real address validity is unknowable client-side, and
  // nothing is ever emailed. This only catches obvious typos.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const ERR = {
    email:    { vi: "Email không hợp lệ.", en: "Enter a valid email address." },
    username: { vi: "Vui lòng nhập tên hiển thị.", en: "Please enter a username." },
    password: { vi: "Mật khẩu cần ít nhất 8 ký tự.", en: "Password must be at least 8 characters." },
    passwordEmpty: { vi: "Vui lòng nhập mật khẩu.", en: "Please enter your password." },
    confirm:  { vi: "Mật khẩu nhập lại không khớp.", en: "Passwords do not match." },
  };

  function validateSignUp(v) {
    v = v || {};
    const errs = {};
    if (!EMAIL_RE.test(String(v.email || "").trim())) errs.email = ERR.email;
    if (!String(v.username || "").trim()) errs.username = ERR.username;
    if (String(v.password || "").length < MIN_PASSWORD) errs.password = ERR.password;
    if (String(v.confirm || "") !== String(v.password || "")) errs.confirm = ERR.confirm;
    return errs;
  }

  /* No length rule here — that belongs on sign-up. Enforcing it at sign-in
     would lock out any account whose password predates the rule. */
  function validateSignIn(v) {
    v = v || {};
    const errs = {};
    if (!EMAIL_RE.test(String(v.email || "").trim())) errs.email = ERR.email;
    if (!String(v.password || "")) errs.password = ERR.passwordEmpty;
    return errs;
  }

  /* Supabase returns raw English strings. Map the ones we expect and fall back
     to something generic — never render an upstream string at the user. */
  const AUTH_ERRORS = [
    [/already registered|already exists/i, {
      vi: "Email này đã được đăng ký. Hãy đăng nhập.",
      en: "That email is already registered. Try signing in.",
    }],
    // Deliberately generic: telling the user which half was wrong turns the
    // sign-in form into an account-enumeration oracle.
    [/invalid login credentials/i, {
      vi: "Email hoặc mật khẩu không đúng.",
      en: "Email or password is incorrect.",
    }],
    [/email.*not confirmed/i, {
      vi: "Tài khoản chưa được xác nhận.",
      en: "This account has not been confirmed.",
    }],
    [/rate limit|too many/i, {
      vi: "Bạn thử quá nhiều lần. Vui lòng đợi một lát.",
      en: "Too many attempts. Please wait a moment.",
    }],
    [/auth-unavailable/, {
      vi: "Đăng nhập hiện không khả dụng.",
      en: "Sign-in is unavailable right now.",
    }],
  ];

  function mapAuthError(code) {
    const s = String(code == null ? "" : code);
    for (let i = 0; i < AUTH_ERRORS.length; i++) {
      if (AUTH_ERRORS[i][0].test(s)) return AUTH_ERRORS[i][1];
    }
    return { vi: "Đã có lỗi xảy ra. Vui lòng thử lại.", en: "Something went wrong. Please try again." };
  }

  /* ---- local state ----
     Only the demo panel's open flag lives here; it is presentational and no
     one outside needs it. The selected screen lives on State.authView in
     app.js, reported through onViewChange below. */
  let _demoOpen = false;
  let _demoCb = null;
  let _viewCb = null;

  function onDemoSignIn(cb) { if (typeof cb === "function") _demoCb = cb; }
  function onViewChange(cb) { if (typeof cb === "function") _viewCb = cb; }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* The feature list that used to live in app.js renderLanding(). It moves here
     so the sign-in screen is both the pitch and the way in. */
  const FEATURES = [
    ["fa-solid fa-route",
      { vi: "Lộ trình theo vai trò", en: "Role-based tracks" },
      { vi: "SWE (Fresher→Senior), DevOps, AI Engineer — học có hệ thống.",
        en: "SWE (Fresher→Senior), DevOps, AI Engineer — structured prep." }],
    ["fa-regular fa-clone",
      { vi: "Thẻ ghi nhớ & Trắc nghiệm", en: "Flashcards & Quizzes" },
      { vi: "Ôn nhanh bằng flashcard spaced-repetition và quiz.",
        en: "Review fast with spaced-repetition cards and quizzes." }],
    ["fa-solid fa-comments",
      { vi: "Trợ lý AI", en: "AI assistant" },
      { vi: "Hỏi đáp về lập trình, phỏng vấn, CV — song ngữ Việt/Anh.",
        en: "Ask about coding, interviews, CV — bilingual VI/EN." }],
    ["fa-solid fa-bell",
      { vi: "Nhắc lịch tuyển dụng", en: "Recruiting reminders" },
      { vi: "Tự phát hiện email mời phỏng vấn/bài test và nhắc lịch.",
        en: "Auto-detect interview/test emails and remind you." }],
  ];

  const COPY = {
    heroTitle: { vi: "Ôn thi phỏng vấn IT, bài bản & song ngữ",
                 en: "Ace your IT interviews — structured & bilingual" },
    signInTitle: { vi: "Đăng nhập", en: "Sign in" },
    signUpTitle: { vi: "Tạo tài khoản", en: "Create an account" },
    email: { vi: "Email", en: "Email" },
    username: { vi: "Tên hiển thị", en: "Username" },
    password: { vi: "Mật khẩu", en: "Password" },
    confirm: { vi: "Nhập lại mật khẩu", en: "Confirm password" },
    submitIn: { vi: "Đăng nhập", en: "Sign in" },
    submitUp: { vi: "Đăng ký", en: "Sign up" },
    or: { vi: "hoặc", en: "or" },
    google: { vi: "Đăng nhập với Google", en: "Sign in with Google" },
    noAccount: { vi: "Chưa có tài khoản?", en: "Don't have an account?" },
    hasAccount: { vi: "Đã có tài khoản?", en: "Already have an account?" },
    goSignUp: { vi: "Đăng ký", en: "Sign Up" },
    /* {email} is substituted by the caller, not by t(). */
    signUpConfirm: {
      vi: "Đã tạo tài khoản. Mở email {email}, bấm liên kết xác nhận rồi quay lại đăng nhập.",
      en: "Account created. Open the confirmation link we sent to {email}, then sign in.",
    },
    goSignIn: { vi: "Đăng nhập", en: "Sign In" },
    demoBtn: { vi: "Tài khoản dùng thử", en: "Demo accounts" },
    demoIntro: { vi: "Dành cho nhà tuyển dụng — đăng nhập ngay, không cần đăng ký.",
                 en: "For reviewers — sign in now, no sign-up needed." },
    demoUse: { vi: "Đăng nhập bằng tài khoản này", en: "Sign in as this account" },
    demoEmail: { vi: "Email", en: "Email" },
    demoPassword: { vi: "Mật khẩu", en: "Password" },
  };

  function brandPanel(ctx) {
    const feats = FEATURES.map((f) =>
      `<div class="auth-feat"><div class="lf-ic">${ctx.fa(f[0])}</div>` +
      `<div><b>${esc(ctx.t(f[1]))}</b><span>${esc(ctx.t(f[2]))}</span></div></div>`
    ).join("");
    return `<div class="auth-brand">
      <div class="auth-brand-logo"><img src="assets/favicon.svg" alt="" width="56" height="56"></div>
      <h1>${esc(ctx.t(COPY.heroTitle))}</h1>
      <div class="auth-feats">${feats}</div>
    </div>`;
  }

  /* autocomplete matters here: the wrong hint makes browsers offer to
     overwrite a saved password on sign-up, or withhold it on sign-in. */
  function field(ctx, name, type, labelNode, autocomplete) {
    return `<label class="auth-field">
      <span>${esc(ctx.t(labelNode))}</span>
      <input name="${name}" type="${type}" autocomplete="${autocomplete}" data-auth-input="${name}">
      <em class="auth-err" data-auth-err="${name}" hidden></em>
    </label>`;
  }

  function demoPanel(ctx) {
    const cards = DEMO_ACCOUNTS.map((a) => `<div class="auth-demo-card">
      <b>${esc(ctx.t(a.label))}</b>
      <div class="auth-demo-row"><span>${esc(ctx.t(COPY.demoEmail))}</span><code>${esc(a.email)}</code></div>
      <div class="auth-demo-row"><span>${esc(ctx.t(COPY.demoPassword))}</span><code>${esc(a.password)}</code></div>
      <button type="button" class="btn sm" data-auth-demo-use="${a.id}">${esc(ctx.t(COPY.demoUse))}</button>
    </div>`).join("");
    return `<div class="auth-demo">
      <button type="button" class="auth-demo-btn" data-auth-demo-toggle="1" aria-expanded="${_demoOpen}">
        ${ctx.fa("fa-solid fa-book")} ${esc(ctx.t(COPY.demoBtn))}
      </button>
      <div class="auth-demo-panel" ${_demoOpen ? "" : "hidden"}>
        <p>${esc(ctx.t(COPY.demoIntro))}</p>
        ${cards}
      </div>
    </div>`;
  }

  function shell(ctx, title, formHtml, footHtml) {
    return `<div class="fade-in auth-page">
      ${brandPanel(ctx)}
      <div class="auth-card">
        <h2>${esc(ctx.t(title))}</h2>
        ${formHtml}
        <div class="auth-alert" data-auth-alert hidden></div>
        <div class="auth-or"><span>${esc(ctx.t(COPY.or))}</span></div>
        <!-- Not fa-brands fa-google: the repo vendors only fa-solid-900 and
             fa-regular-400, so any fa-brands glyph 404s and renders as an
             empty box. -->
        <button type="button" class="btn ghost wide" onclick="IP.auth.signInWithGoogle()">
          ${ctx.fa("fa-solid fa-right-to-bracket")} ${esc(ctx.t(COPY.google))}
        </button>
        <div class="auth-foot">${footHtml}</div>
      </div>
      ${demoPanel(ctx)}
    </div>`;
  }

  function renderSignIn(ctx) {
    const form = `<form data-auth-form="signin" novalidate>
      ${field(ctx, "email", "email", COPY.email, "email")}
      ${field(ctx, "password", "password", COPY.password, "current-password")}
      <button type="submit" class="btn wide">${esc(ctx.t(COPY.submitIn))}</button>
    </form>`;
    const foot = `${esc(ctx.t(COPY.noAccount))} <a href="#" data-auth-go="signup">${esc(ctx.t(COPY.goSignUp))}</a>`;
    return shell(ctx, COPY.signInTitle, form, foot);
  }

  function renderSignUp(ctx) {
    const form = `<form data-auth-form="signup" novalidate>
      ${field(ctx, "email", "email", COPY.email, "email")}
      ${field(ctx, "username", "text", COPY.username, "nickname")}
      ${field(ctx, "password", "password", COPY.password, "new-password")}
      ${field(ctx, "confirm", "password", COPY.confirm, "new-password")}
      <button type="submit" class="btn wide">${esc(ctx.t(COPY.submitUp))}</button>
    </form>`;
    const foot = `${esc(ctx.t(COPY.hasAccount))} <a href="#" data-auth-go="signin">${esc(ctx.t(COPY.goSignIn))}</a>`;
    return shell(ctx, COPY.signUpTitle, form, foot);
  }

  /* Unknown or missing view falls back to sign-in rather than rendering
     nothing — a blank screen is the one outcome with no way out. */
  function render(ctx) {
    return ctx && ctx.authView === "signup" ? renderSignUp(ctx) : renderSignIn(ctx);
  }

  /* handleClick(target) → "rerender" | true | false, matching IP.onboarding. */
  function handleClick(target) {
    if (!target || typeof target.closest !== "function") return false;

    const go = target.closest("[data-auth-go]");
    if (go) {
      const v = go.dataset.authGo;
      if ((v === "signin" || v === "signup") && _viewCb) _viewCb(v);
      return "rerender";
    }

    if (target.closest("[data-auth-demo-toggle]")) { _demoOpen = !_demoOpen; return "rerender"; }

    const use = target.closest("[data-auth-demo-use]");
    if (use) {
      const acct = DEMO_ACCOUNTS.filter(function (a) { return a.id === use.dataset.authDemoUse; })[0];
      if (acct && _demoCb) _demoCb({ email: acct.email, password: acct.password, track: DEMO_TRACK });
      return true;
    }
    return false;
  }

  return {
    DEMO_ACCOUNTS, DEMO_TRACK,
    signUpConfirm: COPY.signUpConfirm,
    validateSignUp, validateSignIn, mapAuthError,
    render, renderSignIn, renderSignUp, handleClick, onDemoSignIn, onViewChange,
  };
});
