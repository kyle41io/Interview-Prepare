# ⚙️ SETUP — one checklist to make Interview-Prep work

> Fill the blanks (`______`) as you collect each value, tick the boxes as you finish each step.
> **⚠️ Do NOT commit this file once you fill in secrets.** Keep filled values on your machine only,
> or delete them after setup. Secrets belong in Supabase/Render env, never in git.
> Exact per-feature commands live in `docs/DEPLOY-ALL.md` and `docs/superpowers/DEPLOY-PHASE-*.md`.

---

## 0. Pick ONE backend

- [ ] **Option A — Supabase** — the architecture the site uses today (`config.js` `API_URL` is empty). No AWS/Render. **Do this to get working now.** → Sections 1–5.
- [ ] **Option B — NestJS API + DynamoDB** — the Phase F backend (progress/billing/chat/inbox). Needs AWS + Render. → Section 7 (do later).

Everything below is **Option A** unless marked Option B.

---

## 1. Values to collect (the shopping list)

| Need | Where to get it | Goes into | Your value |
|------|-----------------|-----------|-----------|
| Supabase **Access Token** | supabase.com → Account → Access Tokens → Generate | `supabase login` (your machine) | `______` |
| **SERVICE_ROLE_KEY** | Dashboard → Settings → API → `service_role` | Supabase secret | `______` |
| **AI key** (ONE of the two) | console.anthropic.com **or** platform.openai.com | Supabase secret | `______` |
| **CRON_SECRET** | generate: `openssl rand -hex 24` | Supabase secret | `______` |
| **Google Client ID** | Google Cloud Console → Credentials | Supabase Auth + secret | `______` |
| **Google Client Secret** | Google Cloud Console → Credentials | Supabase Auth + secret | `______` |

**Already set (public, committed in `assets/js/config.js` — nothing to do):**
- Supabase project ref: `tbihofgqjrwfgjtfjyrg`
- Supabase URL + publishable/anon key ✅
- Admin UUID: `2c2cc2cf-9ced-4642-bdda-dcf7182b3f3a` ✅
- VietQR receiving account (hardcoded): Techcombank `970407` / `19036335023019` / `NGUYEN VAN KIEN`, 49.000đ / 30 days — [ ] confirm this account is yours

---

## 2. CLI (once)

- [ ] Install the Supabase CLI
- [ ] `supabase login`  (uses the Access Token)
- [ ] `supabase link --project-ref tbihofgqjrwfgjtfjyrg`

---

## 3. Tier 1 — Login + cloud sync  *(minimum to "work properly")*

- [ ] Run DB migrations: `supabase db push`  (applies `supabase/migrations/0001…0004`)
- [ ] Enable Google login: Dashboard → Authentication → Providers → **Google** → paste Client ID + Secret
- [ ] Copy the callback URL Supabase shows → add it in Google Console → Credentials → **Authorized redirect URIs**
- [ ] Dashboard → Authentication → URL Configuration → add your GitHub Pages site URL

✅ After this: users can log in with Google and their progress syncs across devices.

---

## 4. Tier 2–4 — Feature layers (optional, add what you want)

### Tier 2 — Pro + payments
- [ ] `supabase secrets set SERVICE_ROLE_KEY=______ ADMIN_UIDS=2c2cc2cf-9ced-4642-bdda-dcf7182b3f3a`
- [ ] `supabase functions deploy approve-payment delete-account`
- [ ] Seed Pro content: run `supabase/seed/pro_content_seed.sql` in the SQL Editor
- [ ] Test: buy → admin approves → Pro unlocks

### Tier 3 — AI chat
- [ ] `supabase secrets set ANTHROPIC_API_KEY=______`  *(or `OPENAI_API_KEY=______`)*
- [ ] *(optional)* `supabase secrets set AI_PROVIDER=______ AI_CHAT_MODEL=______`
- [ ] `supabase functions deploy chat`

### Tier 4 — Gmail intelligence
- [ ] Google Console: enable **Gmail API**; add scope `gmail.readonly`; consent screen = Testing; add yourself as a **test user**
- [ ] `supabase secrets set GOOGLE_CLIENT_ID=______ GOOGLE_CLIENT_SECRET=______ CRON_SECRET=______`
- [ ] `supabase functions deploy gmail-connect gmail-status gmail-scan`
- [ ] Set up the 15-min scan: edit `supabase/seed/cron_gmail.sql` (project ref `tbihofgqjrwfgjtfjyrg` + your CRON_SECRET), run it in the SQL Editor

---

## 5. Security checklist
- [ ] `SERVICE_ROLE_KEY`, AI key, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET` are set as **Supabase secrets only** — never in the repo
- [ ] `config.js` contains only public values (it already does)
- [ ] This `SETUP.md` has no real secrets committed to git

---

## 6. Reference (exact commands)
- `docs/DEPLOY-ALL.md` — consolidated Supabase deploy
- `docs/superpowers/DEPLOY-PHASE-C.md` (Pro) · `-D.md` (chat) · `-E.md` (Gmail)
- `docs/PENDING-SETUP.md` — original per-phase checklist

---

## 7. Option B — activate the Phase F backend (NestJS API + DynamoDB)  *(later)*

Only if you want to switch off Supabase onto the new API. Full steps: `docs/superpowers/DEPLOY-PHASE-F1.md … F4.md`.

**Collect:**
| Need | Where | Your value |
|------|-------|-----------|
| AWS Access Key ID + Secret (IAM user, least-privilege DynamoDB) | AWS Console → IAM | `______` / `______` |
| AWS region | (e.g. `ap-southeast-1`) | `______` |
| Render account | render.com | — |
| SUPABASE_JWT_SECRET (API verifies the login token) | Supabase → Settings → API → JWT Secret | `______` |
| SUPABASE_DB_URL (pooler) — for one-time backfills | Supabase → Settings → Database → Connection string | `______` |

**Steps (per the F1–F4 runbooks):**
- [ ] Create the 4 DynamoDB tables: `npm --prefix api run create-table` · `create-billing-table` · `create-chat-table` · `create-inbox-table`
- [ ] Deploy `api/` to Render (root dir `api/`); set env: `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, `DDB_TABLE`/`DDB_BILLING_TABLE`/`DDB_CHAT_TABLE`/`DDB_INBOX_TABLE`, `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS=https://kyle41io.github.io`, `ADMIN_UIDS`, AI keys + `AI_PROVIDER`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `CRON_SECRET`
- [ ] Set `assets/js/config.js` → `API_URL` = your Render URL, then push (Pages redeploys)
- [ ] Run the backfills (`--dry` first): `backfill` (progress) · `backfill-billing` · `backfill-inbox`
- [ ] GitHub repo secrets (Settings → Secrets → Actions): `API_URL` + `CRON_SECRET` (drives `.github/workflows/gmail-scan.yml`)
- [ ] Point the Google OAuth callback / frontend connect flow at `IP.gmail.connectWithCode(...)`
