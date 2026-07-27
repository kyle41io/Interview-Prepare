process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.DDB_TABLE = process.env.DDB_TABLE || "ip_chat_test";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";

import { handler } from "../src/lambda/chat";
import { apiEvent } from "./lambda-progress.e2e-spec";

const ctx: any = {};
const invoke = (event: any) => (handler as any)(event, ctx, () => {});

describe("chat lambda handler", () => {
  it("GET /v1/chat/quota -> 401 without a token", async () => {
    const res = await invoke(apiEvent("GET", "/v1/chat/quota"));
    expect(res.statusCode).toBe(401);
  });
});
