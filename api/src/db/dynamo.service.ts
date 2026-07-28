import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type ConfigGetter = (key: string) => string | undefined;

/**
 * Builds DynamoDBClient config. Explicit credentials are used ONLY for
 * DynamoDB Local (DDB_ENDPOINT set). In real AWS (Lambda, Render) we defer to
 * the SDK default provider chain: Lambda injects temporary role credentials
 * that REQUIRE a session token and are periodically refreshed — copying only
 * the access key id + secret (dropping AWS_SESSION_TOKEN) yields
 * "security token invalid".
 */
export function buildDynamoClientConfig(get: ConfigGetter) {
  const region = get("AWS_REGION") || "us-east-1";
  const endpoint = get("DDB_ENDPOINT") || undefined; // set for DynamoDB Local
  const accessKeyId = get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = get("AWS_SECRET_ACCESS_KEY");
  return {
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(endpoint && accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  };
}

@Injectable()
export class DynamoService implements OnModuleDestroy {
  private readonly client: DynamoDBClient;
  readonly doc: DynamoDBDocumentClient;
  readonly table: string;
  readonly billingTable: string;
  readonly chatTable: string;
  readonly inboxTable: string;

  constructor(config: ConfigService) {
    this.table = config.get<string>("DDB_TABLE") || "ip_progress";
    this.billingTable = config.get<string>("DDB_BILLING_TABLE") || "ip_billing";
    this.chatTable = config.get<string>("DDB_CHAT_TABLE") || "ip_chat";
    this.inboxTable = config.get<string>("DDB_INBOX_TABLE") || "ip_inbox";
    this.client = new DynamoDBClient(
      buildDynamoClientConfig((k) => config.get<string>(k)),
    );
    this.doc = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  onModuleDestroy() {
    this.client?.destroy();
  }
}
