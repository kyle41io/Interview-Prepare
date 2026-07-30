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

function bilingual(node) {
  return !!(node && typeof node === "object" && node.vi && node.en);
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

      if (b.kind === "flow") {
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
        (b.edges || []).forEach((e, i) => {
          if (!ids.has(e?.from)) bad(`edges[${i}].from "${e?.from}" is not a node`);
          if (!ids.has(e?.to)) bad(`edges[${i}].to "${e?.to}" is not a node`);
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
