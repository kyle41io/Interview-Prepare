/* The diagram specs live in the private content bank, outside this repo, so the
   push script is the only gate between a hand-authored spec and production.
   These cover that gate. */
const test = require("node:test");
const assert = require("node:assert");

let validateDiagrams;
test.before(async () => {
  ({ validateDiagrams } = await import("../api/scripts/content-lib.mjs"));
});

const L = { vi: "vi", en: "en" };
const topic = (block) => ({ id: "t", sections: [{ blocks: [block] }] });
const errs = (block) => validateDiagrams(topic(block));

const FLOW = {
  type: "diagram", kind: "flow", title: L,
  nodes: [
    { id: "a", col: 0, row: 0, label: L },
    { id: "b", col: 1, row: 0, label: L },
  ],
  edges: [{ from: "a", to: "b" }],
  steps: [{ nodes: ["a"], text: L }],
};

test("a well-formed flow passes", () => {
  assert.deepStrictEqual(errs(FLOW), []);
});

test("non-diagram blocks and topics without sections are ignored", () => {
  assert.deepStrictEqual(errs({ type: "prose", vi: "x", en: "y" }), []);
  assert.deepStrictEqual(validateDiagrams({}), []);
  assert.deepStrictEqual(validateDiagrams({ sections: [{}] }), []);
});

test("an unknown kind is reported once and not probed further", () => {
  const e = errs({ type: "diagram", kind: "sankey" });
  assert.strictEqual(e.length, 1);
  assert.match(e[0], /unknown kind/);
});

test("every label and title must carry both languages", () => {
  assert.match(errs({ ...FLOW, title: { vi: "chỉ tiếng Việt" } }).join(), /title must have vi and en/);
  assert.match(errs({ ...FLOW, caption: { en: "only en" } }).join(), /caption must have vi and en/);
  const oneLang = { ...FLOW, nodes: [{ id: "a", label: { vi: "x" } }] };
  assert.match(errs(oneLang).join(), /node "a" label must have vi and en/);
});

test("flow node ids must exist and be unique", () => {
  assert.match(errs({ ...FLOW, nodes: [{ col: 0, label: L }] }).join(), /nodes\[0\] has no id/);
  const dupe = { ...FLOW, nodes: [{ id: "a", col: 0, label: L }, { id: "a", col: 1, label: L }] };
  assert.match(errs(dupe).join(), /duplicate node id "a"/);
});

test("two flow nodes in one grid cell is an error, since they would overlap", () => {
  const stacked = {
    ...FLOW,
    nodes: [{ id: "a", col: 1, row: 2, label: L }, { id: "b", col: 1, row: 2, label: L }],
    edges: [],
  };
  assert.match(errs(stacked).join(), /node "b" shares cell 1,2/);
});

test("a node with no col or row defaults to the origin cell", () => {
  const both = { ...FLOW, nodes: [{ id: "a", label: L }, { id: "b", label: L }], edges: [] };
  assert.match(errs(both).join(), /shares cell 0,0/);
});

test("edges and steps may only name nodes that exist", () => {
  assert.match(errs({ ...FLOW, edges: [{ from: "a", to: "ghost" }] }).join(),
    /edges\[0\]\.to "ghost" is not a node/);
  assert.match(errs({ ...FLOW, edges: [{ to: "b" }] }).join(),
    /edges\[0\]\.from "undefined" is not a node/);
  assert.match(errs({ ...FLOW, steps: [{ nodes: ["ghost"], text: L }] }).join(),
    /steps\[0\] names "ghost", which is not a node/);
});

test("a step needs bilingual text and at least one node", () => {
  assert.match(errs({ ...FLOW, steps: [{ nodes: ["a"], text: { vi: "x" } }] }).join(),
    /steps\[0\]\.text must have vi and en/);
  assert.match(errs({ ...FLOW, steps: [{ nodes: [], text: L }] }).join(), /a step names no nodes/);
});

const SEQ = {
  type: "diagram", kind: "sequence", title: L,
  actors: [{ id: "c", label: L }, { id: "s", label: L }],
  messages: [{ from: "c", to: "s", label: L }],
};

test("a well-formed sequence passes", () => {
  assert.deepStrictEqual(errs(SEQ), []);
});

test("sequence messages may only name declared actors", () => {
  assert.match(errs({ ...SEQ, messages: [{ from: "c", to: "ghost", label: L }] }).join(),
    /messages\[0\]\.to "ghost" is not an actor/);
  assert.match(errs({ ...SEQ, actors: [] }).join(), /no actors/);
  assert.match(errs({ ...SEQ, messages: [] }).join(), /no messages/);
});

test("a self-message is legal", () => {
  assert.deepStrictEqual(errs({ ...SEQ, messages: [{ from: "s", to: "s", label: L }] }), []);
});

test("layers and bars must not be empty", () => {
  assert.match(errs({ type: "diagram", kind: "layers", title: L, layers: [] }).join(), /no layers/);
  assert.match(errs({ type: "diagram", kind: "bars", title: L, items: [] }).join(), /no items/);
});

test("bar values must be positive numbers with a display string", () => {
  const bars = (items) => errs({ type: "diagram", kind: "bars", title: L, items }).join();
  assert.deepStrictEqual(errs({ type: "diagram", kind: "bars", title: L, items: [{ label: L, value: 1, display: "1 ns" }] }), []);
  assert.match(bars([{ label: L, value: "100", display: "100 ns" }]), /must be a positive number/);
  assert.match(bars([{ label: L, value: 0, display: "0" }]), /must be a positive number/);
  assert.match(bars([{ label: L, value: 5 }]), /needs a display string/);
});

test("errors name the block they came from, across sections", () => {
  const e = validateDiagrams({
    sections: [
      { blocks: [{ type: "prose" }, FLOW] },
      { blocks: [{ type: "diagram", kind: "bars", title: L, items: [] }] },
    ],
  });
  assert.strictEqual(e.length, 1);
  assert.match(e[0], /^section\[1\]\.block\[0\] \(bars\): no items$/);
});
