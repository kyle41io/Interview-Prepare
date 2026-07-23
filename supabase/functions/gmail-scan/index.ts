// Cron-driven Gmail scan: refresh token → list/get recent inbox → keyword prefilter
// → AI classify → insert notifications + reminders (idempotent via gmail_seen).
// Never stores email bodies — only the classification result.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiClassify } from "../_shared/ai.ts";

const CLASSIFY_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    is_recruiting: { type: "boolean" },
    kind: { type: "string", enum: ["test", "interview", "offer", "rejection", "other"] },
    company: { type: "string" }, title: { type: "string" },
    event_at: { type: ["string", "null"] }, deadline_at: { type: ["string", "null"] },
    summary: { type: "string" },
  },
  required: ["is_recruiting", "kind", "company", "title", "event_at", "deadline_at", "summary"],
};
const RE = /(interview|phỏng|assessment|coding|test|take-home|offer|onboarding|tuyển|recruit|application|regret|unfortunately|shortlist|screening|hiring|vòng)/i;
// Pre-filter inside the Gmail query so a noisy inbox (job-board ads, newsletters)
// can't push real recruiting mail past the fetch cap. Gmail searches subject+body,
// so this catches far more than a recent-N slice; gmail_seen still dedupes.
const KW_QUERY = '(interview OR "phỏng vấn" OR assessment OR "coding test" OR take-home OR offer OR onboarding OR tuyển OR recruit OR shortlist OR screening OR hiring OR "vòng")';
const DEFAULT_Q = "newer_than:60d in:inbox " + KW_QUERY;
// A reminder inherits the event date the AI extracted from inside the email.
// Emails can reference dates far in the past (old mock tests, forwarded threads);
// those must not become calendar entries. Undated / unparseable = not stale.
function isStalePastDate(iso: string | null, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (isNaN(t)) return false;
  return t < now - 30 * 24 * 60 * 60 * 1000;
}
const SYS = "You classify a recruiting-related email for an IT job seeker. Return JSON per the schema. is_recruiting=false if it is not about a job application/interview/offer/rejection/test. kind: test=coding test/assessment, interview=interview invite/schedule, offer=job offer, rejection=declined, other=recruiting but none of these. event_at/deadline_at: ISO 8601 if a date/time is present, else null. Keep summary <=200 chars, in the email's language.";

async function refreshToken(refresh: string): Promise<{ token: string | null; err: string | null }> {
  const body = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_CLIENT_ID")!, client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token: refresh, grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) {
    // Surface Google's `error` (invalid_client vs invalid_grant) — not the description (may carry detail).
    const t = await r.text().catch(() => "");
    let code = "http_" + r.status;
    try { code = JSON.parse(t).error || code; } catch { /* keep http_ status */ }
    return { token: null, err: code };
  }
  const j = await r.json(); return { token: j.access_token || null, err: j.access_token ? null : "no_access_token" };
}
function header(headers: any[], name: string): string {
  return (headers || []).find((h: any) => h.name?.toLowerCase() === name)?.value || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  // gate: require the CRON_SECRET so only pg_cron / authorized callers run scans
  const secret = req.headers.get("x-cron-secret");
  if (secret !== Deno.env.get("CRON_SECRET")) return new Response("forbidden", { status: 403 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: accounts } = await admin.from("gmail_accounts").select("*").eq("active", true);
  const debug = (new URL(req.url)).searchParams.get("debug") === "1";
  const inspect = debug && (new URL(req.url)).searchParams.get("inspect") === "1"; // non-destructive: ignore seen-cache, don't write
  const dbg: any = { accounts: (accounts || []).length, perAccount: [] };
  let processed = 0;
  for (const acc of accounts || []) {
    const { token, err: tokenErr } = await refreshToken(acc.refresh_token);
    const ad: any = { token: !!token, tokenErr, hasClientId: !!Deno.env.get("GOOGLE_CLIENT_ID"), hasClientSecret: !!Deno.env.get("GOOGLE_CLIENT_SECRET"), listed: 0, seen: 0, reMiss: 0, notRecruiting: 0, matched: 0 };
    dbg.perAccount.push(ad);
    if (!token) continue;
    const auth = { headers: { Authorization: "Bearer " + token } };
    const q = (new URL(req.url)).searchParams.get("q") || DEFAULT_Q;
    const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + encodeURIComponent(q) + "&maxResults=40", auth);
    ad.listStatus = listRes.status;
    const list = listRes.ok ? await listRes.json() : { messages: [] };
    if (!listRes.ok) ad.listErr = (await listRes.text().catch(() => "")).slice(0, 200);
    ad.listQuery = q;
    ad.listed = (list.messages || []).length;
    for (const m of (list.messages || [])) {
      const { data: seen } = await admin.from("gmail_seen").select("msg_id").eq("user_id", acc.user_id).eq("msg_id", m.id).maybeSingle();
      if (seen && !inspect) { ad.seen++; continue; }
      // Mark "seen" ONLY after a definitive decision — never before classification.
      // A transient failure (msg fetch or AI down) must leave the email for the next
      // scan; committing seen early would permanently burn it (the processed:0 bug).
      const markSeen = () => inspect ? Promise.resolve() : admin.from("gmail_seen").insert({ user_id: acc.user_id, msg_id: m.id });
      const msg = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + m.id + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date", auth).then((r) => r.ok ? r.json() : null);
      if (!msg) continue; // transient fetch failure — retry next scan
      const subject = header(msg.payload?.headers, "subject"), from = header(msg.payload?.headers, "from"), snippet = msg.snippet || "";
      if (!RE.test(subject + " " + snippet)) { ad.reMiss++; if (debug) (ad.samples ||= []).push({ subject: subject.slice(0, 80), verdict: "reMiss" }); await markSeen(); continue; } // definitively irrelevant
      let c: any;
      try { c = await aiClassify({ system: SYS, input: `From: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`, schema: CLASSIFY_SCHEMA }); } catch { continue; } // AI down — retry next scan
      await markSeen(); // classified — commit the decision now
      if (debug) (ad.samples ||= []).push({ subject: subject.slice(0, 80), verdict: c?.is_recruiting ? "match:" + c.kind : "notRecruiting" });
      if (!c?.is_recruiting) { ad.notRecruiting++; continue; }
      ad.matched++;
      if (inspect) continue; // non-destructive inspection: don't write notifications/reminders
      await admin.from("notifications").insert({
        user_id: acc.user_id, type: c.kind || "other",
        title: (c.company ? c.company + " — " : "") + (c.title || subject), body: c.summary || "", source: m.id,
      });
      if ((c.kind === "test" || c.kind === "interview") && (c.event_at || c.deadline_at)
          && !isStalePastDate(c.event_at || c.deadline_at, Date.now())) {
        await admin.from("reminders").insert({
          user_id: acc.user_id, kind: c.kind, title: c.title || subject, company: c.company || null,
          due_at: c.event_at || null, deadline_at: c.deadline_at || null, source: m.id,
        });
      }
      processed++;
    }
    await admin.from("gmail_accounts").update({ last_scan: new Date().toISOString() }).eq("user_id", acc.user_id);
  }
  return new Response(JSON.stringify(debug ? { ok: true, processed, debug: dbg } : { ok: true, processed }), { headers: { "content-type": "application/json" } });
});
