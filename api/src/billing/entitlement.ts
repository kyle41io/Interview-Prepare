export interface Entitlement { tier?: string; status?: string; expires_at?: string | null; source?: string; updated_at?: string; }
export function isActive(ent: Entitlement | null | undefined, nowMs: number): boolean {
  if (!ent || ent.status !== "active") return false;
  if (!ent.expires_at) return true;
  return Date.parse(ent.expires_at) > nowMs;
}
export function extendExpiry(nowIso: string, currentIso: string | null, days: number): string {
  const base = Math.max(Date.parse(nowIso), currentIso ? Date.parse(currentIso) : 0);
  return new Date(base + days * 86400000).toISOString();
}
export function toView(ent: Entitlement | null, nowMs: number) {
  const active = isActive(ent, nowMs);
  return {
    tier: ent?.tier ?? "free",
    status: ent?.status ?? "none",
    expires_at: ent?.expires_at ?? null,
    isPro: active,
  };
}
