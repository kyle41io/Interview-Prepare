# Deploy guide — Phase F2 (billing / Pro backend)

Phase F2 adds a paid "Pro" tier on top of the Phase F1 NestJS API: a
`ip_billing` DynamoDB table for entitlements and payment requests, a manual
VietQR-based payment flow (`/v1/billing/*`), an admin approve/reject console,
and a gated Pro content endpoint (`/v1/pro/content/:id`). This **extends the
same Render Web Service and AWS account created in Phase F1** — it does not
stand up a new service or a new account. Follow the steps below, in order,
once per environment.

The app keeps working with none of this deployed: `assets/js/config.js`
`API_URL` defaults to `""`, and `IP.pro` (`assets/js/pro.js`) falls back to
Supabase-only behavior when the API isn't configured. Nothing breaks until
you deploy the steps below.

**Secrets never go in the repo or in this doc.** Every credential below is a
placeholder (`<like-this>`) — real values live only in your AWS IAM console,
Render's environment variable UI, and your own shell/`.env` (git-ignored).
The VietQR bank/account/name values are public-facing (they're what a payer
sees on the QR code) but still configured as env vars, not hardcoded — shown
here as placeholders for consistency.

## 1. Extend the IAM policy for `ip_billing`

1. Open the same IAM user you created in Phase F1 (e.g.
   `interview-prep-api`) — no new user needed.
2. Edit its inline policy (or add a second statement) to also cover the new
   table **and** its GSI. Replace `<account-id>` and `<region>` with the same
   values used for `ip_progress`:

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
           "dynamodb:DescribeTable",
           "dynamodb:CreateTable"
         ],
         "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/ip_billing"
       },
       {
         "Effect": "Allow",
         "Action": ["dynamodb:Query"],
         "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/ip_billing/index/status-index"
       }
     ]
   }
   ```

   The index-level statement is required separately — DynamoDB treats
   `Query` against a GSI as a distinct resource ARN from the base table, even
   though it's the same physical table. `api/src/billing/billing.service.ts`
   queries `status-index` (via `listPayments`) to list pending/submitted
   payments for the admin console.
3. Create the table (run locally, once, with the Phase F1 access key):

   ```bash
   cd api
   npm install
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_BILLING_TABLE=ip_billing \
   npm run create-billing-table
   ```

   This is idempotent — `create-billing-table.ts` checks with
   `DescribeTable` first and only creates the table (with the `status-index`
   GSI) if it doesn't already exist. Billing mode is pay-per-request, same as
   `ip_progress`.

## 2. Render env vars (same Web Service as Phase F1)

Add these to the **existing** F1 Web Service — do not create a new service.
Render dashboard → the service → **Environment**:

- `ADMIN_UIDS` — comma-separated Supabase user UUID(s) allowed to approve or
  reject payments (`api/src/billing/admin.guard.ts` reads this and gates the
  `admin/payments`, `admin/payment/approve`, `admin/payment/reject` routes).
  Find your own UUID in Supabase Dashboard → **Authentication** → **Users**.
  Example: `ADMIN_UIDS=<your-supabase-user-uuid>`.
- `DDB_BILLING_TABLE` — `ip_billing` (or whatever you created in step 1).
- Optional (defaults already exist in code, only set to override):
  - `VIETQR_BANK` — bank BIN code (default `970407`).
  - `VIETQR_ACCT` — receiving account number (default is a placeholder in
    code; set your real account).
  - `VIETQR_NAME` — account holder name shown on the QR (default is a
    placeholder in code; set your real name).
  - `PRICE_VND` — price per plan period in VND (default `49000`).
  - `PLAN_DAYS` — days added to the entitlement per approved payment
    (default `30`).

Leave the Phase F1 vars (`AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `DDB_TABLE`, `SUPABASE_JWT_SECRET`,
`ALLOWED_ORIGINS`) as they are — F2 reuses the same AWS credentials and JWT
verification, just against a second table.

Redeploy the service after saving the new/changed env vars.

## 3. Run the one-time backfill

Existing users may already have entitlement/payment rows sitting in the
legacy Supabase Postgres tables (`public.entitlements`,
`public.payment_requests`, from the pre-F2 manual-approval flow).
`api/scripts/backfill-billing.ts` reads both tables and writes matching
items into `ip_billing` using the same key scheme as the live API
(`api/src/db/keys.ts`, `api/src/billing/billing-keys.ts`), so backfilled
users keep their existing Pro status and payment history.

The script is idempotent (`BatchWriteCommand` with `PutRequest` overwrites by
`pk`+`sk`), so it's safe to re-run.

1. Get the Supabase pooler connection string: Dashboard → **Settings** →
   **Database** → **Connection pooling** → copy the connection string.
2. **Dry run first** — prints counts, writes nothing:

   ```bash
   cd api
   SUPABASE_DB_URL=<pooler-connection-string> \
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_BILLING_TABLE=ip_billing \
   npm run backfill-billing -- --dry
   ```

   Check the output line: `entitlements=<ok>/<total> payments=<ok>/<total>
   items=<n>`. Any row that fails to parse is logged and skipped, not fatal.
3. If the dry run looks right, run it for real (drop `--dry`):

   ```bash
   SUPABASE_DB_URL=<pooler-connection-string> \
   AWS_REGION=<region> \
   AWS_ACCESS_KEY_ID=<your-access-key-id> \
   AWS_SECRET_ACCESS_KEY=<your-secret-access-key> \
   DDB_BILLING_TABLE=ip_billing \
   npm run backfill-billing
   ```
4. Re-running later is safe — it overwrites the same items with the same
   values for already-migrated users.

## 4. Local dev (DynamoDB Local, no AWS account needed)

```bash
cd api
docker compose -f docker-compose.dev.yml up -d                 # starts DynamoDB Local on :8001
DDB_ENDPOINT=http://localhost:8001 DDB_BILLING_TABLE=ip_billing npm run create-billing-table
DDB_ENDPOINT=http://localhost:8001 DDB_BILLING_TABLE=ip_billing ADMIN_UIDS=<your-test-user-uuid> npm run start:dev
```

`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` aren't required against DynamoDB
Local — the SDK accepts any/no credentials for the local endpoint (same as
Phase F1). Set `ADMIN_UIDS` to your own local test user's Supabase UUID so
you can exercise the admin approve/reject flow locally.

## 5. Acceptance checklist

- [ ] **Default entitlement.** A user who has never paid sees
      `GET /v1/billing/entitlement` → `{ tier: "free", status: "none",
      expires_at: null, isPro: false }`.
- [ ] **Buy flow renders a QR.** `POST /v1/billing/payment` (via the IP.pro
      "Buy" button) returns a VietQR URL and the frontend renders it as a
      scannable code.
- [ ] **Submit → admin approve → Pro across devices.** User taps "I've
      paid" (`POST /v1/billing/payment/:code/submit`), an admin
      (`ADMIN_UIDS` account) approves it via the admin console
      (`POST /v1/billing/admin/payment/approve`), and `isPro` flips to
      `true` in `GET /v1/billing/entitlement` — confirmed by reloading on a
      **second device/browser**, not just the one that submitted (proves
      DynamoDB is the shared source of truth).
- [ ] **Pro content gating.** A free user calling
      `GET /v1/pro/content/:id` gets `403`; a Pro user gets `200` with the
      content body.
- [ ] **Admin gating.** A non-admin (UID not in `ADMIN_UIDS`) calling any
      `admin/*` billing route gets `403`.
- [ ] **Double-approve is idempotent.** Approving the same payment `code`
      twice does not extend the entitlement's `expires_at` a second time —
      the second call returns `{ ok: true }` without re-running
      `PLAN_DAYS` extension (`BillingService.claim` returns `"already"` on a
      re-approve of an already-`approved` payment).
- [ ] **`API_URL` empty still works.** With `assets/js/config.js` `API_URL`
      reverted to `""` (e.g. a fork/preview that hasn't deployed the API),
      `IP.pro` still functions via Supabase-only fallback, no console errors
      — confirms Phase F2 is additive, not a hard dependency.
- [ ] **No secrets in the repo.** `git grep -i` for `AWS_SECRET`,
      `AWS_ACCESS_KEY`, `SUPABASE_DB_URL=postgres`, `SUPABASE_JWT_SECRET=`,
      `ADMIN_UIDS=` followed by a real value turns up nothing — only
      placeholders in docs and empty keys in `.env.example`. Secrets go in
      Render's environment UI and your local shell only, never in a
      committed file.
