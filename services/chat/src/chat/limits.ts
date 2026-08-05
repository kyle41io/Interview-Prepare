export const FREE_DAILY = 3;
export const PRO_DAILY = 50;
/* Demo accounts are shared by every visitor and their credentials are public.
   The daily tier is the real spend ceiling; the session tier exists so one
   visitor cannot exhaust the day and leave the next reviewer a dead button. */
export const DEMO_DAILY = 30;
export const DEMO_SESSION = 5;

/** Comma-separated list, same shape as ADMIN_UIDS. Empty list matches nothing. */
export function isDemoEmail(email: string | undefined, demoEmails: string): boolean {
  if (!email) return false;
  const list = (demoEmails || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export function limitsFor(opts: { isPro: boolean; isDemo: boolean }): { daily: number; session: number | null } {
  if (opts.isDemo) return { daily: DEMO_DAILY, session: DEMO_SESSION };
  return { daily: opts.isPro ? PRO_DAILY : FREE_DAILY, session: null };
}
