const test = require("node:test");
const assert = require("node:assert");
const diagram = require("../assets/js/diagram.js");
const { nodeBox, route, deconflict, roundedPath, labelAt, barWidth, pick, tone } = diagram.__internals;

/* ---------- language picking ---------- */

test("pick resolves a bilingual node, falls back, and tolerates plain strings", () => {
  assert.strictEqual(pick({ vi: "Máy chủ", en: "Server" }, "en"), "Server");
  assert.strictEqual(pick({ vi: "Máy chủ", en: "Server" }, "vi"), "Máy chủ");
  assert.strictEqual(pick({ vi: "Máy chủ" }, "en"), "Máy chủ", "missing en falls back to vi");
  assert.strictEqual(pick("literal", "en"), "literal");
  assert.strictEqual(pick(null, "en"), "");
  assert.strictEqual(pick(undefined, "vi"), "");
});

test("tone only accepts known tones", () => {
  assert.strictEqual(tone("green"), "green");
  assert.strictEqual(tone("chartreuse"), "muted");
  assert.strictEqual(tone(undefined), "muted");
});

/* ---------- grid layout ---------- */

test("nodeBox lays a grid out in viewBox units, gaps included", () => {
  const o = { x: 10, y: 20 };
  assert.deepStrictEqual(nodeBox({ col: 0, row: 0 }, o), { x: 10, y: 20, w: 152, h: 58 });
  // one column over = node width + x gap
  assert.deepStrictEqual(nodeBox({ col: 1, row: 0 }, o), { x: 10 + 152 + 56, y: 20, w: 152, h: 58 });
  assert.deepStrictEqual(nodeBox({ col: 0, row: 2 }, o), { x: 10, y: 20 + 2 * (58 + 40), w: 152, h: 58 });
  // a node with no col/row is the origin, not NaN
  assert.deepStrictEqual(nodeBox({}, o), { x: 10, y: 20, w: 152, h: 58 });
});

/* ---------- edge routing ---------- */

const A = { x: 0, y: 0, w: 152, h: 58 };
const RIGHT = { x: 208, y: 0, w: 152, h: 58 };     // same row, one col over
const BELOW = { x: 0, y: 98, w: 152, h: 58 };      // same col, one row down
const DIAG = { x: 208, y: 98, w: 152, h: 58 };

test("a forward edge on one row goes side to side", () => {
  assert.deepStrictEqual(route(A, RIGHT), [{ x: 152, y: 29 }, { x: 208, y: 29 }]);
});

test("a same-column edge goes bottom to top", () => {
  assert.deepStrictEqual(route(A, BELOW), [{ x: 76, y: 58 }, { x: 76, y: 98 }]);
  assert.deepStrictEqual(route(BELOW, A), [{ x: 76, y: 98 }, { x: 76, y: 58 }]);
});

test("a diagonal edge elbows through the column gutter", () => {
  const pts = route(A, DIAG);
  assert.strictEqual(pts.length, 4);
  assert.deepStrictEqual(pts[0], { x: 152, y: 29 }, "leaves the right face");
  assert.deepStrictEqual(pts[3], { x: 208, y: 127 }, "enters the left face");
  assert.strictEqual(pts[1].x, pts[2].x, "the middle hop is vertical");
  assert.strictEqual(pts[1].x, 180, "and sits halfway across the gutter");
});

test("a backward edge on one row detours under the row instead of through it", () => {
  const pts = route(RIGHT, A);
  assert.strictEqual(pts.length, 4);
  assert.deepStrictEqual(pts[0], { x: 284, y: 58 }, "leaves the bottom face");
  assert.deepStrictEqual(pts[3], { x: 76, y: 58 }, "and re-enters the bottom face");
  const under = 58 + 40 / 2;
  assert.strictEqual(pts[1].y, under);
  assert.strictEqual(pts[2].y, under, "the detour runs level below the row");
});

test("route never returns fewer than two points, even for a node to itself", () => {
  assert.strictEqual(route(A, A).length, 2);
});

/* ---------- fanning out shared gutters ---------- */

const elbow = (x, y1, y2) => [{ x: 0, y: y1 }, { x: x, y: y1 }, { x: x, y: y2 }, { x: 500, y: y2 }];

test("deconflict leaves a lone elbow on the true centre line", () => {
  const pts = elbow(180, 29, 127);
  deconflict([pts]);
  assert.strictEqual(pts[1].x, 180);
});

test("deconflict fans elbows sharing a gutter to alternating sides", () => {
  const a = elbow(180, 29, 127), b = elbow(180, 29, 225), c = elbow(180, 127, 29);
  deconflict([a, b, c]);
  assert.strictEqual(a[1].x, 180, "first keeps the centre");
  assert.strictEqual(b[1].x, 171, "second goes left");
  assert.strictEqual(c[1].x, 189, "third goes right");
  // both points of each hop move together, or the hop stops being vertical
  assert.strictEqual(b[1].x, b[2].x);
  assert.strictEqual(c[1].x, c[2].x);
});

test("deconflict fans the under-row detours of backward edges too", () => {
  const under = (y) => [{ x: 284, y: 58 }, { x: 284, y: y }, { x: 76, y: y }, { x: 76, y: 58 }];
  const a = under(78), b = under(78);
  deconflict([a, b]);
  assert.strictEqual(a[1].y, 78);
  assert.strictEqual(b[1].y, 69);
  assert.strictEqual(b[1].y, b[2].y, "the detour stays level");
});

test("deconflict ignores straight two-point edges", () => {
  const straight = [{ x: 152, y: 29 }, { x: 208, y: 29 }];
  deconflict([straight, straight.slice()]);
  assert.deepStrictEqual(straight, [{ x: 152, y: 29 }, { x: 208, y: 29 }]);
});

/* ---------- path building ---------- */

test("roundedPath draws straight segments and quadratic corners", () => {
  const d = roundedPath([{ x: 0, y: 0 }, { x: 100, y: 0 }], 9);
  assert.strictEqual(d, "M 0 0 L 100 0", "two points need no corner");

  const elbow = roundedPath([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }], 9);
  assert.match(elbow, /^M 0 0 L 41 0 Q 50 0 50 9 L 50 50$/);
});

test("roundedPath clamps a corner to half its shortest segment", () => {
  // 10-unit segments cannot absorb a 9-unit radius without folding over.
  const d = roundedPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 9);
  assert.match(d, /^M 0 0 L 5 0 Q 10 0 10 5 L 10 10$/);
});

test("roundedPath returns empty for a degenerate point list", () => {
  assert.strictEqual(roundedPath([], 9), "");
  assert.strictEqual(roundedPath([{ x: 1, y: 1 }], 9), "");
  assert.strictEqual(roundedPath(null, 9), "");
});

test("labelAt prefers the longest horizontal run, above the line", () => {
  const pts = [{ x: 0, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 90 }, { x: 200, y: 90 }];
  // the 160-unit run wins over the 40-unit one
  assert.deepStrictEqual(labelAt(pts), { x: 120, y: 84 });
});

test("labelAt falls back to the midpoint when nothing is horizontal", () => {
  assert.deepStrictEqual(labelAt([{ x: 10, y: 0 }, { x: 10, y: 100 }]), { x: 10, y: 50 });
});

/* ---------- bar scaling ---------- */

test("barWidth scales linearly when asked", () => {
  assert.strictEqual(barWidth(50, 100, "linear"), 50);
  assert.strictEqual(barWidth(100, 100, "linear"), 100);
  assert.strictEqual(barWidth(200, 100, "linear"), 100, "clamped at full width");
});

test("barWidth log-scales so nine orders of magnitude stay visible", () => {
  // The classic latency table: 0.5 ns next to 150,000,000 ns.
  const wSmall = barWidth(0.5, 150e6, "log");
  const wBig = barWidth(150e6, 150e6, "log");
  assert.strictEqual(wBig, 100);
  assert.ok(wSmall >= 2, `smallest bar stays visible, got ${wSmall}`);
  assert.ok(wSmall < 10, `and still reads as tiny, got ${wSmall}`);
  // monotonic across the range
  assert.ok(barWidth(1000, 150e6, "log") > barWidth(100, 150e6, "log"));
});

test("barWidth is zero for non-positive input rather than NaN or -Infinity", () => {
  assert.strictEqual(barWidth(0, 100, "log"), 0);
  assert.strictEqual(barWidth(-5, 100, "log"), 0);
  assert.strictEqual(barWidth(10, 0, "log"), 0);
});

/* ---------- render: shell and kinds ---------- */

const FLOW = {
  type: "diagram", kind: "flow",
  title: { vi: "Luồng yêu cầu", en: "Request flow" },
  caption: { vi: "Chú thích", en: "Caption" },
  lanes: [{ row: 0, label: { vi: "Biên", en: "Edge" } }],
  nodes: [
    { id: "cdn", col: 0, row: 0, tone: "cyan", icon: "☁️", label: { vi: "CloudFront", en: "CloudFront" }, sub: { vi: "CDN", en: "CDN" }, detail: { vi: "Chi tiết CDN", en: "CDN detail" } },
    { id: "alb", col: 1, row: 0, tone: "accent", label: { vi: "ALB", en: "ALB" } },
    { id: "db", col: 1, row: 1, tone: "green", label: { vi: "RDS", en: "RDS" } },
  ],
  edges: [
    { from: "cdn", to: "alb", label: { vi: "miss", en: "miss" } },
    { from: "alb", to: "db", dashed: true },
    { from: "alb", to: "ghost" },
  ],
  steps: [
    { nodes: ["cdn"], text: { vi: "Bước 1", en: "Step 1" } },
    { nodes: ["alb", "db"], text: { vi: "Bước 2", en: "Step 2" } },
  ],
};

test("flow renders a figure with lanes, edges, boxes and its title", () => {
  const html = diagram.render(FLOW, { lang: "en" });
  assert.match(html, /<figure class="dg" data-dg-kind="flow"/);
  assert.match(html, /<figcaption class="dg-title">Request flow<\/figcaption>/);
  assert.match(html, /class="dg-caption">Caption</);
  assert.match(html, /<g class="dg-lane">/);
  assert.match(html, /class="dg-node dg-t-cyan dg-has-detail"/);
  assert.match(html, /class="dg-node dg-t-accent"/, "a node without detail is not clickable");
  assert.strictEqual((html.match(/<foreignObject /g) || []).length, 3);
  // Lanes push the grid right by the label gutter, so row 0 starts at x=44.
  assert.match(html, /<foreignObject x="44" y="14"/);
  assert.match(html, /<path class="dg-edge" d="M 196 43 L 252 43" marker-end="url\(#dg-a\d+\)"\/>/);
  assert.match(html, /class="dg-edge dashed"/);
  assert.match(html, /class="dg-elabel"[^>]*>miss</);
});

test("flow skips an edge naming a node that does not exist", () => {
  const html = diagram.render(FLOW, { lang: "en" });
  // three edges authored, one dangling -> two paths, plus nothing thrown
  assert.strictEqual((html.match(/class="dg-edge/g) || []).length, 2);
});

test("flow tags each node with the walkthrough steps it belongs to", () => {
  const html = diagram.render(FLOW, { lang: "en" });
  assert.match(html, /data-dg-node="cdn" data-dg-steps="1"/);
  assert.match(html, /data-dg-node="alb" data-dg-steps="2"/);
  assert.match(html, /data-dg-total="2"/);
  assert.match(html, /<div class="dg-walk">/);
  assert.match(html, /data-dg-i="1"[^>]*>Step 1</);
});

test("the diagram renders in the requested language", () => {
  const vi = diagram.render(FLOW, { lang: "vi" });
  assert.match(vi, /Luồng yêu cầu/);
  assert.match(vi, /Chi tiết CDN/);
  assert.ok(!vi.includes("Request flow"));
});

test("details include a hint panel and one panel per detailed node", () => {
  const html = diagram.render(FLOW, { lang: "en" });
  assert.match(html, /class="dg-detail dg-hint on"/);
  assert.match(html, /<div class="dg-detail" data-dg-for="cdn">/);
  assert.strictEqual((html.match(/class="dg-detail"/g) || []).length, 1, "only cdn has detail");
});

test("a marker id is unique per rendered diagram", () => {
  const a = diagram.render(FLOW, { lang: "en" }).match(/id="(dg-a\d+)"/)[1];
  const b = diagram.render(FLOW, { lang: "en" }).match(/id="(dg-a\d+)"/)[1];
  assert.notStrictEqual(a, b);
});

test("the svg carries width bounds derived from its viewBox", () => {
  const html = diagram.render(FLOW, { lang: "en" });
  const vb = html.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = Number(vb[1]);
  assert.match(html, new RegExp(`max-width:${w}px`));
  assert.match(html, new RegExp(`min-width:${Math.min(w, 620)}px`));
});

test("sequence renders actors, lifelines, numbered messages and hit strips", () => {
  const html = diagram.render({
    kind: "sequence",
    title: { vi: "Bắt tay TCP", en: "TCP handshake" },
    actors: [{ id: "c", label: { vi: "Client", en: "Client" } }, { id: "s", label: { vi: "Server", en: "Server" } }],
    messages: [
      { id: "syn", from: "c", to: "s", label: { vi: "SYN", en: "SYN" }, detail: { vi: "…", en: "opens the connection" } },
      { from: "s", to: "c", label: { vi: "SYN-ACK", en: "SYN-ACK" }, dashed: true },
      { from: "c", to: "c", label: { vi: "chờ", en: "wait" } },
    ],
  }, { lang: "en" });
  assert.match(html, /data-dg-kind="sequence"/);
  assert.strictEqual((html.match(/class="dg-life"/g) || []).length, 2);
  assert.match(html, /class="dg-actor dg-t-muted"/);
  assert.match(html, />1\. SYN</, "messages are numbered in order");
  assert.match(html, />2\. SYN-ACK</);
  assert.match(html, /class="dg-hit" data-dg-detail="syn"/);
  assert.match(html, /h 34 v 20 h -34/, "a self-call loops off its own lifeline");
  // labels use their own anchor, so the CSS must not force one
  assert.match(html, /text-anchor="start"/);
});

test("layers renders a numbered stack counting down by default", () => {
  const html = diagram.render({
    kind: "layers", numberFrom: 7,
    layers: [
      { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: { vi: "HTTP", en: "HTTP" }, tone: "purple", detail: { vi: "…", en: "what you write" } },
      { id: "tp", label: { vi: "Giao vận", en: "Transport" }, tone: "cyan" },
    ],
  }, { lang: "en" });
  assert.match(html, /<div class="dg-layers">/);
  assert.match(html, /class="dg-layer dg-t-purple dg-has-detail" data-dg-node="app"/);
  assert.match(html, /<span class="dg-l-n">7<\/span>/);
  assert.match(html, /<span class="dg-l-n">6<\/span>/, "counts down from numberFrom");
  assert.match(html, /class="dg-l-sub">HTTP</);
});

test("layers can count up, and omits numbers entirely by default", () => {
  const up = diagram.render({
    kind: "layers", numberFrom: 1, numberDown: false,
    layers: [{ label: { en: "a" } }, { label: { en: "b" } }],
  }, { lang: "en" });
  assert.match(up, /<span class="dg-l-n">1<\/span>[\s\S]*<span class="dg-l-n">2<\/span>/);

  const plain = diagram.render({ kind: "layers", layers: [{ label: { en: "a" } }] }, { lang: "en" });
  assert.ok(!plain.includes("dg-l-n"));
});

test("bars renders proportional fills, a value column and a scale note", () => {
  const html = diagram.render({
    kind: "bars",
    items: [
      { id: "l1", label: { vi: "L1", en: "L1 cache" }, value: 0.5, display: "0.5 ns", tone: "green", detail: { vi: "…", en: "…" } },
      { label: { vi: "SSD", en: "SSD read" }, value: 150000, display: "150 µs", tone: "orange" },
    ],
  }, { lang: "en" });
  assert.match(html, /data-dg-kind="bars"/);
  assert.match(html, /class="dg-bar-row dg-has-detail" data-dg-node="l1"/);
  assert.match(html, /class="dg-b-fill dg-t-green" style="width:[\d.]+%"/);
  assert.match(html, /class="dg-b-value">0\.5 ns</);
  assert.match(html, /Log scale/);
  assert.match(html, /class="dg-bar-row" data-dg-node="b1"/, "rows without an id get a positional one");
});

test("bars drops items with no numeric value and omits the note when linear", () => {
  const html = diagram.render({
    kind: "bars", scale: "linear",
    items: [{ label: { en: "ok" }, value: 5 }, { label: { en: "junk" } }],
  }, { lang: "en" });
  assert.strictEqual((html.match(/class="dg-bar-row/g) || []).length, 1);
  assert.ok(!html.includes("Log scale"));
});

/* ---------- degrade, never throw ---------- */

test("render returns empty for an unknown kind or an empty spec", () => {
  assert.strictEqual(diagram.render({ kind: "sankey", nodes: [] }, { lang: "en" }), "");
  assert.strictEqual(diagram.render(null, { lang: "en" }), "");
  assert.strictEqual(diagram.render({ kind: "flow" }, { lang: "en" }), "", "no nodes, no figure");
  assert.strictEqual(diagram.render({ kind: "flow", nodes: [{ col: 0 }] }, { lang: "en" }), "", "nodes need ids");
  assert.strictEqual(diagram.render({ kind: "sequence", actors: [{ id: "a" }] }, { lang: "en" }), "", "no messages");
  assert.strictEqual(diagram.render({ kind: "layers", layers: [] }, { lang: "en" }), "");
  assert.strictEqual(diagram.render({ kind: "bars", items: [] }, { lang: "en" }), "");
});

test("render defaults to Vietnamese when no context is given", () => {
  const html = diagram.render(FLOW);
  assert.match(html, /Luồng yêu cầu/);
});

test("ids and labels destined for attributes are escaped", () => {
  const html = diagram.render({
    kind: "flow",
    title: { en: "t" },
    nodes: [{ id: 'x" onclick="evil', col: 0, row: 0, label: { en: "hi" }, detail: { en: "d" } }],
  }, { lang: "en" });
  assert.ok(!html.includes('onclick="evil'));
  assert.match(html, /data-dg-node="x&quot; onclick=&quot;evil"/);
});
