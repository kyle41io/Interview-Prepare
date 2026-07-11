# Deploy guide — Phase F3 (AI chat backend)

Phase F3 adds an AI-backed chat assistant on top of the Phase F1/F2 NestJS
API: an `ip_chat` DynamoDB table for per-user daily usage counters (with
TTL-based auto-expiry), a pluggable AI provider adapter (Anthropic / OpenAI /
mock), and `POST /v1/chat` + `GET /v1/chat/quota` endpoints gated by the
existing Phase F2 entitlement (free vs. Pro). This **extends the same Render
Web Service and AWS account created in Phase F1/F2** — it does not stand up
a new service or a new account. Follow the steps below, in order, once per
environment.

The app keeps working with none of this deployed: `assets/js/config.js`
`API_URL` defaults to `""`, and `IP.chat` (`assets/js/chat.js`) falls back to
the Supabase edge function (`chat`) when the API isn't configured. Nothing
breaks until you deploy the steps below.

**Secrets never go in the repo or in this doc.** Every credential below is a
placeholder (`<like-this>`) — real values live only in your AWS IAM console,
Render's environment variable UI, and your own shell/`.env` (git-ignored).

## 1. Extend the IAM policy for `ip_chat`

1. Open the same IAM user you created in Phase F1 (e.g.
   `interview-prep-api`) — no new user needed.
2. Edit its inline policy (or add a second statement) to also cover the new
   table. Replace `<account-id>` and `<region>` with the same values used
   for `ip_progress`/`ip_billing`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem",
           "dynamodb:UpdateItem",
           "dynamodb:DescribeTable",
           "dynamodb:CreateTable",
           "dynamodb:UpdateTimeToLive"
         ],
         "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/ip_chat"
       }
     ]
   }
   ```

   `ip_chat` has no GSI — `api/src/chat/quota.service.ts` only ever does a
   `GetItem`/`UpdateItem` on a single `pk`+`sk` (the atomic daily-counter
   pattern), so no `Query` action or index-level statement is needed here,
   unlike `ip_billing`'s `status-index`.
3. Create the table (run locally, once, with the Phase F1 access key):

   ```bash
   cd api
   npm install
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_CHAT_TABLE=ip_chat \
   npm run create-chat-table
   ```

   This is idempotent — `create-chat-table.ts` checks with `DescribeTable`
   first and only creates the table if it doesn't already exist. Billing
   mode is pay-per-request, same as `ip_progress`/`ip_billing`. It then
   calls `UpdateTimeToLive` to enable TTL on the table's `ttl` attribute
   (idempotent — a second run logs "TTL enable skipped" and continues; this
   is also expected/harmless against DynamoDB Local, which doesn't enforce
   TTL expiry). Each usage-counter item's `ttl` is set by
   `QuotaService.bump()` to ~2 days out, so daily counters self-expire and
   the table never accumulates unbounded history.

## 2. Render env vars (same Web Service as Phase F1/F2)

Add these to the **existing** F1 Web Service — do not create a new service.
Render dashboard → the service → **Environment**:

- `DDB_CHAT_TABLE` — `ip_chat` (or whatever you created in step 1).
  `api/src/db/dynamo.service.ts` defaults to `ip_chat` if unset, but set it
  explicitly for clarity, same as `DDB_BILLING_TABLE`.
- `AI_PROVIDER` — `anthropic`, `openai`, or leave unset/empty for
  auto-select (`api/src/chat/provider.service.ts`'s `pickProvider()` picks
  whichever key below is present; if both are set and `AI_PROVIDER` is
  empty, Anthropic wins). Set to `mock` only for local/dev testing without
  burning real API calls — never set `mock` in production.
- `ANTHROPIC_API_KEY=<your-key>` **and/or** `OPENAI_API_KEY=<your-key>` —
  only **one** of these is required. If `AI_PROVIDER` names a specific
  provider, that provider's key must be set or every `POST /v1/chat` call
  fails with 503 (see the acceptance checklist).
- Optional: `AI_CHAT_MODEL` — overrides the default model id per provider
  (defaults: `claude-haiku-4-5` for Anthropic, `gpt-4o-mini` for OpenAI, set
  in `provider.service.ts`'s `chatModel()`).

Leave the Phase F1/F2 vars (`AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `DDB_TABLE`, `DDB_BILLING_TABLE`,
`SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`) as they are — F3 reuses the same
AWS credentials and JWT verification, just against a third table.
`DDB_BILLING_TABLE` in particular **must already be set and pointing at a
real `ip_billing` table**: `ChatService.chat()`/`quotaFor()` call
`BillingService.getEntitlement()` to decide the free (3/day) vs. Pro
(50/day) limit, so chat quota depends on Phase F2 being deployed first.

Redeploy the service after saving the new/changed env vars.

## 3. Local dev (DynamoDB Local, no AWS account needed)

```bash
cd api
docker compose -f docker-compose.dev.yml up -d                 # starts DynamoDB Local on :8001
DDB_ENDPOINT=http://localhost:8001 DDB_CHAT_TABLE=ip_chat npm run create-chat-table
DDB_ENDPOINT=http://localhost:8001 DDB_BILLING_TABLE=ip_billing npm run create-billing-table   # if not already done in F2
DDB_ENDPOINT=http://localhost:8001 DDB_CHAT_TABLE=ip_chat DDB_BILLING_TABLE=ip_billing AI_PROVIDER=mock npm run start:dev
```

`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` aren't required against DynamoDB
Local — the SDK accepts any/no credentials for the local endpoint (same as
Phase F1/F2). `AI_PROVIDER=mock` makes `ProviderService.complete()` return a
canned `"[mock] " + <last user message>` reply with no network call, so you
can exercise quota/limit/scope logic without an API key. Swap in
`ANTHROPIC_API_KEY=<your-key>` (or `OPENAI_API_KEY=<your-key>`, dropping
`AI_PROVIDER`) to test against a real model locally.

## 4. Acceptance checklist

- [ ] **Free user hits the daily limit.** A free-tier user (entitlement
      `isPro: false`) can call `POST /v1/chat` 3 times in a day; the 4th
      call returns `429` with body `{ error: "quota", remaining: 0 }`
      (`ChatService.chat()` via `QuotaService.bump()`'s conditional
      `UpdateItem`).
- [ ] **Pro user gets 50/day.** A Pro user (entitlement `isPro: true`, per
      Phase F2) gets 50 chats/day before the same `429`.
- [ ] **Bad body → 400, no quota consumed.** `POST /v1/chat` with an empty
      `messages` array, a missing `messages` field, or a last message that
      isn't `role: "user"` returns `400` with `{ error: "no-message" }`
      **before** `QuotaService.bump()` runs — confirm by calling
      `GET /v1/chat/quota` immediately after and seeing `used` unchanged
      (`ChatService.chat()` validates via `clampMessages()` before touching
      quota).
- [ ] **`GET /v1/chat/quota` reflects usage.** After N successful chats
      today, `GET /v1/chat/quota` returns `{ limit, used: N, remaining:
      limit - N, day: "YYYY-MM-DD" }` matching the caller's tier.
- [ ] **No AI key → 503, app doesn't crash.** With neither
      `ANTHROPIC_API_KEY` nor `OPENAI_API_KEY` set (and `AI_PROVIDER` not
      `mock`), `POST /v1/chat` returns `503` with
      `{ error: "ai-unconfigured" }` (`ProviderService.pickProvider()`
      throws `AiUnavailable`, caught in `ChatService.chat()` and mapped to
      `HttpStatus.SERVICE_UNAVAILABLE`) — the request does **not** 500 or
      crash the process, and quota was already consumed by that point (the
      call counts against the daily limit even though the AI call failed,
      since `bump()` runs before `provider.complete()`).
- [ ] **`API_URL` empty still works.** With `assets/js/config.js` `API_URL`
      reverted to `""` (e.g. a fork/preview that hasn't deployed the API),
      `IP.chat` (`assets/js/chat.js`) still functions by routing `send()`
      through the Supabase edge function (`c.functions.invoke("chat", ...)`)
      instead of `IP.api.post("/v1/chat", ...)`, no console errors —
      confirms Phase F3 is additive, not a hard dependency.
- [ ] **No secrets in the repo.** `git grep -i` for `ANTHROPIC_API_KEY=`,
      `OPENAI_API_KEY=`, `AWS_SECRET`, `AWS_ACCESS_KEY` followed by a real
      value turns up nothing — only placeholders in docs and empty keys in
      `.env.example`. AI keys go in Render's environment UI and your local
      shell only, never in a committed file.
