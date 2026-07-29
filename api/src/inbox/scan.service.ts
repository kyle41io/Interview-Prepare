import { Injectable, Logger } from "@nestjs/common";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { seenSk } from "./inbox-keys";
import { GoogleService } from "./google.service";
import { GmailAccountService } from "./gmail-account.service";
import { InboxService } from "./inbox.service";
import { ProviderService } from "../chat/provider.service";
import { CLASSIFY_SYS, CLASSIFY_INSTRUCTION, RECRUIT_RE } from "./classify";

/** Why a message produced nothing. Every non-"notified" outcome used to be an
 *  indistinguishable `continue`, so "scanned: 0" could mean "no recruiting mail
 *  arrived" or "every message failed to classify". */
export type ScanOutcome =
  | "notified" // classified as recruiting -> notification (+ maybe reminder)
  | "seen" // already processed on an earlier run
  | "meta-failed" // Gmail metadata fetch failed (retried next run)
  | "not-recruiting-regex" // prefilter rejected it before spending an LLM call
  | "not-recruiting-model" // model saw it and said no
  | "classify-failed"; // LLM call threw (retried next run)

export interface ScanDebugMessage {
  id: string;
  subject: string;
  from: string;
  outcome: ScanOutcome;
  kind?: string;
  reminder?: boolean;
  error?: string;
}

export interface ScanDebugAccount {
  email: string | null;
  token_refresh: "ok" | "failed";
  query: string;
  listed: number;
  messages: ScanDebugMessage[];
}

export interface ScanResult {
  scanned: number;
  accounts: number;
  debug?: ScanDebugAccount[];
}

@Injectable()
export class ScanService {
  private readonly log = new Logger(ScanService.name);
  constructor(
    private readonly dyn: DynamoService,
    private readonly google: GoogleService,
    private readonly accounts: GmailAccountService,
    private readonly inbox: InboxService,
    private readonly provider: ProviderService,
  ) {}
  private async seen(userId: string, msgId: string): Promise<boolean> {
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.dyn.inboxTable, Key: { pk: userPk(userId), sk: seenSk(msgId) } }));
    return !!r.Item;
  }
  private async markSeen(userId: string, msgId: string) {
    const ttl = Math.floor(Date.now() / 1000) + 7 * 86400;
    await this.dyn.doc.send(new PutCommand({ TableName: this.dyn.inboxTable, Item: { pk: userPk(userId), sk: seenSk(msgId), ttl } }));
  }

  /**
   * @param opts.debug collect a per-message trace of what the scanner saw and
   *   decided. Returned to the caller, never logged, and carries no secrets —
   *   but it does carry the user's own subject lines, so only the cron-guarded
   *   route and direct Lambda invocation may ask for it.
   */
  async scanAll(opts: { debug?: boolean } = {}): Promise<ScanResult> {
    const accts = await this.accounts.listActiveAccounts();
    const debug: ScanDebugAccount[] = [];
    let scanned = 0;
    for (const acc of accts) {
      const access = await this.google.refreshAccessToken(acc.refresh_token);
      const trace: ScanDebugAccount = { email: acc.email ?? null, token_refresh: access ? "ok" : "failed", query: this.google.recentQuery(), listed: 0, messages: [] };
      if (opts.debug) debug.push(trace);
      if (!access) {
        // Google rejected the refresh token: revoked, expired (an OAuth app left
        // in "Testing" expires them after 7 days), or the client secret rotated.
        this.log.warn(`refresh token rejected for ${acc.userId} — user must reconnect Gmail`);
        continue;
      }
      const list = await this.google.listRecent(access);
      trace.listed = list.length;
      for (const m of list) {
        const note = (outcome: ScanOutcome, extra: Partial<ScanDebugMessage> = {}, meta?: { subject: string; from: string }) => {
          if (opts.debug) trace.messages.push({ id: m.id, subject: meta?.subject ?? "", from: meta?.from ?? "", outcome, ...extra });
        };
        if (await this.seen(acc.userId, m.id)) {
          note("seen");
          continue;
        }
        const meta = await this.google.getMeta(access, m.id);
        // Leave unseen so a failed fetch retries; the Gmail query window bounds
        // how long that can repeat.
        if (!meta) {
          note("meta-failed");
          continue;
        }
        if (!RECRUIT_RE.test(meta.subject + " " + meta.snippet)) {
          await this.markSeen(acc.userId, m.id);
          note("not-recruiting-regex", {}, meta);
          continue;
        }
        let c: any;
        try {
          c = await this.provider.classify({ system: CLASSIFY_SYS + CLASSIFY_INSTRUCTION, input: `From: ${meta.from}\nSubject: ${meta.subject}\nSnippet: ${meta.snippet}` });
        } catch (e: any) {
          // Transient by assumption (rate limit, timeout, provider outage), so
          // this message stays unseen and is retried on the next run. Marking it
          // seen here is what silently dropped recruiting mail.
          this.log.warn(`classify failed for message ${m.id}: ${e?.message || e}`);
          note("classify-failed", { error: String(e?.message || e).slice(0, 200) }, meta);
          continue;
        }
        await this.markSeen(acc.userId, m.id);
        if (!c?.is_recruiting) {
          note("not-recruiting-model", {}, meta);
          continue;
        }
        await this.inbox.addNotification(acc.userId, { type: c.kind || "other", title: (c.company ? c.company + " — " : "") + (c.title || meta.subject), body: c.summary || "", source: m.id });
        const reminder = (c.kind === "test" || c.kind === "interview") && !!(c.event_at || c.deadline_at);
        if (reminder) {
          await this.inbox.addReminder(acc.userId, { kind: c.kind, title: c.title || meta.subject, company: c.company, due_at: c.event_at || undefined, deadline_at: c.deadline_at || undefined, source: m.id });
        }
        note("notified", { kind: c.kind, reminder }, meta);
        scanned++;
      }
      await this.accounts.setLastScan(acc.userId);
    }
    return opts.debug ? { scanned, accounts: accts.length, debug } : { scanned, accounts: accts.length };
  }
}
