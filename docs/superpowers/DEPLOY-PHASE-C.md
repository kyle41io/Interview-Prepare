# Phase C deploy guide — Pro content, payments, admin approval

Phase C adds Pro entitlements (paid content unlock), a manual VietQR payment
flow, and an admin-approval Edge Function. None of this is live until you run
the steps below against your Supabase project. Nothing here is automated by
CI — follow it once per environment (and again whenever `0002_pro.sql` or the
seed file changes).

## 0. Prerequisites

- A Supabase project already running Phase A/B (`profiles` table exists).
- Supabase CLI installed locally (`npm i -g supabase` or your platform's
  package). Log in once with `supabase login` — it opens a browser and asks
  for a Personal **Access Token** from
  `https://supabase.com/dashboard/account/tokens`. This access token is only
  for the CLI session; it is not the same as the anon key or service-role key
  used below.

## 1. Run the SQL migration + seed

In the Supabase Dashboard → **SQL Editor**, run these two files **in order**,
pasting each file's full contents into a new query and clicking Run:

1. `supabase/migrations/0002_pro.sql` — creates `entitlements`,
   `payment_requests`, `pro_catalog`, `pro_content` tables + RLS policies.
2. `supabase/seed/pro_content_seed.sql` — seeds 4 Pro deep-dive sections
   (`system-design`, `microservices`, `databases`, `llms`) into
   `pro_catalog` + `pro_content`.

Both files are idempotent (`on conflict ... do update`), so re-running them
after an edit is safe and will not create duplicates.

## 2. Get your auth UID

You'll need your own Supabase Auth user ID (a UUID) for both the admin
allow-list and the Edge Function secret:

1. Dashboard → **Authentication** → **Users**.
2. Find your account (the one you'll use to test/approve payments) and copy
   the value in the **UID** column, e.g. `a1b2c3d4-...`.

## 3. Deploy the Edge Functions + set secrets

From the repo root, with the Supabase CLI linked to your project
(`supabase link --project-ref <your-project-ref>` if not already linked):

```bash
# Phase C: admin-only payment approval
supabase functions deploy approve-payment

# Phase B (still pending from an earlier phase): account deletion
supabase functions deploy delete-account
```

Then set the secrets the `approve-payment` function reads at runtime:

```bash
supabase secrets set \
  SERVICE_ROLE_KEY=<your-service-role-key> \
  ADMIN_UIDS=<your-uuid-from-step-2>
```

- **`SERVICE_ROLE_KEY`**: Dashboard → **Settings** → **API** → `service_role`
  secret key. This bypasses RLS — never put it in client code or commit it;
  it only ever lives as an Edge Function secret.
- **`ADMIN_UIDS`**: comma-separated list of UUIDs allowed to approve
  payments (e.g. `uid1,uid2`). This is the **real** enforcement boundary —
  the function checks the caller's JWT `sub` against this list server-side.

## 4. Add your UID to the client allow-list (UI gating only)

Edit `assets/js/config.js` and add your UUID to `ADMIN_UIDS`:

```js
window.IP_CONFIG = {
  SUPABASE_URL: "...",
  SUPABASE_ANON_KEY: "...",
  ADMIN_UIDS: ["a1b2c3d4-..."],  // your UUID from step 2
};
```

This is **public** and only controls whether the admin approval UI is shown
in the browser — it grants no actual privilege. The real gate is the
`ADMIN_UIDS` Edge Function secret from step 3. Commit this file; it contains
no secrets (same as the anon key already there).

## 5. End-to-end test checklist

Test with two separate Supabase Auth accounts: a normal user and the admin
account whose UID you configured above.

- [ ] **Log in as the normal user.** Open a locked topic (e.g. System
      Design) and confirm the Pro deep-dive section shows a lock/upsell,
      not the content.
- [ ] **Upgrade page → create a payment code.** Confirm a `PRO-XXXXXX` code
      and the VietQR image render, and a `payment_requests` row appears
      (status `pending`) for that user.
- [ ] **Transfer note check.** Confirm the UI instructs the user to put the
      exact code in the bank transfer note/message (`addInfo` in the VietQR
      URL) — this is how the admin matches the payment to the request.
- [ ] **Log in as the admin.** Open the admin/approval view, find the
      pending request by code, and approve it. Confirm this calls the
      `approve-payment` Edge Function (check Function Logs in the Dashboard
      for a 200) and that `payment_requests.status` flips to `approved` and
      an `entitlements` row is created/extended for that user.
- [ ] **Back as the normal user**, refresh/re-init Pro state and confirm the
      previously locked sections now render full content.
- [ ] **Second non-Pro user** (a third account, or the same admin account
      without an entitlement) still sees locks on Pro sections — confirms
      RLS on `pro_content` (`pro content for entitled` policy) actually
      restricts rows and isn't just a client-side check.
- [ ] **Expiry re-locks.** Manually set `entitlements.expires_at` to a past
      timestamp for the test user (SQL Editor) and confirm the app re-locks
      Pro sections without any code change — proves expiry is enforced by
      the `expires_at > now()` check in RLS, not just cached client state.

If any step fails, check Dashboard → **Edge Functions** → `approve-payment`
→ **Logs** first — most failures are a missing/incorrect `SERVICE_ROLE_KEY`
or `ADMIN_UIDS` secret (step 3), not application code.
