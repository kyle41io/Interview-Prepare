# Deploy guide — Phase F4 (Gmail inbox backend)

Phase F4 adds a Gmail-backed recruiting inbox on top of the Phase F1-F3
NestJS API: an `ip_inbox` DynamoDB table (notifications + reminders + Gmail
account state), a Google OAuth connect flow, a scan pipeline that classifies
recent Gmail messages (reusing the F3 AI provider adapter) into
notifications/reminders, and a `POST /v1/gmail/scan` endpoint gated by a
shared-secret header instead of a user JWT (it's called by a machine, not a
logged-in user). This **extends the same Render Web Service and AWS account
created in Phase F1-F3** — it does not stand up a new service or a new
account. Follow the steps below, in order, once per environment.

The app keeps working with none of this deployed: `assets/js/config.js`
`API_URL` defaults to `""`, and `IP.gmail` (`assets/js/gmail.js`) falls back
to Supabase for connect/status/list/read/reminder actions when the API isn't
configured. Nothing breaks until you deploy the steps below.

**Secrets never go in the repo or in this doc.** Every credential below is a
placeholder (`<like-this>`) — real values live only in your AWS IAM console,
Render's environment variable UI, Google Cloud Console, your GitHub repo's
Actions secrets, and your own shell/`.env` (git-ignored).

## 1. Extend the IAM policy for `ip_inbox`

1. Open the same IAM user you created in Phase F1 (e.g.
   `interview-prep-api`) — no new user needed.
2. Edit its inline policy (or add a statement) to also cover the new table.
   Replace `<account-id>` and `<region>` with the same values used for
   `ip_progress`/`ip_billing`/`ip_chat`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:Query",
           "dynamodb:GetItem",
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:BatchWriteItem",
           "dynamodb:Scan",
           "dynamodb:DescribeTable",
           "dynamodb:CreateTable",
           "dynamodb:UpdateTimeToLive"
         ],
         "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/ip_inbox"
       }
     ]
   }
   ```

   `ip_inbox` holds notifications, reminders, and per-user Gmail account
   state (refresh token, last-scan cursor, seen-message markers) under one
   `pk`+`sk` scheme (see `api/src/inbox/inbox-keys.ts`), so it needs a wider
   action set than `ip_chat`: `Query`/`Scan` for `InboxService`'s
   list/scan-all reads, `GetItem`/`PutItem`/`UpdateItem` for the connect/
   status/disconnect/mark-read/reminder-status paths (disconnect clears the
   token via `UpdateItem`, not a delete), and
   `BatchWriteItem` for the one-time backfill script
   (`api/scripts/backfill-inbox.ts`). `DescribeTable`/`CreateTable`/
   `UpdateTimeToLive` are for the idempotent table-creation script, same
   pattern as `ip_chat`/`ip_billing`.
3. Create the table (run locally, once, with the Phase F1 access key):

   ```bash
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_INBOX_TABLE=ip_inbox \
   npm --prefix api run create-inbox-table
   ```

   Idempotent, same shape as `create-chat-table`/`create-billing-table` —
   `DescribeTable` first, `CreateTable` (pay-per-request) only if missing,
   then `UpdateTimeToLive` on the table's `ttl` attribute (a second run logs
   "TTL enable skipped" and continues; harmless against DynamoDB Local too).

## 2. Render env vars (same Web Service as Phase F1-F3)

Add these to the **existing** F1 Web Service — do not create a new service.
Render dashboard → the service → **Environment**:

- `GOOGLE_CLIENT_ID=<...>` and `GOOGLE_CLIENT_SECRET=<...>` — the OAuth
  client credentials from Google Cloud Console (step 3 below).
  `api/src/inbox/google.service.ts` reads both to exchange the auth code for
  a refresh token and to refresh access tokens.
- `CRON_SECRET=<random>` — a long random string, shared with the
  `gmail-scan` GitHub Actions workflow (step 4 below). Checked by
  `api/src/inbox/cron.guard.ts` against the `x-cron-secret` request header
  on `POST /v1/gmail/scan` only — every other `/v1/gmail`, `/v1/notifications`,
  `/v1/reminders` route still requires the normal user JWT.
- `DDB_INBOX_TABLE` — `ip_inbox` (or whatever you created in step 1).
  `api/src/db/dynamo.service.ts` defaults to `ip_inbox` if unset, but set it
  explicitly for clarity, same as `DDB_CHAT_TABLE`/`DDB_BILLING_TABLE`.
- Optional: `GMAIL_MODE` — leave **empty/unset in production**. Set to
  `mock` only for testing: `google.service.ts` then returns a canned
  refresh/access token and fake message list instead of calling Google's
  OAuth/Gmail APIs, same pattern as F3's `AI_PROVIDER=mock`.

F4 reuses the F3 AI env as-is for classification (`AI_PROVIDER`,
`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, `AI_CHAT_MODEL`) — no new AI vars.
Leave the Phase F1-F3 vars (`AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `DDB_TABLE`, `DDB_BILLING_TABLE`, `DDB_CHAT_TABLE`,
`SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`) as they are.

Redeploy the service after saving the new/changed env vars.

## 3. Google Cloud Console — OAuth client

1. In the same Google Cloud project used for Supabase's existing Gmail
   scopes (if any), open **APIs & Services → Credentials** and edit (or
   create) the OAuth 2.0 Client ID used for this app.
2. **Authorized redirect URIs**: add the frontend URL where the OAuth
   authorization code is received (the page that calls
   `IP.gmail.connectWithCode(code, redirectUri)`, added in Task 5) — e.g.
   `https://<your-site>/gmail-callback.html` or wherever that callback page
   lives. This exact URI is also the `redirect_uri` sent to
   `POST /v1/gmail/connect`, and Google requires it to match byte-for-byte
   at both authorization and token-exchange time.
3. **Scopes**: `https://www.googleapis.com/auth/gmail.readonly` (read-only —
   the scan pipeline only reads message metadata/snippets, never sends or
   modifies mail).
4. **Consent screen / auth request params**: the authorization request must
   include `access_type=offline` and `prompt=consent`, or Google won't
   return a `refresh_token` — `google.service.ts`'s `exchangeCode()` throws
   `GmailUnavailable("no refresh_token (ensure access_type=offline +
   prompt=consent)")` if it's missing, so this is not optional.
5. Copy the client ID/secret into Render's `GOOGLE_CLIENT_ID`/
   `GOOGLE_CLIENT_SECRET` (step 2).

The frontend's OAuth callback page is expected to extract `code` from the
redirect query string and call `IP.gmail.connectWithCode(code, redirectUri)`,
which `POST`s `{ code, redirect_uri: redirectUri }` to `/v1/gmail/connect`
(`GmailAccountService.connect()` → `google.service.ts`'s `exchangeCode()`).

## 4. GitHub repo secrets + the `gmail-scan` workflow

`.github/workflows/gmail-scan.yml` runs on a schedule
(`7,22,37,52 * * * *` — ~every 15 minutes, offset off the `:00` mark to
avoid GitHub's top-of-hour scheduling congestion) plus `workflow_dispatch`
for manual runs. It POSTs to `/v1/gmail/scan` with the `x-cron-secret`
header, which `ScanService.scanAll()` runs against every connected Gmail
account.

In the repo's **Settings → Secrets and variables → Actions**, add:

- `API_URL` — the Render service's base URL (same value as the frontend's
  `assets/js/config.js` `API_URL`, e.g. `https://interview-prep-api.onrender.com`).
- `CRON_SECRET` — the **same value** set on Render in step 2 above.

Once both secrets exist, the workflow runs automatically ~every 15 minutes;
no further action is needed. Note GitHub's schedule trigger only fires on
the default branch and can be delayed under load — treat 15 minutes as a
target cadence, not a guarantee.

## 5. Backfill once (existing users' notifications/reminders)

If Phase F1-F3 already ran with legacy Supabase-only notifications/reminders
(`public.notifications`, `public.reminders`), migrate them into `ip_inbox`
once, dry-run first:

```bash
SUPABASE_DB_URL=<pooler-connection-string> \
AWS_REGION=<region> AWS_ACCESS_KEY_ID=<your-access-key-id> \
AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
DDB_INBOX_TABLE=ip_inbox \
npm --prefix api run backfill-inbox -- --dry
```

Review the preview output, then run the same command **without** `--dry` to
write for real. `backfill-inbox.ts` is idempotent (`PutRequest` overwrites by
`pk`+`sk`, safe to re-run). It does **not** carry over Gmail refresh tokens
or `gmail_seen` rows — existing connected users need to re-connect Gmail
once after this migration (see step 3's OAuth flow).

## 6. Local dev (DynamoDB Local, no AWS account needed)

```bash
docker compose -f api/docker-compose.dev.yml up -d                          # starts DynamoDB Local on :8001
DDB_ENDPOINT=http://localhost:8001 DDB_INBOX_TABLE=ip_inbox npm --prefix api run create-inbox-table
DDB_ENDPOINT=http://localhost:8001 DDB_INBOX_TABLE=ip_inbox AI_PROVIDER=mock GMAIL_MODE=mock CRON_SECRET=<any> npm --prefix api run start:dev
```

`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` aren't required against DynamoDB
Local, same as Phase F1-F3. `GMAIL_MODE=mock` makes `GoogleService` return a
canned refresh/access token and a fixed list of fake "recruiting-shaped"
messages with no network call to Google, so `connect` → `scan` can be
exercised end-to-end without real Gmail credentials. `AI_PROVIDER=mock`
keeps classification free of real AI calls, same as F3. `CRON_SECRET` can be
any string locally — set the same value in the `x-cron-secret` header when
calling `POST /v1/gmail/scan` by hand (e.g. via `curl`).

## 7. Acceptance checklist

- [ ] **Connect (mock) succeeds.** With `GMAIL_MODE=mock`,
      `POST /v1/gmail/connect` with any `{ code, redirect_uri }` body
      returns success and `GET /v1/gmail/status` reports the account as
      connected (`GmailAccountService.connect()`/`status()`).
- [ ] **Scan produces a notification.** `POST /v1/gmail/scan` with the
      correct `x-cron-secret` header runs `ScanService.scanAll()` across all
      connected accounts; `GET /v1/notifications` for the connected user
      then shows a new entry for each recruiting-shaped mock message.
- [ ] **Reminder created for a message with a date.** A mock message that
      reads as an interview/test invite with a date produces a matching
      entry in `GET /v1/reminders?status=upcoming`.
- [ ] **Re-scan is idempotent.** Calling `POST /v1/gmail/scan` again with no
      new mock messages does not create duplicate notifications/reminders
      (`gmail_seen` markers dedupe by Gmail message id).
- [ ] **Scan without the header is rejected.** `POST /v1/gmail/scan` with no
      `x-cron-secret` header (or the wrong value) returns `403`
      (`CronGuard.canActivate()` throws `ForbiddenException`).
- [ ] **Notification read/read-all work.** `POST /v1/notifications/read`
      with a valid `{ created_at, id }` marks that one notification read;
      `POST /v1/notifications/read-all` marks all of the caller's
      notifications read.
- [ ] **Reminder status updates work.** `PUT /v1/reminders/:id` with
      `{ status }` updates that reminder's status
      (`InboxService.setReminderStatus()`).
- [ ] **Refresh token never reaches the client.** `GET /v1/gmail/status`'s
      response never includes the stored Gmail refresh token — only
      connection state (e.g. connected email, last-scan time).
- [ ] **`API_URL` empty still works.** With `assets/js/config.js` `API_URL`
      reverted to `""` (e.g. a fork/preview that hasn't deployed the API),
      `IP.gmail` (`assets/js/gmail.js`) still functions for
      connect/status/list/read/reminder actions via its Supabase fallback
      path, no console errors — confirms Phase F4 is additive, not a hard
      dependency.
- [ ] **No secrets in the repo.** `git grep -i` for `GOOGLE_CLIENT_SECRET=`,
      `CRON_SECRET=`, `AWS_SECRET`, `AWS_ACCESS_KEY` followed by a real
      value turns up nothing — only placeholders in docs and empty keys in
      `.env.example`. Google/AWS credentials and the cron secret go in
      Render's environment UI, Google Cloud Console, GitHub Actions
      secrets, and your local shell only, never in a committed file.
