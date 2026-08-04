import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService, userPk } from "@ip/dynamo";
import { ENTITLEMENT_SK, paymentSk, payStatusPk } from "./billing-keys";
import { toView, Entitlement, extendExpiry } from "./entitlement";
import { genProCode, buildVietqrUrl } from "./vietqr";
@Injectable()
export class BillingService {
  constructor(private readonly dyn: DynamoService, private readonly config: ConfigService) {}
  private t() { return this.dyn.billingTable; }
  private now() { return new Date().toISOString(); }

  async getEntitlement(userId: string) {
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: ENTITLEMENT_SK } }));
    return toView((r.Item as Entitlement) || null, Date.now());
  }

  async createPayment(userId: string, plan?: string) {
    const amount = Number(this.config.get("PRICE_VND") || 49000);
    const code = genProCode();
    const created_at = this.now();
    await this.dyn.doc.send(new PutCommand({
      TableName: this.t(),
      Item: { pk: userPk(userId), sk: paymentSk(code), code, plan: plan || "pro-month", amount,
        status: "pending", note: null, created_at, decided_at: null,
        gsi1pk: payStatusPk("pending"), gsi1sk: created_at },
    }));
    const bank = this.config.get<string>("VIETQR_BANK") || "970407";
    const acct = this.config.get<string>("VIETQR_ACCT") || "19036335023019";
    const name = this.config.get<string>("VIETQR_NAME") || "NGUYEN VAN KIEN";
    return { code, amount, plan: plan || "pro-month", created_at,
      vietqr: { bank, acct, name, url: buildVietqrUrl(bank, acct, name, amount, code) } };
  }

  async submitPayment(userId: string, code: string) {
    try {
      await this.dyn.doc.send(new UpdateCommand({
        TableName: this.t(), Key: { pk: userPk(userId), sk: paymentSk(code) },
        UpdateExpression: "SET #s = :submitted, gsi1pk = :gpk",
        ConditionExpression: "#s = :pending",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":submitted": "submitted", ":pending": "pending", ":gpk": payStatusPk("submitted") },
      }));
      return { ok: true, status: "submitted" };
    } catch (e: any) {
      if (e.name === "ConditionalCheckFailedException") throw new BadRequestException("payment not pending");
      throw e;
    }
  }

  async listPayments(status: string) {
    const r = await this.dyn.doc.send(new QueryCommand({
      TableName: this.t(), IndexName: "status-index",
      KeyConditionExpression: "gsi1pk = :s",
      ExpressionAttributeValues: { ":s": payStatusPk(status) },
    }));
    return (r.Items || []).map((it: any) => ({
      userId: String(it.pk).replace(/^USER#/, ""), code: it.code, amount: it.amount,
      status: it.status, created_at: it.created_at, note: it.note ?? null,
    }));
  }

  private async claim(userId: string, code: string, next: "approved" | "rejected") {
    try {
      await this.dyn.doc.send(new UpdateCommand({
        TableName: this.t(), Key: { pk: userPk(userId), sk: paymentSk(code) },
        UpdateExpression: "SET #s = :next, gsi1pk = :gpk, decided_at = :now",
        ConditionExpression: "#s IN (:pending, :submitted)",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":next": next, ":gpk": payStatusPk(next), ":now": this.now(), ":pending": "pending", ":submitted": "submitted" },
      }));
      return "claimed" as const;
    } catch (e: any) {
      if (e.name !== "ConditionalCheckFailedException") throw e;
      const r = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: paymentSk(code) } }));
      const cur = (r.Item as any)?.status;
      if (cur === next) return "already" as const; // idempotent
      throw new BadRequestException(cur ? `payment is ${cur}` : "payment not found");
    }
  }

  async approve({ userId, code }: { userId: string; code: string }) {
    const res = await this.claim(userId, code, "approved");
    if (res === "already") return { ok: true };
    const days = Number(this.config.get("PLAN_DAYS") || 30);
    const g = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: ENTITLEMENT_SK } }));
    const cur = (g.Item as Entitlement) || null;
    const expires_at = extendExpiry(this.now(), cur?.expires_at ?? null, days);
    await this.dyn.doc.send(new PutCommand({
      TableName: this.t(),
      Item: { pk: userPk(userId), sk: ENTITLEMENT_SK, tier: "pro", status: "active", expires_at, source: "manual", updated_at: this.now() },
    }));
    return { ok: true, expires_at };
  }

  async reject({ userId, code }: { userId: string; code: string }) {
    const res = await this.claim(userId, code, "rejected");
    return { ok: true, idempotent: res === "already" };
  }

  async getCurrentPayment(userId: string) {
    const r = await this.dyn.doc.send(new QueryCommand({
      TableName: this.t(),
      KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)",
      ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": "PAYMENT#" },
    }));
    const items = (r.Items || []).filter((x: any) => x.status === "pending" || x.status === "submitted");
    if (!items.length) return null;
    items.sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
    const p: any = items[0];
    const bank = this.config.get<string>("VIETQR_BANK") || "970407";
    const acct = this.config.get<string>("VIETQR_ACCT") || "19036335023019";
    const name = this.config.get<string>("VIETQR_NAME") || "NGUYEN VAN KIEN";
    return { code: p.code, amount: p.amount, plan: p.plan, status: p.status, created_at: p.created_at,
      vietqr: { bank, acct, name, url: buildVietqrUrl(bank, acct, name, p.amount, p.code) } };
  }
}
