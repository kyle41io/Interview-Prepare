import { Injectable } from "@nestjs/common";
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { usageSk, todayUtc } from "./scope";
@Injectable()
export class QuotaService {
  constructor(private readonly dyn: DynamoService) {}
  private key(userId: string, day: string) { return { pk: userPk(userId), sk: usageSk(day) }; }

  async bump(userId: string, limit: number): Promise<{ ok: boolean; remaining: number }> {
    const day = todayUtc();
    const ttl = Math.floor(Date.now() / 1000) + 2 * 86400; // expire ~2 days out
    try {
      const r = await this.dyn.doc.send(new UpdateCommand({
        TableName: this.dyn.chatTable,
        Key: this.key(userId, day),
        UpdateExpression: "ADD #c :one SET #ttl = if_not_exists(#ttl, :ttl)",
        ConditionExpression: "attribute_not_exists(#c) OR #c < :limit",
        ExpressionAttributeNames: { "#c": "count", "#ttl": "ttl" },
        ExpressionAttributeValues: { ":one": 1, ":ttl": ttl, ":limit": limit },
        ReturnValues: "UPDATED_NEW",
      }));
      const count = Number(r.Attributes?.count) || 0;
      return { ok: true, remaining: Math.max(0, limit - count) };
    } catch (e: any) {
      if (e.name === "ConditionalCheckFailedException") return { ok: false, remaining: 0 };
      throw e;
    }
  }

  async getQuota(userId: string, limit: number): Promise<{ limit: number; used: number; remaining: number; day: string }> {
    const day = todayUtc();
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.dyn.chatTable, Key: this.key(userId, day) }));
    const used = Number((r.Item as any)?.count) || 0;
    return { limit, used, remaining: Math.max(0, limit - used), day };
  }
}
