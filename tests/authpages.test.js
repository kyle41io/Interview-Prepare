const test = require("node:test");
const assert = require("node:assert");

global.window = global;
const ap = require("../assets/js/authpages.js");

test("DEMO_ACCOUNTS holds exactly the two seeded accounts", () => {
  assert.strictEqual(ap.DEMO_ACCOUNTS.length, 2);
  const std = ap.DEMO_ACCOUNTS.find(a => a.id === "standard");
  const pro = ap.DEMO_ACCOUNTS.find(a => a.id === "pro");
  assert.strictEqual(std.email, "demo@example.com");
  assert.strictEqual(pro.email, "demo.pro@example.com");
  assert.strictEqual(std.password, "DemoPass123!");
  assert.strictEqual(pro.password, "DemoPass123!");
});

test("DEMO_TRACK is the {role, level} object shape, not a track id", () => {
  assert.deepStrictEqual(ap.DEMO_TRACK, { role: "swe", level: "junior" });
});

test("validateSignUp accepts a well-formed submission", () => {
  assert.deepStrictEqual(ap.validateSignUp({
    email: "a@b.com", username: "kyle", password: "hunter22", confirm: "hunter22",
  }), {});
});

test("validateSignUp rejects a malformed email", () => {
  const errs = ap.validateSignUp({ email: "nope", username: "k", password: "hunter22", confirm: "hunter22" });
  assert.ok(errs.email, "expected an email error");
  assert.ok(errs.email.vi && errs.email.en, "error must be bilingual");
});

test("validateSignUp rejects an empty username", () => {
  const errs = ap.validateSignUp({ email: "a@b.com", username: "   ", password: "hunter22", confirm: "hunter22" });
  assert.ok(errs.username);
});

test("validateSignUp rejects a password under 8 characters", () => {
  const errs = ap.validateSignUp({ email: "a@b.com", username: "k", password: "short7", confirm: "short7" });
  assert.ok(errs.password);
});

test("validateSignUp rejects a mismatched confirmation", () => {
  const errs = ap.validateSignUp({ email: "a@b.com", username: "k", password: "hunter22", confirm: "hunter23" });
  assert.ok(errs.confirm);
  assert.ok(!errs.password, "a mismatch is a confirm error, not a password error");
});

test("validateSignUp reports every invalid field at once", () => {
  const errs = ap.validateSignUp({ email: "nope", username: "", password: "x", confirm: "y" });
  assert.deepStrictEqual(Object.keys(errs).sort(), ["confirm", "email", "password", "username"]);
});

test("validateSignIn requires both fields", () => {
  assert.deepStrictEqual(ap.validateSignIn({ email: "a@b.com", password: "hunter22" }), {});
  assert.ok(ap.validateSignIn({ email: "nope", password: "hunter22" }).email);
  assert.ok(ap.validateSignIn({ email: "a@b.com", password: "" }).password);
});

test("validateSignIn does not enforce a minimum password length", () => {
  // The rule belongs on sign-up. Applying it here would lock out any account
  // whose password predates the rule.
  assert.deepStrictEqual(ap.validateSignIn({ email: "a@b.com", password: "old" }), {});
});

test("mapAuthError translates known Supabase messages bilingually", () => {
  const dup = ap.mapAuthError("User already registered");
  assert.ok(dup.vi && dup.en);
  assert.notStrictEqual(dup.en, ap.mapAuthError("Invalid login credentials").en);
});

test("mapAuthError keeps sign-in failure generic", () => {
  // The message must name email and password together as one undifferentiated
  // failure. Naming only one turns the form into an account-enumeration oracle.
  const m = ap.mapAuthError("Invalid login credentials");
  assert.match(m.en, /email or password/i);
  assert.ok(!/no account|not found|unknown|wrong password|incorrect password/i.test(m.en),
    "must not reveal which of the two was wrong: " + m.en);
  assert.match(m.vi, /email|mật khẩu/i);
});

test("mapAuthError falls back to a generic message for unknown codes", () => {
  const m = ap.mapAuthError("some brand new upstream failure");
  assert.ok(m.vi && m.en);
});

test("mapAuthError handles a missing code", () => {
  const m = ap.mapAuthError(undefined);
  assert.ok(m.vi && m.en);
});

/* ---------- rendering ---------- */

function ctx(authView) {
  return {
    t: (n) => (n && typeof n === "object" ? (n.en || n.vi) : String(n == null ? "" : n)),
    fa: (c) => `<i class="${c}"></i>`,
    lang: "en",
    authView: authView,
  };
}
const CTX = ctx("signin");

test("render dispatches on ctx.authView", () => {
  assert.match(ap.render(ctx("signup")), /data-auth-form="signup"/);
  assert.match(ap.render(ctx("signin")), /data-auth-form="signin"/);
});

test("render falls back to sign-in for a missing or unknown view", () => {
  assert.match(ap.render(ctx(undefined)), /data-auth-form="signin"/);
  assert.match(ap.render(ctx("nonsense")), /data-auth-form="signin"/);
});

test("sign-in screen has email and password inputs and no username", () => {
  const html = ap.renderSignIn(CTX);
  assert.match(html, /name="email"/);
  assert.match(html, /name="password"/);
  assert.ok(!/name="username"/.test(html), "sign-in must not ask for a username");
  assert.ok(!/name="confirm"/.test(html), "sign-in must not ask for confirmation");
});

test("sign-up screen has exactly the four specified fields", () => {
  const html = ap.renderSignUp(ctx("signup"));
  ["email", "username", "password", "confirm"].forEach((f) => {
    assert.match(html, new RegExp(`name="${f}"`), `missing field ${f}`);
  });
  // Fields dropped from the PyEz reference — see spec section 5.1
  ["firstName", "lastName", "class", "gender", "avatar"].forEach((f) => {
    assert.ok(!new RegExp(`name="${f}"`).test(html), `unexpected field ${f}`);
  });
});

test("password fields carry the right autocomplete hint per screen", () => {
  // Wrong hints make browsers offer to overwrite a saved password on sign-up,
  // or refuse to offer the saved one on sign-in.
  assert.match(ap.renderSignIn(CTX), /name="password"[^>]*autocomplete="current-password"/);
  const up = ap.renderSignUp(ctx("signup"));
  assert.match(up, /name="password"[^>]*autocomplete="new-password"/);
  assert.match(up, /name="confirm"[^>]*autocomplete="new-password"/);
  assert.match(up, /name="username"[^>]*autocomplete="nickname"/);
});

test("both screens keep Google sign-in and carry the brand panel copy", () => {
  [ap.renderSignIn(CTX), ap.renderSignUp(ctx("signup"))].forEach((html) => {
    assert.match(html, /IP\.auth\.signInWithGoogle\(\)/);
    assert.match(html, /auth-brand/);
  });
});

test("neither screen offers password reset", () => {
  // Excluded by the spec: it cannot work without email delivery.
  [ap.renderSignIn(CTX), ap.renderSignUp(ctx("signup"))].forEach((html) => {
    assert.ok(!/forgot/i.test(html), "must not show a dead 'forgot password' link");
  });
});

test("the demo panel lists both accounts with their exact credentials", () => {
  const html = ap.renderSignIn(CTX);
  assert.match(html, /data-auth-demo-toggle/);
  ap.DEMO_ACCOUNTS.forEach((a) => {
    assert.ok(html.includes(a.email), `missing ${a.email}`);
    assert.ok(html.includes(a.password), `missing password for ${a.email}`);
    assert.match(html, new RegExp(`data-auth-demo-use="${a.id}"`));
  });
});

test("demo cards are labelled Email, never Username", () => {
  // Email is what the form accepts; labelling it 'username' hands reviewers a
  // value the form rejects.
  const html = ap.renderSignIn(CTX);
  const panel = html.slice(html.indexOf("auth-demo-panel"));
  assert.ok(!/username/i.test(panel), "demo panel must not say 'username'");
});

test("handleClick reports a view change through onViewChange", () => {
  let seen = null;
  ap.onViewChange((v) => { seen = v; });
  const r = ap.handleClick({ closest: (s) => (s === "[data-auth-go]" ? { dataset: { authGo: "signup" } } : null) });
  assert.strictEqual(r, "rerender");
  assert.strictEqual(seen, "signup");
});

test("handleClick ignores a view change to an unknown screen", () => {
  let seen = null;
  ap.onViewChange((v) => { seen = v; });
  ap.handleClick({ closest: (s) => (s === "[data-auth-go]" ? { dataset: { authGo: "nonsense" } } : null) });
  assert.strictEqual(seen, null);
});

test("handleClick toggles the demo panel and asks for a re-render", () => {
  const toggle = { closest: (s) => (s === "[data-auth-demo-toggle]" ? { dataset: {} } : null) };
  assert.strictEqual(ap.handleClick(toggle), "rerender");
  assert.match(ap.renderSignIn(CTX), /auth-demo-panel"\s*>/, "panel should now be open");
  assert.strictEqual(ap.handleClick(toggle), "rerender");
  assert.match(ap.renderSignIn(CTX), /auth-demo-panel"\s*hidden/, "panel should now be closed");
});

test("handleClick fires onDemoSignIn with credentials and the default track", () => {
  let got = null;
  ap.onDemoSignIn((payload) => { got = payload; });
  const r = ap.handleClick({ closest: (s) => (s === "[data-auth-demo-use]" ? { dataset: { authDemoUse: "pro" } } : null) });
  assert.strictEqual(r, true);
  assert.strictEqual(got.email, "demo.pro@example.com");
  assert.strictEqual(got.password, "DemoPass123!");
  assert.deepStrictEqual(got.track, { role: "swe", level: "junior" });
});

test("handleClick returns false for unrelated targets", () => {
  assert.strictEqual(ap.handleClick({ closest: () => null }), false);
});

test("handleClick tolerates a null target", () => {
  assert.strictEqual(ap.handleClick(null), false);
});

/* GoTrue validates the address format before it checks any rate limit — a
   deliberately loose client regex therefore turns a typo into an opaque
   HTTP 400 instead of an inline field error. These are addresses the old
   /^[^\s@]+@[^\s@]+\.[^\s@]+$/ accepted and the server rejects. */
test("validateSignUp rejects addresses GoTrue treats as malformed", () => {
  ["tên@gmail.com", ".a@b.com", "a.@b.com", "a..b@c.com", "a,b@c.com", "a@b.com."].forEach((email) => {
    const errs = ap.validateSignUp({ email, username: "k", password: "hunter22", confirm: "hunter22" });
    assert.ok(errs.email, `${email} should be rejected client-side`);
  });
});

test("validateSignUp still accepts ordinary addresses", () => {
  ["a@b.com", "first.last@sub.example.co.uk", "user+tag@gmail.com", "x_y-z@a-b.io"].forEach((email) => {
    const errs = ap.validateSignUp({ email, username: "k", password: "hunter22", confirm: "hunter22" });
    assert.ok(!errs.email, `${email} should be accepted`);
  });
});

/* Every one of these arrived as a generic "something went wrong", which is
   what made sign-up look broken rather than blocked. */
test("mapAuthError distinguishes the sign-up failures this project actually hits", () => {
  const generic = ap.mapAuthError("some brand new upstream failure");
  [
    "email rate limit exceeded",
    "Unable to validate email address: invalid format",
    "Error sending confirmation email",
    "Password should be at least 6 characters.",
    "Signups not allowed for this instance",
  ].forEach((code) => {
    const m = ap.mapAuthError(code);
    assert.notStrictEqual(m.en, generic.en, `${code} should not fall back to the generic message`);
    assert.notStrictEqual(m.vi, generic.vi, `${code} needs Vietnamese copy too`);
  });
});

/* The mailer quota is a server-side cap on the whole project, not this
   visitor clicking too fast — saying "you tried too many times" sends the
   user to wait out a limit that is not theirs. */
test("mapAuthError separates the email quota from per-user throttling", () => {
  const quota = ap.mapAuthError("email rate limit exceeded");
  const throttle = ap.mapAuthError("Request rate limit reached");
  assert.notStrictEqual(quota.en, throttle.en);
  assert.notStrictEqual(quota.vi, throttle.vi);
});
