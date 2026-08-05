import { buildDynamoClientConfig } from "./dynamo.service";

const get =
  (o: Record<string, string>) =>
  (k: string): string | undefined =>
    o[k];

describe("buildDynamoClientConfig", () => {
  it("Lambda role creds (no endpoint) → no explicit credentials, so the SDK default chain keeps the session token", () => {
    const cfg = buildDynamoClientConfig(
      get({
        AWS_REGION: "us-east-1",
        AWS_ACCESS_KEY_ID: "ASIAEXAMPLE",
        AWS_SECRET_ACCESS_KEY: "secret",
        AWS_SESSION_TOKEN: "token",
      }),
    );
    expect(cfg.region).toBe("us-east-1");
    expect("credentials" in cfg).toBe(false);
    expect("endpoint" in cfg).toBe(false);
  });

  it("DynamoDB Local (endpoint + keys) → explicit credentials", () => {
    const cfg = buildDynamoClientConfig(
      get({
        DDB_ENDPOINT: "http://localhost:8000",
        AWS_ACCESS_KEY_ID: "fake",
        AWS_SECRET_ACCESS_KEY: "fake",
      }),
    );
    expect(cfg.endpoint).toBe("http://localhost:8000");
    expect(cfg.credentials).toEqual({ accessKeyId: "fake", secretAccessKey: "fake" });
  });

  it("defaults region to us-east-1 when unset", () => {
    expect(buildDynamoClientConfig(get({})).region).toBe("us-east-1");
  });
});
