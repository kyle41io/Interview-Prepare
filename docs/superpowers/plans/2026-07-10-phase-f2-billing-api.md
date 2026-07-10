# Phase F2 — Billing/Pro domain → NestJS API + DynamoDB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the billing/Pro domain (entitlement, VietQR payments, admin approval, Pro content delivery) from Supabase Edge Functions/RLS into the NestJS API, with billing data on a new DynamoDB table and Pro content bundled in the API and served after a server-side entitlement check.

**Architecture:** Reuse F1's `api/` NestJS 10 workspace, `JwtAuthGuard`, and `DynamoService`. Add `BillingModule` (entitlement + payment lifecycle + admin approve/reject) backed by a new `ip_billing` DynamoDB table with a `status-index` GSI for cross-user admin listing, and `ProContentModule` serving bundled static content gated by entitlement. Frontend `IP.pro` routes through `IP.api` when `API_URL` is set, else keeps the existing Supabase path (no regression).

**Tech Stack:** NestJS 10, AWS SDK v3 (`@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`), jsonwebtoken@9, Jest + supertest (API), `node --test` (frontend), DynamoDB Local (dev via Docker), Node 18.

## Global Constraints

- **Node 18** (v18.20.8). NestJS **10.x** (NOT 11). AWS SDK v3 `^3.x`. NO Prisma. `pg` only as a **devDependency** for the backfill script (never in the API runtime).
- **`api/` is a separate workspace**; the static frontend at repo root stays no-build vanilla JS; GitHub Pages ignores `api/`.
- **No secrets in the repo.** API reads config/secrets from env: reuse `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`DDB_ENDPOINT`/`SUPABASE_JWT_SECRET`/`ALLOWED_ORIGINS`; ADD `DDB_BILLING_TABLE` (default `ip_billing`), `ADMIN_UIDS` (csv), `VIETQR_BANK` (default `970407`), `VIETQR_ACCT` (default `19036335023019`), `VIETQR_NAME` (default `NGUYEN VAN KIEN`), `PRICE_VND` (default `49000`), `PLAN_DAYS` (default `30`). VietQR params are public config, not secrets, but live server-side for authority. Backfill reads `SUPABASE_DB_URL` at run time only.
- **Auth**: every `/v1/*` route requires the Supabase JWT (reuse `JwtAuthGuard`). `/health` stays open. Identity ONLY from the verified `sub`. Admin routes additionally require `AdminGuard` (uid ∈ `ADMIN_UIDS`, from the verified `sub` — never trust the client).
- **Authz**: every DynamoDB access is keyed by `USER#<userId>`. Admin cross-user reads go through the GSI. Pro content is returned ONLY when the caller's entitlement is active — content bodies never reach a non-Pro client.
- **DTO validation lesson from F1**: a global `ValidationPipe({whitelist:true})` strips any body property not covered by a class-validator decorator. So every request-body DTO MUST decorate every field it needs; do NOT rely on an undecorated pass-through class.
- **Idempotent, race-safe approval**: approve/reject use a DynamoDB conditional `UpdateItem` (`ConditionExpression` on `status`), mirroring Phase C's atomic claim — a double-approve never double-grants.
- **No regression**: when `IP_CONFIG.API_URL` is empty, `IP.pro` behaves exactly as today (Supabase). NestJS 10.x, AWS SDK v3. NO Fable models anywhere.
- **DB separation**: billing lives in its own `ip_billing` table (NOT `ip_progress`). Do not touch `ip_progress` or F1 code. Supabase billing tables (`entitlements`, `payment_requests`, `pro_*`) are kept during transition (backfill source + fallback), deprecated later.

---

## File Structure

**Create (API):**
- `api/src/billing/billing-keys.ts` — key builders for the billing table (pure).
- `api/src/billing/billing-keys.spec.ts` — key tests.
- `api/src/billing/entitlement.ts` — pure entitlement logic (`isActive`, `extendExpiry`, `toView`).
- `api/src/billing/entitlement.spec.ts` — entitlement + VietQR unit tests.
- `api/src/billing/vietqr.ts` — pure VietQR URL builder + `genProCode`.
- `api/src/billing/admin.guard.ts` — `AdminGuard` (ADMIN_UIDS env).
- `api/src/billing/admin.guard.spec.ts` — guard tests.
- `api/src/billing/dto.ts` — decorated request DTOs.
- `api/src/billing/billing.service.ts` — DynamoDB reads/writes.
- `api/src/billing/billing.controller.ts` — `/v1/billing/*` routes.
- `api/src/billing/billing.module.ts`.
- `api/src/pro/content.data.ts` — bundled Pro content (converted from the seed SQL).
- `api/src/pro/pro.service.ts` — catalog + entitlement-gated sections.
- `api/src/pro/pro.controller.ts` — `/v1/pro/*` routes.
- `api/src/pro/pro.module.ts`.
- `api/scripts/create-billing-table.ts` — idempotent create of `ip_billing` + GSI.
- `api/scripts/backfill-billing.ts` — Postgres → `ip_billing` one-time backfill.
- `docs/superpowers/DEPLOY-PHASE-F2.md` — deploy runbook.

**Modify (API):**
- `api/src/db/dynamo.service.ts` — expose `billingTable` (reads `DDB_BILLING_TABLE`).
- `api/src/app.module.ts` — register `BillingModule` + `ProContentModule`.
- `api/package.json` — add `create-billing-table` + `backfill-billing` scripts; add `pg`/`@types/pg` devDependencies.

**Modify (frontend):**
- `assets/js/pro.js` — route through `IP.api` when configured; Supabase fallback; add payment/admin methods.
- `tests/pro.test.js` — add API-routing + fallback tests (create if absent).

---

## Task 1: `ip_billing` table + keys + create-billing-table (+GSI)

**Files:**
- Create: `api/src/billing/billing-keys.ts`, `api/src/billing/billing-keys.spec.ts`, `api/scripts/create-billing-table.ts`
- Modify: `api/src/db/dynamo.service.ts`, `api/package.json`

**Interfaces:**
- Produces `billing-keys`: `ENTITLEMENT_SK="ENTITLEMENT"`; `paymentSk(code)→"PAYMENT#<code>"`; `payStatusPk(status)→"PAYSTATUS#<status>"`; `parsePaymentCode(sk)→code`. Reuses `userPk` from `../db/keys`.
- Produces `DynamoService.billingTable: string` (readonly), same `doc` client. Consumed by BillingService (T2/T3) + backfill (T6).
- Single-table `ip_billing`: PK `pk`(S)=`USER#<id>`, SK `sk`(S) = `ENTITLEMENT` | `PAYMENT#<code>`. GSI `status-index`: `gsi1pk`(S)=`PAYSTATUS#<status>`, `gsi1sk`(S)=`created_at`. Only PAYMENT items carry `gsi1pk/gsi1sk`.

- [ ] **Step 1: expose billingTable on DynamoService** — Edit `api/src/db/dynamo.service.ts`: add a readonly field initialized in the constructor.
```ts
// add alongside `readonly table: string;`
readonly billingTable: string;
// inside constructor, after this.table = ...:
this.billingTable = config.get<string>("DDB_BILLING_TABLE") || "ip_billing";
```
- [ ] **Step 2: failing test `api/src/billing/billing-keys.spec.ts`**
```ts
import { ENTITLEMENT_SK, paymentSk, payStatusPk, parsePaymentCode } from "./billing-keys";
import { userPk } from "../db/keys";
describe("billing-keys", () => {
  it("builds keys", () => {
    expect(userPk("u1")).toBe("USER#u1");
    expect(ENTITLEMENT_SK).toBe("ENTITLEMENT");
    expect(paymentSk("PRO-ABC123")).toBe("PAYMENT#PRO-ABC123");
    expect(payStatusPk("pending")).toBe("PAYSTATUS#pending");
  });
  it("parses the code back out of a payment sk (codes have no '#')", () => {
    expect(parsePaymentCode(paymentSk("PRO-ABC123"))).toBe("PRO-ABC123");
  });
});
```
Run: `npm --prefix api test -- billing-keys` → FAIL (module not found).
- [ ] **Step 3: `api/src/billing/billing-keys.ts`**
```ts
export const ENTITLEMENT_SK = "ENTITLEMENT";
export const paymentSk = (code: string) => `PAYMENT#${code}`;
export const payStatusPk = (status: string) => `PAYSTATUS#${status}`;
export function parsePaymentCode(sk: string): string {
  return sk.startsWith("PAYMENT#") ? sk.slice("PAYMENT#".length) : sk;
}
```
Run: `npm --prefix api test -- billing-keys` → PASS.
- [ ] **Step 4: `api/scripts/create-billing-table.ts`** (idempotent — mirrors `create-table.ts`; adds the GSI)
```ts
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const table = process.env.DDB_BILLING_TABLE || "ip_billing";
const creds = process.env.AWS_ACCESS_KEY_ID
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } }
  : {};
const client = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}), ...creds });
(async () => {
  try {
    await client.send(new DescribeTableCommand({ TableName: table }));
    console.log(`Table ${table} already exists — nothing to do.`);
    return;
  } catch (e: any) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }
  await client.send(new CreateTableCommand({
    TableName: table,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" },
      { AttributeName: "gsi1pk", AttributeType: "S" },
      { AttributeName: "gsi1sk", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: "status-index",
      KeySchema: [
        { AttributeName: "gsi1pk", KeyType: "HASH" },
        { AttributeName: "gsi1sk", KeyType: "RANGE" },
      ],
      Projection: { ProjectionType: "ALL" },
    }],
  }));
  console.log(`Created table ${table} with GSI status-index.`);
})().catch((e) => { console.error(e); process.exit(1); });
```
- [ ] **Step 5: package.json script** — add to `api/package.json` `"scripts"`: `"create-billing-table": "ts-node scripts/create-billing-table.ts"`.
- [ ] **Step 6: verify (offline)** — `npm --prefix api test -- billing-keys` PASS; `npm --prefix api run build` succeeds (DynamoService change compiles). Do NOT hit DynamoDB.
- [ ] **Step 7: Commit** — `git add api/ && git commit -m "feat(api): billing DynamoDB table + keys + create-billing-table (+GSI)"`

---

## Task 2: AdminGuard + entitlement/VietQR + billing entitlement/payment create+submit (+Jest)

**Files:**
- Create: `api/src/billing/entitlement.ts`, `api/src/billing/entitlement.spec.ts`, `api/src/billing/vietqr.ts`, `api/src/billing/admin.guard.ts`, `api/src/billing/admin.guard.spec.ts`, `api/src/billing/dto.ts`, `api/src/billing/billing.service.ts`, `api/src/billing/billing.controller.ts`, `api/src/billing/billing.module.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Consumes: `DynamoService` (`this.dyn.doc`, `this.dyn.billingTable`), `billing-keys`, `JwtAuthGuard` + `@CurrentUser()`/`AuthUser` from `../auth`.
- Produces (used by T3 + frontend): entitlement view `{tier:string,status:string,expires_at:string|null,isPro:boolean}`; payment-create response `{code,amount,plan,created_at,vietqr:{bank,acct,name,url}}`. `AdminGuard` (used by T3). `entitlement.ts`: `isActive(ent,nowMs)`, `extendExpiry(nowIso,currentIso|null,days)`, `toView(ent|null,nowMs)`. `vietqr.ts`: `buildVietqrUrl(bank,acct,name,amount,code)`, `genProCode(rand?)`.

- [ ] **Step 1: failing test `api/src/billing/entitlement.spec.ts`**
```ts
import { isActive, extendExpiry, toView } from "./entitlement";
import { buildVietqrUrl, genProCode } from "./vietqr";
const NOW = Date.parse("2026-07-10T00:00:00Z");
describe("entitlement", () => {
  it("isActive: active + future expiry = true; expired or none = false", () => {
    expect(isActive({ status: "active", expires_at: "2026-08-10T00:00:00Z" }, NOW)).toBe(true);
    expect(isActive({ status: "active", expires_at: "2026-06-10T00:00:00Z" }, NOW)).toBe(false);
    expect(isActive(null as any, NOW)).toBe(false);
    expect(isActive({ status: "expired", expires_at: "2026-08-10T00:00:00Z" }, NOW)).toBe(false);
  });
  it("extendExpiry: from now when no current, stacks on future current", () => {
    expect(extendExpiry("2026-07-10T00:00:00Z", null, 30)).toBe("2026-08-09T00:00:00.000Z");
    expect(extendExpiry("2026-07-10T00:00:00Z", "2026-07-20T00:00:00Z", 30)).toBe("2026-08-19T00:00:00.000Z");
  });
  it("toView maps to {tier,status,expires_at,isPro}", () => {
    expect(toView({ tier: "pro", status: "active", expires_at: "2026-08-10T00:00:00Z" }, NOW))
      .toEqual({ tier: "pro", status: "active", expires_at: "2026-08-10T00:00:00Z", isPro: true });
    expect(toView(null, NOW)).toEqual({ tier: "free", status: "none", expires_at: null, isPro: false });
  });
});
describe("vietqr", () => {
  it("builds a vietqr url with amount + addInfo", () => {
    const u = buildVietqrUrl("970407", "19036335023019", "NGUYEN VAN KIEN", 49000, "PRO-ABC123");
    expect(u).toContain("970407-19036335023019");
    expect(u).toContain("amount=49000");
    expect(u).toContain("addInfo=PRO-ABC123");
  });
  it("genProCode: PRO- prefix, deterministic with seeded rand", () => {
    let i = 0; const rand = () => [0, 0, 0, 0, 0, 0][i++] ?? 0;
    expect(genProCode(rand)).toMatch(/^PRO-[A-Z0-9]{6}$/);
  });
});
```
Run: `npm --prefix api test -- entitlement` → FAIL.
- [ ] **Step 2: `api/src/billing/entitlement.ts`**
```ts
export interface Entitlement { tier?: string; status?: string; expires_at?: string | null; source?: string; updated_at?: string; }
export function isActive(ent: Entitlement | null | undefined, nowMs: number): boolean {
  if (!ent || ent.status !== "active") return false;
  if (!ent.expires_at) return true;
  return Date.parse(ent.expires_at) > nowMs;
}
export function extendExpiry(nowIso: string, currentIso: string | null, days: number): string {
  const base = Math.max(Date.parse(nowIso), currentIso ? Date.parse(currentIso) : 0);
  return new Date(base + days * 86400000).toISOString();
}
export function toView(ent: Entitlement | null, nowMs: number) {
  const active = isActive(ent, nowMs);
  return {
    tier: ent?.tier ?? "free",
    status: ent?.status ?? "none",
    expires_at: ent?.expires_at ?? null,
    isPro: active,
  };
}
```
- [ ] **Step 3: `api/src/billing/vietqr.ts`**
```ts
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function genProCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return "PRO-" + s;
}
export function buildVietqrUrl(bank: string, acct: string, name: string, amount: number, code: string): string {
  return `https://img.vietqr.io/image/${bank}-${acct}-compact2.jpg?amount=${amount}` +
    `&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(name)}`;
}
```
Run: `npm --prefix api test -- entitlement` → PASS.
- [ ] **Step 4: failing test `api/src/billing/admin.guard.spec.ts`**
```ts
import { AdminGuard } from "./admin.guard";
import { ForbiddenException } from "@nestjs/common";
const ctx = (userId?: string) => ({ switchToHttp: () => ({ getRequest: () => ({ user: userId ? { id: userId } : undefined }) }) }) as any;
const cfg = (uids: string) => ({ get: (_: string) => uids }) as any;
describe("AdminGuard", () => {
  it("allows a uid in ADMIN_UIDS", () => {
    expect(new AdminGuard(cfg("a,b,c")).canActivate(ctx("b"))).toBe(true);
  });
  it("rejects a uid not in ADMIN_UIDS", () => {
    expect(() => new AdminGuard(cfg("a,b,c")).canActivate(ctx("z"))).toThrow(ForbiddenException);
  });
  it("rejects when no user / empty ADMIN_UIDS", () => {
    expect(() => new AdminGuard(cfg("a,b")).canActivate(ctx())).toThrow(ForbiddenException);
    expect(() => new AdminGuard(cfg("")).canActivate(ctx("a"))).toThrow(ForbiddenException);
  });
});
```
Run: `npm --prefix api test -- admin.guard` → FAIL.
- [ ] **Step 5: `api/src/billing/admin.guard.ts`**
```ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const uid = req.user?.id;
    const admins = (this.config.get<string>("ADMIN_UIDS") || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!uid || !admins.includes(uid)) throw new ForbiddenException("admin only");
    return true;
  }
}
```
Run: `npm --prefix api test -- admin.guard` → PASS.
- [ ] **Step 6: `api/src/billing/dto.ts`** (decorated — ValidationPipe whitelists)
```ts
import { IsIn, IsOptional, IsString } from "class-validator";
export class CreatePaymentDto { @IsOptional() @IsString() plan?: string; }
export class AdminDecideDto { @IsString() userId!: string; @IsString() code!: string; }
export const PAY_STATUSES = ["pending", "submitted", "approved", "rejected"] as const;
export class AdminListQueryDto { @IsIn(["pending", "submitted", "approved", "rejected"]) status!: string; }
```
- [ ] **Step 7: `api/src/billing/billing.service.ts`** (entitlement get + payment create/submit; admin methods added in T3)
```ts
import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { ENTITLEMENT_SK, paymentSk, payStatusPk } from "./billing-keys";
import { toView, Entitlement } from "./entitlement";
import { genProCode, buildVietqrUrl } from "./vietqr";
@Injectable()
export class BillingService {
  constructor(private readonly dyn: DynamoService, private readonly config: ConfigService) {}
  private t() { return this.dyn.billingTable; }
  private now() { return new Date().toISOString(); }

  async getEntitlement(userId: string) {
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: ENTITLEMENT_SK } }));
    return toView((r.Item as Entitlement) || null, Date.now());
  }

  async createPayment(userId: string, plan?: string) {
    const amount = Number(this.config.get("PRICE_VND") || 49000);
    const code = genProCode();
    const created_at = this.now();
    await this.dyn.doc.send(new PutCommand({
      TableName: this.t(),
      Item: { pk: userPk(userId), sk: paymentSk(code), code, plan: plan || "pro-month", amount,
        status: "pending", note: null, created_at, decided_at: null,
        gsi1pk: payStatusPk("pending"), gsi1sk: created_at },
    }));
    const bank = this.config.get<string>("VIETQR_BANK") || "970407";
    const acct = this.config.get<string>("VIETQR_ACCT") || "19036335023019";
    const name = this.config.get<string>("VIETQR_NAME") || "NGUYEN VAN KIEN";
    return { code, amount, plan: plan || "pro-month", created_at,
      vietqr: { bank, acct, name, url: buildVietqrUrl(bank, acct, name, amount, code) } };
  }

  async submitPayment(userId: string, code: string) {
    try {
      await this.dyn.doc.send(new UpdateCommand({
        TableName: this.t(), Key: { pk: userPk(userId), sk: paymentSk(code) },
        UpdateExpression: "SET #s = :submitted, gsi1pk = :gpk",
        ConditionExpression: "#s = :pending",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":submitted": "submitted", ":pending": "pending", ":gpk": payStatusPk("submitted") },
      }));
      return { ok: true, status: "submitted" };
    } catch (e: any) {
      if (e.name === "ConditionalCheckFailedException") throw new BadRequestException("payment not pending");
      throw e;
    }
  }
}
```
- [ ] **Step 8: `api/src/billing/billing.controller.ts`** (entitlement + create + submit; admin routes in T3)
```ts
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { BillingService } from "./billing.service";
import { CreatePaymentDto } from "./dto";
@Controller("v1/billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly svc: BillingService) {}
  @Get("entitlement")
  entitlement(@CurrentUser() u: AuthUser) { return this.svc.getEntitlement(u.id); }
  @Post("payment")
  create(@CurrentUser() u: AuthUser, @Body() b: CreatePaymentDto) { return this.svc.createPayment(u.id, b.plan); }
  @Post("payment/:code/submit")
  submit(@CurrentUser() u: AuthUser, @Param("code") code: string) { return this.svc.submitPayment(u.id, code); }
}
```
- [ ] **Step 9: `api/src/billing/billing.module.ts`**
```ts
import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
@Module({ controllers: [BillingController], providers: [BillingService] })
export class BillingModule {}
```
Then edit `api/src/app.module.ts`: add `import { BillingModule } from "./billing/billing.module";` and put `BillingModule` in the imports array (keep existing).
- [ ] **Step 10: verify** — `npm --prefix api test` (entitlement + admin.guard + billing-keys + all F1 specs green); `npm --prefix api run build` succeeds.
- [ ] **Step 11: Commit** — `git add api/ && git commit -m "feat(api): AdminGuard + billing entitlement/payment create+submit (+Jest)"`

---

## Task 3: billing admin list/approve/reject (GSI + conditional claim)

**Files:**
- Modify: `api/src/billing/billing.service.ts`, `api/src/billing/billing.controller.ts`
- Test: `api/src/billing/billing.service.spec.ts` (create)

**Interfaces:**
- Consumes: T2's BillingService + `AdminGuard` + `AdminDecideDto`/`AdminListQueryDto`.
- Produces (frontend admin): `listPayments(status)→[{userId,code,amount,status,created_at,note}]`; `approve({userId,code})→{ok,expires_at}` (idempotent); `reject({userId,code})→{ok}`.

- [ ] **Step 1: failing test `api/src/billing/billing.service.spec.ts`** — unit-test approve idempotency by mocking `DynamoService.doc.send` per command.
```ts
import { BillingService } from "./billing.service";
function svcWith(sends: any[]) {
  let i = 0;
  const doc = { send: jest.fn(async () => sends[i++]) };
  const dyn = { doc, billingTable: "ip_billing" } as any;
  const config = { get: (k: string) => ({ PRICE_VND: 49000, PLAN_DAYS: 30 } as any)[k] } as any;
  return { svc: new BillingService(dyn, config), doc };
}
describe("BillingService.approve", () => {
  it("claims a pending payment then grants/extends the entitlement", async () => {
    // 1) UpdateCommand claim OK; 2) GetCommand entitlement (none); 3) PutCommand entitlement
    const { svc, doc } = svcWith([{}, { Item: undefined }, {}]);
    const out = await svc.approve({ userId: "u1", code: "PRO-1" });
    expect(out.ok).toBe(true);
    expect(typeof out.expires_at).toBe("string");
    expect(doc.send).toHaveBeenCalledTimes(3);
  });
  it("is idempotent when the payment is already approved (claim fails, status already approved)", async () => {
    const err: any = new Error("cond"); err.name = "ConditionalCheckFailedException";
    const doc = { send: jest.fn()
      .mockRejectedValueOnce(err)                              // claim fails
      .mockResolvedValueOnce({ Item: { status: "approved" } }) // re-read: already approved
    };
    const dyn = { doc, billingTable: "ip_billing" } as any;
    const config = { get: (k: string) => ({ PLAN_DAYS: 30 } as any)[k] } as any;
    const out = await new BillingService(dyn, config).approve({ userId: "u1", code: "PRO-1" });
    expect(out.ok).toBe(true);
    expect(doc.send).toHaveBeenCalledTimes(2); // no entitlement write on the idempotent path
  });
});
```
Run: `npm --prefix api test -- billing.service` → FAIL.
- [ ] **Step 2: add admin methods to `billing.service.ts`** — import `QueryCommand`, `DeleteCommand` not needed; add `parsePaymentCode` + `isActive`/`extendExpiry` imports. Append:
```ts
// add to imports: QueryCommand from "@aws-sdk/lib-dynamodb"; parsePaymentCode from "./billing-keys"; isActive, extendExpiry from "./entitlement"
async listPayments(status: string) {
  const r = await this.dyn.doc.send(new QueryCommand({
    TableName: this.t(), IndexName: "status-index",
    KeyConditionExpression: "gsi1pk = :s",
    ExpressionAttributeValues: { ":s": payStatusPk(status) },
  }));
  return (r.Items || []).map((it: any) => ({
    userId: String(it.pk).replace(/^USER#/, ""), code: it.code, amount: it.amount,
    status: it.status, created_at: it.created_at, note: it.note ?? null,
  }));
}
private async claim(userId: string, code: string, next: "approved" | "rejected") {
  try {
    await this.dyn.doc.send(new UpdateCommand({
      TableName: this.t(), Key: { pk: userPk(userId), sk: paymentSk(code) },
      UpdateExpression: "SET #s = :next, gsi1pk = :gpk, decided_at = :now",
      ConditionExpression: "#s IN (:pending, :submitted)",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":next": next, ":gpk": payStatusPk(next), ":now": this.now(), ":pending": "pending", ":submitted": "submitted" },
    }));
    return "claimed" as const;
  } catch (e: any) {
    if (e.name !== "ConditionalCheckFailedException") throw e;
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: paymentSk(code) } }));
    const cur = (r.Item as any)?.status;
    if (cur === next) return "already" as const; // idempotent
    throw new BadRequestException(cur ? `payment is ${cur}` : "payment not found");
  }
}
async approve({ userId, code }: { userId: string; code: string }) {
  const res = await this.claim(userId, code, "approved");
  if (res === "already") return { ok: true };
  const days = Number(this.config.get("PLAN_DAYS") || 30);
  const g = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: ENTITLEMENT_SK } }));
  const cur = (g.Item as Entitlement) || null;
  const expires_at = extendExpiry(this.now(), cur?.expires_at ?? null, days);
  await this.dyn.doc.send(new PutCommand({
    TableName: this.t(),
    Item: { pk: userPk(userId), sk: ENTITLEMENT_SK, tier: "pro", status: "active", expires_at, source: "manual", updated_at: this.now() },
  }));
  return { ok: true, expires_at };
}
async reject({ userId, code }: { userId: string; code: string }) {
  const res = await this.claim(userId, code, "rejected");
  return { ok: true, idempotent: res === "already" };
}
```
(Note: `isActive` import not strictly needed here; import only what you use. Keep `QueryCommand`, `GetCommand`, `PutCommand`, `UpdateCommand`, `parsePaymentCode` unused-free.)
- [ ] **Step 3: add admin routes to `billing.controller.ts`**
```ts
// add imports: Get already present; Query from "@nestjs/common"; AdminGuard from "./admin.guard"; AdminDecideDto, AdminListQueryDto from "./dto"
import { Query } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { AdminDecideDto, AdminListQueryDto } from "./dto";
// ...inside the class:
@Get("admin/payments")
@UseGuards(JwtAuthGuard, AdminGuard)
adminList(@Query() q: AdminListQueryDto) { return this.svc.listPayments(q.status); }
@Post("admin/payment/approve")
@UseGuards(JwtAuthGuard, AdminGuard)
adminApprove(@Body() b: AdminDecideDto) { return this.svc.approve(b); }
@Post("admin/payment/reject")
@UseGuards(JwtAuthGuard, AdminGuard)
adminReject(@Body() b: AdminDecideDto) { return this.svc.reject(b); }
```
(The controller-level `@UseGuards(JwtAuthGuard)` already applies; the method-level `@UseGuards(JwtAuthGuard, AdminGuard)` re-declares both so AdminGuard runs after auth. This is intentional — do not remove the class-level guard.)
- [ ] **Step 4: verify** — `npm --prefix api test -- billing.service` PASS (both cases); full `npm --prefix api test` green; `npm --prefix api run build` succeeds.
- [ ] **Step 5: Commit** — `git add api/ && git commit -m "feat(api): billing admin list/approve/reject (GSI + conditional claim)"`

---

## Task 4: Pro content module (bundled data, entitlement-gated)

**Files:**
- Create: `api/src/pro/content.data.ts`, `api/src/pro/pro.service.ts`, `api/src/pro/pro.controller.ts`, `api/src/pro/pro.module.ts`
- Test: `api/src/pro/pro.service.spec.ts`
- Modify: `api/src/app.module.ts`
- Source to convert: `supabase/seed/pro_content_seed.sql`

**Interfaces:**
- Consumes: `BillingService.getEntitlement(userId)` (returns `{isPro}`), `JwtAuthGuard` + `@CurrentUser()`.
- Produces: `GET /v1/pro/catalog → [{topic_id, position, title}]`; `GET /v1/pro/content/:topicId → {sections:[{position,title,section}]}` (403 when not Pro). `content.data.ts` exports `PRO_CONTENT: Array<{topic_id:string; position:number; title:{vi:string;en:string}; section:any}>`.

- [ ] **Step 1: `api/src/pro/content.data.ts`** — CONVERT the seed. Open `supabase/seed/pro_content_seed.sql`; each `pro_content` row (`topic_id`, `position`, `section` jsonb) and its matching `pro_catalog` title (`title` jsonb `{vi,en}`) becomes one entry. This is a mechanical data transcription (no logic) — reproduce every section object verbatim from the seed's JSONB.
```ts
export interface ProSection { topic_id: string; position: number; title: { vi: string; en: string }; section: any; }
export const PRO_CONTENT: ProSection[] = [
  // one object per pro_content row, e.g.:
  // { topic_id: "<from seed>", position: 0, title: { vi: "…", en: "…" }, section: { /* verbatim jsonb from seed */ } },
  // ...transcribe ALL rows from supabase/seed/pro_content_seed.sql
];
```
Verification that the conversion is complete is in Step 5 (counts must match the seed).
- [ ] **Step 2: failing test `api/src/pro/pro.service.spec.ts`**
```ts
import { ProService } from "./pro.service";
const billing = (isPro: boolean) => ({ getEntitlement: async () => ({ isPro }) }) as any;
describe("ProService", () => {
  it("catalog returns teasers (no section body)", async () => {
    const svc = new ProService(billing(false));
    const cat = await svc.catalog();
    expect(Array.isArray(cat)).toBe(true);
    if (cat.length) { expect(cat[0]).toHaveProperty("title"); expect(cat[0]).not.toHaveProperty("section"); }
  });
  it("content: 403-style null/throw when not Pro, sections when Pro", async () => {
    const topic = require("./content.data").PRO_CONTENT[0]?.topic_id;
    if (!topic) return; // seed empty guard
    await expect(new ProService(billing(false)).sections("nobody", topic)).rejects.toThrow();
    const out = await new ProService(billing(true)).sections("u1", topic);
    expect(Array.isArray(out.sections)).toBe(true);
    expect(out.sections[0]).toHaveProperty("section");
  });
});
```
Run: `npm --prefix api test -- pro.service` → FAIL.
- [ ] **Step 3: `api/src/pro/pro.service.ts`**
```ts
import { Injectable, ForbiddenException } from "@nestjs/common";
import { BillingService } from "../billing/billing.service";
import { PRO_CONTENT } from "./content.data";
@Injectable()
export class ProService {
  constructor(private readonly billing: BillingService) {}
  async catalog() {
    return PRO_CONTENT.map((r) => ({ topic_id: r.topic_id, position: r.position, title: r.title }))
      .sort((a, b) => a.topic_id.localeCompare(b.topic_id) || a.position - b.position);
  }
  async sections(userId: string, topicId: string) {
    const ent = await this.billing.getEntitlement(userId);
    if (!ent.isPro) throw new ForbiddenException("pro required");
    const sections = PRO_CONTENT.filter((r) => r.topic_id === topicId)
      .sort((a, b) => a.position - b.position)
      .map((r) => ({ position: r.position, title: r.title, section: r.section }));
    return { sections };
  }
}
```
- [ ] **Step 4: `api/src/pro/pro.controller.ts` + `pro.module.ts`**
```ts
// pro.controller.ts
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { ProService } from "./pro.service";
@Controller("v1/pro")
@UseGuards(JwtAuthGuard)
export class ProController {
  constructor(private readonly svc: ProService) {}
  @Get("catalog") catalog() { return this.svc.catalog(); }
  @Get("content/:topicId") content(@CurrentUser() u: AuthUser, @Param("topicId") id: string) { return this.svc.sections(u.id, id); }
}
```
```ts
// pro.module.ts — imports BillingModule to reuse BillingService
import { Module } from "@nestjs/common";
import { ProService } from "./pro.service";
import { ProController } from "./pro.controller";
import { BillingModule } from "../billing/billing.module";
@Module({ imports: [BillingModule], controllers: [ProController], providers: [ProService] })
export class ProContentModule {}
```
For `ProService` to inject `BillingService`, `BillingModule` must export it — edit `api/src/billing/billing.module.ts` to add `exports: [BillingService]`. Then edit `app.module.ts` to import `ProContentModule`.
- [ ] **Step 5: verify** — `npm --prefix api test -- pro.service` PASS; full `npm --prefix api test` green; `npm --prefix api run build` succeeds. Confirm the conversion is complete: the number of `PRO_CONTENT` entries equals the `pro_content` INSERT row count in `supabase/seed/pro_content_seed.sql` (grep the seed for row count and compare) — log the two counts.
- [ ] **Step 6: Commit** — `git add api/ && git commit -m "feat(api): pro content module (bundled data, entitlement-gated)"`

---

## Task 5: Frontend `IP.pro` routes billing/pro through the API (Supabase fallback)

**Files:**
- Modify: `assets/js/pro.js`
- Test: `tests/pro.test.js` (create)

**Interfaces:**
- Consumes `IP.api` (`configured()`, `get`, `post`). Keeps pure helpers `genProCode`/`extendExpiry`/`vietqrUrl`/`isAdmin` and their exports.
- Produces new `IP.pro` methods for app.js call sites: `createPayment(plan?)`, `submitPayment(code)`, `adminListPayments(status)`, `adminApprove(userId,code)`, `adminReject(userId,code)`. `init`/`isPro`/`catalog`/`sections` route via API when configured.

> **DESIGN NOTE:** `IP.api` returns the API `entitlement` view `{tier,status,expires_at,isPro}`. When configured, cache that as `_ent` and make `isPro()` honor `_ent.isPro` directly (the server already computed it). When NOT configured, keep the exact current Supabase behavior. Do NOT delete the Supabase branches.

- [ ] **Step 1: failing test `tests/pro.test.js`** (node --test; mock `IP.api`)
```js
const { test } = require("node:test");
const assert = require("node:assert");
const pro = require("../assets/js/pro.js");
function withApi(configured, calls) {
  global.window = global;
  global.IP = { api: {
    configured: () => configured,
    get: async (p) => { calls.push(["get", p]); return p === "/v1/billing/entitlement" ? { tier: "pro", status: "active", expires_at: "2999-01-01T00:00:00Z", isPro: true } : { sections: [] }; },
    post: async (p, b) => { calls.push(["post", p, b]); return { code: "PRO-X", amount: 49000, vietqr: { url: "u" } }; },
  }, auth: { client: () => null, getUser: () => ({ id: "u1" }) } };
}
test("init + isPro use the API entitlement when configured", async () => {
  const calls = []; withApi(true, calls);
  await pro.init();
  assert.ok(calls.some((c) => c[1] === "/v1/billing/entitlement"));
  assert.strictEqual(pro.isPro(), true);
});
test("createPayment posts to the API when configured", async () => {
  const calls = []; withApi(true, calls);
  const r = await pro.createPayment();
  assert.deepStrictEqual(calls.find((c) => c[0] === "post")[1], "/v1/billing/payment");
  assert.strictEqual(r.code, "PRO-X");
});
test("not configured => no IP.api calls (Supabase fallback path)", async () => {
  const calls = []; withApi(false, calls);
  await pro.init().catch(() => {});
  assert.strictEqual(calls.length, 0);
});
```
Run: `node --test tests/` → new tests FAIL.
- [ ] **Step 2: refactor `assets/js/pro.js`** — add a lazy `_api()` accessor and gate the data calls. Keep every existing Supabase branch as the else.
```js
function _api() { return root.IP && root.IP.api; }
function _apiOn() { const a = _api(); return !!(a && a.configured && a.configured()); }
```
Rewrite `init` head:
```js
async function init() {
  const a = _auth();
  const user = a && a.getUser();
  if (!user) { _ent = null; _emit(); return; }
  if (_apiOn()) {
    try { _ent = await _api().get("/v1/billing/entitlement"); } catch (e) { _ent = null; }
    _emit(); return;
  }
  // ---- existing Supabase branch unchanged below ----
  const c = _client(); /* ...existing code... */
}
```
Make `isPro` honor the API view when present:
```js
function isPro() {
  if (_ent && typeof _ent.isPro === "boolean") return _ent.isPro; // API entitlement view
  return !!(_ent && _ent.status === "active" && Date.parse(_ent.expires_at) > Date.now()); // Supabase row
}
```
Gate `catalog` (API → `GET /v1/pro/catalog`, group by topic_id into the same Map shape; else existing Supabase) and `sections` (API → `if(!isPro()) return null; return (await _api().get("/v1/pro/content/"+topicId)).sections`; else existing Supabase). Add new methods:
```js
async function createPayment(plan) { return _apiOn() ? _api().post("/v1/billing/payment", plan ? { plan } : {}) : _supabaseCreatePayment(plan); }
async function submitPayment(code) { return _apiOn() ? _api().post("/v1/billing/payment/" + encodeURIComponent(code) + "/submit", {}) : _supabaseSubmit(code); }
async function adminListPayments(status) { return _apiOn() ? _api().get("/v1/billing/admin/payments?status=" + encodeURIComponent(status)) : _supabaseAdminList(status); }
async function adminApprove(userId, code) { return _apiOn() ? _api().post("/v1/billing/admin/payment/approve", { userId, code }) : _supabaseApprove(userId, code); }
async function adminReject(userId, code) { return _apiOn() ? _api().post("/v1/billing/admin/payment/reject", { userId, code }) : _supabaseReject(userId, code); }
```
For the Supabase fallback helpers (`_supabaseCreatePayment`, etc.): locate the current buy/submit/admin flow (run `grep -rn "payment_requests\|approve-payment\|functions.invoke" assets/js/`); if that logic currently lives in `app.js`, move the minimal Supabase calls into these named helpers in `pro.js` (so both branches live behind one `IP.pro` API), and update the app.js call sites to call `IP.pro.createPayment/submitPayment/adminApprove/...`. If a flow does not exist yet in the fallback, the helper may return a `Promise.reject(new Error("api-not-configured"))` — but preserve any behavior that exists today. Add all new methods to the returned object.
- [ ] **Step 3: run** — `node --test tests/` → all green (≥ prior count + 3 new). `node --check assets/js/pro.js`.
- [ ] **Step 4: Commit** — `git add assets/js/pro.js tests/pro.test.js && git commit -m "feat(web): IP.pro routes billing/pro through API (Supabase fallback)"`

---

## Task 6: `entitlements` + `payment_requests` → `ip_billing` backfill

**Files:**
- Create: `api/scripts/backfill-billing.ts`
- Modify: `api/package.json` (add `"backfill-billing": "ts-node scripts/backfill-billing.ts"`; ensure `pg`/`@types/pg` devDependencies — added in F1's backfill task; add if missing)

**Interfaces:** standalone `ts-node` script; reads Supabase Postgres via `pg` (env `SUPABASE_DB_URL`); writes `ip_billing` items via `@aws-sdk/lib-dynamodb` `BatchWriteCommand` (≤25), idempotent. Uses `userPk`, `ENTITLEMENT_SK`, `paymentSk`, `payStatusPk`.

- [ ] **Step 1: `api/scripts/backfill-billing.ts`**
```ts
import { Client } from "pg";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { userPk } from "../src/db/keys";
import { ENTITLEMENT_SK, paymentSk, payStatusPk } from "../src/billing/billing-keys";

const DRY = process.argv.includes("--dry");
const table = process.env.DDB_BILLING_TABLE || "ip_billing";
const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const creds = process.env.AWS_ACCESS_KEY_ID
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } } : {};
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}), ...creds }), { marshallOptions: { removeUndefinedValues: true } });
const iso = (v: any) => (v ? new Date(v).toISOString() : null);

async function batch(items: any[]) {
  if (DRY || !items.length) return;
  for (let i = 0; i < items.length; i += 25) {
    await doc.send(new BatchWriteCommand({ RequestItems: { [table]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) } }));
  }
}
(async () => {
  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }); // Supabase pooler: cert chain not bundled
  await pg.connect();
  const items: any[] = [];
  const ents = await pg.query("select user_id, tier, status, expires_at, source, updated_at from public.entitlements");
  for (const e of ents.rows) {
    items.push({ pk: userPk(e.user_id), sk: ENTITLEMENT_SK, tier: e.tier || "pro", status: e.status || "active",
      expires_at: iso(e.expires_at), source: e.source || "manual", updated_at: iso(e.updated_at) || new Date().toISOString() });
  }
  const pays = await pg.query("select id, user_id, code, plan, amount, status, note, created_at, decided_at from public.payment_requests");
  for (const p of pays.rows) {
    const created_at = iso(p.created_at) || new Date().toISOString();
    items.push({ pk: userPk(p.user_id), sk: paymentSk(p.code), code: p.code, plan: p.plan, amount: p.amount,
      status: p.status, note: p.note ?? null, created_at, decided_at: iso(p.decided_at),
      gsi1pk: payStatusPk(p.status), gsi1sk: created_at });
  }
  console.log(`${DRY ? "[DRY] " : ""}entitlements=${ents.rowCount} payments=${pays.rowCount} items=${items.length}`);
  await batch(items);
  await pg.end();
  console.log(DRY ? "[DRY] no writes" : "backfill complete");
})().catch((e) => { console.error(e); process.exit(1); });
```
- [ ] **Step 2: verify (offline)** — `npm --prefix api install` (pg present); `npm --prefix api run build` or `./node_modules/.bin/tsc --noEmit` type-checks the script; full `npm --prefix api test` still green. Do NOT run against a live DB.
- [ ] **Step 3: Commit** — `git add api/ && git commit -m "feat(api): entitlements+payments → ip_billing backfill script"`

---

## Task 7: `DEPLOY-PHASE-F2.md`

**Files:** Create `docs/superpowers/DEPLOY-PHASE-F2.md`.

- [ ] **Step 1: write the runbook** — sections, placeholders only (no real secrets):
  1. **DynamoDB**: extend the IAM policy for `ip_billing` (Query/GetItem/PutItem/UpdateItem/BatchWriteItem/DescribeTable/CreateTable) AND its index `arn:aws:dynamodb:<region>:<account-id>:table/ip_billing/index/status-index` (Query). Run `AWS_REGION=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… DDB_BILLING_TABLE=ip_billing npm --prefix api run create-billing-table`.
  2. **Render env** (add to the existing F1 service): `ADMIN_UIDS=<your-uuid>`, `DDB_BILLING_TABLE=ip_billing`, and (optional, defaults exist) `VIETQR_BANK`/`VIETQR_ACCT`/`VIETQR_NAME`/`PRICE_VND`/`PLAN_DAYS`. Redeploy.
  3. **Backfill once** (`--dry` first): `SUPABASE_DB_URL=<pooler> AWS_REGION=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… DDB_BILLING_TABLE=ip_billing npm --prefix api run backfill-billing -- --dry` then without `--dry`.
  4. **Local dev**: `docker compose -f api/docker-compose.dev.yml up -d`; `DDB_ENDPOINT=http://localhost:8001 DDB_BILLING_TABLE=ip_billing npm --prefix api run create-billing-table`; run the API with `DDB_ENDPOINT` + `ADMIN_UIDS` set.
  5. **Acceptance checklist**: entitlement=free by default; buy → VietQR renders → submit → admin approve → `isPro` true across devices; free user `GET /v1/pro/content/:id` → 403, Pro user → 200; non-admin admin call → 403; double-approve idempotent; `API_URL` empty → IP.pro still works via Supabase. Secrets only in env, never in repo.
- [ ] **Step 2: Commit** — `git add docs/superpowers/DEPLOY-PHASE-F2.md && git commit -m "docs: DEPLOY-PHASE-F2 (billing table + GSI + IAM + ADMIN_UIDS + backfill)"`

---

## Self-Review (run against the spec)

1. **Spec coverage:** §4 table+GSI → T1; §6 entitlement/payment/create/submit → T2; admin list/approve/reject → T3; §5 Pro content bundled+gated → T4; §7 frontend IP.pro → T5; §8 backfill → T6; §10/§13 deploy → T7. Unit + e2e + live run: unit in T2/T3/T4, frontend in T5; e2e gated on DDB_ENDPOINT + live run are executed by the SDD controller before merge (as in F1). ✔
2. **Placeholders:** content.data.ts is bulk data transcription from a named source file with a count-match verification (not a logic placeholder); the frontend fallback helpers step names the grep to locate call sites (refactor-integration, not a code placeholder). No TBD/TODO. ✔
3. **Type consistency:** `getEntitlement`→`{tier,status,expires_at,isPro}` used by ProService + frontend; `paymentSk/payStatusPk/ENTITLEMENT_SK` consistent across T1/T2/T3/T6; `approve/reject({userId,code})` matches controller body `AdminDecideDto` + frontend `adminApprove(userId,code)`; GSI `status-index`/`gsi1pk`/`gsi1sk` consistent T1↔T3↔T6; VietQR params + `PRICE_VND`/`PLAN_DAYS` env names consistent T2↔spec↔T7. ✔
