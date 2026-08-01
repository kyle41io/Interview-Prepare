#!/usr/bin/env node
/* Seed the two published demo accounts.
 *
 * Idempotent: re-running updates rather than duplicating. Run once after the
 * infrastructure deploys, with credentials in the environment:
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
 *   DDB_BILLING_TABLE=<table name> \
 *   AWS_REGION=us-east-1 \
 *   node scripts/seed-demo-accounts.mjs
 *
 * The service role key bypasses RLS — never commit it, never ship it to the
 * browser.
 */
import { createClient } from "@supabase/supabase-js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const PASSWORD = "DemoPass123!";
// Far future: BillingService.getEntitlement compares expires_at against now,
// and the normal 30-day plan would silently un-Pro this account after a month.
const PRO_EXPIRES = "2099-12-31T00:00:00.000Z";

const ACCOUNTS = [
  { email: "demo@example.com", username: "Demo User", pro: false },
  { email: "demo.pro@example.com", username: "Demo Pro", pro: true },
];

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing required env var: ${k}`); process.exit(1); }
  return v;
};

const supabase = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const billingTable = need("DDB_BILLING_TABLE");
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function findByEmail(email) {
  // listUsers is paginated; these accounts sit on page 1 of a small project,
  // but page through anyway so this stays correct as the user table grows.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function upsertUser(acct) {
  const existing = await findByEmail(acct.email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acct.username },
    });
    if (error) throw error;
    console.log(`updated  ${acct.email}  ${data.user.id}`);
    return data.user.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: acct.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: acct.username },
  });
  if (error) throw error;
  console.log(`created  ${acct.email}  ${data.user.id}`);
  return data.user.id;
}

async function grantPro(userId) {
  await ddb.send(new PutCommand({
    TableName: billingTable,
    Item: {
      pk: `USER#${userId}`,
      sk: "ENTITLEMENT",
      tier: "pro",
      status: "active",
      expires_at: PRO_EXPIRES,
      source: "demo-seed",
      updated_at: new Date().toISOString(),
    },
  }));
  console.log(`granted  pro entitlement to ${userId} (expires ${PRO_EXPIRES})`);
}

for (const acct of ACCOUNTS) {
  const id = await upsertUser(acct);
  if (acct.pro) await grantPro(id);
}
console.log("done.");
