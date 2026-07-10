import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as jwt from "jsonwebtoken";

// Env must be set before the Nest app (and its ConfigModule/DynamoService) is created,
// so the JwtAuthGuard and DynamoService pick these values up.
process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.DDB_TABLE = process.env.DDB_TABLE || "ip_progress_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
// process.env.DDB_ENDPOINT is intentionally left untouched here: it gates whether the
// DynamoDB-backed test below runs (set it to DynamoDB Local, e.g. http://localhost:8001,
// to enable it). If unset, that test is skipped.

import { AppModule } from "../src/app.module";

const tok = (sub: string) => "Bearer " + jwt.sign({ sub, email: sub + "@t.c" }, "test-secret");

describe("API e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health 200", () => {
    return request(app.getHttpServer()).get("/health").expect(200).expect({ status: "ok" });
  });

  it("/v1/progress 401 without token", () => {
    return request(app.getHttpServer()).get("/v1/progress").expect(401);
  });

  const dbOn = !!process.env.DDB_ENDPOINT;
  if (!dbOn) {
    // eslint-disable-next-line no-console
    console.warn(
      "[e2e] DDB_ENDPOINT not set — skipping progress user-isolation test. " +
        "Start DynamoDB Local via `docker compose -f docker-compose.dev.yml up -d`, " +
        "run `DDB_ENDPOINT=http://localhost:8001 npm run create-table`, then re-run " +
        "e2e tests with DDB_ENDPOINT=http://localhost:8001 to exercise it.",
    );
  }

  (dbOn ? it : it.skip)("progress isolation: user A cannot see user B's data", async () => {
    // A writes a topic as learned.
    await request(app.getHttpServer())
      .put("/v1/progress/topic/dsa")
      .set("Authorization", tok("user-A"))
      .send({ learned: true })
      .expect(200);

    // A can read their own data back.
    const a = await request(app.getHttpServer())
      .get("/v1/progress")
      .set("Authorization", tok("user-A"))
      .expect(200);
    expect(a.body.topics.dsa).toBe(true);

    // B, a completely different user, must not see A's topic.
    const b = await request(app.getHttpServer())
      .get("/v1/progress")
      .set("Authorization", tok("user-B"))
      .expect(200);
    expect(b.body.topics.dsa).toBeUndefined();
    expect(Object.keys(b.body.topics)).not.toContain("dsa");
  });

  // Regression: POST /v1/progress/sync is the frontend's primary write path. A prior
  // bug stripped the whole body (undecorated DTO + whitelisting ValidationPipe) and
  // then threw in mergeSnapshot. This exercises the BatchWrite round-trip end-to-end.
  (dbOn ? it : it.skip)("progress sync: full snapshot round-trips via BatchWrite", async () => {
    const snap = {
      topics: { arrays: true, graphs: true },
      cards: { q1: { due_at: 1720000000000, interval: 3, ease: 2.5, reps: 2 } },
      quizBest: { arrays: 80 },
      bookmarks: ["graphs"],
      streak: { current: 4, longest: 9, last_day: "2026-07-10" },
      settings: { lang: "vi", theme: "dark", track_role: "swe", track_level: "senior" },
    };
    const synced = await request(app.getHttpServer())
      .post("/v1/progress/sync")
      .set("Authorization", tok("user-sync"))
      .send(snap)
      .expect(201);
    expect(synced.body.topics).toEqual({ arrays: true, graphs: true });

    const got = await request(app.getHttpServer())
      .get("/v1/progress")
      .set("Authorization", tok("user-sync"))
      .expect(200);
    expect(got.body.topics).toEqual({ arrays: true, graphs: true });
    expect(got.body.cards.q1).toEqual({ due_at: 1720000000000, interval: 3, ease: 2.5, reps: 2 });
    expect(got.body.quizBest.arrays).toBe(80);
    expect(got.body.bookmarks).toEqual(["graphs"]);
    expect(got.body.streak.current).toBe(4);
    expect(got.body.settings).toEqual({ lang: "vi", theme: "dark", track_role: "swe", track_level: "senior" });
  });
});
