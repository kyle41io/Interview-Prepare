/* One-time backfill: reads legacy `public.user_state` JSONB blobs from Supabase
   Postgres and writes them into the DynamoDB single-table (`ip_progress`) using
   the same key scheme + shapes as the NestJS API (see src/progress/merge.ts,
   src/db/keys.ts). Idempotent — PutRequest overwrites by pk+sk, safe to re-run.

   Usage:
     SUPABASE_DB_URL=<pooler-connection-string> \
     AWS_REGION=us-east-1 AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> \
     npm run backfill -- --dry   # preview only, writes nothing
     npm run backfill            # writes for real
*/
import { Pool } from "pg";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { userPk, topicSk, cardSk, quizSk, bookSk, STREAK_SK, SETTINGS_SK } from "../src/db/keys";

const DRY_RUN = process.argv.includes("--dry");

const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const table = process.env.DDB_TABLE || "ip_progress";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const ddbClient = new DynamoDBClient({
  region,
  ...(endpoint ? { endpoint } : {}),
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
});
const doc = DynamoDBDocumentClient.from(ddbClient, { marshallOptions: { removeUndefinedValues: true } });

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Maps one row's `state` JSONB blob (the frontend store snapshot shape:
// { lang, theme, track:{role,level}|null, progress:{[id]:bool}, cards:{[k]:{interval,ease,reps,due}},
//   quizBest:{[id]:pct}, bookmarks:[id], streak:{count,lastActiveDate,dailyGoal} } )
// into DynamoDB items, exactly mirroring assets/js/sync.js#toApiSnapshot.
function buildItems(userId: string, state: any, now: string): Record<string, any>[] {
  const pk = userPk(userId);
  const items: Record<string, any>[] = [];

  const progress = state.progress || {};
  for (const id of Object.keys(progress)) {
    if (!progress[id]) continue;
    items.push({ pk, sk: topicSk(id), status: "learned", learned_at: now, updated_at: now });
  }

  const cards = state.cards || {};
  for (const key of Object.keys(cards)) {
    const c = cards[key] || {};
    items.push({
      pk,
      sk: cardSk(key),
      due_at: c.due != null ? c.due : null,
      interval: Number(c.interval) || 0,
      ease: Number(c.ease) || 2.5,
      reps: Number(c.reps) || 0,
      updated_at: now,
    });
  }

  const quizBest = state.quizBest || {};
  for (const id of Object.keys(quizBest)) {
    items.push({ pk, sk: quizSk(id), best_pct: Number(quizBest[id]) || 0, attempts: 0, updated_at: now });
  }

  const bookmarks: string[] = state.bookmarks || [];
  for (const id of bookmarks) {
    items.push({ pk, sk: bookSk(id), created_at: now });
  }

  if (state.streak) {
    const count = Number(state.streak.count) || 0;
    items.push({
      pk,
      sk: STREAK_SK,
      current: count,
      longest: count,
      last_day: state.streak.lastActiveDate || null,
      updated_at: now,
    });
  }

  const track = state.track || {};
  items.push({
    pk,
    sk: SETTINGS_SK,
    lang: state.lang,
    theme: state.theme,
    track_role: track.role,
    track_level: track.level,
    updated_at: now,
  });

  return items;
}

async function writeBatch(items: Record<string, any>[]) {
  for (const batch of chunk(items, 25)) {
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [table]: batch.map((Item) => ({ PutRequest: { Item } })),
        },
      }),
    );
  }
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error("SUPABASE_DB_URL is required (Supabase pooler connection string).");
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  let totalItems = 0;
  let totalUsers = 0;
  let totalSkipped = 0;

  try {
    const { rows } = await pool.query("select user_id, state from public.user_state");
    console.log(`Fetched ${rows.length} user_state row(s) from Postgres.${DRY_RUN ? " (dry run — nothing will be written)" : ""}`);

    for (const row of rows) {
      const userId = row.user_id;
      try {
        const state = typeof row.state === "string" ? JSON.parse(row.state) : row.state || {};
        const now = new Date().toISOString();
        const items = buildItems(userId, state, now);

        console.log(`user ${userId}: ${items.length} item(s)`);

        if (!DRY_RUN) {
          await writeBatch(items);
        }

        totalItems += items.length;
        totalUsers += 1;
      } catch (err) {
        totalSkipped += 1;
        console.error(`Skipping malformed row for user ${userId}:`, err);
      }
    }

    console.log(
      `${DRY_RUN ? "[dry run] " : ""}Done. ${totalUsers} user(s) processed, ${totalItems} item(s) ${DRY_RUN ? "would be" : ""} written, ${totalSkipped} skipped.`,
    );
  } finally {
    await pool.end();
    ddbClient.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
