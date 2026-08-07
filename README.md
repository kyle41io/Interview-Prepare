# Interview Prep · Ôn thi phỏng vấn SWE

A bilingual (Tiếng Việt / English) interview-preparation platform for software
engineers: structured study tracks, spaced-repetition flashcards, quizzes,
progress that follows you across devices, an AI coach, and a recruiting-inbox
scanner that turns interview emails into reminders.

> Nền tảng ôn phỏng vấn **song ngữ Việt–Anh**: lộ trình học theo vị trí, thẻ ghi
> nhớ lặp lại ngắt quãng, trắc nghiệm, đồng bộ tiến độ giữa các thiết bị, trợ lý
> AI và bộ quét email tuyển dụng.

A build-free static SPA on S3 + CloudFront, talking to five NestJS
microservices that run as six AWS Lambda functions behind one API Gateway.
Everything is provisioned with Terraform and deployed per service from GitHub
Actions.

**Live:** the CloudFront hostname is not committed — read it with
`terraform -chdir=infra/platform output -raw cloudfront_url`.

---

## Features

**Study**

- **Bilingual throughout (VI/EN)** — every string, including the content itself,
  is a `{ vi, en }` pair. Switching language is instant and remembered.
- **Study tracks** — seven of them (Software Engineer at fresher / junior /
  senior, plus DevOps, AI Engineer, Frontend and Backend). Picking one at
  onboarding scopes the whole app: the sidebar, the dashboard, the flashcard
  queue and the cheat sheet all show that track's topics and nothing else.
- **Learn mode** — 31 topics, 257 sections of prose, tables, code, callouts and
  interactive diagrams.
- **Flashcards** — 378 cards scheduled by a built-in SM-2 spaced-repetition
  algorithm (`Again / Hard / Good / Easy`).
- **Quiz** — 262 multiple-choice questions with instant feedback, explanations
  and a score.
- **Interview-day cheat sheet** — every "soundbite" callout in your track,
  collected onto one page to skim before you walk in.
- **Search** — full-text across every topic you can see (press `/`).
- **Progress, bookmarks and streaks** — mark topics learned, watch a dashboard
  fill up, keep a daily streak.
- **Keyboard shortcuts** — `/` search · `Space` flip card · `1`–`4` rate a card
  or pick an answer · `Esc` close.
- **Light / dark theme**, following the system setting by default.

**Account**

- **Sign in** with email + password or Google, through Supabase Auth. Two demo
  accounts (standard and Pro) are one click away on the sign-in screen.
- **Cross-device sync** — progress, flashcard schedules and bookmarks merge
  rather than overwrite, so studying on a phone and a laptop never loses a card.
- **Pro tier** — eight deeper topics (AWS, system design, microservices,
  Docker & Kubernetes, database internals, Elasticsearch, LLMs, deep learning
  and NLP) plus higher AI limits. Payment is submitted, then approved by an
  admin; entitlement flips live without a reload.
- **AI coach** — ask questions in context. Quotas are enforced server-side:
  3 messages a day on free, 50 on Pro, and 30 a day / 5 per session on the
  shared demo accounts.

**Recruiting inbox** (Pro)

- **Gmail scan** every 15 minutes on a schedule, finding recruiting mail.
- **Four independent noise filters** — a regex prefilter that runs *before* any
  AI call, the model's own verdict, per-message dedupe markers that expire on
  their own, and typed outcomes so a quiet run is diagnosable rather than
  ambiguous.
- **Notifications** with an unread badge, mark-read / mark-all-read, and a
  delete-read that clears read rows while keeping unread ones.
- **Interview reminders** on a month calendar, exportable as an `.ics` file any
  calendar app can import. Times are stored as floating wall-clock values, so a
  3pm interview stays 3pm no matter which timezone the browser is in.

## Architecture

```
Browser ── CloudFront ── S3            static SPA (no build step)
   │
   └───── API Gateway (HTTP API) ───── six Lambda functions
                                        ├── progress   → ip_progress
                                        ├── billing    → ip_billing
                                        ├── chat       → ip_chat
                                        ├── content    → private S3 bucket
                                        ├── inbox http → ip_inbox
                                        └── inbox scan → ip_inbox   (EventBridge, every 15 min)
```

Five services, six functions, six Terraform stacks, nine CI workflows. The
rules that keep them apart:

- **One datastore per service.** No service reads another's table. A service may
  have several entrypoints, but exactly one place it stores things.
- **Services own their routes.** The platform stack creates the API; each
  service stack attaches its own integration, routes and invoke permission. A
  service can be deployed, or removed, without touching the others.
- **SSM Parameter Store is the config plane.** Stacks discover each other by
  reading parameters, not by reading each other's Terraform state.
- **The boundary is enforced in CI.** `npm run boundaries` runs
  dependency-cruiser and fails on any cross-service import outside the two
  dated, shrinking exceptions recorded in `.dependency-cruiser.js`.
- **Least privilege per function.** Each Lambda gets its own IAM role scoped to
  its own table or bucket.

Learning content is not shipped to the browser as static files. It lives in a
private S3 bucket and is served through `GET /v1/content/bundle`, which returns
a five-minute presigned URL to a signed-in user, or `{ unchanged: true }` when
the client's ETag still matches.

## Local development

```bash
npm install
npm run build:deps            # required first — see below
npm test                      # every workspace
npm test --workspace @ip/web  # frontend only (node --test, not jest)
cd apps/web && python3 -m http.server 8000
```

`build:deps` compiles the three shared packages plus billing and chat, the two
services that publish a barrel. Every `@ip/*` import resolves through the
workspace symlink to `dist/index.d.ts`, so on a fresh checkout a consumer's
`jest` or `nest build` cannot type-check until its producers have emitted
declarations. Run it after `npm install` and after changing a producer.

Each backend service runs standalone:

| Service | Port | Command |
|---|---|---|
| progress | 3001 | `npm run start:dev --workspace @ip/progress-service` |
| billing | 3002 | `npm run start:dev --workspace @ip/billing-service` |
| chat | 3003 | `npm run start:dev --workspace @ip/chat-service` |
| content | 3004 | `npm run start:dev --workspace @ip/content-service` |
| inbox | 3005 | `npm run start:dev --workspace @ip/inbox-service` |

`docker-compose.dev.yml` starts a DynamoDB Local on port 8001 for the four
services that own a table; point `DDB_ENDPOINT` at it. Copy `.env.example` to
`.env` first — one `.env` at the repo root serves every service.

Deployment is per service, from GitHub Actions, using OIDC (no stored AWS
keys) and path filters, behind a gated production environment.

## Project structure

An npm-workspaces monorepo: one deployable unit per directory under `apps/`,
`services/` and `packages/`.

```
Interview-Prepare/
├── apps/web/                # the static SPA — @ip/web
│   ├── index.html           # shell: top bar, sidebar, PREP bootstrap, script order
│   ├── assets/
│   │   ├── css/styles.css   # design system, light + dark
│   │   ├── js/app.js        # core: i18n, router, search, progress, flashcards, quiz
│   │   ├── js/content.js    # fetches the content bundle through the API
│   │   ├── js/sync.js       # cross-device merge
│   │   ├── js/config.js     # public config: Supabase URL + anon key, API_URL
│   │   └── data/tracks.js   # curriculum metadata — the only content file the page loads
│   └── tests/               # node --test, no jest
├── services/                # five independently deployable Lambda services
│   ├── progress/            # ip_progress table
│   ├── billing/             # ip_billing table; entitlement, payments, Pro content
│   ├── chat/                # ip_chat table; AI chat + quota
│   ├── content/             # no table — serves learning bundles from private S3
│   └── inbox/               # ip_inbox table; two entrypoints, http + gmail-scan cron
├── packages/                # shared infrastructure, never domain logic
│   ├── auth/                # @ip/auth — JWT guard, @CurrentUser
│   ├── config/              # @ip/config — ConfigModule, SSM hydration, lambda bootstrap
│   ├── dynamo/              # @ip/dynamo — DocumentClient wrapper + key helpers
│   └── testing/             # @ip/testing — shared jest preset, API Gateway fixture
├── infra/
│   ├── platform/            # shared stack: API Gateway, CloudFront, S3, SSM, deploy role
│   └── modules/             # reused Lambda-service module
├── scripts/esbuild-service.mjs   # one bundler, every service
├── .dependency-cruiser.js   # the no-cross-service rule
└── .github/workflows/       # ci + one deploy workflow per service
```

## Content authoring

Learning content is **not** in this repository. The authoring sources live in a
git-ignored `content/` directory and are pushed to the private S3 bucket:

```bash
npm -w @ip/content run content:push
```

Each topic is one file that calls `PREP.register({...})`. Every text field is
bilingual — `{ vi: "…", en: "…" }`:

```js
PREP.register({
  id: "my-topic", icon: "fa-solid fa-puzzle-piece", category: "architecture",
  title: { vi: "Tiêu đề", en: "Title" },
  blurb: { vi: "Tóm tắt", en: "Summary" },
  sections: [
    { id: "intro", title: { vi: "…", en: "…" }, blocks: [
      { type: "prose", vi: "…", en: "…" },
      { type: "list", items: [ { vi: "…", en: "…" } ] },
      { type: "table", headers: { vi: [...], en: [...] }, rows: [ { vi: [...], en: [...] } ] },
      { type: "code", code: "…", caption: { vi: "…", en: "…" } },
      { type: "callout", variant: "soundbite", vi: "…", en: "…" }, // soundbite|tip|warning|danger|key
      { type: "chips", items: ["term1", "term2"] },
    ] },
  ],
  flashcards: [ { front: { vi, en }, back: { vi, en } } ],
  quiz: [ { q: { vi, en }, options: [ { vi, en } /*…4*/ ], answer: 0, explain: { vi, en } } ],
});
```

Add `tier: "pro"` to put a topic behind the Pro tier. Which track a topic
belongs to is decided in `apps/web/assets/data/tracks.js`; categories are
defined at the top of `app.js`. No `<script>` tag is needed — the bundle is
loaded at runtime, after sign-in.

---

*Học để hiểu trade-off và cách giải thích — phỏng vấn chấm tư duy, không chấm
định nghĩa. Study for the trade-offs and how to explain them: interviews test
reasoning, not definitions.*
