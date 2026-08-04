process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.DDB_TABLE = process.env.DDB_TABLE || "ip_inbox_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";
process.env.GMAIL_MODE = process.env.GMAIL_MODE || "mock";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron";

import { apiEvent } from "@ip/testing/api-event";

import { handler } from "../src/lambda/http";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});

describe("inbox lambda handler", () => {
  it("GET /v1/notifications -> 401 without a token", async () => {
    const res = await invoke(apiEvent("GET", "/v1/notifications"));
    expect(res.statusCode).toBe(401);
  });
});
