import { hydrateSecretsFromSsm, SSM_TO_ENV } from "./secrets";

// A minimal fake SSM client: records the commands it was asked to send and
// returns a scripted GetParameters response. Keeps the test off real AWS.
function fakeSsm(values: Record<string, string>) {
  const send = jest.fn(async (cmd: { input: { Names: string[] } }) => ({
    Parameters: cmd.input.Names.filter((n) => n in values).map((n) => ({
      Name: n,
      Value: values[n],
    })),
  }));
  return { send } as unknown as import("@aws-sdk/client-ssm").SSMClient & {
    send: jest.Mock;
  };
}

describe("hydrateSecretsFromSsm", () => {
  const PREFIX = "/interview-prep";

  it("does nothing (never touches SSM) when SSM_PREFIX is unset — local/Render path", async () => {
    const env: NodeJS.ProcessEnv = {};
    const client = fakeSsm({});
    await hydrateSecretsFromSsm({ client, env });
    expect(client.send).not.toHaveBeenCalled();
  });

  it("env wins: when every target env var is already set, SSM is not called", async () => {
    const env: NodeJS.ProcessEnv = { SSM_PREFIX: PREFIX };
    for (const key of Object.values(SSM_TO_ENV)) env[key] = `preset-${key}`;
    const client = fakeSsm({});

    await hydrateSecretsFromSsm({ client, env });

    expect(client.send).not.toHaveBeenCalled();
    // Pre-existing env values are preserved untouched.
    expect(env.SUPABASE_JWT_SECRET).toBe("preset-SUPABASE_JWT_SECRET");
  });

  it("fetches from SSM and populates env when a target var is absent and SSM_PREFIX is set", async () => {
    const env: NodeJS.ProcessEnv = { SSM_PREFIX: PREFIX };
    const client = fakeSsm({
      [`${PREFIX}/supabase-jwt-secret`]: "jwt-from-ssm",
      [`${PREFIX}/openai-api-key`]: "openai-from-ssm",
      [`${PREFIX}/anthropic-api-key`]: "anthropic-from-ssm",
      [`${PREFIX}/gmail-oauth-client-id`]: "google-id-from-ssm",
      [`${PREFIX}/gmail-oauth-client-secret`]: "google-secret-from-ssm",
      [`${PREFIX}/cron-secret`]: "cron-from-ssm",
    });

    await hydrateSecretsFromSsm({ client, env });

    expect(client.send).toHaveBeenCalledTimes(1);
    expect(env.SUPABASE_JWT_SECRET).toBe("jwt-from-ssm");
    expect(env.OPENAI_API_KEY).toBe("openai-from-ssm");
    expect(env.ANTHROPIC_API_KEY).toBe("anthropic-from-ssm");
    // Code reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, not GMAIL_OAUTH_*.
    expect(env.GOOGLE_CLIENT_ID).toBe("google-id-from-ssm");
    expect(env.GOOGLE_CLIENT_SECRET).toBe("google-secret-from-ssm");
    expect(env.CRON_SECRET).toBe("cron-from-ssm");
  });

  it("env wins per-key: only the absent keys are requested from SSM", async () => {
    const env: NodeJS.ProcessEnv = {
      SSM_PREFIX: PREFIX,
      SUPABASE_JWT_SECRET: "already-here",
    };
    const client = fakeSsm({
      [`${PREFIX}/anthropic-api-key`]: "anthropic-from-ssm",
      [`${PREFIX}/gmail-oauth-client-id`]: "google-id-from-ssm",
      [`${PREFIX}/gmail-oauth-client-secret`]: "google-secret-from-ssm",
      [`${PREFIX}/cron-secret`]: "cron-from-ssm",
    });

    await hydrateSecretsFromSsm({ client, env });

    const requested: string[] = client.send.mock.calls[0][0].input.Names;
    expect(requested).not.toContain(`${PREFIX}/supabase-jwt-secret`);
    expect(env.SUPABASE_JWT_SECRET).toBe("already-here");
    expect(env.ANTHROPIC_API_KEY).toBe("anthropic-from-ssm");
  });
});
