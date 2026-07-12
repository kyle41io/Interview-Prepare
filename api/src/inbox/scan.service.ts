import { Injectable } from "@nestjs/common";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { seenSk } from "./inbox-keys";
import { GoogleService } from "./google.service";
import { GmailAccountService } from "./gmail-account.service";
import { InboxService } from "./inbox.service";
import { ProviderService } from "../chat/provider.service";
import { CLASSIFY_SYS, CLASSIFY_INSTRUCTION, RECRUIT_RE } from "./classify";

@Injectable()
export class ScanService {
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

  async scanAll(): Promise<{ scanned: number; accounts: number }> {
    const accts = await this.accounts.listActiveAccounts();
    let scanned = 0;
    for (const acc of accts) {
      const access = await this.google.refreshAccessToken(acc.refresh_token);
      if (!access) continue;
      const list = await this.google.listRecent(access);
      for (const m of list) {
        if (await this.seen(acc.userId, m.id)) continue;
        await this.markSeen(acc.userId, m.id);
        const meta = await this.google.getMeta(access, m.id);
        if (!meta) continue;
        if (!RECRUIT_RE.test(meta.subject + " " + meta.snippet)) continue;
        let c: any;
        try {
          c = await this.provider.classify({ system: CLASSIFY_SYS + CLASSIFY_INSTRUCTION, input: `From: ${meta.from}\nSubject: ${meta.subject}\nSnippet: ${meta.snippet}` });
        } catch {
          continue;
        }
        if (!c?.is_recruiting) continue;
        await this.inbox.addNotification(acc.userId, { type: c.kind || "other", title: (c.company ? c.company + " — " : "") + (c.title || meta.subject), body: c.summary || "", source: m.id });
        if ((c.kind === "test" || c.kind === "interview") && (c.event_at || c.deadline_at)) {
          await this.inbox.addReminder(acc.userId, { kind: c.kind, title: c.title || meta.subject, company: c.company, due_at: c.event_at || undefined, deadline_at: c.deadline_at || undefined, source: m.id });
        }
        scanned++;
      }
      await this.accounts.setLastScan(acc.userId);
    }
    return { scanned, accounts: accts.length };
  }
}
