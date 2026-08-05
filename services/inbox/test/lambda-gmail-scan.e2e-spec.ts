process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
// DynamoService reads a separate env var per domain table; this service's is
// DDB_INBOX_TABLE, not DDB_TABLE. Setting the wrong one leaves the default
// ("ip_inbox") in force, which is the table local development uses.
//
// A DIFFERENT table from lambda-inbox.e2e-spec.ts, deliberately. The assertion
// below is "0 accounts", which is only true of a table nothing else writes to,
// and the http suite's scan test connects an account. jest gives suites no
// ordering guarantee, so sharing one table makes whichever runs second fail.
process.env.DDB_INBOX_TABLE = process.env.DDB_INBOX_TABLE || "ip_inbox_scan_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";
process.env.GMAIL_MODE = process.env.GMAIL_MODE || "mock";

import { handler } from "../src/lambda/scan";

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
