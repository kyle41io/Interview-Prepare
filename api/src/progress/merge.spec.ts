import { mergeSnapshot } from "./merge";
import type { Snapshot } from "./merge";

const empty: Snapshot = { topics: {}, cards: {}, quizBest: {}, bookmarks: [], streak: null, settings: {} };

test("union topics + bookmarks", () => {
  const out = mergeSnapshot(
    { ...empty, topics: { a: true }, bookmarks: ["x"] },
    { ...empty, topics: { b: true }, bookmarks: ["y", "x"] },
  );
  expect(out.topics).toEqual({ a: true, b: true });
  expect(out.bookmarks.sort()).toEqual(["x", "y"]);
});

test("quizBest takes max per topic (conflicting values)", () => {
  const out = mergeSnapshot({ ...empty, quizBest: { t: 80 } }, { ...empty, quizBest: { t: 60, u: 90 } });
  expect(out.quizBest).toEqual({ t: 80, u: 90 });
});

test("flashcard keeps later due_at and higher reps (conflict)", () => {
  const s: Snapshot = { ...empty, cards: { k: { due_at: "2026-07-10T00:00:00Z", interval: 2, ease: 2.5, reps: 3 } } };
  const l: Snapshot = { ...empty, cards: { k: { due_at: "2026-07-20T00:00:00Z", interval: 5, ease: 2.4, reps: 2 } } };
  const out = mergeSnapshot(s, l);
  expect(out.cards.k.due_at).toBe("2026-07-20T00:00:00Z");
  expect(out.cards.k.reps).toBe(3);
  expect(out.cards.k.interval).toBe(5);
  expect(out.cards.k.ease).toBe(2.4);
});

test("flashcard: new card only present locally is added as-is", () => {
  const s: Snapshot = { ...empty };
  const l: Snapshot = { ...empty, cards: { n: { due_at: "2026-07-11T00:00:00Z", interval: 1, ease: 2.5, reps: 0 } } };
  const out = mergeSnapshot(s, l);
  expect(out.cards.n).toEqual({ due_at: "2026-07-11T00:00:00Z", interval: 1, ease: 2.5, reps: 0 });
});

test("streak takes max current/longest and latest last_day (conflict)", () => {
  const out = mergeSnapshot(
    { ...empty, streak: { current: 3, longest: 5, last_day: "2026-07-09" } },
    { ...empty, streak: { current: 4, longest: 4, last_day: "2026-07-10" } },
  );
  expect(out.streak).toEqual({ current: 4, longest: 5, last_day: "2026-07-10" });
});

test("streak: server null, local present -> local wins", () => {
  const out = mergeSnapshot(empty, { ...empty, streak: { current: 1, longest: 1, last_day: "2026-07-01" } });
  expect(out.streak).toEqual({ current: 1, longest: 1, last_day: "2026-07-01" });
});

test("streak: local null, server present -> server retained", () => {
  const out = mergeSnapshot({ ...empty, streak: { current: 2, longest: 2, last_day: "2026-07-01" } }, empty);
  expect(out.streak).toEqual({ current: 2, longest: 2, last_day: "2026-07-01" });
});

test("settings: local overrides server on conflicting keys, server keys retained otherwise", () => {
  const out = mergeSnapshot(
    { ...empty, settings: { lang: "en", theme: "dark" } },
    { ...empty, settings: { lang: "fr" } },
  );
  expect(out.settings).toEqual({ lang: "fr", theme: "dark" });
});

test("settings: both empty -> {}", () => {
  const out = mergeSnapshot(empty, empty);
  expect(out.settings).toEqual({});
});

test("partial/undefined input does not throw (external body may omit fields)", () => {
  // The /sync body arrives from an external request and may be partial or empty.
  // mergeSnapshot must normalize rather than crash on a missing collection.
  expect(() => mergeSnapshot(undefined as any, undefined as any)).not.toThrow();
  expect(() => mergeSnapshot({} as any, {} as any)).not.toThrow();
  const out = mergeSnapshot(empty, { topics: { a: true } } as any); // local missing bookmarks/cards/etc.
  expect(out.topics).toEqual({ a: true });
  expect(out.bookmarks).toEqual([]);
  expect(out.cards).toEqual({});
  expect(out.quizBest).toEqual({});
  expect(out.settings).toEqual({});
});

test("flashcard: same due_at (tie) keeps server record's due_at/interval/ease, reps still maxed", () => {
  const s: Snapshot = { ...empty, cards: { k: { due_at: "2026-07-10T00:00:00Z", interval: 2, ease: 2.5, reps: 3 } } };
  const l: Snapshot = { ...empty, cards: { k: { due_at: "2026-07-10T00:00:00Z", interval: 5, ease: 2.4, reps: 1 } } };
  const out = mergeSnapshot(s, l);
  // Tie on due_at: mergeSnapshot's `>` comparison is false on equality, so the server record wins.
  expect(out.cards.k).toEqual({ due_at: "2026-07-10T00:00:00Z", interval: 2, ease: 2.5, reps: 3 });
});
