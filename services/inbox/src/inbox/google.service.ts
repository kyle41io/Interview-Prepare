import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { extractBody } from "./mime";
export class GmailUnavailable extends Error {}

// How much of the body the classifier sees. Enough for the schedule block of a
// long invitation, short of a whole thread's quoted history.
const BODY_CHARS = 4000;
@Injectable()
export class GoogleService {
  constructor(private readonly config: ConfigService) {}
  private cid() { return this.config.get<string>("GOOGLE_CLIENT_ID"); }
  private secret() { return this.config.get<string>("GOOGLE_CLIENT_SECRET"); }
  private mock() { return (this.config.get<string>("GMAIL_MODE") || "").toLowerCase() === "mock"; }

  async exchangeCode(code: string, redirectUri: string): Promise<{ refresh_token: string; email: string | null }> {
    if (this.mock()) return { refresh_token: "mock-refresh", email: "mock@example.com" };
    const body = new URLSearchParams({ client_id: this.cid()!, client_secret: this.secret()!, code, redirect_uri: redirectUri, grant_type: "authorization_code" });
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (!r.ok) throw new GmailUnavailable(`token exchange ${r.status} ${await r.text()}`);
    const j: any = await r.json();
    if (!j.refresh_token) throw new GmailUnavailable("no refresh_token (ensure access_type=offline + prompt=consent)");
    let email: string | null = null;
    try { const parts = String(j.id_token || "").split("."); if (parts[1]) email = JSON.parse(Buffer.from(parts[1], "base64").toString()).email || null; } catch { /* ignore */ }
    return { refresh_token: j.refresh_token, email };
  }
  async refreshAccessToken(refresh: string): Promise<string | null> {
    if (this.mock()) return "mock-access";
    const body = new URLSearchParams({ client_id: this.cid()!, client_secret: this.secret()!, refresh_token: refresh, grant_type: "refresh_token" });
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (!r.ok) return null;
    return (await r.json()).access_token || null;
  }
  // The Gmail search the scanner runs. Exposed so a debug scan can report which
  // window it looked at — "no messages" and "wrong query" look identical otherwise.
  recentQuery(): string {
    return this.config.get<string>("GMAIL_QUERY") || "newer_than:2d in:inbox";
  }
  // Returns [{ id }]; mock yields a canned recruiting message.
  async listRecent(access: string): Promise<Array<{ id: string }>> {
    if (this.mock()) return [{ id: "mock-msg-1" }];
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + encodeURIComponent(this.recentQuery()) + "&maxResults=20", { headers: { Authorization: "Bearer " + access } });
    if (!r.ok) return [];
    return ((await r.json()).messages || []).map((m: any) => ({ id: m.id }));
  }
  /** Returns { subject, from, date, snippet, body }; mock yields a canned
   *  interview email.
   *
   *  format=full, not format=metadata. The scanner used to classify on the
   *  subject plus Gmail's ~200-character snippet alone, which is where an
   *  invitation's greeting lives — the interview time is further down, in the
   *  body. That is why a "Thư mời phỏng vấn" mail reached the notification bell
   *  but never produced a calendar event: with no date in the input, the
   *  classifier had nothing to return. The granted scope is gmail.readonly, so
   *  the full message is already ours to read; gmail.metadata would 403 here. */
  async getMeta(access: string, id: string): Promise<{ subject: string; from: string; date: string; snippet: string; body: string } | null> {
    if (this.mock()) {
      return {
        subject: "Interview invite — Acme",
        from: "recruiter@acme.com",
        date: "Wed, 19 Aug 2026 08:10:00 +0700",
        snippet: "We'd like to schedule your interview.",
        body: "We would like to invite you to a technical interview at 14:00 on 21/08/2026.",
      };
    }
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + id + "?format=full", { headers: { Authorization: "Bearer " + access } });
    if (!r.ok) return null;
    const msg: any = await r.json();
    const h = (name: string) => (msg.payload?.headers || []).find((x: any) => x.name?.toLowerCase() === name)?.value || "";
    return { subject: h("subject"), from: h("from"), date: h("date"), snippet: msg.snippet || "", body: extractBody(msg.payload, BODY_CHARS) };
  }
}
