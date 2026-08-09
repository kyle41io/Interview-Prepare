import { Injectable, BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QuotaService } from "./quota.service";
import { ProviderService, AiUnavailable } from "./provider.service";
import { BillingService } from "@ip/billing-service";
import { AuthUser } from "@ip/auth";
import { SYSTEM, clampMessages, type ChatMsg } from "./scope";
import { HistoryService } from "./history.service";
import { isDemoEmail, limitsFor } from "./limits";

@Injectable()
export class ChatService {
  constructor(
    private readonly quota: QuotaService,
    private readonly provider: ProviderService,
    private readonly billing: BillingService,
    private readonly config: ConfigService,
    private readonly history: HistoryService,
  ) {}

  private isDemo(user: AuthUser) {
    return isDemoEmail(user.email, this.config.get<string>("DEMO_EMAILS") || "");
  }

  private async limits(user: AuthUser) {
    const ent = await this.billing.getEntitlement(user.id);
    return limitsFor({ isPro: !!ent.isPro, isDemo: this.isDemo(user) });
  }

  /* Which conversation this request belongs to. Null means the user's own,
     a session id means a demo visitor's — and a demo request without one is
     unattributable, so it gets no history rather than the shared login's. */
  private historyKey(user: AuthUser): { skip: boolean; sessionId: string | null } {
    if (!this.isDemo(user)) return { skip: false, sessionId: null };
    return { skip: !user.sessionId, sessionId: user.sessionId || null };
  }

  async chat(user: AuthUser, rawMessages: any): Promise<{ text: string; remaining: number }> {
    const messages = clampMessages(rawMessages);
    if (!messages.length || messages[messages.length - 1].role !== "user") throw new BadRequestException({ error: "no-message" });

    const { daily, session } = await this.limits(user);

    // Session first: the demo accounts are shared logins, so the daily pool is
    // shared too. Letting a request the session cap will reject still bump the
    // daily counter is exactly the failure the session tier exists to prevent —
    // one visitor burning the day's allowance leaves the next reviewer a dead
    // chat button. The reverse waste is harmless: a visitor the daily cap
    // rejects is blocked for the rest of the day anyway, so a spent session
    // turn costs nothing real.
    if (session !== null && user.sessionId) {
      const s = await this.quota.bumpSession(user.id, user.sessionId, session);
      if (!s.ok) throw new HttpException({ error: "quota-session", remaining: 0 }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const q = await this.quota.bump(user.id, daily);
    if (!q.ok) throw new HttpException({ error: "quota", remaining: 0 }, HttpStatus.TOO_MANY_REQUESTS);

    try {
      const { text } = await this.provider.complete({ system: SYSTEM, messages, maxTokens: 1024 });
      const h = this.historyKey(user);
      if (!h.skip) await this.history.save(user.id, h.sessionId, [...messages, { role: "assistant", content: text }]);
      return { text, remaining: q.remaining };
    } catch (e) {
      if (e instanceof AiUnavailable) throw new HttpException({ error: "ai-unconfigured" }, HttpStatus.SERVICE_UNAVAILABLE);
      throw e;
    }
  }

  async historyFor(user: AuthUser): Promise<{ messages: ChatMsg[] }> {
    const h = this.historyKey(user);
    if (h.skip) return { messages: [] };
    return { messages: await this.history.get(user.id, h.sessionId) };
  }

  async quotaFor(user: AuthUser) {
    const { daily } = await this.limits(user);
    return this.quota.getQuota(user.id, daily);
  }
}
