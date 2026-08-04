import * as jwt from "jsonwebtoken";

process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.DDB_TABLE = process.env.DDB_TABLE || "ip_progress_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";

import { apiEvent } from "@ip/testing/api-event";

import { handler } from "../src/lambda/progress";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});
const tok = (sub: string) => "Bearer " + jwt.sign({ sub, email: sub + "@t.c" }, "test-secret");

// The two tests below round-trip through a real table, so they need DynamoDB
// Local and skip without it:
//   docker compose -f docker-compose.dev.yml up -d
//   export DDB_ENDPOINT=http://localhost:8001
//   DDB_TABLE=ip_progress_test npm run create-table --workspace @ip/progress-service
//   npm run test:e2e --workspace @ip/progress-service
// They came from the monolith's api/test/app.e2e-spec.ts, which Task 8 removed
// with api/. The assertions are unchanged; only the transport is — supertest
// against an in-process HTTP server became the Lambda handler these tests are
// now the only end-to-end coverage of.
const dbOn = !!process.env.DDB_ENDPOINT;
const json = async (event: any) => {
  const res = await invoke(event);
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
};

describe("progress lambda handler", () => {
  it("GET /health -> 200 { status: ok }", async () => {
    const res = await invoke(apiEvent("GET", "/health"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET /v1/progress -> 401 without a token (guard wired)", async () => {
    const res = await invoke(apiEvent("GET", "/v1/progress"));
    expect(res.statusCode).toBe(401);
  });

  it("GET /v1/progress -> not 401 with a valid token (module wired)", async () => {
    const res = await invoke(apiEvent("GET", "/v1/progress", { token: tok("u1") }));
    expect(res.statusCode).not.toBe(401);
  });

  (dbOn ? it : it.skip)("progress isolation: user A cannot see user B's data", async () => {
    // A writes a topic as learned.
    const put = await json(
      apiEvent("PUT", "/v1/progress/topic/dsa", { token: tok("user-A"), body: { learned: true } }),
    );
    expect(put.status).toBe(200);

    // A can read their own data back.
    const a = await json(apiEvent("GET", "/v1/progress", { token: tok("user-A") }));
    expect(a.status).toBe(200);
    expect(a.body.topics.dsa).toBe(true);

    // B, a completely different user, must not see A's topic. This is the
    // partition-key isolation assertion: every item is written under
    // USER#<sub>, so a second subject cannot read the first's rows.
    const b = await json(apiEvent("GET", "/v1/progress", { token: tok("user-B") }));
    expect(b.status).toBe(200);
    expect(b.body.topics.dsa).toBeUndefined();
    expect(Object.keys(b.body.topics)).not.toContain("dsa");
  });

  // Regression: POST /v1/progress/sync is the frontend's primary write path. A
  // prior bug stripped the whole body (undecorated DTO + whitelisting
  // ValidationPipe) and then threw in mergeSnapshot. This exercises the
  // BatchWrite round-trip end-to-end; merge.spec.ts covers the merge in
  // isolation but cannot catch a DTO that discards the body before it arrives.
  (dbOn ? it : it.skip)("progress sync: full snapshot round-trips via BatchWrite", async () => {
    const snap = {
      topics: { arrays: true, graphs: true },
      cards: { q1: { due_at: 1720000000000, interval: 3, ease: 2.5, reps: 2 } },
      quizBest: { arrays: 80 },
      bookmarks: ["graphs"],
      streak: { current: 4, longest: 9, last_day: "2026-07-10" },
      settings: { lang: "vi", theme: "dark", track_role: "swe", track_level: "senior" },
    };
    const synced = await json(
      apiEvent("POST", "/v1/progress/sync", { token: tok("user-sync"), body: snap }),
    );
    expect(synced.status).toBe(201); // Nest's POST default success status
    expect(synced.body.topics).toEqual({ arrays: true, graphs: true });

    const got = await json(apiEvent("GET", "/v1/progress", { token: tok("user-sync") }));
    expect(got.status).toBe(200);
    expect(got.body.topics).toEqual({ arrays: true, graphs: true });
    expect(got.body.cards.q1).toEqual({ due_at: 1720000000000, interval: 3, ease: 2.5, reps: 2 });
    expect(got.body.quizBest.arrays).toBe(80);
    expect(got.body.bookmarks).toEqual(["graphs"]);
    expect(got.body.streak.current).toBe(4);
    expect(got.body.settings).toEqual({
      lang: "vi",
      theme: "dark",
      track_role: "swe",
      track_level: "senior",
    });
  });
});
