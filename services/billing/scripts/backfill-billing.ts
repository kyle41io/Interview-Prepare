/* One-time backfill: reads legacy `public.entitlements` + `public.payment_requests`
   rows from Supabase Postgres and writes matching `ip_billing` items using the
   same key scheme + shapes as the NestJS billing API (see src/billing/billing-keys.ts,
   src/db/keys.ts). Idempotent — PutRequest overwrites by pk+sk, safe to re-run.

   Usage:
     SUPABASE_DB_URL=<pooler-connection-string> \
     AWS_REGION=us-east-1 AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> \
     npm run backfill-billing -- --dry   # preview only, writes nothing
     npm run backfill-billing            # writes for real
*/
import { Client } from "pg";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { userPk } from "@ip/dynamo";
import { ENTITLEMENT_SK, paymentSk, payStatusPk } from "../src/billing/billing-keys";

const DRY = process.argv.includes("--dry");
const table = process.env.DDB_BILLING_TABLE || "ip_billing";
const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const creds = process.env.AWS_ACCESS_KEY_ID
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } } : {};
const ddbClient = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}), ...creds });
const doc = DynamoDBDocumentClient.from(ddbClient, { marshallOptions: { removeUndefinedValues: true } });
const iso = (v: any) => (v ? new Date(v).toISOString() : null);

async function batch(items: any[]) {
  if (DRY || !items.length) return;
  for (let i = 0; i < items.length; i += 25) {
    await doc.send(new BatchWriteCommand({ RequestItems: { [table]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) } }));
  }
}
(async () => {
  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }); // Supabase pooler: cert chain not bundled
  await pg.connect();
  const items: any[] = [];
  let entOk = 0, entSkipped = 0, payOk = 0, paySkipped = 0;

  try {
    const ents = await pg.query("select user_id, tier, status, expires_at, source, updated_at from public.entitlements");
    for (const e of ents.rows) {
      try {
        items.push({ pk: userPk(e.user_id), sk: ENTITLEMENT_SK, tier: e.tier || "pro", status: e.status || "active",
          expires_at: iso(e.expires_at), source: e.source || "manual", updated_at: iso(e.updated_at) || new Date().toISOString() });
        entOk += 1;
      } catch (err) {
        entSkipped += 1;
        console.error(`Skipping malformed entitlements row for user ${e && e.user_id}:`, err);
      }
    }

    const pays = await pg.query("select id, user_id, code, plan, amount, status, note, created_at, decided_at from public.payment_requests");
    for (const p of pays.rows) {
      try {
        const created_at = iso(p.created_at) || new Date().toISOString();
        items.push({ pk: userPk(p.user_id), sk: paymentSk(p.code), code: p.code, plan: p.plan, amount: p.amount,
          status: p.status, note: p.note ?? null, created_at, decided_at: iso(p.decided_at),
          gsi1pk: payStatusPk(p.status), gsi1sk: created_at });
        payOk += 1;
      } catch (err) {
        paySkipped += 1;
        console.error(`Skipping malformed payment_requests row for user ${p && p.user_id} code ${p && p.code}:`, err);
      }
    }

    console.log(`${DRY ? "[DRY] " : ""}entitlements=${entOk}/${entOk + entSkipped} payments=${payOk}/${payOk + paySkipped} items=${items.length}`);
    await batch(items);
    console.log(DRY ? "[DRY] no writes" : "backfill complete");
  } finally {
    await pg.end();
    ddbClient.destroy();
  }
})().catch((e) => { console.error(e); process.exit(1); });
