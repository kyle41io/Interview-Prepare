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

export function findDuplicateIds(topics) {
  const ids = topics.map((t) => t?.id);
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}
