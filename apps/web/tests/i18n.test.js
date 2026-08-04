const test = require("node:test");
const assert = require("node:assert");
const i18n = require("../assets/js/i18n.js");

test("pick returns string node as-is", () => {
  assert.strictEqual(i18n.pick("hello", "vi"), "hello");
});
test("pick returns requested language", () => {
  assert.strictEqual(i18n.pick({ vi: "Xin chào", en: "Hello" }, "en"), "Hello");
});
test("pick falls back en->vi when lang missing", () => {
  assert.strictEqual(i18n.pick({ vi: "Chỉ VI" }, "en"), "Chỉ VI");
});
test("pick falls back vi->en when lang missing", () => {
  assert.strictEqual(i18n.pick({ en: "Only EN" }, "vi"), "Only EN");
});
test("pick handles null/undefined", () => {
  assert.strictEqual(i18n.pick(null, "vi"), "");
  assert.strictEqual(i18n.pick(undefined, "en"), "");
});
