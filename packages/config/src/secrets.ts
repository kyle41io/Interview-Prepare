import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";

/**
 * Maps each SSM parameter name (relative to SSM_PREFIX) to the exact
 * environment-variable key the application code reads via ConfigService.
 *
 * NOTE: the Gmail OAuth params are named `gmail-oauth-client-*` in SSM but the
 * code (services/inbox/src/inbox/google.service.ts) reads GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET — the env keys below are the ones the code expects, not
 * the SSM param names.
 *
 * This map is shared by every service, so each Lambda hydrates all six secrets
 * whether it reads them or not. That is deliberate for P1 — it reproduces the
 * monolith's single environment exactly — but it means the IAM grant is
 * per-service-role-reads-everything. Splitting the map per service is a
 * least-privilege change, and IAM changes are out of scope for a phase whose
 * gate is zero behaviour change.
 */
export const SSM_TO_ENV: Record<string, string> = {
  "supabase-jwt-secret": "SUPABASE_JWT_SECRET", // packages/auth/src/jwt.guard.ts
  "openai-api-key": "OPENAI_API_KEY", // services/chat/src/chat/provider.service.ts (active provider)
  "anthropic-api-key": "ANTHROPIC_API_KEY", // services/chat/src/chat/provider.service.ts (kept ready as fallback)
  "gmail-oauth-client-id": "GOOGLE_CLIENT_ID", // services/inbox/src/inbox/google.service.ts
  "gmail-oauth-client-secret": "GOOGLE_CLIENT_SECRET", // services/inbox/src/inbox/google.service.ts
  "cron-secret": "CRON_SECRET", // services/inbox/src/inbox/cron.guard.ts
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
