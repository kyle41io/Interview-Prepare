import { Injectable, BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QuotaService } from "./quota.service";
import { ProviderService, AiUnavailable } from "./provider.service";
import { BillingService } from "../billing/billing.service";
import { AuthUser } from "../auth/current-user.decorator";
import { SYSTEM, clampMessages } from "./scope";
import { isDemoEmail, limitsFor } from "./limits";

@Injectable()
export class ChatService {
  constructor(
    private readonly quota: QuotaService,
    private readonly provider: ProviderService,
    private readonly billing: BillingService,
    private readonly config: ConfigService,
  ) {}

  private async limits(user: AuthUser) {
    const ent = await this.billing.getEntitlement(user.id);
    const isDemo = isDemoEmail(user.email, this.config.get<string>("DEMO_EMAILS") || "");
    return limitsFor({ isPro: !!ent.isPro, isDemo });
  }

  async chat(user: AuthUser, rawMessages: any): Promise<{ text: string; remaining: number }> {
    const messages = clampMessages(rawMessages);
    if (!messages.length || messages[messages.length - 1].role !== "user") throw new BadRequestException({ error: "no-message" });

    const { daily, session } = await this.limits(user);

    // Daily first: it's the real spend ceiling, and bumping the session
    // counter on a request the daily cap will reject would burn session
    // allowance on a request that never runs.
    const q = await this.quota.bump(user.id, daily);
    if (!q.ok) throw new HttpException({ error: "quota", remaining: 0 }, HttpStatus.TOO_MANY_REQUESTS);

    if (session !== null && user.sessionId) {
      const s = await this.quota.bumpSession(user.id, user.sessionId, session);
      if (!s.ok) throw new HttpException({ error: "quota-session", remaining: 0 }, HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      const { text } = await this.provider.complete({ system: SYSTEM, messages, maxTokens: 1024 });
      return { text, remaining: q.remaining };
    } catch (e) {
      if (e instanceof AiUnavailable) throw new HttpException({ error: "ai-unconfigured" }, HttpStatus.SERVICE_UNAVAILABLE);
      throw e;
    }
  }

  async quotaFor(user: AuthUser) {
    const { daily } = await this.limits(user);
    return this.quota.getQuota(user.id, daily);
  }
}
