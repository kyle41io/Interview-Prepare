process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
// No DDB_* here: content is the one service that owns no table. It reads
// learning bundles from a private S3 bucket and hands back presigned URLs.

import { apiEvent } from "@ip/testing/api-event";

import { handler } from "../src/lambda/content";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});

// Content was the only one of the five entrypoints with no suite, so nothing
// exercised the handler its deploy workflow ships. These two assertions are the
// same smoke pair the other services carry: the graph bootstraps, and the guard
// is wired. Neither reaches S3 — a bundle fetch would need a real bucket and
// credentials, which belongs to the Task 20 smoke test, not to CI.
describe("content lambda handler", () => {
  it("GET /health -> 200 { status: ok }", async () => {
    const res = await invoke(apiEvent("GET", "/health"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET /v1/content/bundle -> 401 without a token (guard wired)", async () => {
    const res = await invoke(apiEvent("GET", "/v1/content/bundle"));
    expect(res.statusCode).toBe(401);
  });
});
