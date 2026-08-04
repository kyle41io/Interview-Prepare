import { Injectable, ForbiddenException } from "@nestjs/common";
import { BillingService } from "../billing/billing.service";
import { PRO_CONTENT } from "./content.data";
@Injectable()
export class ProService {
  constructor(private readonly billing: BillingService) {}
  async catalog() {
    return PRO_CONTENT.map((r) => ({ topic_id: r.topic_id, position: r.position, title: r.title }))
      .sort((a, b) => a.topic_id.localeCompare(b.topic_id) || a.position - b.position);
  }
  async sections(userId: string, topicId: string) {
    const ent = await this.billing.getEntitlement(userId);
    if (!ent.isPro) throw new ForbiddenException("pro required");
    const sections = PRO_CONTENT.filter((r) => r.topic_id === topicId)
      .sort((a, b) => a.position - b.position)
      .map((r) => ({ position: r.position, title: r.title, section: r.section }));
    return { sections };
  }
}
