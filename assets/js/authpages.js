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

  return { DEMO_ACCOUNTS, DEMO_TRACK, validateSignUp, validateSignIn, mapAuthError };
});
