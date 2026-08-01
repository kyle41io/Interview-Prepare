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
