import { Injectable, BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { QuotaService } from "./quota.service";
import { ProviderService, AiUnavailable } from "./provider.service";
import { BillingService } from "../billing/billing.service";
import { SYSTEM, clampMessages } from "./scope";
const limitFor = (isPro: boolean) => (isPro ? 50 : 3);
@Injectable()
export class ChatService {
  constructor(
    private readonly quota: QuotaService,
    private readonly provider: ProviderService,
    private readonly billing: BillingService,
  ) {}
  async chat(userId: string, rawMessages: any): Promise<{ text: string; remaining: number }> {
    const messages = clampMessages(rawMessages);
    if (!messages.length || messages[messages.length - 1].role !== "user") throw new BadRequestException({ error: "no-message" });
    const ent = await this.billing.getEntitlement(userId);
    const limit = limitFor(!!ent.isPro);
    const q = await this.quota.bump(userId, limit);
    if (!q.ok) throw new HttpException({ error: "quota", remaining: 0 }, HttpStatus.TOO_MANY_REQUESTS);
    try {
      const { text } = await this.provider.complete({ system: SYSTEM, messages, maxTokens: 1024 });
      return { text, remaining: q.remaining };
    } catch (e) {
      if (e instanceof AiUnavailable) throw new HttpException({ error: "ai-unconfigured" }, HttpStatus.SERVICE_UNAVAILABLE);
      throw e;
    }
  }
  async quotaFor(userId: string) {
    const ent = await this.billing.getEntitlement(userId);
    return this.quota.getQuota(userId, limitFor(!!ent.isPro));
  }
}
