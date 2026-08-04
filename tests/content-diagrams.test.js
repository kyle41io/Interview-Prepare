/* The diagram specs live in the private content bank, outside this repo, so the
   push script is the only gate between a hand-authored spec and production.
   These cover that gate. */
const test = require("node:test");
const assert = require("node:assert");

let validateDiagrams;
test.before(async () => {
  ({ validateDiagrams } = await import("../services/content/scripts/content-lib.mjs"));
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

test("a label shaped like an unknown HTML tag is caught, since the parser eats it", () => {
  const solo = (node) => errs({ ...FLOW, nodes: [node], edges: [], steps: [{ nodes: ["a"], text: L }] });
  const withLabel = (label) => solo({ id: "a", col: 0, row: 0, label });

  // the real bug this came from: a React component name renders as an empty box
  assert.match(withLabel({ vi: "<App> — giữ state", en: "<App> — owns state" }).join(),
    /label\.vi \("<App> — giữ state"\) contains <App>.*write &lt;App&gt;/);
  assert.match(withLabel({ vi: "ok", en: "Array<T> of rows" }).join(), /contains <T>/);
  assert.match(withLabel({ vi: "ok", en: "a <div> wrapper" }).join(), /contains <div>/);

  // inline emphasis is the reason labels are innerHTML in the first place
  assert.deepStrictEqual(withLabel({ vi: "<b>đậm</b> và <code>mã</code>", en: "<b>bold</b> and <code>code</code>" }), []);
  assert.deepStrictEqual(withLabel({ vi: "&lt;App&gt;", en: "&lt;App&gt;" }), []);
  assert.deepStrictEqual(withLabel({ vi: "a < b", en: "a < b" }), [], "a bare comparison is not a tag");

  // subs and lane labels are swept too, not just node labels
  assert.match(solo({ id: "a", col: 0, row: 0, label: L, sub: { vi: "<Foo>", en: "<Foo>" } }).join(),
    /sub\.vi .*contains <Foo>/);
  assert.match(errs({ ...FLOW, lanes: [{ row: 0, label: { vi: "<Bar>", en: "<Bar>" } }] }).join(),
    /lane label\.vi .*contains <Bar>/);
});

/* Edge labels are painted under the node boxes, so a label wider than the run it
   sits on is silently lost. The budget depends on how the edge routes. */
test("an edge label's budget follows the run its route gives it", () => {
  const grid = [
    { id: "a", col: 0, row: 0, label: L },
    { id: "b", col: 1, row: 0, label: L },   // right of a  -> forward
    { id: "c", col: 0, row: 1, label: L },   // below a     -> same column
    { id: "d", col: 1, row: 1, label: L },   // diagonal    -> elbow
  ];
  const edge = (from, to, label) => errs({
    ...FLOW, nodes: grid, edges: [{ from, to, label }], steps: [{ nodes: ["a"], text: L }],
  });

  // forward, adjacent columns: the 56-unit gap between two boxes -> 8 chars
  assert.deepStrictEqual(edge("a", "b", { vi: "12345678", en: "12345678" }), []);
  assert.match(edge("a", "b", { vi: "123456789", en: "ok" }).join(),
    /edges\[0\]\.label\.vi \("123456789"\) is 9 chars; max 8 — it sits in the gap between two boxes/);

  // elbow: only half a gutter, ~28 units -> 4 chars
  assert.deepStrictEqual(edge("a", "d", { vi: "1234", en: "1234" }), []);
  assert.match(edge("a", "d", { vi: "12345", en: "ok" }).join(), /max 4 — this edge turns a corner/);

  // straight down a column, and a backward edge that detours below the row: both roomy
  assert.deepStrictEqual(edge("a", "c", { vi: "x".repeat(28), en: "x" }), []);
  assert.deepStrictEqual(edge("b", "a", { vi: "x".repeat(28), en: "x" }), []);
  assert.match(edge("b", "a", { vi: "x".repeat(29), en: "x" }).join(), /max 28 — it runs below the row/);

  // an unlabelled edge is fine; a half-translated one is not
  assert.deepStrictEqual(edge("a", "b", undefined), []);
  assert.match(edge("a", "b", { vi: "chỉ vi" }).join(), /edges\[0\]\.label must have vi and en/);
});

test("a lane label must be short, because it is drawn sideways down the row pitch", () => {
  const lane = (label) => errs({ ...FLOW, lanes: [{ row: 0, label }] }).join();
  assert.deepStrictEqual(errs({ ...FLOW, lanes: [{ row: 0, label: { vi: "Đồng bộ", en: "Sync" } }] }), []);
  assert.match(lane({ vi: "Control plane", en: "Control" }), /lanes\[0\]\.label\.vi is 13 chars; max 12/);
  assert.match(lane({ vi: "Ngắn", en: "Virtualisation" }), /lanes\[0\]\.label\.en is 14 chars; max 12/);
  assert.match(lane({ vi: "chỉ tiếng Việt" }), /lanes\[0\]\.label must have vi and en/);
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
