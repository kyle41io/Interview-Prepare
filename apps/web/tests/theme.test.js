const test = require("node:test");
const assert = require("node:assert");
const theme = require("../assets/js/theme.js");

test("resolve honors explicit light/dark", () => {
  assert.strictEqual(theme.resolve("light", true), "light");
  assert.strictEqual(theme.resolve("dark", false), "dark");
});
test("resolve('system') follows prefersDark", () => {
  assert.strictEqual(theme.resolve("system", true), "dark");
  assert.strictEqual(theme.resolve("system", false), "light");
});
test("resolve defaults unknown pref to system behavior", () => {
  assert.strictEqual(theme.resolve(undefined, true), "dark");
  assert.strictEqual(theme.resolve("weird", false), "light");
});
