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
});
