// Store / remove a user's Gmail refresh token (service-role only; never returned to client).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "not-signed-in" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u?.user) return json({ error: "invalid-token" }, 401);
    const uid = u.user.id;
    const body = await req.json().catch(() => ({}));

    if (body.action === "store") {
      if (!body.refresh_token) return json({ error: "no-refresh-token" }, 400);
      const { error } = await admin.from("gmail_accounts").upsert({
        user_id: uid, refresh_token: body.refresh_token, email: body.email ?? null,
        active: true,
      });
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }
    if (body.action === "disconnect") {
      const { error } = await admin.from("gmail_accounts").delete().eq("user_id", uid);
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
