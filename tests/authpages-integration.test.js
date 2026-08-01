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

test("demo sign-in sets both State.track and storage", () => {
  const m = appJs.match(/onDemoSignIn\([\s\S]{0,600}?\}\);/);
  assert.ok(m, "onDemoSignIn not wired");
  assert.match(m[0], /State\.track\s*=/);
  assert.match(m[0], /LS\.set\("track"/);
});

test("auth screen styles exist", () => {
  ["auth-page", "auth-brand", "auth-card", "auth-demo-panel", "auth-err"].forEach((c) => {
    assert.ok(css.includes("." + c), `missing style for .${c}`);
  });
});
