import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const table = process.env.DDB_TABLE || "ip_progress";
const creds = process.env.AWS_ACCESS_KEY_ID
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } }
  : {};

const client = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}), ...creds });

(async () => {
  try {
    await client.send(new DescribeTableCommand({ TableName: table }));
    console.log(`Table ${table} already exists — nothing to do.`);
    return;
  } catch (e: any) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }
  await client.send(new CreateTableCommand({
    TableName: table,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" },
    ],
  }));
  console.log(`Created table ${table}.`);
})().catch((e) => { console.error(e); process.exit(1); });
