process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
// DynamoService reads a separate env var per domain table; this service's is
// DDB_BILLING_TABLE, not DDB_TABLE. Setting the wrong one leaves the default
// ("ip_billing") in force, which is the table local development uses.
process.env.DDB_BILLING_TABLE = process.env.DDB_BILLING_TABLE || "ip_billing_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";

import { apiEvent } from "@ip/testing/api-event";

import { handler } from "../src/lambda/billing";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});

describe("billing lambda handler", () => {
  it("GET /v1/billing/entitlement -> 401 without a token", async () => {
    const res = await invoke(apiEvent("GET", "/v1/billing/entitlement"));
    expect(res.statusCode).toBe(401);
  });
});
