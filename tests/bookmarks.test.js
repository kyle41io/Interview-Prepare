/* tests/bookmarks.test.js — TDD for IP.bookmarks (pure functions) */
const test = require("node:test");
const assert = require("node:assert");

/* Provide a minimal IP.store stub (no localStorage in Node) */
const globalObj = globalThis;
globalObj.IP = globalObj.IP || {};
globalObj.IP.store = {
  _data: {},
  get(k, d) { return k in this._data ? this._data[k] : d; },
  set(k, v) { this._data[k] = v; },
};

const bm = require("../assets/js/bookmarks.js");

test("has() returns false for empty list", () => {
  assert.strictEqual(bm.has([], "dsa"), false);
});

test("has() returns true when id present", () => {
  assert.strictEqual(bm.has(["dsa", "react"], "dsa"), true);
});

test("has() returns false when id absent", () => {
  assert.strictEqual(bm.has(["react"], "dsa"), false);
});

test("toggle() adds id when absent (non-mutating)", () => {
  const input = ["a", "b"];
  const result = bm.toggle(input, "c");
  assert.deepStrictEqual(result, ["a", "b", "c"]);
  assert.deepStrictEqual(input, ["a", "b"]); // original unchanged
});

test("toggle() removes id when present (non-mutating)", () => {
  const input = ["a", "b", "c"];
  const result = bm.toggle(input, "b");
  assert.deepStrictEqual(result, ["a", "c"]);
  assert.deepStrictEqual(input, ["a", "b", "c"]); // original unchanged
});

test("all() returns empty array when store has nothing", () => {
  globalObj.IP.store._data = {};
  const result = bm.all();
  assert.deepStrictEqual(result, []);
});

test("toggleStored() persists toggled value to store", () => {
  globalObj.IP.store._data = { bookmarks: ["react"] };
  const result = bm.toggleStored("dsa");
  assert.deepStrictEqual(result, ["react", "dsa"]);
  assert.deepStrictEqual(globalObj.IP.store._data.bookmarks, ["react", "dsa"]);
});

test("toggleStored() removes when already stored", () => {
  globalObj.IP.store._data = { bookmarks: ["react", "dsa"] };
  const result = bm.toggleStored("react");
  assert.deepStrictEqual(result, ["dsa"]);
  assert.deepStrictEqual(globalObj.IP.store._data.bookmarks, ["dsa"]);
});
