// Admin-gated payment approval: list/approve/reject payment requests.
// approve() flows through applyApproval() so a future bank-webhook function
// can reuse the same entitlement logic. Deno / Supabase Edge Function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });

function extendExpiry(nowMs: number, currentIso: string | null, days: number): string {
  const base = Math.max(nowMs, currentIso ? Date.parse(currentIso) : 0);
  return new Date(base + days * 86400000).toISOString();
}

async function applyApproval(admin: ReturnType<typeof createClient>, paymentId: string) {
  // Atomically claim the request: only a pending/submitted row flips to approved.
  // Conditional update + row check makes concurrent double-approve safe — the
  // second caller claims nothing and never re-grants the entitlement.
  const { data: claimed, error: ce } = await admin.from("payment_requests")
    .update({ status: "approved", decided_at: new Date().toISOString() })
    .eq("id", paymentId).in("status", ["pending", "submitted"])
    .select("user_id").maybeSingle();
  if (ce) return { error: ce.message };
  if (!claimed) {
    const { data: existing } = await admin.from("payment_requests").select("status").eq("id", paymentId).maybeSingle();
    if (existing?.status === "approved") return { ok: true }; // idempotent: already granted
    return { error: "payment not found or not claimable" };
  }
  const { data: ent } = await admin.from("entitlements").select("expires_at").eq("user_id", claimed.user_id).maybeSingle();
  const expires = extendExpiry(Date.now(), ent?.expires_at ?? null, 30);
  const { error: e1 } = await admin.from("entitlements").upsert({
    user_id: claimed.user_id, tier: "pro", status: "active",
    expires_at: expires, source: "manual", updated_at: new Date().toISOString(),
  });
  if (e1) return { error: e1.message };
  return { ok: true, expires_at: expires };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "no token" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SERVICE_ROLE_KEY")!;
    const adminUids = (Deno.env.get("ADMIN_UIDS") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u?.user) return json({ error: "invalid token" }, 401);
    if (!adminUids.includes(u.user.id)) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.action === "list") {
      const { data, error } = await admin.from("payment_requests")
        .select("id,user_id,code,plan,amount,status,note,created_at, profiles(email,display_name)")
        .in("status", ["pending", "submitted"]).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ requests: data });
    }
    if (body.action === "approve") {
      const r = await applyApproval(admin, body.payment_id);
      return "error" in r ? json(r, 500) : json(r);
    }
    if (body.action === "reject") {
      const { error } = await admin.from("payment_requests")
        .update({ status: "rejected", note: body.note ?? null, decided_at: new Date().toISOString() })
        .eq("id", body.payment_id).in("status", ["pending", "submitted"]);
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
