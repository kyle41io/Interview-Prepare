# 🎯 Interview Prep · Ôn thi phỏng vấn SWE

A **bilingual (Tiếng Việt / English)** Software-Engineer interview prep app — all the knowledge you need, plus **spaced-repetition flashcards** and **quizzes**, in one offline-friendly static site.

> Ứng dụng ôn phỏng vấn **song ngữ Việt–Anh**: tổng hợp kiến thức, kèm **thẻ ghi nhớ (spaced repetition)** và **trắc nghiệm**, chạy hoàn toàn tĩnh, không cần cài đặt.

**🔴 Live:** served from S3 behind CloudFront. GitHub Pages is retired. The
distribution's hostname is not committed — read it with
`terraform -chdir=infra output -raw cloudfront_url`.

---

## ✨ Features / Tính năng

- **🌐 Bilingual toggle (VI/EN)** — switch language instantly; choice is remembered.
- **📖 Learn mode** — 16 topics, 130+ sections, with tables, code, soundbites and Q&A.
- **📇 Flashcards** — 200+ cards with a built-in **SM-2 spaced-repetition** scheduler (`Again / Hard / Good / Easy`). Progress saved in your browser.
- **✍️ Quiz** — 110+ multiple-choice questions with instant feedback + explanations and a score.
- **🔍 Search** — full-text search across every topic (press `/`).
- **📊 Progress tracking** — mark topics as learned; a dashboard shows how far you are.
- **🎯 Interview-day cheat sheet** — every "soundbite" auto-collected on the home page to skim 5 minutes before you walk in.
- **⌨️ Keyboard shortcuts** — `/` search · `Space` flip card · `1-4` rate card / pick answer.
- **No build step, no dependencies, works offline.**

## 📚 Topics / Chủ đề

| Category | Topics |
|---|---|
| 🧠 Foundations | **DSA** (Big-O, data structures, patterns, UMPIRE strategy) |
| 🏗️ Architecture | Microservices · System Design · Design Patterns & SOLID |
| 🔌 APIs | REST vs gRPC (+ GraphQL) |
| 💾 Data | Databases: SQL vs NoSQL · ACID/BASE · CAP · indexes · transactions |
| 🎨 Frontend | React · Redux · Vue |
| ⚙️ Backend | Django · .NET / C# |
| ☁️ DevOps & Cloud | Docker & Kubernetes · CI/CD · AWS |
| 💼 My Project | **OWork** (Node.js + Odoo + Postgres, multi-tenant, Factur-X/Chorus, CI/CD) |
| 🗣️ Behavioral | STAR method, common questions, what to ask |

## 🚀 Local development / Chạy local

```bash
npm install
npm test                      # every workspace
npm test --workspace @ip/web  # frontend only (node --test, not jest)
cd apps/web && python3 -m http.server 8000
```

The frontend is a build-free static SPA served from S3 behind CloudFront.
Each backend service runs standalone for local development:

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

`npm run boundaries` is the architectural test: it fails if any service
imports another outside the two dated exceptions recorded in
`.dependency-cruiser.js`.

- **AWS deployment:** see [docs/superpowers/DEPLOY-AWS.md](docs/superpowers/DEPLOY-AWS.md).

## 🗂️ Project structure / Cấu trúc

An npm-workspaces monorepo: one deployable unit per directory under
`apps/`, `services/` and `packages/`.

```
Interview-Prepare/
├── apps/web/               # the static SPA — @ip/web
│   ├── index.html          # shell: top bar, sidebar, defines PREP bootstrap, loads data + app
│   ├── assets/
│   │   ├── css/styles.css  # design system (dark theme)
│   │   ├── js/app.js       # core: i18n, router, search, progress, flashcards (SM-2), quiz
│   │   ├── js/config.js    # public config: Supabase URL + anon key, API_URL
│   │   └── data/           # one self-registering file per topic (the knowledge)
│   │       ├── dsa.js      # ← canonical schema example
│   │       ├── microservices.js, system-design.js, design-patterns.js
│   │       └── …           # 30 more, plus tracks.js
│   └── tests/              # node --test, no jest
├── services/              # five independently deployable Lambda services
│   ├── progress/           # ip_progress table
│   ├── billing/            # ip_billing table; entitlement + pro content
│   ├── chat/               # ip_chat table; AI chat + quota
│   ├── content/            # no table — serves learning bundles from private S3
│   └── inbox/              # ip_inbox table; two entrypoints, http + gmail-scan cron
├── packages/              # shared infrastructure, never domain logic
│   ├── auth/               # @ip/auth — JWT guard, @CurrentUser
│   ├── config/             # @ip/config — ConfigModule, SSM hydration, lambda bootstrap
│   ├── dynamo/             # @ip/dynamo — DocumentClient wrapper + key helpers
│   └── testing/            # @ip/testing — shared jest preset, API Gateway event fixture
├── infra/                 # Terraform
├── scripts/esbuild-service.mjs  # one bundler, every service
├── .dependency-cruiser.js # the no-cross-service rule
└── README.md
```

## ➕ Add or edit content / Thêm hoặc sửa nội dung

Every topic is one file in `apps/web/assets/data/` that calls `PREP.register({...})`. Copy the shape of [`apps/web/assets/data/dsa.js`](apps/web/assets/data/dsa.js). Each text field is bilingual: `{ vi: "…", en: "…" }`.

```js
PREP.register({
  id: "my-topic", icon: "🧩", category: "architecture",
  title: { vi: "Tiêu đề", en: "Title" },
  blurb: { vi: "Tóm tắt", en: "Summary" },
  sections: [
    { id: "intro", title: { vi: "…", en: "…" }, blocks: [
      { type: "prose", vi: "…", en: "…" },
      { type: "list", items: [ { vi: "…", en: "…" } ] },
      { type: "table", headers: { vi: [...], en: [...] }, rows: [ { vi: [...], en: [...] } ] },
      { type: "code", code: "…", caption: { vi: "…", en: "…" } },
      { type: "callout", variant: "soundbite", vi: "…", en: "…" }, // variants: soundbite|tip|warning|danger|key
      { type: "chips", items: ["term1", "term2"] },
    ] },
  ],
  flashcards: [ { front: { vi, en }, back: { vi, en } } ],
  quiz: [ { q: { vi, en }, options: [ { vi, en } /*…4*/ ], answer: 0, explain: { vi, en } } ],
});
```

Then add a `<script src="assets/data/my-topic.js"></script>` line in `apps/web/index.html` (before `app.js`). Categories live at the top of `app.js`.

---

*Built to be easy to learn, smart, and memorable. Học để hiểu trade-off và cách giải thích — phỏng vấn chấm tư duy, không chấm định nghĩa. Good luck! 🍀*
