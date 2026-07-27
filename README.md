# 🎯 Interview Prep · Ôn thi phỏng vấn SWE

A **bilingual (Tiếng Việt / English)** Software-Engineer interview prep app — all the knowledge you need, plus **spaced-repetition flashcards** and **quizzes**, in one offline-friendly static site.

> Ứng dụng ôn phỏng vấn **song ngữ Việt–Anh**: tổng hợp kiến thức, kèm **thẻ ghi nhớ (spaced repetition)** và **trắc nghiệm**, chạy hoàn toàn tĩnh, không cần cài đặt.

**🔴 Live:** https://kyle41io.github.io/Interview-Prepare/ *(GitHub Pages — see setup below)*

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

## 🚀 Run locally / Chạy local

It's a static site — just open `index.html`. For the flashcard/quiz JS to load via `file://` in all browsers, a tiny local server is safest:

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000

# or Node
npx serve .
```

## 🌍 Deploy on GitHub Pages

1. Repo → **Settings → Pages**.
2. **Source:** *Deploy from a branch* → Branch: **`main`** → Folder: **`/ (root)`** → **Save**.
3. Wait ~1 min → the site is live at `https://kyle41io.github.io/Interview-Prepare/`.

A `.nojekyll` file is included so the `assets/` folder is served correctly.

- **AWS deployment:** see [docs/superpowers/DEPLOY-AWS.md](docs/superpowers/DEPLOY-AWS.md).

## 🗂️ Project structure / Cấu trúc

```
Interview-Prepare/
├── index.html              # shell: top bar, sidebar, defines PREP bootstrap, loads data + app
├── .nojekyll               # tell GitHub Pages to serve assets/ as-is
├── assets/
│   ├── css/styles.css      # design system (dark theme)
│   ├── js/app.js           # core: i18n, router, search, progress, flashcards (SM-2), quiz
│   └── data/               # one self-registering file per topic (the knowledge)
│       ├── dsa.js          # ← canonical schema example
│       ├── microservices.js, system-design.js, design-patterns.js
│       ├── rest-grpc.js, databases.js
│       ├── react.js, redux.js, vue.js
│       ├── django.js, dotnet.js
│       ├── docker-k8s.js, cicd.js, aws.js
│       ├── owork.js        # your project's interview talking points
│       └── behavioral.js
└── README.md
```

## ➕ Add or edit content / Thêm hoặc sửa nội dung

Every topic is one file in `assets/data/` that calls `PREP.register({...})`. Copy the shape of [`assets/data/dsa.js`](assets/data/dsa.js). Each text field is bilingual: `{ vi: "…", en: "…" }`.

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

Then add a `<script src="assets/data/my-topic.js"></script>` line in `index.html` (before `app.js`). Categories live at the top of `app.js`.

---

*Built to be easy to learn, smart, and memorable. Học để hiểu trade-off và cách giải thích — phỏng vấn chấm tư duy, không chấm định nghĩa. Good luck! 🍀*
