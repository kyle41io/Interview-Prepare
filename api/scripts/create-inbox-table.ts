import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } from "@aws-sdk/client-dynamodb";
const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const table = process.env.DDB_INBOX_TABLE || "ip_inbox";
const creds = process.env.AWS_ACCESS_KEY_ID
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } }
  : {};
const client = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}), ...creds });
(async () => {
  let existed = false;
  try {
    await client.send(new DescribeTableCommand({ TableName: table }));
    existed = true;
    console.log(`Table ${table} already exists.`);
  } catch (e: any) {
    if (e.name !== "ResourceNotFoundException") throw e;
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
  }
  // Enable TTL on `ttl` (idempotent — ignore "already enabled"; DynamoDB Local may not support TTL, ignore there too)
  try {
    await client.send(new UpdateTimeToLiveCommand({
      TableName: table,
      TimeToLiveSpecification: { Enabled: true, AttributeName: "ttl" },
    }));
    console.log(`TTL enabled on ${table}.ttl`);
  } catch (e: any) {
    console.log(`TTL enable skipped (${e.name || e.message}) — safe to ignore if already enabled or unsupported by DynamoDB Local.`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
