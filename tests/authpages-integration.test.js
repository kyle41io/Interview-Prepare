const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appJs = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/css/styles.css"), "utf8");

test("authpages.js is loaded before app.js", () => {
  const a = indexHtml.indexOf("assets/js/authpages.js");
  const b = indexHtml.indexOf("assets/js/app.js");
  assert.ok(a > -1, "authpages.js script tag missing");
  assert.ok(a < b, "authpages.js must load before app.js");
});

test("renderLanding is gone and the gate delegates to authpages", () => {
  assert.ok(!/function renderLanding/.test(appJs), "renderLanding should be deleted");
  assert.ok(!/renderLanding\(\)/.test(appJs), "no call sites should remain");
  assert.match(appJs, /IP\.authpages\.render\(/);
});

test("auth clicks are delegated before the onboarding check", () => {
  const authIdx = appJs.indexOf("IP.authpages.handleClick");
  const obIdx = appJs.indexOf("IP.onboarding.handleClick");
  assert.ok(authIdx > -1, "authpages.handleClick not wired");
  assert.ok(authIdx < obIdx, "auth must be checked before onboarding");
});

test("the selected auth screen lives on State.authView", () => {
  assert.match(appJs, /authView:\s*"signin"/, "State.authView should default to signin");
  assert.match(appJs, /IP\.authpages\.onViewChange\(/, "onViewChange not wired");
  assert.match(appJs, /authView:\s*State\.authView/, "render ctx must carry State.authView");
});

test("demo sign-in sets both State.track and storage only after a successful submitAuth", () => {
  const m = appJs.match(/onDemoSignIn\(async[\s\S]{0,600}?\n {4}\}\);/);
  assert.ok(m, "onDemoSignIn not wired");
  assert.match(m[0], /State\.track\s*=/);
  assert.match(m[0], /LS\.set\("track"/);

  // Regression guard for the "seeds localStorage before sign-in succeeds"
  // bug: submitAuth must be awaited and its result checked *before*
  // State.track / LS.set are touched, so a failed demo sign-in never
  // leaves a stray track in storage for a later real sign-up to inherit.
  const submitIdx = m[0].indexOf("submitAuth(");
  const trackAssignIdx = m[0].indexOf("State.track =");
  const lsSetIdx = m[0].indexOf('LS.set("track"');
  assert.ok(submitIdx > -1, "submitAuth not called");
  assert.ok(submitIdx < trackAssignIdx, "submitAuth must be called before State.track is set");
  assert.ok(submitIdx < lsSetIdx, "submitAuth must be called before LS.set(\"track\", ...)");
  assert.match(m[0], /res\.ok/, "State.track/LS.set must be gated on submitAuth's success result");
});

test("auth screen styles exist", () => {
  ["auth-page", "auth-brand", "auth-card", "auth-demo-panel", "auth-err"].forEach((c) => {
    assert.ok(css.includes("." + c), `missing style for .${c}`);
  });
});

test("sign-up tells the user to confirm their email when no session is created", () => {
  // The project has mailer_autoconfirm off, so a successful signUp returns no
  // session and the auth listener never fires. Without this notice the form
  // just sits there and the user assumes sign-up is broken.
  const m = appJs.match(/async function submitAuth[\s\S]{0,2500}?\n {2}\}/);
  assert.ok(m, "submitAuth not found");
  assert.match(m[0], /res\.needsConfirm/, "submitAuth must branch on needsConfirm");
  assert.match(m[0], /signUpConfirm/, "the confirmation copy must be painted");
  // Success and failure share one element, so the success styling has to be
  // cleared on every submit or an error inherits the green treatment.
  assert.match(m[0], /classList\.remove\("ok"\)/, "the ok class must be reset per submit");
});

test("the auth alert has a success variant distinct from the error styling", () => {
  assert.ok(css.includes(".auth-alert.ok"), "missing .auth-alert.ok style");
});

test("authpages exports bilingual sign-up confirmation copy", () => {
  const authpages = require("../assets/js/authpages.js");
  assert.ok(authpages.signUpConfirm, "signUpConfirm not exported");
  ["vi", "en"].forEach((l) => {
    assert.strictEqual(typeof authpages.signUpConfirm[l], "string");
    assert.match(authpages.signUpConfirm[l], /\{email\}/, `${l} copy must interpolate the address`);
  });
});
