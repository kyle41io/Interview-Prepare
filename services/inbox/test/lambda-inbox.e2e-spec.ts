import * as jwt from "jsonwebtoken";

process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
// DynamoService reads a separate env var per domain table; this service's is
// DDB_INBOX_TABLE, not DDB_TABLE. Setting the wrong one leaves the default
// ("ip_inbox") in force, which is the table local development uses.
process.env.DDB_INBOX_TABLE = process.env.DDB_INBOX_TABLE || "ip_inbox_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";
process.env.GMAIL_MODE = process.env.GMAIL_MODE || "mock";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron";

import { apiEvent } from "@ip/testing/api-event";

import { handler } from "../src/lambda/http";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});
const tok = (sub: string) => "Bearer " + jwt.sign({ sub, email: sub + "@t.c" }, "test-secret");

// The scan test below round-trips through a real table, so it needs DynamoDB
// Local and skips without it:
//   docker compose -f docker-compose.dev.yml up -d
//   export DDB_ENDPOINT=http://localhost:8001
//   DDB_INBOX_TABLE=ip_inbox_test      npm run create-inbox-table --workspace @ip/inbox-service
//   DDB_INBOX_TABLE=ip_inbox_scan_test npm run create-inbox-table --workspace @ip/inbox-service
//   npm run test:e2e --workspace @ip/inbox-service
// Migrated unchanged from the monolith's api/test/app.e2e-spec.ts, which Task 8
// removed with api/. GMAIL_MODE=mock and AI_PROVIDER=mock above mean neither
// Google nor an LLM is called.
const dbOn = !!process.env.DDB_ENDPOINT;
const json = async (event: any) => {
  const res = await invoke(event);
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
};

describe("inbox lambda handler", () => {
  it("GET /v1/notifications -> 401 without a token", async () => {
    const res = await invoke(apiEvent("GET", "/v1/notifications"));
    expect(res.statusCode).toBe(401);
  });

  it("POST /v1/gmail/scan -> 403 without the cron secret (CronGuard wired)", async () => {
    const res = await invoke(apiEvent("POST", "/v1/gmail/scan"));
    expect(res.statusCode).toBe(403);
  });

  // Idempotency is the load-bearing assertion: the scheduler re-runs this on a
  // fixed interval over the same mailbox, so a second scan finding the same
  // messages must not create a second notification.
  (dbOn ? it : it.skip)(
    "connect(mock) -> scan(mock) creates a notification, idempotent on re-scan",
    async () => {
      const t = tok("inbox-user");

      const connected = await json(
        apiEvent("POST", "/v1/gmail/connect", {
          token: t,
          body: { code: "x", redirect_uri: "y" },
        }),
      );
      expect(connected.status).toBe(201);

      const scan = () =>
        json(apiEvent("POST", "/v1/gmail/scan", { headers: { "x-cron-secret": "test-cron" } }));

      expect((await scan()).status).toBe(201);
      const n1 = await json(apiEvent("GET", "/v1/notifications", { token: t }));
      expect(n1.status).toBe(200);
      expect(n1.body.length).toBeGreaterThanOrEqual(1);

      expect((await scan()).status).toBe(201);
      const n2 = await json(apiEvent("GET", "/v1/notifications", { token: t }));
      expect(n2.body.length).toBe(n1.body.length); // idempotent — no duplicate
    },
  );
});
