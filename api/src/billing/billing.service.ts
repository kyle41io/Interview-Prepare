import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { ENTITLEMENT_SK, paymentSk, payStatusPk } from "./billing-keys";
import { toView, Entitlement } from "./entitlement";
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
}
