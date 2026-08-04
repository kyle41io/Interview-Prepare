import * as jwt from "jsonwebtoken";

process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
// DynamoService reads a separate env var per domain table; this service's is
// DDB_CHAT_TABLE, not DDB_TABLE. Setting the wrong one leaves the default
// ("ip_chat") in force, which is the table local development uses.
process.env.DDB_CHAT_TABLE = process.env.DDB_CHAT_TABLE || "ip_chat_test";
// Chat's integration tests need BILLING's table as well, which is the P1
// coupling made concrete: ChatService.limits() asks BillingService for the
// caller's entitlement before it decides the quota, so the quota path cannot be
// exercised without a billing table to read. When P5 turns entitlement into a
// read model chat owns, this line is one of the things that disappears.
process.env.DDB_BILLING_TABLE = process.env.DDB_BILLING_TABLE || "ip_billing_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";

import { apiEvent } from "@ip/testing/api-event";

import { handler } from "../src/lambda/chat";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});
const tok = (sub: string) => "Bearer " + jwt.sign({ sub, email: sub + "@t.c" }, "test-secret");

// Quota is persisted per user, so a fixed subject only passes against a table
// that has never seen it: the second run starts at 429. The monolith's version
// of these tests had the same flaw and only ever ran on a fresh table. A
// run-scoped subject makes them repeatable, which is what CI needs.
const run = Date.now().toString(36);
const user = (name: string) => tok(`chat-${name}-${run}`);

// The quota tests below round-trip through real tables, so they need DynamoDB
// Local and skip without it. Both tables, for the reason given above:
//   docker compose -f docker-compose.dev.yml up -d
//   export DDB_ENDPOINT=http://localhost:8001
//   DDB_CHAT_TABLE=ip_chat_test npm run create-chat-table --workspace @ip/chat-service
//   DDB_BILLING_TABLE=ip_billing_test npm run create-billing-table --workspace @ip/billing-service
//   npm run test:e2e --workspace @ip/chat-service
// From the monolith's api/test/app.e2e-spec.ts, which Task 8 removed with api/.
// Assertions unchanged; the transport is the Lambda handler rather than
// supertest, and the subjects are run-scoped. AI_PROVIDER=mock above means no
// provider is called.
const dbOn = !!process.env.DDB_ENDPOINT;
const json = async (event: any) => {
  const res = await invoke(event);
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
};
const ask = (token: string) =>
  json(apiEvent("POST", "/v1/chat", { token, body: { messages: [{ role: "user", content: "hi" }] } }));

describe("chat lambda handler", () => {
  it("GET /v1/chat/quota -> 401 without a token", async () => {
    const res = await invoke(apiEvent("GET", "/v1/chat/quota"));
    expect(res.statusCode).toBe(401);
  });

  (dbOn ? it : it.skip)(
    "free tier allows 3 then 429; bad body 400 without consuming quota",
    async () => {
      const t = user("free");

      // Bad body first, and this ordering is the point: a rejected request must
      // NOT consume quota. If validation ran after the quota debit, the three
      // successful calls below would hit 429 on the third.
      const bad = await json(apiEvent("POST", "/v1/chat", { token: t, body: { messages: [] } }));
      expect(bad.status).toBe(400);

      for (let i = 0; i < 3; i++) {
        const r = await ask(t);
        expect(r.status).toBe(201); // Nest's POST default success status
        expect(typeof r.body.text).toBe("string");
      }

      const over = await ask(t);
      expect(over.status).toBe(429);

      const q = await json(apiEvent("GET", "/v1/chat/quota", { token: t }));
      expect(q.status).toBe(200);
      expect(q.body.used).toBe(3);
      expect(q.body.remaining).toBe(0);
      expect(q.body.limit).toBe(3);
    },
  );

  (dbOn ? it : it.skip)("quota is isolated per user", async () => {
    await ask(user("A"));
    const qb = await json(apiEvent("GET", "/v1/chat/quota", { token: user("B") }));
    expect(qb.status).toBe(200);
    expect(qb.body.used).toBe(0);
  });
});
