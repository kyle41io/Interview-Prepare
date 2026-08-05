/* IP.diagram — visual, clickable lesson diagrams from declarative specs.

   A `{ type:"diagram" }` content block names a kind and its nodes; this module
   turns that into markup. Four kinds cover what interview material actually
   needs to show:

     flow      — boxes on a grid joined by orthogonal arrows (request paths,
                 service topologies, pipelines, trees). Optional swim lanes and
                 an optional step-by-step walkthrough.
     sequence  — actors with lifelines and numbered messages (handshakes,
                 OAuth, replication round-trips).
     layers    — a labelled vertical stack (OSI, storage engines, model stacks).
     bars      — proportional bars, linear or log (latency numbers, Big-O
                 growth, storage sizes).

   Why an SVG built from viewBox arithmetic rather than measured HTML: the app
   renders whole pages with innerHTML and no hydration step, so a diagram must
   be correct the instant its string lands in the document — there is nowhere to
   hang a post-layout measuring pass or a ResizeObserver. Every coordinate here
   is computed in viewBox units at string-generation time, and the browser
   scales the finished picture. Node text still gets real CSS line-breaking
   because the boxes are <foreignObject>, so bilingual labels of different
   lengths wrap instead of overflowing a hand-measured <text>.

   Interaction rides the app's existing body-level click delegation (app.js) and
   keeps its state in the DOM — a `sel` class, a `data-dg-step` index. Nothing
   here needs to survive a re-render, and a re-render always yields a valid
   initial state.

   Dual-export: sets root.IP.diagram AND module.exports, like the other modules. */
(function (root, factory) {
  "use strict";
  const api = factory();
  root.IP = root.IP || {};
  root.IP.diagram = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /* ---------- geometry, in viewBox units ---------- */
  const NODE = { w: 152, h: 58 };     // a flow box
  const GAP = { x: 56, y: 40 };       // space between boxes; also the elbow budget
  const PAD = 14;
  const LANE_W = 30;                  // gutter for rotated lane labels
  const CORNER = 9;                   // elbow rounding
  const ACTOR = { w: 148, h: 38 };    // a sequence actor header
  const ACTOR_GAP = 46;
  const MSG_Y = 42;                   // vertical step between messages
  const MSG_TOP = 34;                 // first message below the actor headers

  const TONES = ["accent", "green", "orange", "purple", "pink", "red", "cyan", "gold", "muted"];

  /* Marker ids must be unique per document — several diagrams share a page. */
  let _uid = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]
    ));
  }

  /* Labels are authored content and may carry inline markup (<b>, <code>), the
     same as every other block type, so they are not escaped. Anything that
     lands in an attribute is. */
  function pick(node, lang) {
    if (node == null) return "";
    if (typeof node === "object") return String(node[lang] || node.vi || node.en || "");
    return String(node);
  }

  function tone(v) { return TONES.indexOf(v) >= 0 ? v : "muted"; }
  function r1(n) { return Math.round(n * 10) / 10; }

  /* Both width bounds come from the viewBox, so they can only be set here.
     max-width keeps a small diagram from being inflated past 1:1 (its font
     sizes are chosen at that scale); min-width is a legibility floor — past it
     the figure scrolls sideways instead of shrinking the type further. */
  const LEGIBLE_MIN = 620;
  function svgOpen(width, height, title, uid) {
    const w = r1(width);
    return `<svg class="dg-svg" viewBox="0 0 ${w} ${r1(height)}" role="img"` +
      ` style="max-width:${w}px;min-width:${r1(Math.min(width, LEGIBLE_MIN))}px"` +
      ` aria-label="${esc(title)}">` +
      `<defs><marker id="dg-a${uid}" viewBox="0 0 10 10" refX="9" refY="5"` +
      ` markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
      `<path class="dg-arrow" d="M 0 1 L 9 5 L 0 9 z"/></marker></defs>`;
  }

  /* ---------- flow: boxes and orthogonal edges ---------- */

  function nodeBox(n, origin) {
    return {
      x: origin.x + (n.col || 0) * (NODE.w + GAP.x),
      y: origin.y + (n.row || 0) * (NODE.h + GAP.y),
      w: NODE.w, h: NODE.h,
    };
  }

  const anchors = {
    left: (b) => ({ x: b.x, y: b.y + b.h / 2 }),
    right: (b) => ({ x: b.x + b.w, y: b.y + b.h / 2 }),
    top: (b) => ({ x: b.x + b.w / 2, y: b.y }),
    bottom: (b) => ({ x: b.x + b.w / 2, y: b.y + b.h }),
  };

  /* Waypoints from box `a` to box `b`, always leaving and entering a side face
     so the arrowhead reads as docking rather than crossing. A backward edge on
     the same row detours under the row instead of drawing straight back through
     the boxes in between. */
  function route(a, b) {
    const sameRow = Math.abs(a.y - b.y) < 1;
    const sameCol = Math.abs(a.x - b.x) < 1;
    const forward = b.x > a.x;

    if (sameRow && sameCol) return [anchors.right(a), anchors.right(a)];
    if (sameCol) {
      return b.y > a.y ? [anchors.bottom(a), anchors.top(b)] : [anchors.top(a), anchors.bottom(b)];
    }
    if (sameRow) {
      if (forward) return [anchors.right(a), anchors.left(b)];
      const under = a.y + a.h + GAP.y / 2;
      const from = anchors.bottom(a), to = anchors.bottom(b);
      return [from, { x: from.x, y: under }, { x: to.x, y: under }, to];
    }
    // Different row and column: out the side, across the gutter, then in.
    const from = forward ? anchors.right(a) : anchors.left(a);
    const to = forward ? anchors.left(b) : anchors.right(b);
    const midX = r1((from.x + to.x) / 2);
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
  }

  /* Point `r` units from p toward q, clamped to half the run so short segments
     cannot round past their own midpoint and fold the corner inside out. */
  function toward(p, q, r) {
    const dx = q.x - p.x, dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(r, len / 2) / len;
    return { x: r1(p.x + dx * k), y: r1(p.y + dy * k) };
  }

  function roundedPath(pts, radius) {
    if (!pts || pts.length < 2) return "";
    let d = `M ${r1(pts[0].x)} ${r1(pts[0].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const a = toward(p, pts[i - 1], radius), b = toward(p, pts[i + 1], radius);
      d += ` L ${a.x} ${a.y} Q ${r1(p.x)} ${r1(p.y)} ${b.x} ${b.y}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L ${r1(last.x)} ${r1(last.y)}`;
  }

  /* Two elbows that leave different rows for the same column gutter put their
     middle hop on exactly the same line, and the pair then reads as one edge
     with two arrowheads. Fan them a few units apart in spec order — the first
     edge keeps the true centre, later ones alternate to either side. */
  const FAN = 9;
  function deconflict(paths) {
    const seen = {};
    paths.forEach((pts) => {
      if (!pts || pts.length !== 4) return;
      const vertical = Math.abs(pts[1].x - pts[2].x) < 1;
      const key = vertical ? "x" + r1(pts[1].x) : "y" + r1(pts[1].y);
      const n = seen[key] = (seen[key] || 0) + 1;
      if (n === 1) return;
      const shift = Math.ceil((n - 1) / 2) * FAN * (n % 2 ? 1 : -1);
      if (vertical) { pts[1].x = r1(pts[1].x + shift); pts[2].x = r1(pts[2].x + shift); }
      else { pts[1].y = r1(pts[1].y + shift); pts[2].y = r1(pts[2].y + shift); }
    });
    return paths;
  }

  /* An edge label wants a horizontal run to sit on; the vertical hop of an
     elbow is the worst place for it. */
  function labelAt(pts) {
    let best = null, bestLen = -1;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.abs(b.x - a.x);
      if (Math.abs(b.y - a.y) < 1 && len > bestLen) { bestLen = len; best = { a: a, b: b }; }
    }
    if (!best) {
      const a = pts[0], b = pts[pts.length - 1];
      return { x: r1((a.x + b.x) / 2), y: r1((a.y + b.y) / 2) };
    }
    return { x: r1((best.a.x + best.b.x) / 2), y: r1(best.a.y - 6) };
  }

  function nodeHtml(n, box, ctx, stepsOf) {
    const label = pick(n.label, ctx.lang);
    const sub = pick(n.sub, ctx.lang);
    const detail = pick(n.detail, ctx.lang);
    const cls = ["dg-node", "dg-t-" + tone(n.tone)];
    if (detail) cls.push("dg-has-detail");
    const hit = detail ? ` data-dg-detail="${esc(n.id)}" role="button" tabindex="0"` : "";
    // overflow:visible would let a long label escape the frame it is drawn in;
    // the box is fixed and the CSS clamps the label instead.
    return `<foreignObject x="${r1(box.x)}" y="${r1(box.y)}" width="${box.w}" height="${box.h}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" class="${cls.join(" ")}"` +
      ` data-dg-node="${esc(n.id)}" data-dg-steps="${esc(stepsOf(n.id))}"${hit}>` +
      (n.icon ? `<span class="dg-n-icon">${pick(n.icon, ctx.lang)}</span>` : "") +
      `<span class="dg-n-label">${label}</span>` +
      (sub ? `<span class="dg-n-sub">${sub}</span>` : "") +
      `</div></foreignObject>`;
  }

  function renderFlow(spec, ctx, uid) {
    const nodes = (spec.nodes || []).filter((n) => n && n.id);
    if (!nodes.length) return "";

    const lanes = spec.lanes || [];
    const origin = { x: PAD + (lanes.length ? LANE_W : 0), y: PAD };
    const cols = nodes.reduce((m, n) => Math.max(m, (n.col || 0) + 1), 1);
    const rows = nodes.reduce((m, n) => Math.max(m, (n.row || 0) + 1), 1);
    const width = origin.x + cols * NODE.w + (cols - 1) * GAP.x + PAD;
    const height = origin.y + rows * NODE.h + (rows - 1) * GAP.y + PAD;

    const boxes = {};
    nodes.forEach((n) => { boxes[n.id] = nodeBox(n, origin); });

    /* Which walkthrough steps a node belongs to, so the walk handler can
       emphasise by attribute lookup instead of re-deriving the spec. */
    const steps = spec.steps || [];
    const stepsOf = (id) => steps
      .map((s, i) => ((s.nodes || []).indexOf(id) >= 0 ? i + 1 : 0))
      .filter(Boolean).join(" ");

    const laneSvg = lanes.map((l) => {
      const y = origin.y + (l.row || 0) * (NODE.h + GAP.y);
      return `<g class="dg-lane">` +
        `<rect x="${PAD}" y="${r1(y - 10)}" width="${r1(width - PAD * 2)}" height="${NODE.h + 20}" rx="10"/>` +
        `<text x="${PAD + LANE_W / 2}" y="${r1(y + NODE.h / 2)}" transform="rotate(-90 ${PAD + LANE_W / 2} ${r1(y + NODE.h / 2)})">` +
        `${esc(pick(l.label, ctx.lang))}</text></g>`;
    }).join("");

    const edges = (spec.edges || []).filter((e) => e && boxes[e.from] && boxes[e.to]);
    // a typo in a spec drops its own edge, it does not blank the diagram
    const paths = deconflict(edges.map((e) => route(boxes[e.from], boxes[e.to])));

    const edgeSvg = edges.map((e, i) => {
      const cls = "dg-edge" + (e.dashed ? " dashed" : "");
      return `<path class="${cls}" d="${roundedPath(paths[i], CORNER)}" marker-end="url(#dg-a${uid})"/>`;
    }).join("");

    /* Labels are split out from their paths so they can be painted last. The run
       an edge label sits on is only as wide as the gutter, and the widest glyphs
       cost more per character than validateDiagrams() can predict exactly — so a
       label sized right at the budget may still overhang a box by a unit or two.
       Painted after the boxes, its panel-coloured halo keeps it readable instead
       of it disappearing underneath. Grossly long labels are still a spec bug,
       which is what the budget in validateDiagrams() is for. */
    const labelSvg = edges.map((e, i) => {
      const label = pick(e.label, ctx.lang);
      if (!label) return "";
      const at = labelAt(paths[i]);
      return `<text class="dg-elabel" x="${at.x}" y="${at.y}">${esc(label)}</text>`;
    }).join("");

    const nodeSvg = nodes.map((n) => nodeHtml(n, boxes[n.id], ctx, stepsOf)).join("");

    // Lanes, then edges, then boxes, then edge labels on top of all of it.
    return svgOpen(width, height, pick(spec.title, ctx.lang), uid) +
      laneSvg + edgeSvg + nodeSvg + labelSvg + `</svg>`;
  }

  /* ---------- sequence: lifelines and numbered messages ---------- */

  function renderSequence(spec, ctx, uid) {
    const actors = (spec.actors || []).filter((a) => a && a.id);
    const msgs = (spec.messages || []).filter((m) => m && m.from && m.to);
    if (actors.length < 1 || !msgs.length) return "";

    const cx = {};
    actors.forEach((a, i) => { cx[a.id] = PAD + i * (ACTOR.w + ACTOR_GAP) + ACTOR.w / 2; });
    const width = PAD * 2 + actors.length * ACTOR.w + (actors.length - 1) * ACTOR_GAP;
    const lifeTop = PAD + ACTOR.h;
    const height = lifeTop + MSG_TOP + msgs.length * MSG_Y;

    const heads = actors.map((a) => {
      const x = cx[a.id] - ACTOR.w / 2;
      return `<foreignObject x="${r1(x)}" y="${PAD}" width="${ACTOR.w}" height="${ACTOR.h}">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" class="dg-actor dg-t-${tone(a.tone)}">` +
        (a.icon ? `<span class="dg-n-icon">${pick(a.icon, ctx.lang)}</span>` : "") +
        `${pick(a.label, ctx.lang)}</div></foreignObject>` +
        `<line class="dg-life" x1="${r1(cx[a.id])}" y1="${lifeTop}" x2="${r1(cx[a.id])}" y2="${r1(height - 8)}"/>`;
    }).join("");

    const rows = msgs.map((m, i) => {
      const y = lifeTop + MSG_TOP + i * MSG_Y;
      const from = cx[m.from], to = cx[m.to];
      if (from == null || to == null) return "";
      const label = `${i + 1}. ${pick(m.label, ctx.lang)}`;
      const detail = pick(m.detail, ctx.lang);
      const cls = "dg-edge" + (m.dashed ? " dashed" : "");
      let path, tx, anchor;
      if (m.from === m.to) {
        // Self-call: a loop hanging off the right of its own lifeline.
        path = `M ${r1(from)} ${r1(y - 8)} h 34 v 20 h -34`;
        tx = r1(from + 42); anchor = "start";
      } else {
        path = `M ${r1(from)} ${r1(y)} L ${r1(to)} ${r1(y)}`;
        tx = r1((from + to) / 2); anchor = "middle";
      }
      // A full-width hit strip: clicking anywhere on the row opens its note,
      // which is a far kinder target than a 1px arrow. The strip is invisible
      // until hovered, so a dot in the margin is what says "there is more here"
      // on a touch screen, where hover never happens.
      const hit = detail
        ? `<rect class="dg-hit" data-dg-detail="${esc(m.id || "m" + i)}" x="${PAD}" y="${r1(y - MSG_Y / 2)}" ` +
          `width="${r1(width - PAD * 2)}" height="${MSG_Y}" rx="8" role="button" tabindex="0"/>` +
          `<circle class="dg-more" cx="${PAD + 4}" cy="${r1(y - 4)}" r="2.5"/>`
        : "";
      return hit +
        `<path class="${cls}" d="${path}" marker-end="url(#dg-a${uid})"/>` +
        `<text class="dg-mlabel" x="${tx}" y="${r1(y - 7)}" text-anchor="${anchor}">${esc(label)}</text>`;
    }).join("");

    return svgOpen(width, height, pick(spec.title, ctx.lang), uid) + heads + rows + `</svg>`;
  }

  /* ---------- layers: a labelled vertical stack (plain HTML) ---------- */

  function renderLayers(spec, ctx) {
    const layers = (spec.layers || []).filter(Boolean);
    if (!layers.length) return "";
    const from = typeof spec.numberFrom === "number" ? spec.numberFrom : null;
    const dir = spec.numberDown === false ? 1 : -1;   // OSI counts down from 7
    const rows = layers.map((l, i) => {
      const detail = pick(l.detail, ctx.lang);
      const id = l.id || "l" + i;
      const hit = detail ? ` data-dg-detail="${esc(id)}" role="button" tabindex="0"` : "";
      const num = from === null ? "" : `<span class="dg-l-n">${from + dir * i}</span>`;
      return `<div class="dg-layer dg-t-${tone(l.tone)}${detail ? " dg-has-detail" : ""}"` +
        ` data-dg-node="${esc(id)}"${hit}>${num}` +
        `<span class="dg-l-label">${pick(l.label, ctx.lang)}</span>` +
        (l.sub ? `<span class="dg-l-sub">${pick(l.sub, ctx.lang)}</span>` : "") +
        `</div>`;
    }).join("");
    return `<div class="dg-layers">${rows}</div>`;
  }

  /* ---------- bars: proportional magnitudes (plain HTML) ---------- */

  /* Latency numbers span nine orders of magnitude, so a linear bar renders
     everything below "network round-trip" as an invisible sliver. Log scaling
     is the default for that reason; opt out with scale:"linear". */
  function barWidth(value, max, scale) {
    if (!(max > 0) || !(value > 0)) return 0;
    if (scale === "linear") return Math.min(100, (value / max) * 100);
    const w = (Math.log10(value + 1) / Math.log10(max + 1)) * 100;
    return Math.max(2, Math.min(100, w));   // keep the smallest bar visible
  }

  function renderBars(spec, ctx) {
    const items = (spec.items || []).filter((i) => i && typeof i.value === "number");
    if (!items.length) return "";
    const scale = spec.scale === "linear" ? "linear" : "log";
    const max = items.reduce((m, i) => Math.max(m, i.value), 0);
    const rows = items.map((it, i) => {
      const detail = pick(it.detail, ctx.lang);
      const id = it.id || "b" + i;
      const hit = detail ? ` data-dg-detail="${esc(id)}" role="button" tabindex="0"` : "";
      const w = r1(barWidth(it.value, max, scale));
      return `<div class="dg-bar-row${detail ? " dg-has-detail" : ""}" data-dg-node="${esc(id)}"${hit}>` +
        `<span class="dg-b-label">${pick(it.label, ctx.lang)}</span>` +
        `<span class="dg-b-track"><span class="dg-b-fill dg-t-${tone(it.tone)}" style="width:${w}%"></span></span>` +
        `<span class="dg-b-value">${esc(pick(it.display, ctx.lang) || it.value)}</span></div>`;
    }).join("");
    const note = scale === "log"
      ? { vi: "Thang log — mỗi bậc là ×10", en: "Log scale — each step is ×10" }
      : null;
    return `<div class="dg-bars">${rows}</div>` +
      (note ? `<div class="dg-scale-note">${esc(pick(note, ctx.lang))}</div>` : "");
  }

  /* ---------- shell: title, figure, walkthrough, detail panels ---------- */

  function detailsHtml(spec, ctx) {
    const src = spec.kind === "layers" ? (spec.layers || [])
      : spec.kind === "bars" ? (spec.items || [])
        : spec.kind === "sequence" ? (spec.messages || [])
          : (spec.nodes || []);
    const panels = src.map((n, i) => {
      const detail = pick(n && n.detail, ctx.lang);
      if (!detail) return "";
      const id = (n.id || (spec.kind === "sequence" ? "m" + i : (spec.kind === "bars" ? "b" + i : "l" + i)));
      const head = pick(n.label, ctx.lang);
      return `<div class="dg-detail" data-dg-for="${esc(id)}">` +
        (head ? `<b class="dg-d-head">${head}</b>` : "") + detail + `</div>`;
    }).join("");
    if (!panels) return "";
    const hint = { vi: "Bấm vào một khối để xem giải thích", en: "Click a block for the explanation" };
    return `<div class="dg-details">` +
      `<div class="dg-detail dg-hint on">${esc(pick(hint, ctx.lang))}</div>${panels}</div>`;
  }

  /* A dot rail reads position at a glance, but it stops being legible once the
     dots outnumber what the eye can count, so past that it falls back to the
     numeric counter. Either way `walk()` updates whichever one is present. */
  const DOT_MAX = 6;

  function walkHtml(spec, ctx) {
    const steps = spec.steps || [];
    if (!steps.length) return "";
    const overview = { vi: "Tổng quan — bấm ▶ để đi từng bước", en: "Overview — press ▶ to walk through" };
    const texts = [`<span class="dg-step on" data-dg-i="0">${esc(pick(overview, ctx.lang))}</span>`]
      .concat(steps.map((s, i) => `<span class="dg-step" data-dg-i="${i + 1}">${pick(s.text, ctx.lang)}</span>`))
      .join("");
    const gauge = steps.length <= DOT_MAX
      ? `<span class="dg-dots" aria-hidden="true">` +
        steps.map((s, i) => `<i data-dg-dot="${i + 1}"></i>`).join("") + `</span>`
      : `<span class="dg-sn">—</span>`;
    return `<div class="dg-walk">` +
      `<button class="dg-sbtn" data-dg-walk="-1" aria-label="previous">◀</button>` +
      gauge +
      `<button class="dg-sbtn" data-dg-walk="1" aria-label="next">▶</button>` +
      `<span class="dg-stext" role="status">${texts}</span></div>`;
  }

  const KINDS = { flow: renderFlow, sequence: renderSequence, layers: renderLayers, bars: renderBars };

  /* Returns "" for anything it cannot draw: a diagram is an aid, and a bad spec
     shipped in remote content must not take the lesson down with it. */
  function render(spec, ctx) {
    if (!spec || !KINDS[spec.kind]) return "";
    const c = { lang: (ctx && ctx.lang) || "vi" };
    try {
      const uid = ++_uid;
      const body = KINDS[spec.kind](spec, c, uid);
      if (!body) return "";
      const title = pick(spec.title, c.lang);
      const caption = pick(spec.caption, c.lang);
      const total = (spec.steps || []).length;
      return `<figure class="dg" data-dg-kind="${esc(spec.kind)}" data-dg-step="0" data-dg-total="${total}">` +
        (title ? `<figcaption class="dg-title">${title}</figcaption>` : "") +
        `<div class="dg-scroll">${body}</div>` +
        walkHtml(spec, c) +
        detailsHtml(spec, c) +
        (caption ? `<div class="dg-caption">${caption}</div>` : "") +
        `</figure>`;
    } catch (e) {
      console.warn("[diagram] render failed", spec && spec.kind, e);
      return "";
    }
  }

  /* ---------- interaction (called from app.js's click delegation) ---------- */

  /* Selecting a block swaps which detail panel is shown. The hint panel is one
     of them, so the first click replaces it and it never returns. */
  function select(figure, id) {
    if (!figure) return null;
    figure.querySelectorAll("[data-dg-node]").forEach((el) => {
      el.classList.toggle("sel", el.getAttribute("data-dg-node") === id);
    });
    figure.querySelectorAll("[data-dg-detail]").forEach((el) => {
      el.classList.toggle("sel", el.getAttribute("data-dg-detail") === id);
    });
    figure.querySelectorAll(".dg-detail").forEach((el) => {
      el.classList.toggle("on", el.getAttribute("data-dg-for") === id);
    });
    return id;
  }

  /* Step 0 is the overview: everything at full strength. Steps 1..n dim the
     nodes they do not name, which is what makes a dense topology readable one
     hop at a time. */
  function walk(figure, delta) {
    if (!figure) return 0;
    const total = Number(figure.getAttribute("data-dg-total")) || 0;
    const at = Math.max(0, Math.min(total, (Number(figure.getAttribute("data-dg-step")) || 0) + delta));
    figure.setAttribute("data-dg-step", String(at));
    figure.querySelectorAll("[data-dg-i]").forEach((el) => {
      el.classList.toggle("on", Number(el.getAttribute("data-dg-i")) === at);
    });
    figure.querySelectorAll("[data-dg-steps]").forEach((el) => {
      const mine = (el.getAttribute("data-dg-steps") || "").split(" ").indexOf(String(at)) >= 0;
      el.classList.toggle("dim", at !== 0 && !mine);
      el.classList.toggle("hi", at !== 0 && mine);
    });
    const counter = figure.querySelector(".dg-sn");
    if (counter) counter.textContent = at === 0 ? "—" : at + "/" + total;
    /* "done" for steps already walked, "on" for the current one: the rail then
       shows both how far along and how far is left. */
    figure.querySelectorAll("[data-dg-dot]").forEach((el) => {
      const i = Number(el.getAttribute("data-dg-dot"));
      el.classList.toggle("on", i === at);
      el.classList.toggle("done", i < at);
    });
    return at;
  }

  return {
    render: render, select: select, walk: walk,
    // exposed for tests
    __internals: {
      nodeBox: nodeBox, route: route, deconflict: deconflict, roundedPath: roundedPath,
      labelAt: labelAt, barWidth: barWidth, pick: pick, tone: tone,
    },
  };
});
