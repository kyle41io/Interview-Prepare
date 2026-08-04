/* One-time backfill: reads legacy `public.notifications` + `public.reminders` rows from
   Supabase Postgres and writes matching `ip_inbox` items using the same key scheme + shapes
   as the NestJS inbox API (see src/inbox/inbox-keys.ts, src/inbox/inbox.service.ts, src/db/keys.ts).
   Idempotent — PutRequest overwrites by pk+sk, safe to re-run.

   Gmail `refresh_token`s are NOT backfilled by this script (users re-connect Gmail);
   `gmail_seen` rows are skipped entirely.

   Usage:
     SUPABASE_DB_URL=<pooler-connection-string> \
     AWS_REGION=us-east-1 AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> \
     npm run backfill-inbox -- --dry   # preview only, writes nothing
     npm run backfill-inbox            # writes for real
*/
import { Client } from "pg";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { userPk } from "@ip/dynamo";
import { notifSk, reminderSk } from "../src/inbox/inbox-keys";

const DRY = process.argv.includes("--dry");
const table = process.env.DDB_INBOX_TABLE || "ip_inbox";
const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const creds = process.env.AWS_ACCESS_KEY_ID
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } } : {};
const ddbClient = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}), ...creds });
const doc = DynamoDBDocumentClient.from(ddbClient, { marshallOptions: { removeUndefinedValues: true } });
const iso = (v: any) => (v ? new Date(v).toISOString() : new Date().toISOString());

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

  try {
    const nt = await pg.query("select id, user_id, type, title, body, read, source, created_at from public.notifications");
    for (const n of nt.rows) {
      const created_at = iso(n.created_at);
      items.push({
        pk: userPk(n.user_id),
        sk: notifSk(created_at, String(n.id)),
        id: String(n.id),
        type: n.type,
        title: n.title,
        body: n.body ?? "",
        read: !!n.read,
        source: n.source ?? null,
        created_at,
      });
    }

    const rm = await pg.query("select id, user_id, kind, title, company, due_at, deadline_at, status, source from public.reminders");
    for (const r of rm.rows) {
      items.push({
        pk: userPk(r.user_id),
        sk: reminderSk(String(r.id)),
        id: String(r.id),
        kind: r.kind,
        title: r.title,
        company: r.company ?? null,
        due_at: r.due_at ? iso(r.due_at) : null,
        deadline_at: r.deadline_at ? iso(r.deadline_at) : null,
        status: r.status || "upcoming",
        source: r.source ?? null,
        created_at: new Date().toISOString(),
      });
    }

    console.log(`${DRY ? "[DRY] " : ""}notifications=${nt.rowCount} reminders=${rm.rowCount} items=${items.length}`);
    await batch(items);
    console.log(DRY ? "[DRY] no writes" : "backfill complete");
  } finally {
    await pg.end();
    ddbClient.destroy();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
