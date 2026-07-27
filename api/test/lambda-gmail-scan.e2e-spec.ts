process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.DDB_TABLE = process.env.DDB_TABLE || "ip_inbox_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";
process.env.GMAIL_MODE = process.env.GMAIL_MODE || "mock";

import { handler } from "../src/lambda/gmail-scan";

const ctx: any = {};
const dbOn = !!process.env.DDB_ENDPOINT;

describe("gmail-scan lambda handler", () => {
  it("exports a function", () => {
    expect(typeof handler).toBe("function");
  });

  (dbOn ? it : it.skip)("runs scanAll against an empty table -> 0 accounts", async () => {
    const res: any = await (handler as any)({}, ctx, () => {});
    expect(res.ok).toBe(true);
    expect(res.accounts).toBe(0);
    expect(res.scanned).toBe(0);
  });
});
