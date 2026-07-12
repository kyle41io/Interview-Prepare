# Phase F4 — Gmail intelligence / inbox → NestJS API + DynamoDB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Gmail intelligence (connect via server-side OAuth code exchange, a cron-triggered inbox scan that AI-classifies recruiting emails into notifications + reminders, and the notification/reminder read APIs) from Supabase Edge Functions/pg_cron into the NestJS API, with all inbox data on a new DynamoDB table.

**Architecture:** Reuse F1's `api/` workspace, `JwtAuthGuard`, `DynamoService`, and F3's `ProviderService` (extended with `classify`). A new `InboxModule` exposes gmail connect/status/disconnect, notifications (list/read), reminders (list/setStatus), and a `CRON_SECRET`-gated `POST /v1/gmail/scan` that an external GitHub Actions cron triggers. Frontend `IP.gmail` routes through the API when `API_URL` is set, else the Supabase edge functions; the realtime bell becomes poll-on-open.

**Tech Stack:** NestJS 10, AWS SDK v3, global `fetch` (Google OAuth + Gmail REST + AI provider) — NO new npm deps. Jest + supertest (API), `node --test` (frontend), DynamoDB Local (dev).

## Global Constraints

- **Node 18** (v18.20.8). NestJS **10.x** (NOT 11). AWS SDK v3 `^3.x`. NO Prisma. **No new npm deps** — Google/Gmail/provider calls use global `fetch`; `pg` stays a devDependency for the backfill only.
- **`api/` is a separate workspace**; the static frontend at repo root stays no-build vanilla JS.
- **No secrets in the repo.** New env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `GMAIL_MODE` (empty|`mock`), `DDB_INBOX_TABLE` (default `ip_inbox`). Reuse `SUPABASE_JWT_SECRET`, AWS creds, `DDB_ENDPOINT`, `ALLOWED_ORIGINS`, and F3's AI env (`AI_PROVIDER`/keys/`AI_CHAT_MODEL`) for `classify`. The Google refresh token, Google client secret, `CRON_SECRET`, and AI keys live ONLY in env — never the repo, never returned to the client.
- **Auth**: JWT routes = `/v1/gmail/status|connect|disconnect`, `/v1/notifications*`, `/v1/reminders*` (identity from verified `sub`, keyed `USER#<sub>`). `POST /v1/gmail/scan` is NOT JWT — gated by `CronGuard` (header `x-cron-secret` === `CRON_SECRET`, else 403). `/health` open.
- **DTO/body lesson (F1/F2/F3)**: bodies with arrays/nested objects → type the `@Body()` as a plain **interface** (erases to `Object`, so the whitelist ValidationPipe passes it through). Never a decorated class for such bodies.
- **Mock modes for testability**: `AI_PROVIDER=mock` (classify returns canned) + `GMAIL_MODE=mock` (Google/Gmail calls return canned messages, no network) let scan + e2e run without real OAuth/keys. **Never Fable.**
- **Idempotent scan**: a `SEEN#<msgId>` item (GetItem check + PutItem with TTL) prevents re-processing a message — a re-scan must NOT duplicate notifications.
- **DB separation**: inbox data lives in its OWN `ip_inbox` table (NOT `ip_progress`/`ip_billing`/`ip_chat`). Don't touch F1-F3 tables/code except adding `inboxTable` to `DynamoService`, `classify` to `ProviderService`, and importing what's needed. Refresh-token backfill optional (users can re-connect).
- **Frontend no-regression**: `API_URL` empty ⇒ `IP.gmail` uses the Supabase edge functions exactly as today.

---

## File Structure

**Create (API):** `api/src/inbox/inbox-keys.ts`(+spec), `inbox.service.ts`(+spec), `notifications.controller.ts`, `reminders.controller.ts`, `gmail-account.service.ts`(+spec), `google.service.ts`, `scan.service.ts`(+spec), `gmail.controller.ts`, `cron.guard.ts`(+spec), `classify.ts`, `inbox.module.ts`. `api/scripts/create-inbox-table.ts`, `api/scripts/backfill-inbox.ts`. `.github/workflows/gmail-scan.yml`. `docs/superpowers/DEPLOY-PHASE-F4.md`.
**Modify (API):** `api/src/db/dynamo.service.ts` (add `inboxTable`), `api/src/chat/provider.service.ts` (add `classify`), `api/src/app.module.ts` (register InboxModule), `api/test/app.e2e-spec.ts` (inbox e2e), `api/package.json` (scripts).
**Modify (frontend):** `assets/js/gmail.js` (route through IP.api; drop realtime), `tests/gmail.test.js` (create).

---

## Task 1: `ip_inbox` table + inbox-keys + create-inbox-table (TTL)

**Files:** Create `api/src/inbox/inbox-keys.ts`, `inbox-keys.spec.ts`, `api/scripts/create-inbox-table.ts`. Modify `api/src/db/dynamo.service.ts`, `api/package.json`.

**Interfaces:**
- Produces `inbox-keys`: `GMAIL_ACCOUNT_SK="GMAIL_ACCOUNT"`; `notifSk(createdAt,id)→"NOTIF#<createdAt>#<id>"`; `reminderSk(id)→"REMINDER#<id>"`; `seenSk(msgId)→"SEEN#<msgId>"`; `NOTIF_PREFIX="NOTIF#"`, `REMINDER_PREFIX="REMINDER#"`; `parseNotifKey(sk)→{createdAt,id}`. Reuses `userPk` from `../db/keys`.
- Produces `DynamoService.inboxTable` (readonly, `DDB_INBOX_TABLE` default `ip_inbox`).
- Table `ip_inbox`: PK `pk`(S), SK `sk`(S), PAY_PER_REQUEST, TTL on `ttl`.

- [ ] **Step 1: DynamoService.inboxTable** — Edit `api/src/db/dynamo.service.ts`: add `readonly inboxTable: string;` and `this.inboxTable = config.get<string>("DDB_INBOX_TABLE") || "ip_inbox";` (keep `table`/`billingTable`/`chatTable`/`doc`).
- [ ] **Step 2: failing test `api/src/inbox/inbox-keys.spec.ts`**
```ts
import { GMAIL_ACCOUNT_SK, notifSk, reminderSk, seenSk, NOTIF_PREFIX, parseNotifKey } from "./inbox-keys";
import { userPk } from "../db/keys";
describe("inbox-keys", () => {
  it("builds keys", () => {
    expect(userPk("u1")).toBe("USER#u1");
    expect(GMAIL_ACCOUNT_SK).toBe("GMAIL_ACCOUNT");
    expect(notifSk("2026-07-10T00:00:00.000Z", "n1")).toBe("NOTIF#2026-07-10T00:00:00.000Z#n1");
    expect(reminderSk("r1")).toBe("REMINDER#r1");
    expect(seenSk("m1")).toBe("SEEN#m1");
    expect(NOTIF_PREFIX).toBe("NOTIF#");
  });
  it("parseNotifKey splits createdAt + id (id may be a uuid, createdAt has colons)", () => {
    expect(parseNotifKey("NOTIF#2026-07-10T00:00:00.000Z#n1")).toEqual({ createdAt: "2026-07-10T00:00:00.000Z", id: "n1" });
  });
});
```
Run: `npm --prefix api test -- inbox-keys` → FAIL.
- [ ] **Step 3: `api/src/inbox/inbox-keys.ts`**
```ts
export const GMAIL_ACCOUNT_SK = "GMAIL_ACCOUNT";
export const NOTIF_PREFIX = "NOTIF#";
export const REMINDER_PREFIX = "REMINDER#";
export const notifSk = (createdAt: string, id: string) => `${NOTIF_PREFIX}${createdAt}#${id}`;
export const reminderSk = (id: string) => `${REMINDER_PREFIX}${id}`;
export const seenSk = (msgId: string) => `SEEN#${msgId}`;
// SK = NOTIF#<createdAt>#<id>; createdAt is an ISO string containing ':' but NOT '#',
// so split on the FIRST and LAST '#'.
export function parseNotifKey(sk: string): { createdAt: string; id: string } {
  const body = sk.slice(NOTIF_PREFIX.length);
  const i = body.lastIndexOf("#");
  return { createdAt: body.slice(0, i), id: body.slice(i + 1) };
}
```
Run: `npm --prefix api test -- inbox-keys` → PASS.
- [ ] **Step 4: `api/scripts/create-inbox-table.ts`** — copy `api/scripts/create-chat-table.ts` verbatim but with `const table = process.env.DDB_INBOX_TABLE || "ip_inbox";` (same idempotent CreateTable pk HASH/sk RANGE PAY_PER_REQUEST + `UpdateTimeToLiveCommand` on `ttl` in a try/catch). Reproduce the whole script with that one change.
- [ ] **Step 5: package.json** — add script `"create-inbox-table": "ts-node scripts/create-inbox-table.ts"`.
- [ ] **Step 6: verify** — `npm --prefix api test -- inbox-keys` PASS; `npm --prefix api run build` succeeds. No DynamoDB calls.
- [ ] **Step 7: Commit** — `git add api/ && git commit -m "feat(api): inbox DynamoDB table + keys + create-inbox-table (TTL)"`

---

## Task 2: notifications + reminders module + endpoints

**Files:** Create `api/src/inbox/inbox.service.ts`, `inbox.service.spec.ts`, `notifications.controller.ts`, `reminders.controller.ts`, `inbox.module.ts`. Modify `api/src/app.module.ts`.

**Interfaces:**
- Consumes `DynamoService` (`doc`, `inboxTable`), `inbox-keys`, `userPk`, `JwtAuthGuard`+`@CurrentUser()`, lib-dynamodb `QueryCommand`/`UpdateCommand`/`PutCommand`.
- Produces (used by scan T4 + frontend): `InboxService.listNotifications(userId, limit=30)`, `markRead(userId, createdAt, id)`, `markAllRead(userId)`, `addNotification(userId, {type,title,body,source})`, `listReminders(userId, status="upcoming")`, `setReminderStatus(userId, id, status)`, `addReminder(userId, {kind,title,company,due_at,deadline_at,source})`.

- [ ] **Step 1: `api/src/inbox/inbox.service.ts`**
```ts
import { Injectable } from "@nestjs/common";
import { QueryCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { notifSk, reminderSk, NOTIF_PREFIX, REMINDER_PREFIX, parseNotifKey } from "./inbox-keys";
function rid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
@Injectable()
export class InboxService {
  constructor(private readonly dyn: DynamoService) {}
  private t() { return this.dyn.inboxTable; }

  async listNotifications(userId: string, limit = 30) {
    const r = await this.dyn.doc.send(new QueryCommand({
      TableName: this.t(),
      KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)",
      ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": NOTIF_PREFIX },
      ScanIndexForward: false, Limit: limit,
    }));
    return (r.Items || []).map((it: any) => ({ id: it.id, type: it.type, title: it.title, body: it.body, read: !!it.read, source: it.source, created_at: it.created_at }));
  }
  async addNotification(userId: string, n: { type: string; title: string; body: string; source: string }) {
    const created_at = new Date().toISOString();
    const id = rid();
    await this.dyn.doc.send(new PutCommand({ TableName: this.t(), Item: { pk: userPk(userId), sk: notifSk(created_at, id), id, type: n.type, title: n.title, body: n.body, read: false, source: n.source, created_at } }));
    return { id, created_at };
  }
  async markRead(userId: string, createdAt: string, id: string) {
    await this.dyn.doc.send(new UpdateCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: notifSk(createdAt, id) }, UpdateExpression: "SET #r = :t", ExpressionAttributeNames: { "#r": "read" }, ExpressionAttributeValues: { ":t": true } }));
    return { ok: true };
  }
  async markAllRead(userId: string) {
    const r = await this.dyn.doc.send(new QueryCommand({ TableName: this.t(), KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)", ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": NOTIF_PREFIX } }));
    let n = 0;
    for (const it of (r.Items || []) as any[]) {
      if (it.read) continue;
      const { createdAt, id } = parseNotifKey(it.sk);
      await this.markRead(userId, createdAt, id); n++;
    }
    return { ok: true, updated: n };
  }
  async listReminders(userId: string, status = "upcoming") {
    const r = await this.dyn.doc.send(new QueryCommand({ TableName: this.t(), KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)", ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": REMINDER_PREFIX } }));
    return ((r.Items || []) as any[])
      .filter((it) => !status || it.status === status)
      .map((it) => ({ id: it.id, kind: it.kind, title: it.title, company: it.company, due_at: it.due_at, deadline_at: it.deadline_at, status: it.status, source: it.source }))
      .sort((a, b) => String(a.due_at || "").localeCompare(String(b.due_at || "")));
  }
  async addReminder(userId: string, r: { kind: string; title: string; company?: string; due_at?: string; deadline_at?: string; source: string }) {
    const id = rid();
    await this.dyn.doc.send(new PutCommand({ TableName: this.t(), Item: { pk: userPk(userId), sk: reminderSk(id), id, kind: r.kind, title: r.title, company: r.company ?? null, due_at: r.due_at ?? null, deadline_at: r.deadline_at ?? null, status: "upcoming", source: r.source, created_at: new Date().toISOString() } }));
    return { id };
  }
  async setReminderStatus(userId: string, id: string, status: string) {
    await this.dyn.doc.send(new UpdateCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: reminderSk(id) }, UpdateExpression: "SET #s = :s", ExpressionAttributeNames: { "#s": "status" }, ExpressionAttributeValues: { ":s": status } }));
    return { ok: true };
  }
}
```
- [ ] **Step 2: failing test `api/src/inbox/inbox.service.spec.ts`** (mock `DynamoService.doc.send`)
```ts
import { InboxService } from "./inbox.service";
const svc = (send: jest.Mock) => new InboxService({ doc: { send }, inboxTable: "ip_inbox" } as any);
describe("InboxService", () => {
  it("listNotifications queries newest-first with limit and maps items", async () => {
    const send = jest.fn().mockResolvedValue({ Items: [{ id: "n1", type: "interview", title: "t", body: "b", read: false, source: "m1", created_at: "2026-07-10T00:00:00Z", sk: "NOTIF#2026-07-10T00:00:00Z#n1" }] });
    const out = await svc(send).listNotifications("u1", 30);
    const arg = send.mock.calls[0][0].input;
    expect(arg.ScanIndexForward).toBe(false); expect(arg.Limit).toBe(30);
    expect(arg.ExpressionAttributeValues[":pfx"]).toBe("NOTIF#");
    expect(out[0]).toEqual({ id: "n1", type: "interview", title: "t", body: "b", read: false, source: "m1", created_at: "2026-07-10T00:00:00Z" });
  });
  it("markAllRead updates only unread items", async () => {
    const send = jest.fn()
      .mockResolvedValueOnce({ Items: [{ sk: "NOTIF#2026-07-10T00:00:00Z#a", read: false }, { sk: "NOTIF#2026-07-09T00:00:00Z#b", read: true }] })
      .mockResolvedValue({});
    const out = await svc(send).markAllRead("u1");
    expect(out.updated).toBe(1); // only 'a'
    expect(send).toHaveBeenCalledTimes(2); // 1 query + 1 update
  });
  it("listReminders filters by status and sorts by due_at", async () => {
    const send = jest.fn().mockResolvedValue({ Items: [
      { id: "r2", status: "upcoming", due_at: "2026-08-02", kind: "interview", title: "B" },
      { id: "r1", status: "upcoming", due_at: "2026-08-01", kind: "test", title: "A" },
      { id: "r3", status: "done", due_at: "2026-07-01", kind: "test", title: "C" },
    ] });
    const out = await svc(send).listReminders("u1", "upcoming");
    expect(out.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});
```
Run: `npm --prefix api test -- inbox.service` → after implementing Step 1, PASS. (Write this test, run FAIL, then Step 1 makes it green — reorder as TDD: test first, then service.)
- [ ] **Step 3: `notifications.controller.ts` + `reminders.controller.ts`**
```ts
// notifications.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { InboxService } from "./inbox.service";
interface ReadBody { created_at?: string; id?: string; }
@Controller("v1/notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: InboxService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query("limit") limit?: string) { return this.svc.listNotifications(u.id, limit ? Number(limit) : 30); }
  @Post("read") read(@CurrentUser() u: AuthUser, @Body() b: ReadBody) { return this.svc.markRead(u.id, b.created_at || "", b.id || ""); }
  @Post("read-all") readAll(@CurrentUser() u: AuthUser) { return this.svc.markAllRead(u.id); }
}
```
```ts
// reminders.controller.ts
import { Body, Controller, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { InboxService } from "./inbox.service";
interface StatusBody { status?: string; }
@Controller("v1/reminders")
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly svc: InboxService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query("status") status?: string) { return this.svc.listReminders(u.id, status || "upcoming"); }
  @Put(":id") setStatus(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() b: StatusBody) { return this.svc.setReminderStatus(u.id, id, b.status || "upcoming"); }
}
```
- [ ] **Step 4: `inbox.module.ts`** — providers `[InboxService]`, controllers `[NotificationsController, RemindersController]`, `exports: [InboxService]` (scan T4 + gmail T3 reuse it). Register `InboxModule` in `app.module.ts` (keep existing imports).
```ts
import { Module } from "@nestjs/common";
import { InboxService } from "./inbox.service";
import { NotificationsController } from "./notifications.controller";
import { RemindersController } from "./reminders.controller";
@Module({ providers: [InboxService], controllers: [NotificationsController, RemindersController], exports: [InboxService] })
export class InboxModule {}
```
- [ ] **Step 5: verify** — `npm --prefix api test` green (inbox.service + prior); `npm --prefix api run build` succeeds.
- [ ] **Step 6: Commit** — `git add api/ && git commit -m "feat(api): notifications + reminders module + endpoints (+Jest)"`

---

## Task 3: gmail account connect/status/disconnect (OAuth code exchange)

**Files:** Create `api/src/inbox/google.service.ts`, `api/src/inbox/gmail-account.service.ts`, `gmail-account.service.spec.ts`, `api/src/inbox/gmail.controller.ts`. Modify `api/src/inbox/inbox.module.ts`.

**Interfaces:**
- Consumes `ConfigService`, `DynamoService` (`doc`, `inboxTable`), `userPk`, `GMAIL_ACCOUNT_SK`, `JwtAuthGuard`+`@CurrentUser()`, global `fetch`.
- Produces: `GoogleService.exchangeCode(code, redirectUri)→{refresh_token, email}`. `GmailAccountService.connect(userId, code, redirectUri)`, `status(userId)→{connected,email,last_scan}`, `disconnect(userId)`, `getAccount(userId)` + `listActiveAccounts()` + `setLastScan(userId)` (used by scan T4). `GmailController`: `POST /v1/gmail/connect`, `GET /v1/gmail/status`, `POST /v1/gmail/disconnect` (JWT).

- [ ] **Step 1: `api/src/inbox/google.service.ts`** (code exchange + token refresh + Gmail list/get; `GMAIL_MODE=mock` short-circuits the Gmail data calls — the mock messages live here so Task 4's scan can use them)
```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
export class GmailUnavailable extends Error {}
@Injectable()
export class GoogleService {
  constructor(private readonly config: ConfigService) {}
  private cid() { return this.config.get<string>("GOOGLE_CLIENT_ID"); }
  private secret() { return this.config.get<string>("GOOGLE_CLIENT_SECRET"); }
  private mock() { return (this.config.get<string>("GMAIL_MODE") || "").toLowerCase() === "mock"; }

  async exchangeCode(code: string, redirectUri: string): Promise<{ refresh_token: string; email: string | null }> {
    if (this.mock()) return { refresh_token: "mock-refresh", email: "mock@example.com" };
    const body = new URLSearchParams({ client_id: this.cid()!, client_secret: this.secret()!, code, redirect_uri: redirectUri, grant_type: "authorization_code" });
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (!r.ok) throw new GmailUnavailable(`token exchange ${r.status} ${await r.text()}`);
    const j: any = await r.json();
    if (!j.refresh_token) throw new GmailUnavailable("no refresh_token (ensure access_type=offline + prompt=consent)");
    let email: string | null = null;
    try { const parts = String(j.id_token || "").split("."); if (parts[1]) email = JSON.parse(Buffer.from(parts[1], "base64").toString()).email || null; } catch { /* ignore */ }
    return { refresh_token: j.refresh_token, email };
  }
  async refreshAccessToken(refresh: string): Promise<string | null> {
    if (this.mock()) return "mock-access";
    const body = new URLSearchParams({ client_id: this.cid()!, client_secret: this.secret()!, refresh_token: refresh, grant_type: "refresh_token" });
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (!r.ok) return null;
    return (await r.json()).access_token || null;
  }
  // Returns [{ id }]; mock yields a canned recruiting message.
  async listRecent(access: string): Promise<Array<{ id: string }>> {
    if (this.mock()) return [{ id: "mock-msg-1" }];
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + encodeURIComponent("newer_than:2d in:inbox") + "&maxResults=20", { headers: { Authorization: "Bearer " + access } });
    if (!r.ok) return [];
    return ((await r.json()).messages || []).map((m: any) => ({ id: m.id }));
  }
  // Returns { subject, from, snippet }; mock yields a canned interview email.
  async getMeta(access: string, id: string): Promise<{ subject: string; from: string; snippet: string } | null> {
    if (this.mock()) return { subject: "Interview invite — Acme", from: "recruiter@acme.com", snippet: "We'd like to schedule your interview." };
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + id + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date", { headers: { Authorization: "Bearer " + access } });
    if (!r.ok) return null;
    const msg: any = await r.json();
    const h = (name: string) => (msg.payload?.headers || []).find((x: any) => x.name?.toLowerCase() === name)?.value || "";
    return { subject: h("subject"), from: h("from"), snippet: msg.snippet || "" };
  }
}
```
- [ ] **Step 2: `api/src/inbox/gmail-account.service.ts`**
```ts
import { Injectable } from "@nestjs/common";
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { GMAIL_ACCOUNT_SK } from "./inbox-keys";
import { GoogleService } from "./google.service";
@Injectable()
export class GmailAccountService {
  constructor(private readonly dyn: DynamoService, private readonly google: GoogleService) {}
  private t() { return this.dyn.inboxTable; }
  async connect(userId: string, code: string, redirectUri: string) {
    const { refresh_token, email } = await this.google.exchangeCode(code, redirectUri);
    await this.dyn.doc.send(new PutCommand({ TableName: this.t(), Item: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK, refresh_token, email, active: true, last_scan: null, updated_at: new Date().toISOString() } }));
    return { connected: true, email };
  }
  async getAccount(userId: string) {
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK } }));
    return (r.Item as any) || null;
  }
  async status(userId: string) {
    const a = await this.getAccount(userId);
    return { connected: !!a && a.active === true, email: a?.email ?? null, last_scan: a?.last_scan ?? null };
  }
  async disconnect(userId: string) {
    await this.dyn.doc.send(new UpdateCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK }, UpdateExpression: "SET active = :f, refresh_token = :e", ExpressionAttributeValues: { ":f": false, ":e": "" } }));
    return { connected: false };
  }
  // Scan (T4) uses these — Scan is acceptable: the account count is small.
  async listActiveAccounts(): Promise<Array<{ userId: string; refresh_token: string }>> {
    const r = await this.dyn.doc.send(new ScanCommand({ TableName: this.t(), FilterExpression: "sk = :s AND active = :t", ExpressionAttributeValues: { ":s": GMAIL_ACCOUNT_SK, ":t": true } }));
    return ((r.Items || []) as any[]).map((it) => ({ userId: String(it.pk).replace(/^USER#/, ""), refresh_token: it.refresh_token }));
  }
  async setLastScan(userId: string) {
    await this.dyn.doc.send(new UpdateCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK }, UpdateExpression: "SET last_scan = :n", ExpressionAttributeValues: { ":n": new Date().toISOString() } }));
  }
}
```
- [ ] **Step 3: failing test `api/src/inbox/gmail-account.service.spec.ts`** — assert connect stores the exchanged refresh token and never returns it; status reflects active; disconnect clears it.
```ts
import { GmailAccountService } from "./gmail-account.service";
function make(send: jest.Mock, exchange = async () => ({ refresh_token: "rt", email: "e@x.com" })) {
  const google = { exchangeCode: jest.fn(exchange) } as any;
  return { svc: new GmailAccountService({ doc: { send }, inboxTable: "ip_inbox" } as any, google), google, send };
}
describe("GmailAccountService", () => {
  it("connect exchanges the code and stores refresh_token, returns only {connected,email}", async () => {
    const send = jest.fn().mockResolvedValue({});
    const { svc, google } = make(send);
    const out = await svc.connect("u1", "code123", "https://app/cb");
    expect(google.exchangeCode).toHaveBeenCalledWith("code123", "https://app/cb");
    expect(out).toEqual({ connected: true, email: "e@x.com" });
    const item = send.mock.calls[0][0].input.Item;
    expect(item.refresh_token).toBe("rt"); expect(item.active).toBe(true);
    expect(out).not.toHaveProperty("refresh_token"); // never returned to client
  });
  it("status maps active/email/last_scan", async () => {
    const { svc } = make(jest.fn().mockResolvedValue({ Item: { active: true, email: "e@x.com", last_scan: "2026-07-10" } }));
    expect(await svc.status("u1")).toEqual({ connected: true, email: "e@x.com", last_scan: "2026-07-10" });
  });
  it("disconnect clears the refresh token", async () => {
    const send = jest.fn().mockResolvedValue({});
    await make(send).svc.disconnect("u1");
    const arg = send.mock.calls[0][0].input;
    expect(arg.ExpressionAttributeValues[":f"]).toBe(false);
    expect(arg.ExpressionAttributeValues[":e"]).toBe("");
  });
});
```
Run: `npm --prefix api test -- gmail-account` → FAIL then implement Steps 1-2 → PASS.
- [ ] **Step 4: `api/src/inbox/gmail.controller.ts`** (connect/status/disconnect only; scan added in T4). Body is an interface (whitelist lesson).
```ts
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { GmailAccountService } from "./gmail-account.service";
interface ConnectBody { code?: string; redirect_uri?: string; }
@Controller("v1/gmail")
export class GmailController {
  constructor(private readonly accounts: GmailAccountService) {}
  @Post("connect") @UseGuards(JwtAuthGuard) connect(@CurrentUser() u: AuthUser, @Body() b: ConnectBody) { return this.accounts.connect(u.id, b.code || "", b.redirect_uri || ""); }
  @Get("status") @UseGuards(JwtAuthGuard) status(@CurrentUser() u: AuthUser) { return this.accounts.status(u.id); }
  @Post("disconnect") @UseGuards(JwtAuthGuard) disconnect(@CurrentUser() u: AuthUser) { return this.accounts.disconnect(u.id); }
}
```
(NOTE: `GmailController` is NOT `@UseGuards` at the class level — the scan route added in T4 must be CRON-gated, not JWT. Guards are per-method here.)
- [ ] **Step 5: wire module** — edit `inbox.module.ts`: add `GoogleService`, `GmailAccountService` to providers, `GmailController` to controllers.
- [ ] **Step 6: verify** — `npm --prefix api test -- gmail-account` PASS; full `npm --prefix api test` green; `npm --prefix api run build` succeeds.
- [ ] **Step 7: Commit** — `git add api/ && git commit -m "feat(api): gmail account connect/status/disconnect (OAuth code exchange) (+Jest)"`

---

## Task 4: provider classify + scan service + `POST /v1/gmail/scan` (CRON gate)

**Files:** Create `api/src/inbox/classify.ts`, `api/src/inbox/cron.guard.ts`, `cron.guard.spec.ts`, `api/src/inbox/scan.service.ts`, `scan.service.spec.ts`. Modify `api/src/chat/provider.service.ts` (+classify), `api/src/inbox/gmail.controller.ts` (+scan), `api/src/inbox/inbox.module.ts`, `api/test/app.e2e-spec.ts`.

**Interfaces:**
- Consumes: `ProviderService` (F3, +classify), `GoogleService`+`GmailAccountService`+`InboxService` (T2/T3), `DynamoService`, `seenSk`, `userPk`.
- Produces: `ProviderService.classify({system,input})→object`; `CronGuard`; `ScanService.scanAll()→{scanned,accounts}`; `POST /v1/gmail/scan` (CronGuard).

- [ ] **Step 1: `api/src/inbox/classify.ts`** (SYS + prefilter + classify-mock, ported verbatim from `supabase/functions/gmail-scan/index.ts`)
```ts
export const CLASSIFY_SYS = "You classify a recruiting-related email for an IT job seeker. Return JSON per the schema. is_recruiting=false if it is not about a job application/interview/offer/rejection/test. kind: test=coding test/assessment, interview=interview invite/schedule, offer=job offer, rejection=declined, other=recruiting but none of these. event_at/deadline_at: ISO 8601 if a date/time is present, else null. Keep summary <=200 chars, in the email's language.";
export const RECRUIT_RE = /(interview|phỏng|assessment|coding|test|take-home|offer|onboarding|tuyển|recruit|application|regret|unfortunately|shortlist|screening|hiring|vòng)/i;
export const CLASSIFY_INSTRUCTION = ' Respond with ONLY a JSON object with keys: is_recruiting (boolean), kind ("test"|"interview"|"offer"|"rejection"|"other"), company (string), title (string), event_at (ISO 8601 string or null), deadline_at (ISO 8601 string or null), summary (string). No prose, no code fences.';
export interface Classification { is_recruiting: boolean; kind: string; company: string; title: string; event_at: string | null; deadline_at: string | null; summary: string; }
```
- [ ] **Step 2: add `classify` to `api/src/chat/provider.service.ts`** — reuses `complete()`; mock returns a canned recruiting object; JSON parse failure → `{is_recruiting:false}`.
```ts
// import { CLASSIFY_INSTRUCTION } from "../inbox/classify";  (add at top)
async classify(opts: { system: string; input: string }): Promise<any> {
  if (this.pickProvider() === "mock") {
    return { is_recruiting: true, kind: "interview", company: "Acme", title: "Interview invite", event_at: null, deadline_at: null, summary: "[mock] interview" };
  }
  const { text } = await this.complete({ system: opts.system + CLASSIFY_INSTRUCTION, messages: [{ role: "user", content: opts.input }], maxTokens: 512 });
  try { return JSON.parse(text.replace(/^```(json)?/i, "").replace(/```$/, "").trim()); } catch { return { is_recruiting: false }; }
}
```
(`pickProvider()` is already public on ProviderService from F3.)
- [ ] **Step 3: failing test `api/src/inbox/cron.guard.spec.ts` + `cron.guard.ts`**
```ts
// cron.guard.spec.ts
import { CronGuard } from "./cron.guard";
import { ForbiddenException } from "@nestjs/common";
const ctx = (hdr?: string) => ({ switchToHttp: () => ({ getRequest: () => ({ headers: hdr ? { "x-cron-secret": hdr } : {} }) }) }) as any;
const cfg = (s: string) => ({ get: () => s }) as any;
describe("CronGuard", () => {
  it("allows the matching secret", () => { expect(new CronGuard(cfg("s3cr3t")).canActivate(ctx("s3cr3t"))).toBe(true); });
  it("rejects wrong/missing secret and empty config", () => {
    expect(() => new CronGuard(cfg("s3cr3t")).canActivate(ctx("nope"))).toThrow(ForbiddenException);
    expect(() => new CronGuard(cfg("s3cr3t")).canActivate(ctx())).toThrow(ForbiddenException);
    expect(() => new CronGuard(cfg("")).canActivate(ctx("x"))).toThrow(ForbiddenException);
  });
});
```
```ts
// cron.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class CronGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>("CRON_SECRET");
    const got = context.switchToHttp().getRequest().headers["x-cron-secret"];
    if (!secret || got !== secret) throw new ForbiddenException("forbidden");
    return true;
  }
}
```
Run: `npm --prefix api test -- cron.guard` → FAIL then PASS.
- [ ] **Step 4: `api/src/inbox/scan.service.ts`** (the scan orchestration, ported from the edge fn; idempotent via SEEN#)
```ts
import { Injectable } from "@nestjs/common";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { seenSk } from "./inbox-keys";
import { GoogleService } from "./google.service";
import { GmailAccountService } from "./gmail-account.service";
import { InboxService } from "./inbox.service";
import { ProviderService } from "../chat/provider.service";
import { CLASSIFY_SYS, RECRUIT_RE } from "./classify";
@Injectable()
export class ScanService {
  constructor(
    private readonly dyn: DynamoService,
    private readonly google: GoogleService,
    private readonly accounts: GmailAccountService,
    private readonly inbox: InboxService,
    private readonly provider: ProviderService,
  ) {}
  private async seen(userId: string, msgId: string): Promise<boolean> {
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.dyn.inboxTable, Key: { pk: userPk(userId), sk: seenSk(msgId) } }));
    return !!r.Item;
  }
  private async markSeen(userId: string, msgId: string) {
    const ttl = Math.floor(Date.now() / 1000) + 7 * 86400;
    await this.dyn.doc.send(new PutCommand({ TableName: this.dyn.inboxTable, Item: { pk: userPk(userId), sk: seenSk(msgId), ttl } }));
  }
  async scanAll(): Promise<{ scanned: number; accounts: number }> {
    const accts = await this.accounts.listActiveAccounts();
    let scanned = 0;
    for (const acc of accts) {
      const access = await this.google.refreshAccessToken(acc.refresh_token);
      if (!access) continue;
      const list = await this.google.listRecent(access);
      for (const m of list) {
        if (await this.seen(acc.userId, m.id)) continue;
        await this.markSeen(acc.userId, m.id);
        const meta = await this.google.getMeta(access, m.id);
        if (!meta) continue;
        if (!RECRUIT_RE.test(meta.subject + " " + meta.snippet)) continue;
        let c: any;
        try { c = await this.provider.classify({ system: CLASSIFY_SYS, input: `From: ${meta.from}\nSubject: ${meta.subject}\nSnippet: ${meta.snippet}` }); } catch { continue; }
        if (!c?.is_recruiting) continue;
        await this.inbox.addNotification(acc.userId, { type: c.kind || "other", title: (c.company ? c.company + " — " : "") + (c.title || meta.subject), body: c.summary || "", source: m.id });
        if ((c.kind === "test" || c.kind === "interview") && (c.event_at || c.deadline_at)) {
          await this.inbox.addReminder(acc.userId, { kind: c.kind, title: c.title || meta.subject, company: c.company, due_at: c.event_at || undefined, deadline_at: c.deadline_at || undefined, source: m.id });
        }
        scanned++;
      }
      await this.accounts.setLastScan(acc.userId);
    }
    return { scanned, accounts: accts.length };
  }
}
```
- [ ] **Step 5: failing test `api/src/inbox/scan.service.spec.ts`** — mock the collaborators; assert a recruiting message creates a notification + reminder, and a second scan (seen=true) creates nothing (idempotent).
```ts
import { ScanService } from "./scan.service";
function build(seenFirst = false) {
  const send = jest.fn()
    .mockResolvedValueOnce({ Item: seenFirst ? { sk: "SEEN#m1" } : undefined }) // seen() check
    .mockResolvedValue({}); // markSeen + others
  const dyn = { doc: { send }, inboxTable: "ip_inbox" } as any;
  const google = { refreshAccessToken: async () => "acc", listRecent: async () => [{ id: "m1" }], getMeta: async () => ({ subject: "Interview at Acme", from: "r@a.com", snippet: "schedule interview" }) } as any;
  const accounts = { listActiveAccounts: async () => [{ userId: "u1", refresh_token: "rt" }], setLastScan: jest.fn() } as any;
  const inbox = { addNotification: jest.fn(async () => ({ id: "n" })), addReminder: jest.fn(async () => ({ id: "r" })) } as any;
  const provider = { classify: async () => ({ is_recruiting: true, kind: "interview", company: "Acme", title: "Interview", event_at: "2026-08-01T09:00:00Z", deadline_at: null, summary: "s" }) } as any;
  return { svc: new ScanService(dyn, google, accounts, inbox, provider), inbox };
}
describe("ScanService.scanAll", () => {
  it("classifies a recruiting message → notification + reminder", async () => {
    const { svc, inbox } = build(false);
    const out = await svc.scanAll();
    expect(out).toEqual({ scanned: 1, accounts: 1 });
    expect(inbox.addNotification).toHaveBeenCalledTimes(1);
    expect(inbox.addReminder).toHaveBeenCalledTimes(1); // interview + event_at
  });
  it("idempotent: an already-seen message creates nothing", async () => {
    const { svc, inbox } = build(true);
    const out = await svc.scanAll();
    expect(out.scanned).toBe(0);
    expect(inbox.addNotification).not.toHaveBeenCalled();
  });
});
```
Run: `npm --prefix api test -- scan.service` → FAIL then PASS.
- [ ] **Step 6: add scan route to `gmail.controller.ts`**
```ts
// add imports: CronGuard from "./cron.guard"; ScanService from "./scan.service"
@Post("scan") @UseGuards(CronGuard)
scan() { return this.scan_.scanAll(); }
// inject in the constructor: private readonly scan_: ScanService
```
Register `CronGuard` + `ScanService` in `inbox.module.ts` providers; `InboxModule` must import `ChatModule`? No — `ProviderService` is provided by `ChatModule`. To inject `ProviderService` into `ScanService`, `InboxModule` must `imports: [ChatModule]` AND `ChatModule` must `exports: [ProviderService]`. Edit `api/src/chat/chat.module.ts` to add `exports: [ProviderService]`, and `inbox.module.ts` to `imports: [ChatModule]`.
- [ ] **Step 7: e2e `api/test/app.e2e-spec.ts`** — add an inbox block, gated on `DDB_ENDPOINT`, forcing `AI_PROVIDER=mock` + `GMAIL_MODE=mock` + `CRON_SECRET=test-cron` before app init.
```ts
// near top env setup: process.env.GMAIL_MODE = process.env.GMAIL_MODE || "mock"; process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron";
it("notifications: 401 without token", () => request(app.getHttpServer()).get("/v1/notifications").expect(401));
it("scan without cron secret → 403", () => request(app.getHttpServer()).post("/v1/gmail/scan").expect(403));
(dbOn ? it : it.skip)("connect(mock) → scan(mock) creates a notification, idempotent on re-scan", async () => {
  const t = tok("inbox-user");
  await request(app.getHttpServer()).post("/v1/gmail/connect").set("Authorization", t).send({ code: "x", redirect_uri: "y" }).expect(201);
  await request(app.getHttpServer()).post("/v1/gmail/scan").set("x-cron-secret", "test-cron").expect(201);
  const n1 = await request(app.getHttpServer()).get("/v1/notifications").set("Authorization", t).expect(200);
  expect(n1.body.length).toBeGreaterThanOrEqual(1);
  await request(app.getHttpServer()).post("/v1/gmail/scan").set("x-cron-secret", "test-cron").expect(201);
  const n2 = await request(app.getHttpServer()).get("/v1/notifications").set("Authorization", t).expect(200);
  expect(n2.body.length).toBe(n1.body.length); // idempotent — no duplicate
});
```
- [ ] **Step 8: verify** — `npm --prefix api test` (cron.guard + scan.service + provider classify + prior green); `npm --prefix api run test:e2e` (401 + 403 pass; DB-gated inbox test skips w/o DDB_ENDPOINT); `npm --prefix api run build` ok.
- [ ] **Step 9: Commit** — `git add api/ && git commit -m "feat(api): provider classify + Google/scan service + POST /v1/gmail/scan (CRON gate, mock modes) (+e2e)"`

---

## Task 5: Frontend `IP.gmail` routes through the API (Supabase fallback, poll bell)

**Files:** Modify `assets/js/gmail.js`. Test: `tests/gmail.test.js` (create).

**Interfaces:** Consumes `IP.api`. Keep pure helpers `buildICS`/`notifIcon`/`looksRecruiting`/`icsDate` + exports.

- [ ] **Step 1: failing test `tests/gmail.test.js`** — mock `IP.api`; assert routing + fallback.
```js
const { test } = require("node:test"); const assert = require("node:assert");
const gmail = require("../assets/js/gmail.js");
function setup(configured, calls) {
  global.window = global;
  global.IP = { api: { configured: () => configured, get: async (p) => { calls.push(["get", p]); return p.indexOf("reminders") >= 0 ? [] : [{ id: "n1", read: false, title: "t" }]; }, post: async (p, b) => { calls.push(["post", p, b]); return { ok: true }; } },
    auth: { client: () => ({ from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }) }) }) } };
}
test("fetchNotifications uses GET /v1/notifications when configured", async () => {
  const calls = []; setup(true, calls);
  const list = await gmail.fetchNotifications();
  assert.ok(calls.some((c) => c[1] === "/v1/notifications"));
  assert.strictEqual(list[0].id, "n1");
});
test("markRead posts to /v1/notifications/read with {created_at,id} when configured", async () => {
  const calls = []; setup(true, calls);
  await gmail.markRead({ id: "n1", created_at: "2026-07-10T00:00:00Z" });
  const call = calls.find((c) => c[0] === "post" && c[1] === "/v1/notifications/read");
  assert.deepStrictEqual(call[2], { id: "n1", created_at: "2026-07-10T00:00:00Z" });
});
test("not configured → Supabase path (no IP.api call)", async () => {
  const calls = []; setup(false, calls);
  await gmail.fetchNotifications();
  assert.strictEqual(calls.filter((c) => c[0] === "get").length, 0);
});
```
Run: `node --test tests/` → new FAIL.
- [ ] **Step 2: refactor `assets/js/gmail.js`** — add `_apiOn()`; gate each stateful method. **`markRead` signature changes** from `markRead(id)` to `markRead(notif)` (needs `created_at`+`id` for the API key); update the app.js call site to pass the whole notification object (grep `IP.gmail.markRead`). Route:
  - `fetchNotifications()` → API: `GET /v1/notifications` (store `_notifications`); else Supabase select.
  - `markRead(notif)` → API: `POST /v1/notifications/read {created_at:notif.created_at, id:notif.id}`; else Supabase update by id. Update local `_notifications`.
  - `markAllRead()` → API: `POST /v1/notifications/read-all`; else Supabase.
  - `fetchReminders()` → API: `GET /v1/reminders?status=upcoming`; else Supabase.
  - `setReminderStatus(id, status)` → API: `PUT /v1/reminders/<id> {status}`; else Supabase.
  - `status()` → API: `GET /v1/gmail/status`; else Supabase `gmail-status`.
  - `disconnect()` → API: `POST /v1/gmail/disconnect`; else Supabase.
  - `connect()` → when API configured, obtain a Google auth code (offline) via the existing `IP.auth` Gmail flow and `POST /v1/gmail/connect {code, redirect_uri}`; else the existing `IP.auth.connectGmail()` path. If the auth-code acquisition isn't available in `IP.auth`, keep the current `connect()` for the fallback and add a `connectWithCode(code, redirectUri)` method that posts to the API, and wire the app.js OAuth callback to call it — grep `IP.gmail.connect`/`connectGmail` to find the call sites; if the code-acquisition path is unclear, STOP and report NEEDS_CONTEXT rather than guessing.
  - **`subscribeRealtime`**: keep the export but make it a NO-OP that returns null when `_apiOn()` (DynamoDB has no push; the bell polls on open). Keep the Supabase realtime for the fallback branch. Remove/guard the realtime subscription so it isn't started against the API.
- [ ] **Step 3: verify** — `node --test tests/` green (prior + 3 new); `node --check assets/js/gmail.js`. Confirm the Supabase fallback branch is unchanged when not configured.
- [ ] **Step 4: Commit** — `git add assets/js/gmail.js tests/gmail.test.js && git commit -m "feat(web): IP.gmail routes through API (Supabase fallback, poll bell)"`

---

## Task 6: `notifications`+`reminders` → `ip_inbox` backfill

**Files:** Create `api/scripts/backfill-inbox.ts`. Modify `api/package.json` (add `"backfill-inbox"` script).

**Interfaces:** standalone `ts-node`; reads Supabase `notifications` + `reminders` via `pg` (`SUPABASE_DB_URL`); writes `ip_inbox` items via `BatchWriteCommand` (≤25), idempotent, `--dry`. Uses `userPk`, `notifSk`, `reminderSk`. `gmail_accounts` (refresh tokens) NOT backfilled by default (users re-connect); `gmail_seen` skipped.

- [ ] **Step 1: `api/scripts/backfill-inbox.ts`** (mirror `api/scripts/backfill-billing.ts` structure)
```ts
import { Client } from "pg";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { userPk } from "../src/db/keys";
import { notifSk, reminderSk } from "../src/inbox/inbox-keys";
const DRY = process.argv.includes("--dry");
const table = process.env.DDB_INBOX_TABLE || "ip_inbox";
const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const creds = process.env.AWS_ACCESS_KEY_ID ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } } : {};
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}), ...creds }), { marshallOptions: { removeUndefinedValues: true } });
const iso = (v: any) => (v ? new Date(v).toISOString() : new Date().toISOString());
async function batch(items: any[]) { if (DRY || !items.length) return; for (let i = 0; i < items.length; i += 25) await doc.send(new BatchWriteCommand({ RequestItems: { [table]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) } })); }
(async () => {
  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const items: any[] = [];
  const nt = await pg.query("select id, user_id, type, title, body, read, source, created_at from public.notifications");
  for (const n of nt.rows) { const created_at = iso(n.created_at); items.push({ pk: userPk(n.user_id), sk: notifSk(created_at, String(n.id)), id: String(n.id), type: n.type, title: n.title, body: n.body ?? "", read: !!n.read, source: n.source ?? null, created_at }); }
  const rm = await pg.query("select id, user_id, kind, title, company, due_at, deadline_at, status, source from public.reminders");
  for (const r of rm.rows) items.push({ pk: userPk(r.user_id), sk: reminderSk(String(r.id)), id: String(r.id), kind: r.kind, title: r.title, company: r.company ?? null, due_at: r.due_at ? iso(r.due_at) : null, deadline_at: r.deadline_at ? iso(r.deadline_at) : null, status: r.status || "upcoming", source: r.source ?? null, created_at: new Date().toISOString() });
  console.log(`${DRY ? "[DRY] " : ""}notifications=${nt.rowCount} reminders=${rm.rowCount} items=${items.length}`);
  await batch(items);
  await pg.end();
  console.log(DRY ? "[DRY] no writes" : "backfill complete");
})().catch((e) => { console.error(e); process.exit(1); });
```
- [ ] **Step 2: verify** — `npm --prefix api install`; `npm --prefix api run build` (or `./node_modules/.bin/tsc --noEmit`) type-checks; `npm --prefix api test` green. Do NOT run against a live DB.
- [ ] **Step 3: Commit** — `git add api/ && git commit -m "feat(api): notifications+reminders → ip_inbox backfill script"`

---

## Task 7: `DEPLOY-PHASE-F4.md` + GitHub Actions cron

**Files:** Create `docs/superpowers/DEPLOY-PHASE-F4.md`, `.github/workflows/gmail-scan.yml`.

- [ ] **Step 1: `.github/workflows/gmail-scan.yml`**
```yaml
name: gmail-scan
on:
  schedule:
    - cron: "7,22,37,52 * * * *"   # ~every 15 min (off the :00 mark)
  workflow_dispatch: {}
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger inbox scan
        run: |
          curl -fsS -X POST "${{ secrets.API_URL }}/v1/gmail/scan" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            --max-time 120
```
- [ ] **Step 2: `docs/superpowers/DEPLOY-PHASE-F4.md`** (placeholders only; match F1-F3 style):
  1. **DynamoDB**: extend the IAM policy for `arn:aws:dynamodb:<region>:<account-id>:table/ip_inbox` (Query/GetItem/PutItem/UpdateItem/DeleteItem/BatchWriteItem/Scan/DescribeTable/CreateTable/UpdateTimeToLive). Run `... DDB_INBOX_TABLE=ip_inbox npm --prefix api run create-inbox-table`.
  2. **Render env** (add): `GOOGLE_CLIENT_ID=<...>`, `GOOGLE_CLIENT_SECRET=<...>`, `CRON_SECRET=<random>`, `DDB_INBOX_TABLE=ip_inbox`, optional `GMAIL_MODE` (leave empty in prod; `mock` for testing). Reuses F3 AI env. Redeploy.
  3. **Google Console**: OAuth client — add the frontend's redirect URI (where the auth code is received); ensure `gmail.readonly` scope + `access_type=offline`.
  4. **GitHub repo secrets** (Settings → Secrets → Actions): `API_URL` (the Render base URL) + `CRON_SECRET` (same value as Render). The `gmail-scan` workflow then runs ~every 15 min.
  5. **Backfill once** (`--dry` first): `SUPABASE_DB_URL=<pooler> ... DDB_INBOX_TABLE=ip_inbox npm --prefix api run backfill-inbox -- --dry` then without `--dry`. (Existing connected users re-connect Gmail — refresh tokens are not backfilled.)
  6. **Local dev**: `docker compose -f api/docker-compose.dev.yml up -d`; `DDB_ENDPOINT=http://localhost:8001 DDB_INBOX_TABLE=ip_inbox npm --prefix api run create-inbox-table`; run the API with `DDB_ENDPOINT`, `AI_PROVIDER=mock`, `GMAIL_MODE=mock`, `CRON_SECRET=<any>`.
  7. **Acceptance checklist**: connect (mock) → scan → notification appears → reminder for interview/test with a date; re-scan is idempotent (no duplicate); scan without `x-cron-secret` → 403; read/read-all/reminder status work; refresh token never returned to the client; `API_URL` empty → `IP.gmail` still works via Supabase. Secrets in env only.
- [ ] **Step 3: Commit** — `git add docs/superpowers/DEPLOY-PHASE-F4.md .github/workflows/gmail-scan.yml && git commit -m "docs+ci: DEPLOY-PHASE-F4 + gmail-scan GitHub Actions cron"`

---

## Self-Review (run against the spec)

1. **Spec coverage:** §4 table+TTL → T1; notifications/reminders (list/read/status) → T2; §6 connect/status/disconnect (OAuth code exchange) → T3; §5 classify + §6 Google/scan + §7 scan endpoint (CRON gate) + mock modes → T4; §8 frontend IP.gmail (+drop realtime) → T5; §10 backfill → T6; §7b Actions cron + §11 deploy → T7. Unit T1-4; e2e (DDB_ENDPOINT + mock modes) T4; live run = SDD controller step. ✔
2. **Placeholders:** none — SYS/prefilter/schema ported verbatim; the one fuzzy area (connect's auth-code acquisition in T5) has an explicit NEEDS_CONTEXT instruction rather than a guess. ✔
3. **Type consistency:** `inbox-keys` (T1) used by InboxService/scan/backfill; `InboxService.addNotification/addReminder/listNotifications/markRead/...` (T2) used by ScanService (T4) + controllers + frontend; `GoogleService.exchangeCode/refreshAccessToken/listRecent/getMeta` + `GmailAccountService.listActiveAccounts/setLastScan` (T3) used by ScanService (T4); `ProviderService.classify` (T4) reuses F3 `complete`; `CronGuard` on the scan route only (not JWT); bodies are interfaces (whitelist lesson); `markRead(notif)` signature change flagged for the app.js call site; DynamoService.inboxTable (T1) used throughout. ✔
