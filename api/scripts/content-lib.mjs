import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/* The banks are scripts that call a global PREP.register(). Shim that global and
   import each file, which captures the registered object with zero reformatting
   of the authoring sources. */
export async function loadTopics(dir) {
  const captured = [];
  globalThis.PREP = { register: (t) => captured.push(t) };
  try {
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".js")).sort()) {
      await import(`file://${resolve(join(dir, f))}`);
    }
  } finally {
    delete globalThis.PREP;
  }
  return captured;
}

export function validateTopic(t) {
  const errs = [];
  if (!t || typeof t.id !== "string" || !t.id) errs.push("missing id");
  if (!t?.title?.vi) errs.push("missing title.vi");
  if (!t?.title?.en) errs.push("missing title.en");
  if (!Array.isArray(t?.sections) || t.sections.length === 0) errs.push("empty sections");
  return errs;
}

/* Diagram specs are hand-authored coordinates and cross-references, and a bad
   one renders as nothing at all (IP.diagram degrades rather than throwing) —
   which in a private bundle means a silently blank figure in production. The
   push refuses instead. Every check here mirrors an assumption the renderer
   makes. */
const KINDS = ["flow", "sequence", "layers", "bars"];

/* Measured, not guessed: at the lane label's type size a character costs ~7.3
   viewBox units, and the budget is the 98-unit row pitch less a 10-unit gap. */
const LANE_LABEL_MAX = 12;

/* Edge labels measure ~6.4 units per character, 7.4 for the widest glyphs, so
   these divide the run each route type offers (GAP.x = 56 between adjacent
   boxes; ~28 across half a gutter for an elbow; ~208 centre-to-centre for a
   detour below the row or a hop between rows) by 7. */
const EDGE_LABEL = { forward: 8, elbow: 4, loose: 28 };

function bilingual(node) {
  return !!(node && typeof node === "object" && node.vi && node.en);
}

/* Labels are injected as innerHTML so a few inline tags can be used for emphasis.
   The trap is that anything else shaped like a tag is swallowed silently by the
   parser: a node labelled "<App>" renders as an empty box, and "Array<T>" loses
   its type. Angle brackets meant as text have to be written &lt; and &gt;. */
const INLINE_OK = /^\/?(?:b|i|em|strong|code|br|small|sub|sup)$/i;

function swallowedTags(text) {
  return [...String(text).matchAll(/<\s*([A-Za-z][A-Za-z0-9]*)/g)]
    .map((m) => m[1])
    .filter((tag) => !INLINE_OK.test(tag));
}

export function validateDiagrams(t) {
  const errs = [];
  (t?.sections || []).forEach((s, si) => {
    (s?.blocks || []).forEach((b, bi) => {
      if (!b || b.type !== "diagram") return;
      const at = `section[${si}].block[${bi}]`;
      const bad = (m) => errs.push(`${at} (${b.kind || "no kind"}): ${m}`);

      if (KINDS.indexOf(b.kind) < 0) return bad(`unknown kind`);
      if (!bilingual(b.title)) bad("title must have vi and en");
      if (b.caption && !bilingual(b.caption)) bad("caption must have vi and en");

      /* Sweep every short display string for angle brackets the HTML parser would
         eat. Details and captions are prose where real markup belongs, so they are
         left alone; labels and subs are the ones that vanish. */
      const shown = [b.nodes, b.layers, b.items, b.actors].filter(Array.isArray).flat()
        .flatMap((n) => [["label", n?.label], ["sub", n?.sub], ["display", n?.display]])
        .concat((b.lanes || []).map((l) => ["lane label", l?.label]))
        .concat((b.edges || []).map((e) => ["edge label", e?.label]))
        .concat((b.messages || []).map((m) => ["message label", m?.label]));
      shown.forEach(([what, val]) => {
        if (!val || typeof val !== "object") return;
        ["vi", "en"].forEach((lg) => {
          const tags = val[lg] ? swallowedTags(val[lg]) : [];
          if (tags.length) {
            bad(`${what}.${lg} ("${val[lg]}") contains <${tags[0]}>, which the HTML ` +
              `parser will swallow — write &lt;${tags[0]}&gt; to show it as text`);
          }
        });
      });

      if (b.kind === "flow") {
        /* A lane label is drawn rotated -90, so its length runs down the figure
           and has to fit the row pitch (NODE.h + GAP.y = 98 viewBox units).
           Two lanes on adjacent rows with long labels overlap into each other,
           which is invisible here and only shows up as mush in the gutter. */
        (b.lanes || []).forEach((l, i) => {
          if (!bilingual(l?.label)) return bad(`lanes[${i}].label must have vi and en`);
          ["vi", "en"].forEach((lg) => {
            if (l.label[lg].length > LANE_LABEL_MAX) {
              bad(`lanes[${i}].label.${lg} is ${l.label[lg].length} chars; ` +
                `max ${LANE_LABEL_MAX} — it is drawn sideways and would run into the next lane`);
            }
          });
        });

        const nodes = b.nodes || [];
        if (!nodes.length) bad("no nodes");
        const ids = new Set(), cells = new Set();
        nodes.forEach((n, i) => {
          if (!n?.id) return bad(`nodes[${i}] has no id`);
          if (ids.has(n.id)) bad(`duplicate node id "${n.id}"`);
          ids.add(n.id);
          if (!bilingual(n.label)) bad(`node "${n.id}" label must have vi and en`);
          // Two nodes in one grid cell draw on top of each other.
          const cell = `${n.col || 0},${n.row || 0}`;
          if (cells.has(cell)) bad(`node "${n.id}" shares cell ${cell}`);
          cells.add(cell);
        });
        const at = new Map(nodes.filter((n) => n?.id).map((n) => [n.id, n]));
        (b.edges || []).forEach((e, i) => {
          if (!ids.has(e?.from)) bad(`edges[${i}].from "${e?.from}" is not a node`);
          if (!ids.has(e?.to)) bad(`edges[${i}].to "${e?.to}" is not a node`);
          if (!e?.label) return;
          if (!bilingual(e.label)) return bad(`edges[${i}].label must have vi and en`);

          /* Edge labels are painted before the node boxes, so anything wider
             than the straight run it sits on slides underneath a box and is
             simply lost. How much run there is depends on how the edge routes
             (see route() in diagram.js), so the budget does too. */
          const a = at.get(e.from), z = at.get(e.to);
          if (!a || !z) return;
          const sameRow = (a.row || 0) === (z.row || 0), sameCol = (a.col || 0) === (z.col || 0);
          const cap = sameRow && !sameCol
            ? ((z.col || 0) > (a.col || 0) ? EDGE_LABEL.forward : EDGE_LABEL.loose)
            : sameCol && !sameRow ? EDGE_LABEL.loose : EDGE_LABEL.elbow;
          const why = cap === EDGE_LABEL.elbow
            ? "this edge turns a corner, so it only has half a gutter to sit on"
            : cap === EDGE_LABEL.forward
              ? "it sits in the gap between two boxes"
              : "it runs below the row";
          ["vi", "en"].forEach((lg) => {
            if (e.label[lg].length > cap) {
              bad(`edges[${i}].label.${lg} ("${e.label[lg]}") is ${e.label[lg].length} chars; ` +
                `max ${cap} — ${why}. Move the detail into a node detail or a step.`);
            }
          });
        });
        (b.steps || []).forEach((st, i) => {
          if (!bilingual(st?.text)) bad(`steps[${i}].text must have vi and en`);
          (st?.nodes || []).forEach((id) => {
            if (!ids.has(id)) bad(`steps[${i}] names "${id}", which is not a node`);
          });
        });
        // A step that names nothing dims the whole picture for no reason.
        if ((b.steps || []).some((st) => !(st.nodes || []).length)) bad("a step names no nodes");
      }

      if (b.kind === "sequence") {
        const actors = b.actors || [];
        if (!actors.length) bad("no actors");
        const ids = new Set(actors.map((a) => a?.id).filter(Boolean));
        actors.forEach((a, i) => {
          if (!a?.id) bad(`actors[${i}] has no id`);
          if (!bilingual(a.label)) bad(`actor "${a?.id}" label must have vi and en`);
        });
        if (!(b.messages || []).length) bad("no messages");
        (b.messages || []).forEach((m, i) => {
          if (!ids.has(m?.from)) bad(`messages[${i}].from "${m?.from}" is not an actor`);
          if (!ids.has(m?.to)) bad(`messages[${i}].to "${m?.to}" is not an actor`);
          if (!bilingual(m?.label)) bad(`messages[${i}].label must have vi and en`);
        });
      }

      if (b.kind === "layers") {
        if (!(b.layers || []).length) bad("no layers");
        (b.layers || []).forEach((l, i) => {
          if (!bilingual(l?.label)) bad(`layers[${i}].label must have vi and en`);
        });
      }

      if (b.kind === "bars") {
        if (!(b.items || []).length) bad("no items");
        (b.items || []).forEach((it, i) => {
          if (typeof it?.value !== "number" || !(it.value > 0)) bad(`items[${i}].value must be a positive number`);
          if (!bilingual(it?.label)) bad(`items[${i}].label must have vi and en`);
          if (!it?.display) bad(`items[${i}] needs a display string (the raw number is not a unit)`);
        });
      }
    });
  });
  return errs;
}

export function findDuplicateIds(topics) {
  const ids = topics.map((t) => t?.id);
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}
