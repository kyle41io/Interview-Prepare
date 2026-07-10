import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

@Injectable()
export class DynamoService implements OnModuleDestroy {
  private readonly client: DynamoDBClient;
  readonly doc: DynamoDBDocumentClient;
  readonly table: string;
  readonly billingTable: string;

  constructor(config: ConfigService) {
    const region = config.get<string>("AWS_REGION") || "us-east-1";
    const endpoint = config.get<string>("DDB_ENDPOINT") || undefined; // set for DynamoDB Local
    const accessKeyId = config.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = config.get<string>("AWS_SECRET_ACCESS_KEY");
    this.table = config.get<string>("DDB_TABLE") || "ip_progress";
    this.billingTable = config.get<string>("DDB_BILLING_TABLE") || "ip_billing";
    this.client = new DynamoDBClient({
      region,
      ...(endpoint ? { endpoint } : {}),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    this.doc = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  onModuleDestroy() {
    this.client?.destroy();
  }
}
