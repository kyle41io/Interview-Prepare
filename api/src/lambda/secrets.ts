import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";

/**
 * Maps each SSM parameter name (relative to SSM_PREFIX) to the exact
 * environment-variable key the application code reads via ConfigService.
 *
 * NOTE: the Gmail OAuth params are named `gmail-oauth-client-*` in SSM but the
 * code (api/src/inbox/google.service.ts) reads GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET — the env keys below are the ones the code expects, not
 * the SSM param names.
 */
export const SSM_TO_ENV: Record<string, string> = {
  "supabase-jwt-secret": "SUPABASE_JWT_SECRET", // api/src/auth/jwt.guard.ts
  "anthropic-api-key": "ANTHROPIC_API_KEY", // api/src/chat/provider.service.ts
  "gmail-oauth-client-id": "GOOGLE_CLIENT_ID", // api/src/inbox/google.service.ts
  "gmail-oauth-client-secret": "GOOGLE_CLIENT_SECRET", // api/src/inbox/google.service.ts
  "cron-secret": "CRON_SECRET", // api/src/inbox/cron.guard.ts
};

interface HydrateDeps {
  client?: SSMClient;
  env?: NodeJS.ProcessEnv;
}

/**
 * Hydrates secret env vars from SSM Parameter Store for the Lambda runtime,
 * without disturbing local dev / Render where secrets already arrive as real
 * environment variables.
 *
 * Gating rules:
 *  - If SSM_PREFIX is unset, do nothing (non-Lambda environments).
 *  - Env wins: any target env var already populated is left untouched and is
 *    never requested from SSM.
 *  - Only the still-missing params are fetched (one GetParameters call,
 *    WithDecryption). On a warm Lambda the first cold invocation populates
 *    process.env, so subsequent calls find everything present and return
 *    without touching SSM.
 */
export async function hydrateSecretsFromSsm(deps: HydrateDeps = {}): Promise<void> {
  const env = deps.env ?? process.env;
  const prefix = env.SSM_PREFIX;

  // Non-Lambda path (local dev / Render): rely entirely on real env vars.
  if (!prefix) return;

  // Env wins — only fetch params whose target env var is not already set.
  const missing = Object.entries(SSM_TO_ENV).filter(([, envKey]) => !env[envKey]);
  if (missing.length === 0) return;

  const client = deps.client ?? new SSMClient({});
  const names = missing.map(([param]) => `${prefix}/${param}`);

  const res = await client.send(
    new GetParametersCommand({ Names: names, WithDecryption: true }),
  );

  const byName = new Map((res.Parameters ?? []).map((p) => [p.Name, p.Value]));
  for (const [param, envKey] of missing) {
    const value = byName.get(`${prefix}/${param}`);
    if (value !== undefined && value !== "") env[envKey] = value;
  }
}
