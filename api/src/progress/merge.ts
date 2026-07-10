export type Card = { due_at: string | null; interval: number; ease: number; reps: number };

export interface Snapshot {
  topics: Record<string, true>;
  cards: Record<string, Card>;
  quizBest: Record<string, number>;
  bookmarks: string[];
  streak: { current: number; longest: number; last_day: string | null } | null;
  settings: { lang?: string; theme?: string; track_role?: string; track_level?: string } | null;
}

export function mergeSnapshot(server: Snapshot, local: Snapshot): Snapshot {
  const topics = { ...server.topics, ...local.topics };
  const bookmarks = Array.from(new Set([...server.bookmarks, ...local.bookmarks]));

  const quizBest: Record<string, number> = { ...server.quizBest };
  for (const [k, v] of Object.entries(local.quizBest)) quizBest[k] = Math.max(quizBest[k] ?? 0, v);

  const cards: Record<string, Card> = { ...server.cards };
  for (const [k, lc] of Object.entries(local.cards)) {
    const sc = cards[k];
    if (!sc) { cards[k] = lc; continue; }
    const later = Date.parse(lc.due_at || "0") > Date.parse(sc.due_at || "0") ? lc : sc;
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

  return { topics, cards, quizBest, bookmarks, streak, settings: Object.keys(settings).length ? settings : null };
}
