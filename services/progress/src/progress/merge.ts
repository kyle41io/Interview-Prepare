// due_at is an epoch-millisecond number (the frontend store's SM-2 `due`, passed
// through by toApiSnapshot). It is NOT an ISO string — do not Date.parse() it.
export type Card = { due_at: number | null; interval: number; ease: number; reps: number };

export interface Snapshot {
  topics: Record<string, true>;
  cards: Record<string, Card>;
  quizBest: Record<string, number>;
  bookmarks: string[];
  streak: { current: number; longest: number; last_day: string | null } | null;
  settings: { lang?: string; theme?: string; track_role?: string; track_level?: string };
}

// Normalize a possibly-partial snapshot (the `local` side arrives from an
// external request body and may omit fields) to a fully-populated shape so the
// merge never throws on a missing collection.
function norm(x: Partial<Snapshot> | null | undefined): Snapshot {
  const s = x || {};
  return {
    topics: s.topics || {},
    cards: s.cards || {},
    quizBest: s.quizBest || {},
    bookmarks: Array.isArray(s.bookmarks) ? s.bookmarks : [],
    streak: s.streak || null,
    settings: s.settings || {},
  };
}

export function mergeSnapshot(serverIn: Partial<Snapshot> | null | undefined, localIn: Partial<Snapshot> | null | undefined): Snapshot {
  const server = norm(serverIn);
  const local = norm(localIn);
  const topics = { ...server.topics, ...local.topics };
  const bookmarks = Array.from(new Set([...server.bookmarks, ...local.bookmarks]));

  const quizBest: Record<string, number> = { ...server.quizBest };
  for (const [k, v] of Object.entries(local.quizBest)) quizBest[k] = Math.max(quizBest[k] ?? 0, v);

  const cards: Record<string, Card> = { ...server.cards };
  for (const [k, lc] of Object.entries(local.cards)) {
    const sc = cards[k];
    if (!sc) { cards[k] = lc; continue; }
    // due_at is epoch-ms (number); compare numerically. Later due_at wins; tie keeps server.
    const later = (Number(lc.due_at) || 0) > (Number(sc.due_at) || 0) ? lc : sc;
    cards[k] = { due_at: later.due_at, interval: later.interval, ease: later.ease, reps: Math.max(sc.reps, lc.reps) };
  }

  let streak = server.streak;
  if (local.streak) {
    streak = streak
      ? {
          current: Math.max(streak.current, local.streak.current),
          longest: Math.max(streak.longest, local.streak.longest),
          last_day: Date.parse(local.streak.last_day || "0") >= Date.parse(streak.last_day || "0") ? local.streak.last_day : streak.last_day,
        }
      : local.streak;
  }

  const settings = { ...(server.settings || {}), ...(local.settings || {}) };

  return { topics, cards, quizBest, bookmarks, streak, settings };
}
