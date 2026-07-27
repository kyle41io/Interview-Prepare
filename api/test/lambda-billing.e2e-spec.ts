process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.DDB_TABLE = process.env.DDB_TABLE || "ip_billing_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";

import { handler } from "../src/lambda/billing";
import { apiEvent } from "./lambda-progress.e2e-spec";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});

describe("billing lambda handler", () => {
  it("GET /v1/billing/entitlement -> 401 without a token", async () => {
    const res = await invoke(apiEvent("GET", "/v1/billing/entitlement"));
    expect(res.statusCode).toBe(401);
  });
});
