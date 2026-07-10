# Deploy guide — Phase F1 (NestJS API + DynamoDB progress backend)

Phase F1 moves the progress domain (topics learned, flashcard SRS state, quiz
best scores, bookmarks, streak, settings) off the Supabase `user_state` JSONB
blob and onto a dedicated NestJS API (`api/`) backed by a DynamoDB
single-table (`ip_progress`). Supabase keeps Auth (login) and the legacy
Phase B/C/D/E tables — this only replaces the *progress* storage path.

The app keeps working with none of this deployed: `assets/js/config.js`
`API_URL` defaults to `""`, and the frontend adapter (`assets/js/sync.js`)
falls back to syncing progress against Supabase (or local-only if Supabase
isn't configured either). Nothing breaks until you intentionally flip
`API_URL` in step 3. Follow the steps below, in order, once per environment.

**Secrets never go in the repo or in this doc.** Every credential below is a
placeholder (`<like-this>`) — real values live only in your AWS IAM console,
in Render's environment variable UI, and in your own shell/`.env` (which is
git-ignored). `assets/js/config.js` only ever holds `API_URL`, a plain HTTPS
URL — not a secret.

## 1. AWS account, IAM user, and the DynamoDB table

1. If you don't already have one, create an AWS account (or use an existing
   one) and note which region you'll deploy to (e.g. `us-east-1`).
2. **IAM** → **Users** → create a new user for this app (e.g.
   `interview-prep-api`), access type: **programmatic access** (access
   key/secret, no console login needed).
3. Attach a **least-privilege** inline policy scoped to just the one table —
   do not use `AmazonDynamoDBFullAccess`. Create an inline policy with this
   JSON (replace `<account-id>` and `<region>`; table name matches
   `DDB_TABLE` below, default `ip_progress`):

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
           "dynamodb:DeleteItem",
           "dynamodb:BatchWriteItem",
           "dynamodb:DescribeTable",
           "dynamodb:CreateTable"
         ],
         "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/ip_progress"
       }
     ]
   }
   ```

   `CreateTable`/`DescribeTable` are only needed once (step below and any
   future re-run of the create-table script); the API itself at runtime only
   uses `Query`/`GetItem`/`PutItem`/`DeleteItem`/`BatchWriteItem`.
4. **Security credentials** tab → **Create access key** → copy the **Access
   key ID** and **Secret access key** once (AWS only shows the secret at
   creation time). Store them somewhere safe (password manager) — you'll
   paste them into Render in step 2 and use them locally for the backfill in
   step 4. Never commit them.
5. Create the table (run locally, once, with the credentials from step 4):

   ```bash
   cd api
   npm install
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_TABLE=ip_progress \
   npm run create-table
   ```

   This is idempotent — `create-table.ts` checks with `DescribeTable` first
   and only creates the table if it doesn't already exist. Billing mode is
   pay-per-request, so there's no capacity to size.

## 2. Render Web Service

1. In Render, **New** → **Web Service** → connect this GitHub repo.
2. **Root Directory**: `api` (the service only builds/runs the NestJS app,
   not the static frontend — `render.yaml` in `api/` already encodes this if
   you use Render's Blueprint flow instead of the manual wizard).
3. Build command: `npm install && npm run build`. Start command:
   `node dist/main.js`.
4. Environment variables (Render dashboard → the service → **Environment**;
   never in a file that gets committed):
   - `AWS_REGION` — same region as step 1.
   - `AWS_ACCESS_KEY_ID` — the access key from step 1.4.
   - `AWS_SECRET_ACCESS_KEY` — the secret from step 1.4.
   - `DDB_TABLE` — `ip_progress` (or whatever you created in step 1.5).
   - `SUPABASE_JWT_SECRET` — Supabase Dashboard → **Settings** → **API** →
     **JWT Secret**. The API verifies the frontend's Supabase-issued JWT with
     this secret (`api/src/auth/jwt.guard.ts`) — it does not talk to
     Supabase over the network, so this is the only Supabase value the API
     needs.
   - `ALLOWED_ORIGINS` — `https://kyle41io.github.io` (add
     `http://localhost:8000` too if you want local frontend dev to hit the
     deployed API instead of a local one; comma-separated, no spaces).
   - Leave `DDB_ENDPOINT` **unset** in Render — that variable only exists to
     point the API at DynamoDB Local for local dev (step 5). Unset means the
     AWS SDK talks to real DynamoDB in `AWS_REGION`.
5. Deploy. Once live, confirm `GET https://<your-service>.onrender.com/health`
   returns `200`.

## 3. Point the frontend at the API

Edit `assets/js/config.js` and set `API_URL` to the Render service URL, then
commit and push (GitHub Pages redeploys the static site automatically):

```js
window.IP_CONFIG = {
  SUPABASE_URL: "...",
  SUPABASE_ANON_KEY: "...",
  ADMIN_UIDS: [...],
  API_URL: "https://<your-service>.onrender.com",
};
```

This is a plain public URL, not a secret — safe to commit (same as the
Supabase URL/anon key already in that file).

## 4. Run the one-time backfill

Existing users have their progress sitting in Supabase Postgres
`public.user_state.state` (JSONB). `api/scripts/backfill.ts` reads every row
from there and writes the equivalent items into DynamoDB using the same
key/shape conventions as the live API (`api/src/db/keys.ts`,
`api/src/progress/merge.ts`), so backfilled users see their existing
progress the first time they load with `API_URL` set.

The script is idempotent (`BatchWriteCommand` with `PutRequest` overwrites by
`pk`+`sk`), so it's safe to re-run if it fails partway through or if you want
to re-sync after fixing a bad row.

1. Get the Supabase pooler connection string: Dashboard → **Settings** →
   **Database** → **Connection pooling** → copy the connection string
   (`postgres://postgres.<ref>:<password>@<pooler-host>:6543/postgres` or
   similar — the exact host/port depend on your project/region).
2. **Dry run first** — prints per-user item counts and a total, writes
   nothing:

   ```bash
   cd api
   SUPABASE_DB_URL=<pooler-connection-string> \
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_TABLE=ip_progress \
   npm run backfill -- --dry
   ```

   Check the output: one line per user (`user <uuid>: N item(s)`), then a
   summary line with total users/items/skipped. Any row that fails to parse
   is logged and skipped, not fatal to the run.
3. If the dry run looks right, run it for real (same command, drop `--dry`):

   ```bash
   SUPABASE_DB_URL=<pooler-connection-string> \
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_TABLE=ip_progress \
   npm run backfill
   ```
4. Re-running later (e.g. new signups accumulated more `user_state` rows
   before you got around to running this) is safe — it will just overwrite
   the same items with the same values for already-migrated users.

## 5. Local dev (DynamoDB Local, no AWS account needed)

```bash
cd api
docker compose -f docker-compose.dev.yml up -d       # starts DynamoDB Local on :8001
DDB_ENDPOINT=http://localhost:8001 npm run create-table
DDB_ENDPOINT=http://localhost:8001 npm run start:dev  # API on :3000, talking to local Dynamo
```

Point the frontend's `API_URL` at `http://localhost:3000` locally (don't
commit that change — it's for your own testing only) or run the frontend
against a deployed Render instance instead. `AWS_ACCESS_KEY_ID`/
`AWS_SECRET_ACCESS_KEY` aren't required against DynamoDB Local — the SDK
accepts any/no credentials for the local endpoint.

## 6. Acceptance checklist

- [ ] **Health check.** `GET /health` on the Render URL returns `200`.
- [ ] **Fresh login, new progress.** Log in as a normal (non-backfilled)
      user, mark a topic learned, review a flashcard, take a quiz, add a
      bookmark, and let the streak update. Reload the page — all of it
      persists (confirms the API round-trip, not just local state).
- [ ] **Second device / browser.** Log in as the same user in a different
      browser (or incognito) — the progress from the step above shows up
      there too (confirms DynamoDB is the shared source of truth, not
      per-browser localStorage).
- [ ] **Backfilled user keeps their history.** Log in as a user who existed
      *before* this deploy (i.e. whose progress lived only in
      `user_state` pre-backfill) and confirm their previously-tracked
      topics/cards/quiz scores/bookmarks/streak are present after the
      backfill ran.
- [ ] **User isolation.** Log in as user A and user B (two separate
      accounts) and confirm A never sees B's progress. `api/test/app.e2e-spec.ts`
      covers this automatically when `DDB_ENDPOINT` is set (see step 5) —
      run `DDB_ENDPOINT=http://localhost:8001 npm run test:e2e` for the
      automated check, and spot-check manually in the browser too.
- [ ] **`API_URL` empty still works.** With `assets/js/config.js` `API_URL`
      reverted to `""` (e.g. on a fork/preview that hasn't deployed the API
      yet), the app still runs local-only (or Supabase-only) with no console
      errors — confirms Phase F1 is additive, not a hard dependency.
- [ ] **No secrets in the repo.** `git grep -i` for `AWS_SECRET`,
      `AWS_ACCESS_KEY`, `SUPABASE_DB_URL=postgres`, `SUPABASE_JWT_SECRET=`
      followed by a real value turns up nothing — only placeholders in docs
      and empty keys in `.env.example`.
