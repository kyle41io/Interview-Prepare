# Pro Gating + Path-Scoped Topics — Design

**Date:** 2026-07-23
**Status:** Approved (design)
**Area:** Frontend (vanilla, no-build) + track data. No new backend/edge-function or migration work.

## Goal

Give the app a real Free/Pro boundary and scope the learn experience to the
user's chosen path. Today Pro is cosmetic: every topic is visible and openable,
AI Chat and the Gmail suite work for everyone, and the home page lists all 31
topics regardless of the selected path.

## Decisions (locked)

1. **Access model — Hybrid.** Entitlement is server-sourced (`IP.pro.isPro()`
   from the `entitlements` table / billing API). The UI gates off that value.
   Operations that already have server enforcement keep it (chat quota edge fn,
   Gmail edge functions, Pro deep-dive `pro_content` sections behind RLS).
2. **Pro topics (8):** `microservices`, `system-design`, `db-internals`,
   `docker-k8s`, `aws`, `llms`, `dl-nlp`, `elasticsearch`. All others stay free.
3. **Topic visibility — path-scoped (A).** Home + sidebar show only the current
   path's topics. No "browse all". "Change path" opens the role/level picker. A
   user with no track (new, or after clearing) lands on the picker.
4. **Two new level-less role paths (B):** Frontend Engineer, Backend Engineer —
   to home the 6 topics that belong to no path today.

## Known limitation (accepted)

The 8 Pro topics' **base** content ships inside the static JS bundle
(`assets/data/*.js`), so a determined user can read it via view-source. For this
portfolio/CV app the client-side gate is acceptable; the genuinely protected
assets — Pro deep-dive `pro_content` sections, AI Chat, and the Gmail suite —
remain server-enforced. This is a deliberate trade-off, not an oversight.

## The Pro tier flag

Topic Pro status is data-driven. Each Pro topic's data file carries
`tier: "pro"` (only `microservices` has it today). A single helper is the source
of truth so the whole app agrees:

```js
// PREP.isProTopic(id) -> boolean. A topic is Pro iff its registered data has tier === "pro".
```

`PREP` already registers topics; add `isProTopic` alongside the existing
registry accessors (see `assets/data/*` bootstrap and `PREP.registerTrack`).
The 8 topics above get `tier: "pro"` in their data files.

## Gate behaviors (non-Pro user)

### G1 — AI Chat
- The "AI Chat" nav button shows a `PRO` badge.
- Opening Chat renders a **locked panel**: short explainer + "Upgrade to Pro"
  CTA (routes to the existing upgrade view), no input bar, no history fetch.
- Pro users: unchanged.

### G2 — Pro topics
- In the sidebar + home cards, Pro topics render with a lock icon + `PRO` badge.
- Clicking a Pro topic as non-Pro renders a **paywall screen** in the content
  area (title, "This topic is Pro", upgrade CTA) instead of `renderTopic`.
- **Flashcards & Quiz pools exclude Pro topics for non-Pro users** — a locked
  topic must not be studiable sideways. Pro users see them.
- Pro users: topics open normally; existing `pro_content` deep sections keep
  their own server gate.

### G3 — Gmail suite
- Hide the notification **bell** (topbar) entirely for non-Pro.
- Hide the **Reminders** view and any nav/entry to it for non-Pro; guard the
  `reminders` mode so a stale saved view / hash can't reach it.
- In **Settings**, replace the functional Gmail card with a small **locked
  "Pro feature" upsell card** (visible for discoverability, not operational).
- Pro users: unchanged (bell, Reminders, Gmail connect all functional).

## Path scoping (A)

- **Home** (`renderHome`): render only categories/topics contained in the
  current path (`currentTrack()` → `IP.tracks.resolveItems`). Remove the
  all-topics grouping fallback.
- **Sidebar** (`renderSidebar`): list only the current path's topics. Remove the
  "All topics →" entry and the `browseAll` toggle/state.
- **Change path:** the existing `changeTrack` control clears/re-opens the
  onboarding picker (`IP.onboarding`), which already writes `track` to the store
  and re-renders.
- **No track:** `IP.onboarding.shouldShow()` already returns true when no track
  is stored; the picker is shown. Ensure a brand-new (and signed-out→in) user
  reaches it.
- Remove `State.browseAll` and its handlers; keep `State.track` and
  `currentTrack()` as-is.

## Two new paths (B)

Add two level-less roles to `PREP.roles` and two tracks in `assets/data/tracks.js`:

```js
// roles: add after ai-engineer
{ id: "frontend", icon: "fa-solid fa-window-maximize",
  title: { vi: "Frontend Engineer", en: "Frontend Engineer" }, levels: [] },
{ id: "backend",  icon: "fa-solid fa-layer-group",
  title: { vi: "Backend Engineer",  en: "Backend Engineer"  }, levels: [] },
```

```js
// tracks
{ id: "frontend", role: "frontend", level: "",
  title: { vi: "Frontend Engineer", en: "Frontend Engineer" },
  blurb: { vi: "Giao diện hiện đại: framework, TypeScript, bảo mật FE và UX.",
           en: "Modern UI: frameworks, TypeScript, FE security and UX." },
  items: ["dsa", "react", "redux", "vue", "typescript", "fe-security",
          "skeleton-loading", "rest-grpc", "system-design", "behavioral"] },
{ id: "backend", role: "backend", level: "",
  title: { vi: "Backend Engineer", en: "Backend Engineer" },
  blurb: { vi: "Dịch vụ phía server: framework, dữ liệu, tìm kiếm và hệ thống.",
           en: "Server-side services: frameworks, data, search and systems." },
  items: ["dsa", "oop", "databases", "rest-grpc", "nodejs", "dotnet", "django",
          "ecommerce", "elasticsearch", "db-internals", "system-design",
          "behavioral"] },
```

This homes all 6 previously-stranded topics: `vue`, `skeleton-loading` →
Frontend; `dotnet`, `django`, `ecommerce`, `elasticsearch` → Backend.

## Data flow

`IP.pro.isPro()` is the single gate signal, already refreshed on login via
`IP.pro.init()` and observable via `IP.pro.onChange`. Every gate (G1–G3, G2 pool
exclusion) reads it at render time. When entitlement changes (purchase approved
→ `onChange`), a re-render unlocks everything without reload.

`PREP.isProTopic(id)` is the single topic-tier signal, used by the sidebar, home
cards, topic open guard, and the flashcard/quiz pool filters.

## Testing

Node `node:test` unit tests (the repo's existing harness), pure logic only:
- `PREP.isProTopic` returns true for the 8, false otherwise.
- Pool-filter helper drops Pro topics when `isPro=false`, keeps them when true.
- New tracks resolve (`IP.tracks.resolveItems`) to the expected item lists; the
  6 orphan topics are each reachable from at least one track.
- `resolveItems` still drops unknown ids and preserves order (regression).

DOM/gate wiring is verified with the existing Playwright self-audit (memory:
`reference-playwright-audit`) — stub `isPro` both ways and confirm the bell,
Reminders, Chat panel, and a Pro topic card lock/unlock accordingly.

## Out of scope

- Moving Pro topic base content server-side (see limitation).
- New payment/billing flows — the existing VietQR upgrade path is reused as the
  CTA target.
- New backend endpoints, edge functions, or DB migrations.
