const test = require("node:test");
const assert = require("node:assert");

// minimal localStorage shim for Node
function makeShim() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => Array.from(m.keys())[i],
    get length() { return m.size; },
    _map: m,
  };
}
global.localStorage = makeShim();
// Object.keys(localStorage) must list stored keys for clearAll(); emulate via defineProperty
function freshStore() {
  delete require.cache[require.resolve("../assets/js/store.js")];
  return require("../assets/js/store.js");
}

test("snapshot returns all default keys when empty", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const s = store.snapshot();
  assert.deepStrictEqual(Object.keys(s).sort(), Object.keys(store.defaults()).sort());
  assert.strictEqual(s.lang, "vi");
  assert.deepStrictEqual(s.bookmarks, []);
});

test("snapshot reflects set values", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  store.set("lang", "en");
  store.set("bookmarks", ["dsa"]);
  const s = store.snapshot();
  assert.strictEqual(s.lang, "en");
  assert.deepStrictEqual(s.bookmarks, ["dsa"]);
});

test("onChange fires on set with the key", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  store.onChange((k) => seen.push(k));
  store.set("theme", "dark");
  assert.deepStrictEqual(seen, ["theme"]);
});

test("replaceAll writes known keys and fires once with '*'", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  store.onChange((k) => seen.push(k));
  store.replaceAll({ lang: "en", progress: { dsa: true }, ignored: 1 });
  assert.strictEqual(store.snapshot().lang, "en");
  assert.deepStrictEqual(store.snapshot().progress, { dsa: true });
  assert.strictEqual(store.snapshot().ignored, undefined); // not a known key
  assert.deepStrictEqual(seen, ["*"]);
});

test("replaceAll silent does not fire", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  store.onChange((k) => seen.push(k));
  store.replaceAll({ lang: "en" }, { silent: true });
  assert.deepStrictEqual(seen, []);
});

test("onChange unsubscribe stops further events", () => {
  global.localStorage = makeShim();
  const store = freshStore();
  const seen = [];
  const off = store.onChange((k) => seen.push(k));
  store.set("lang", "en");
  off();
  store.set("lang", "vi");
  assert.deepStrictEqual(seen, ["lang"]);
});
