# Phase F1 — NestJS API skeleton + Progress domain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đứng một API NestJS (modular monolith) phục vụ dữ liệu học qua **DynamoDB single-table** (NoSQL, AWS-native), thay blob JSONB + merge-client bằng REST API + merge-server; frontend tĩnh gọi API qua JWT Supabase.

**Architecture:** `api/` = NestJS 10 app riêng trong repo (GitHub Pages chỉ serve root, bỏ qua `api/`). Domain progress lưu ở **DynamoDB** (một datastore RIÊNG — pattern database-per-service của microservices); Supabase Postgres vẫn giữ Auth + các bảng cũ (profiles/entitlements/payments/chat/gmail), F1 KHÔNG đụng tới. Single-table: PK=`USER#<userId>`, SK=`TOPIC#… / CARD#… / QUIZ#… / BOOK#… / STREAK / SETTINGS`; snapshot = một Query theo partition. `JwtAuthGuard` verify JWT Supabase (HS256, `SUPABASE_JWT_SECRET`). `ProgressModule` cung cấp snapshot/sync/CRUD. Frontend thêm `IP.api` + chuyển `IP.sync` sang API (fallback local khi `API_URL` rỗng).

**Tech Stack:** NestJS 10, AWS SDK v3 (`@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`), `jsonwebtoken` (verify HS256), Jest + supertest (API), `node --test` (frontend), DynamoDB Local (dev qua Docker), Docker + Render.

## Global Constraints
- **Node 18** (env: v18.20.8). Pin **NestJS 10.x**, **AWS SDK v3** (`@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`, ^3.x), `jsonwebtoken@9` — đều chạy Node 18. KHÔNG dùng NestJS 11 (tránh rủi ro engine). KHÔNG dùng Prisma (đã bỏ; progress dùng DynamoDB).
- **`api/` là workspace tách biệt** (own `package.json`); frontend tĩnh ở root KHÔNG đổi kiến trúc no-build; GitHub Pages bỏ qua `api/`.
- **Không secret trong repo.** API đọc secrets/config từ env: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (prod: có thể dùng IAM role thay 2 biến này), `DDB_TABLE`, `DDB_ENDPOINT` (chỉ set khi chạy DynamoDB Local — prod để trống), `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`, `PORT`. `config.js` (frontend) chỉ thêm `API_URL` (public; rỗng ⇒ local-only).
- **Auth**: mọi route `/v1/*` cần `Authorization: Bearer <supabase access_token>`; guard verify chữ ký HS256 + `exp`, gắn `req.user = { id: payload.sub, email: payload.email }`. `/health` không auth.
- **Authz**: mọi truy vấn DynamoDB khoá theo partition key `USER#<currentUser.id>`. Không tin `user_id` từ body/param — user id chỉ lấy từ JWT đã verify.
- **KHÔNG dùng model Fable** ở bất kỳ đâu (không liên quan F1 nhưng giữ quy ước).
- **DB tách biệt, đừng phá Postgres**: progress nằm trong DynamoDB single-table RIÊNG. Supabase Postgres (Auth + profiles/entitlements/payments/chat/gmail) GIỮ NGUYÊN, F1 không introspect/migrate/sửa gì trên Postgres. Không FK chéo DB — cách ly bảo đảm bằng partition key. Bảng `user_state` (JSONB) trên Postgres giữ tạm để backfill + fallback, đánh dấu deprecated.
- **Frontend fallback**: `API_URL` rỗng ⇒ `IP.api` báo "không cấu hình", `IP.sync` chạy local-only (không lỗi, không mất tính năng học offline).
- **Suite**: `node --test tests/` giữ **60/60 + test mới**; `npm --prefix api test` xanh.
- CORS: chỉ `https://kyle41io.github.io` + `http://localhost:8000` (đọc từ `ALLOWED_ORIGINS`, phân tách phẩy).
- **Line numbers ước lượng — locate bằng grep.**

## File Structure
**Create (API):** `api/package.json` `api/tsconfig.json` `api/tsconfig.build.json` `api/nest-cli.json` `api/.gitignore` `api/.env.example` `api/Dockerfile` `api/render.yaml` `api/src/main.ts` `api/src/app.module.ts` `api/src/config/config.module.ts` `api/src/health/health.controller.ts` `api/src/db/keys.ts` `api/src/db/keys.spec.ts` `api/src/db/dynamo.service.ts` `api/src/db/dynamo.module.ts` `api/scripts/create-table.ts` `api/docker-compose.dev.yml` `api/src/auth/jwt.guard.ts` `api/src/auth/current-user.decorator.ts` `api/src/auth/auth.module.ts` `api/src/progress/dto.ts` `api/src/progress/merge.ts` `api/src/progress/progress.service.ts` `api/src/progress/progress.controller.ts` `api/src/progress/progress.module.ts` `api/src/progress/merge.spec.ts` `api/src/auth/jwt.guard.spec.ts` `api/test/app.e2e-spec.ts` `api/scripts/backfill.ts`
**Remove (API, from Task 1's abandoned Prisma commit `ed29d1f`):** `api/src/prisma/` (schema.prisma, prisma.service.ts, prisma.module.ts, migrations/).
**Create (web):** `assets/js/api.js` `tests/api.test.js` `docs/superpowers/DEPLOY-PHASE-F1.md`
**Modify (web):** `assets/js/config.js` (+`API_URL`), `index.html` (+`api.js` script), `assets/js/sync.js` (use API), `tests/sync.test.js` (if exists — keep merge tests green).

**Note on running commands:** all `npm` commands for the API run with `--prefix api` or from inside `api/`. The frontend has no build.

---

## Task 1: Scaffold NestJS app + config + health + deploy files

**Files:** Create all `api/` root config files + `main.ts` + `app.module.ts` + `config` + `health` + `Dockerfile` + `render.yaml`.
**Interfaces:** Produces a bootable NestJS app on `PORT` (default 3000) with `GET /health` → `{status:"ok"}`, CORS from `ALLOWED_ORIGINS`, global prefix NONE (health at root; `/v1` set per-controller).

- [ ] **Step 1: `api/package.json`**
```json
{
  "name": "interview-prep-api",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=18.18 <21" },
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.json",
    "prisma:generate": "prisma generate --schema src/prisma/schema.prisma",
    "prisma:migrate": "prisma migrate deploy --schema src/prisma/schema.prisma",
    "backfill": "ts-node scripts/backfill.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/config": "^3.2.0",
    "@prisma/client": "^5.22.0",
    "jsonwebtoken": "^9.0.2",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/testing": "^10.4.0",
    "@types/jest": "^29.5.12",
    "@types/node": "^18.19.0",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.ts$": "ts-jest" },
    "testEnvironment": "node"
  }
}
```
- [ ] **Step 2: `api/tsconfig.json`**, **`api/tsconfig.build.json`**, **`api/nest-cli.json`**
```json
// tsconfig.json
{ "compilerOptions": { "module": "commonjs", "target": "ES2021", "declaration": false, "emitDecoratorMetadata": true, "experimentalDecorators": true, "sourceMap": true, "outDir": "./dist", "baseUrl": "./", "strict": true, "skipLibCheck": true, "esModuleInterop": true, "resolveJsonModule": true } }
```
```json
// tsconfig.build.json
{ "extends": "./tsconfig.json", "exclude": ["node_modules", "dist", "test", "**/*.spec.ts", "scripts"] }
```
```json
// nest-cli.json
{ "$schema": "https://json.schemastore.org/nest-cli", "collection": "@nestjs/schematics", "sourceRoot": "src", "compilerOptions": { "deleteOutDir": true } }
```
- [ ] **Step 3: `api/.gitignore`** (`node_modules`, `dist`, `.env`, `*.log`) and **`api/.env.example`**:
```
DATABASE_URL=postgresql://postgres:<pwd>@<host>:6543/postgres?pgbouncer=true
SUPABASE_JWT_SECRET=
ALLOWED_ORIGINS=https://kyle41io.github.io,http://localhost:8000
PORT=3000
```
- [ ] **Step 4: `api/src/config/config.module.ts`**
```ts
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
@Global()
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true })] })
export class AppConfigModule {}
```
- [ ] **Step 5: `api/src/health/health.controller.ts`**
```ts
import { Controller, Get } from "@nestjs/common";
@Controller("health")
export class HealthController {
  @Get() check() { return { status: "ok" }; }
}
```
- [ ] **Step 6: `api/src/app.module.ts`** (Prisma/Auth/Progress modules added in later tasks — for now just config + health)
```ts
import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { HealthController } from "./health/health.controller";
@Module({ imports: [AppConfigModule], controllers: [HealthController] })
export class AppModule {}
```
- [ ] **Step 7: `api/src/main.ts`**
```ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:8000").split(",").map(s => s.trim());
  app.enableCors({ origin: origins, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["authorization", "content-type"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```
- [ ] **Step 8: `api/Dockerfile`** (multi-stage, for future AWS)
```dockerfile
FROM node:18-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate --schema src/prisma/schema.prisma && npm run build
FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma ./src/prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```
- [ ] **Step 9: `api/render.yaml`**
```yaml
services:
  - type: web
    name: interview-prep-api
    runtime: node
    rootDir: api
    buildCommand: npm install && npx prisma generate --schema src/prisma/schema.prisma && npm run build
    startCommand: node dist/main.js
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SUPABASE_JWT_SECRET
        sync: false
      - key: ALLOWED_ORIGINS
        value: https://kyle41io.github.io,http://localhost:8000
```
- [ ] **Step 10: Install + build + smoke** — `npm --prefix api install` (network needed; if offline, note it). Then `npm --prefix api run build` → `dist/` created. Start: `PORT=3000 node api/dist/main.js &` then `curl -s localhost:3000/health` → `{"status":"ok"}`. Kill the process.
  Expected: build succeeds, health returns ok. (If `npm install` can't reach network in this env, the reviewer/implementer must flag — the plan assumes install works; do not fake it.)
- [ ] **Step 11: Commit** — `git add api/ && git commit -m "chore(api): scaffold NestJS app + config + health + Dockerfile/render.yaml"`

## Task 2: DynamoDB single-table store + keys + create-table (replaces Prisma)

> **NOTE:** This task replaces the abandoned Prisma commit `ed29d1f`. It removes `api/src/prisma/` and adds the DynamoDB layer. The Dockerfile `npm ci`/`--omit=dev` fixes from `ed29d1f` are DB-agnostic — KEEP them; only remove the `prisma generate` step.

**Files:** Create `api/src/db/keys.ts`, `api/src/db/keys.spec.ts`, `api/src/db/dynamo.service.ts`, `api/src/db/dynamo.module.ts`, `api/scripts/create-table.ts`, `api/docker-compose.dev.yml`. Modify `api/src/app.module.ts` (swap PrismaModule→DynamoModule), `api/package.json` (deps+scripts), `api/Dockerfile` (drop `prisma generate`), `api/.env.example`, `api/render.yaml`. Remove `api/src/prisma/`.
**Interfaces:**
- Produces `keys` (pure): `userPk(userId)→"USER#<id>"`; `topicSk(id)→"TOPIC#<id>"`, `cardSk(key)→"CARD#<key>"`, `quizSk(id)→"QUIZ#<id>"`, `bookSk(id)→"BOOK#<id>"`; constants `STREAK_SK="STREAK"`, `SETTINGS_SK="SETTINGS"`; `parseSk(sk)→{type,id}`. Consumed by ProgressService (T4) + backfill (T8).
- Produces `DynamoService` (injectable, `@Global`): readonly `doc: DynamoDBDocumentClient`, readonly `table: string`. Consumed by ProgressService (T4) + backfill (T8).
- **Single-table design** (`ip_progress`): PK `pk` (S) = `USER#<userId>`, SK `sk` (S) = entity key. Item attrs by type — Topic:`{status,learned_at,updated_at}`, Card:`{due_at,interval,ease,reps,updated_at}`, Quiz:`{best_pct,attempts,updated_at}`, Bookmark:`{created_at}`, Streak(`sk=STREAK`):`{current,longest,last_day,updated_at}`, Settings(`sk=SETTINGS`):`{lang,theme,track_role,track_level,updated_at}`. Snapshot = one `Query(pk=USER#<id>)`.

- [ ] **Step 1: deps** — Edit `api/package.json`: remove `prisma` + `@prisma/client` from deps and any `prisma:*` scripts; add `"@aws-sdk/client-dynamodb": "^3.699.0"` and `"@aws-sdk/lib-dynamodb": "^3.699.0"` to dependencies; add script `"create-table": "ts-node scripts/create-table.ts"`. Run `npm --prefix api install`.
- [ ] **Step 2: failing test `api/src/db/keys.spec.ts`**
```ts
import { userPk, topicSk, cardSk, quizSk, bookSk, STREAK_SK, SETTINGS_SK, parseSk } from "./keys";
describe("keys", () => {
  it("builds partition + sort keys", () => {
    expect(userPk("u1")).toBe("USER#u1");
    expect(topicSk("t1")).toBe("TOPIC#t1");
    expect(cardSk("q1:2")).toBe("CARD#q1:2");
    expect(quizSk("t1")).toBe("QUIZ#t1");
    expect(bookSk("t1")).toBe("BOOK#t1");
  });
  it("round-trips prefixed keys via parseSk (ids may contain '#')", () => {
    expect(parseSk(topicSk("t1"))).toEqual({ type: "TOPIC", id: "t1" });
    expect(parseSk(cardSk("a#b"))).toEqual({ type: "CARD", id: "a#b" });
  });
  it("parses singleton keys", () => {
    expect(parseSk(STREAK_SK)).toEqual({ type: "STREAK", id: "" });
    expect(parseSk(SETTINGS_SK)).toEqual({ type: "SETTINGS", id: "" });
  });
});
```
Run: `npm --prefix api test -- keys` → FAIL (module not found).
- [ ] **Step 3: `api/src/db/keys.ts`**
```ts
export type EntityType = "TOPIC" | "CARD" | "QUIZ" | "BOOK" | "STREAK" | "SETTINGS";
export const STREAK_SK = "STREAK";
export const SETTINGS_SK = "SETTINGS";
export const userPk = (userId: string) => `USER#${userId}`;
export const topicSk = (id: string) => `TOPIC#${id}`;
export const cardSk = (key: string) => `CARD#${key}`;
export const quizSk = (id: string) => `QUIZ#${id}`;
export const bookSk = (id: string) => `BOOK#${id}`;
export function parseSk(sk: string): { type: EntityType; id: string } {
  if (sk === STREAK_SK) return { type: "STREAK", id: "" };
  if (sk === SETTINGS_SK) return { type: "SETTINGS", id: "" };
  const i = sk.indexOf("#");
  return { type: sk.slice(0, i) as EntityType, id: sk.slice(i + 1) };
}
```
Run: `npm --prefix api test -- keys` → PASS.
- [ ] **Step 4: `api/src/db/dynamo.service.ts`**
```ts
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
@Injectable()
export class DynamoService implements OnModuleDestroy {
  private readonly client: DynamoDBClient;
  readonly doc: DynamoDBDocumentClient;
  readonly table: string;
  constructor(config: ConfigService) {
    const region = config.get<string>("AWS_REGION") || "us-east-1";
    const endpoint = config.get<string>("DDB_ENDPOINT") || undefined; // set for DynamoDB Local
    const accessKeyId = config.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = config.get<string>("AWS_SECRET_ACCESS_KEY");
    this.table = config.get<string>("DDB_TABLE") || "ip_progress";
    this.client = new DynamoDBClient({
      region,
      ...(endpoint ? { endpoint } : {}),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    this.doc = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  onModuleDestroy() { this.client?.destroy(); }
}
```
- [ ] **Step 5: `api/src/db/dynamo.module.ts`** (global)
```ts
import { Global, Module } from "@nestjs/common";
import { DynamoService } from "./dynamo.service";
@Global()
@Module({ providers: [DynamoService], exports: [DynamoService] })
export class DynamoModule {}
```
Then edit `api/src/app.module.ts`: remove the `PrismaModule` import + entry, add `import { DynamoModule } from "./db/dynamo.module";` and put `DynamoModule` in the imports array (keep AppConfigModule + HealthController).
- [ ] **Step 6: `api/scripts/create-table.ts`** (idempotent — safe to re-run; used for DynamoDB Local + AWS)
```ts
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DDB_ENDPOINT || undefined;
const table = process.env.DDB_TABLE || "ip_progress";
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
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" },
    ],
  }));
  console.log(`Created table ${table}.`);
})().catch((e) => { console.error(e); process.exit(1); });
```
- [ ] **Step 7: `api/docker-compose.dev.yml`** (local DynamoDB; host port 8001 to avoid clashing with the frontend dev server on 8000)
```yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
    ports: ["8001:8000"]
```
- [ ] **Step 8: env + deploy files**
  - `api/.env.example`: remove `DATABASE_URL`; add (placeholders only) `AWS_REGION=us-east-1`, `AWS_ACCESS_KEY_ID=`, `AWS_SECRET_ACCESS_KEY=`, `DDB_TABLE=ip_progress`, `DDB_ENDPOINT=` (empty in prod; `http://localhost:8001` for local). Keep `SUPABASE_JWT_SECRET=`, `ALLOWED_ORIGINS=...`, `PORT=3000`.
  - `api/render.yaml`: replace the `DATABASE_URL` env key with `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DDB_TABLE` (sync:false so set in dashboard). Keep `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`.
  - `api/Dockerfile`: remove the `RUN npx prisma generate` (or `prisma generate`) line. KEEP the `npm ci` + `--omit=dev`/prune fixes from `ed29d1f`.
- [ ] **Step 9: remove Prisma** — `git rm -r api/src/prisma` (delete schema.prisma, prisma.service.ts, prisma.module.ts, migrations/).
- [ ] **Step 10: verify (offline)** — `npm --prefix api install` (aws-sdk added), `npm --prefix api run build` (nest build succeeds with DynamoModule), `npm --prefix api test` (keys spec passes). Do NOT run `create-table` or hit DynamoDB in the build — table creation + connectivity need DynamoDB Local/AWS and are documented in Task 8. `grep -r "@prisma\|PrismaService\|DATABASE_URL" api/src` returns nothing.
- [ ] **Step 11: Commit** — `git add api/ && git rm -r --cached api/src/prisma 2>/dev/null; git commit -m "feat(api): DynamoDB single-table progress store + keys + create-table (replaces Prisma)"`

## Task 3: JWT auth guard (Supabase) + CurrentUser

**Files:** Create `api/src/auth/jwt.guard.ts`, `current-user.decorator.ts`, `auth.module.ts`, `jwt.guard.spec.ts`.
**Interfaces:** Produces `JwtAuthGuard` (throws `UnauthorizedException` on missing/invalid/expired token; sets `req.user = {id,email}`) and `@CurrentUser()` param decorator returning `{ id: string; email?: string }`.

- [ ] **Step 1: Failing test `jwt.guard.spec.ts`**
```ts
import { JwtAuthGuard } from "./jwt.guard";
import { UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
const SECRET = "test-secret";
function ctx(auth?: string) {
  const req: any = { headers: auth ? { authorization: auth } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}
describe("JwtAuthGuard", () => {
  const guard = new JwtAuthGuard({ get: () => SECRET } as any);
  it("rejects missing token", () => { expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException); });
  it("rejects bad signature", () => {
    const t = jwt.sign({ sub: "u1" }, "wrong"); expect(() => guard.canActivate(ctx("Bearer " + t))).toThrow(UnauthorizedException);
  });
  it("rejects expired", () => {
    const t = jwt.sign({ sub: "u1", exp: Math.floor(Date.now()/1000) - 10 }, SECRET);
    expect(() => guard.canActivate(ctx("Bearer " + t))).toThrow(UnauthorizedException);
  });
  it("accepts valid + sets user", () => {
    const t = jwt.sign({ sub: "u1", email: "a@b.c" }, SECRET);
    const c = ctx("Bearer " + t); expect(guard.canActivate(c)).toBe(true);
    expect(c._req.user).toEqual({ id: "u1", email: "a@b.c" });
  });
});
```
- [ ] **Step 2: Run → FAIL** — `npm --prefix api test -- jwt.guard` (module missing).
- [ ] **Step 3: `jwt.guard.ts`**
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const h = req.headers["authorization"] || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) throw new UnauthorizedException("no token");
    const secret = this.config.get<string>("SUPABASE_JWT_SECRET");
    if (!secret) throw new UnauthorizedException("auth not configured");
    let payload: any;
    try { payload = jwt.verify(token, secret, { algorithms: ["HS256"] }); }
    catch { throw new UnauthorizedException("invalid token"); }
    if (!payload?.sub) throw new UnauthorizedException("no subject");
    req.user = { id: payload.sub, email: payload.email };
    return true;
  }
}
```
- [ ] **Step 4: `current-user.decorator.ts`**
```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
export interface AuthUser { id: string; email?: string; }
export const CurrentUser = createParamDecorator((_d, ctx: ExecutionContext): AuthUser =>
  ctx.switchToHttp().getRequest().user);
```
- [ ] **Step 5: `auth.module.ts`** (exports guard so other modules can use)
```ts
import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt.guard";
@Module({ providers: [JwtAuthGuard], exports: [JwtAuthGuard] })
export class AuthModule {}
```
- [ ] **Step 6: Run → PASS** — `npm --prefix api test -- jwt.guard` (4 pass).
- [ ] **Step 7: Commit** — `git add api/src/auth && git commit -m "feat(api): JWT auth guard (Supabase HS256) + CurrentUser decorator"`

## Task 4: Progress module — merge + snapshot + CRUD

**Files:** Create `api/src/progress/{merge.ts,merge.spec.ts,dto.ts,progress.service.ts,progress.controller.ts,progress.module.ts}`; add to `app.module.ts`.
**Interfaces:**
- `mergeSnapshot(server: Snapshot, local: Snapshot): Snapshot` (pure). `Snapshot = { topics: Record<string,true>, cards: Record<string,{due_at,interval,ease,reps}>, quizBest: Record<string,number>, bookmarks: string[], streak: {current,longest,last_day}|null, settings: {lang?,theme?,track_role?,track_level?}|null }`.
- `ProgressService`: `getSnapshot(userId)`, `sync(userId, local)`, `setTopic(userId,id,learned)`, `setFlashcard(userId,key,dto)`, `setQuiz(userId,id,pct)`, `setBookmark(userId,id,on)`, `setStreak(userId,dto)`, `setSettings(userId,dto)`.
- Routes under `@Controller("v1/progress")` + settings at `@Controller("v1/settings")`, all guarded by `JwtAuthGuard`.

- [ ] **Step 1: Failing test `merge.spec.ts`** (pure rules — union topics/bookmarks, max quizBest, SM-2 keep later due_at / higher reps, streak max)
```ts
import { mergeSnapshot } from "./merge";
const empty = { topics:{}, cards:{}, quizBest:{}, bookmarks:[], streak:null, settings:null };
test("union topics + bookmarks", () => {
  const out = mergeSnapshot({...empty, topics:{a:true}, bookmarks:["x"]}, {...empty, topics:{b:true}, bookmarks:["y","x"]});
  expect(out.topics).toEqual({a:true,b:true});
  expect(out.bookmarks.sort()).toEqual(["x","y"]);
});
test("quizBest takes max", () => {
  const out = mergeSnapshot({...empty, quizBest:{t:80}}, {...empty, quizBest:{t:60, u:90}});
  expect(out.quizBest).toEqual({t:80,u:90});
});
test("flashcard keeps later due_at and higher reps", () => {
  const s = {...empty, cards:{k:{due_at:"2026-07-10T00:00:00Z",interval:2,ease:2.5,reps:3}}};
  const l = {...empty, cards:{k:{due_at:"2026-07-20T00:00:00Z",interval:5,ease:2.4,reps:2}}};
  const out = mergeSnapshot(s,l);
  expect(out.cards.k.due_at).toBe("2026-07-20T00:00:00Z");
  expect(out.cards.k.reps).toBe(3);
});
test("streak takes max current/longest", () => {
  const out = mergeSnapshot({...empty, streak:{current:3,longest:5,last_day:"2026-07-09"}}, {...empty, streak:{current:4,longest:4,last_day:"2026-07-10"}});
  expect(out.streak).toEqual({current:4,longest:5,last_day:"2026-07-10"});
});
```
- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: `merge.ts`**
```ts
export type Card = { due_at: string | null; interval: number; ease: number; reps: number };
export interface Snapshot {
  topics: Record<string, true>; cards: Record<string, Card>; quizBest: Record<string, number>;
  bookmarks: string[]; streak: { current: number; longest: number; last_day: string | null } | null;
  settings: { lang?: string; theme?: string; track_role?: string; track_level?: string } | null;
}
export function mergeSnapshot(server: Snapshot, local: Snapshot): Snapshot {
  const topics = { ...server.topics, ...local.topics };
  const bookmarks = Array.from(new Set([...server.bookmarks, ...local.bookmarks]));
  const quizBest: Record<string, number> = { ...server.quizBest };
  for (const [k, v] of Object.entries(local.quizBest)) quizBest[k] = Math.max(quizBest[k] ?? 0, v);
  const cards: Record<string, Card> = { ...server.cards };
  for (const [k, lc] of Object.entries(local.cards)) {
    const sc = cards[k];
    if (!sc) { cards[k] = lc; continue; }
    const later = (Date.parse(lc.due_at || "0") > Date.parse(sc.due_at || "0")) ? lc : sc;
    cards[k] = { due_at: later.due_at, interval: later.interval, ease: later.ease, reps: Math.max(sc.reps, lc.reps) };
  }
  let streak = server.streak;
  if (local.streak) streak = streak
    ? { current: Math.max(streak.current, local.streak.current), longest: Math.max(streak.longest, local.streak.longest),
        last_day: (Date.parse(local.streak.last_day||"0") >= Date.parse(streak.last_day||"0")) ? local.streak.last_day : streak.last_day }
    : local.streak;
  const settings = { ...(server.settings || {}), ...(local.settings || {}) };
  return { topics, cards, quizBest, bookmarks, streak, settings: Object.keys(settings).length ? settings : null };
}
```
- [ ] **Step 4: Run → PASS** (4).
- [ ] **Step 5: `dto.ts`** (class-validator DTOs)
```ts
import { IsBoolean, IsInt, IsOptional, IsNumber, IsString, Min, Max } from "class-validator";
export class TopicDto { @IsBoolean() learned!: boolean; }
export class FlashcardDto {
  @IsOptional() @IsString() due_at?: string;
  @IsInt() interval!: number; @IsNumber() ease!: number; @IsInt() reps!: number;
}
export class QuizDto { @IsInt() @Min(0) @Max(100) pct!: number; }
export class BookmarkDto { @IsBoolean() on!: boolean; }
export class StreakDto { @IsInt() current!: number; @IsInt() longest!: number; @IsOptional() @IsString() last_day?: string; }
export class SettingsDto {
  @IsOptional() @IsString() lang?: string; @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsString() track_role?: string; @IsOptional() @IsString() track_level?: string;
}
export class SyncDto { /* accepts a Snapshot-shaped body; validated loosely */ [k: string]: any; }
```
- [ ] **Step 6: `progress.service.ts`** — inject `DynamoService` + import `keys` (`userPk/topicSk/cardSk/quizSk/bookSk/STREAK_SK/SETTINGS_SK/parseSk`) and `mergeSnapshot`. Uses AWS SDK v3 lib-dynamodb commands (`QueryCommand`, `PutCommand`, `DeleteCommand`, `BatchWriteCommand`) via `this.dyn.doc.send(...)`, table = `this.dyn.table`. Every op keyed by `pk = userPk(userId)` — that IS the authz boundary.
  - `getSnapshot(userId)`: `QueryCommand({ TableName, KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": userPk(userId) } })`, paginate on `LastEvaluatedKey`; pass items to `toSnapshot`.
  - `toSnapshot(items)`: reduce items via `parseSk(item.sk)` into the Snapshot shape `{ topics:{[id]:true}, cards:{[key]:{due_at,interval,ease,reps}}, quizBest:{[id]:pct}, bookmarks:[id], streak:{current,longest,last_day}, settings:{lang,theme,track_role,track_level} }`. Empty partition → all-empty snapshot (`{topics:{},cards:{},quizBest:{},bookmarks:[],streak:null,settings:{}}`).
  - `sync(userId, local)`: `const merged = mergeSnapshot(await getSnapshot(userId), local)`; convert `merged` back to items (one per topic/card/quiz/bookmark + streak + settings) and write via `BatchWriteCommand` in chunks of **25** (DynamoDB batch limit); return `merged`.
  - Setters (each one `PutCommand` unless noted; always include `updated_at: new Date().toISOString()`):
    `setTopic(userId,id,learned)` → learned: Put `{pk,sk:topicSk(id),status:"learned",learned_at,updated_at}`; unlearned: `DeleteCommand` on `sk:topicSk(id)`.
    `setFlashcard(userId,key,dto)` → Put `{pk,sk:cardSk(key),due_at,interval,ease,reps,updated_at}`.
    `setQuiz(userId,id,pct)` → read existing (GetCommand) to bump `attempts` and keep `best_pct=max(prev,pct)`; Put merged.
    `setBookmark(userId,id,on)` → on: Put `{pk,sk:bookSk(id),created_at}`; off: `DeleteCommand`.
    `setStreak(userId,dto)` → Put `{pk,sk:STREAK_SK,current,longest,last_day,updated_at}`.
    `setSettings(userId,dto)` → Put `{pk,sk:SETTINGS_SK,...dto,updated_at}` (only provided keys; `removeUndefinedValues` handles gaps).
  Each setter returns the resulting sub-object (or the fresh snapshot) so the frontend can confirm. No cross-user reads — `pk` scoping guarantees isolation.
- [ ] **Step 7: `progress.controller.ts`** — `@UseGuards(JwtAuthGuard)` on the class; methods map to spec §6 routes using `@CurrentUser()`.
```ts
@UseGuards(JwtAuthGuard)
@Controller("v1/progress")
export class ProgressController {
  constructor(private svc: ProgressService) {}
  @Get() get(@CurrentUser() u) { return this.svc.getSnapshot(u.id); }
  @Post("sync") sync(@CurrentUser() u, @Body() b: SyncDto) { return this.svc.sync(u.id, b as any); }
  @Put("topic/:id") topic(@CurrentUser() u, @Param("id") id, @Body() b: TopicDto) { return this.svc.setTopic(u.id, id, b.learned); }
  @Post("flashcard/:key") card(@CurrentUser() u, @Param("key") k, @Body() b: FlashcardDto) { return this.svc.setFlashcard(u.id, k, b); }
  @Put("quiz/:id") quiz(@CurrentUser() u, @Param("id") id, @Body() b: QuizDto) { return this.svc.setQuiz(u.id, id, b.pct); }
  @Put("bookmark/:id") bm(@CurrentUser() u, @Param("id") id, @Body() b: BookmarkDto) { return this.svc.setBookmark(u.id, id, b.on); }
  @Put("streak") streak(@CurrentUser() u, @Body() b: StreakDto) { return this.svc.setStreak(u.id, b); }
}
// SettingsController @Controller("v1/settings") with @Put() → svc.setSettings
```
- [ ] **Step 8: `progress.module.ts`** (imports AuthModule; provides service; declares both controllers) + add to `app.module.ts`.
- [ ] **Step 9: Build + unit** — `npm --prefix api run build`; `npm --prefix api test` (merge tests pass). 
- [ ] **Step 10: Commit** — `git add api/src/progress api/src/app.module.ts && git commit -m "feat(api): progress module — snapshot/sync/CRUD + merge (Jest)"`

## Task 5: e2e tests (health + auth + progress isolation)

**Files:** Create `api/test/app.e2e-spec.ts`, `api/test/jest-e2e.json`.
**Interfaces:** Consumes the running Nest app via supertest. Uses a `SUPABASE_JWT_SECRET=test-secret` env + tokens signed in-test. **DB**: uses DynamoDB Local from `DDB_ENDPOINT` if provided (start via `docker compose -f docker-compose.dev.yml up -d` then `npm run create-table` against the local endpoint); if absent, the progress e2e is skipped with a clear `console.warn` (health + 401 still run without DB).

- [ ] **Step 1: `test/jest-e2e.json`** — `{ "moduleFileExtensions":["js","json","ts"], "rootDir":".", "testRegex":".e2e-spec.ts$", "transform":{"^.+\\.ts$":"ts-jest"}, "testEnvironment":"node" }`
- [ ] **Step 2: `app.e2e-spec.ts`**
```ts
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import * as jwt from "jsonwebtoken";
import { AppModule } from "../src/app.module";
process.env.SUPABASE_JWT_SECRET = "test-secret";
const tok = (sub: string) => "Bearer " + jwt.sign({ sub, email: sub + "@t.c" }, "test-secret");
describe("API e2e", () => {
  let app: INestApplication;
  beforeAll(async () => { const m = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = m.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); await app.init(); });
  afterAll(async () => { await app.close(); });
  it("/health 200", () => request(app.getHttpServer()).get("/health").expect(200).expect({ status: "ok" }));
  it("/v1/progress 401 without token", () => request(app.getHttpServer()).get("/v1/progress").expect(401));
  const dbOn = !!process.env.DDB_ENDPOINT;
  (dbOn ? it : it.skip)("progress isolation: A can't see B", async () => {
    await request(app.getHttpServer()).put("/v1/progress/topic/dsa").set("Authorization", tok("user-A")).send({ learned: true }).expect(200);
    const b = await request(app.getHttpServer()).get("/v1/progress").set("Authorization", tok("user-B")).expect(200);
    expect(b.body.topics.dsa).toBeUndefined();
  });
});
```
- [ ] **Step 3: Run** — `npm --prefix api run test:e2e`. Expected: health + 401 pass; isolation runs if `DDB_ENDPOINT` set (DynamoDB Local) else skipped (warn). (Locally without DynamoDB Local → 2 pass, 1 skip. That's acceptable; the isolation test runs when DynamoDB Local/AWS is available.)
- [ ] **Step 4: Commit** — `git add api/test && git commit -m "test(api): e2e — health, auth 401, progress user isolation"`

## Task 6: Frontend `IP.api` client + config

**Files:** Create `assets/js/api.js`, `tests/api.test.js`; Modify `assets/js/config.js`, `index.html`.
**Interfaces:** Produces `IP.api` with `configured()` (bool), `get(path)`, `post(path,body)`, `put(path,body)` → Promise<data|{error}>; attaches `Authorization: Bearer <token>` from `IP.auth.client().auth.getSession()`. Base = `IP_CONFIG.API_URL` (no trailing slash). Empty ⇒ `configured()===false`, calls reject with `{error:"api-not-configured"}` (callers degrade).

- [ ] **Step 1: Failing test `tests/api.test.js`** (pure URL building + header assembly with mock fetch + a fake IP.auth)
```js
const test = require("node:test"); const assert = require("node:assert");
const api = require("../assets/js/api.js");
test("configured reflects API_URL", () => {
  api.__setBase(""); assert.strictEqual(api.configured(), false);
  api.__setBase("https://x.dev"); assert.strictEqual(api.configured(), true);
});
test("get builds URL + bearer header", async () => {
  api.__setBase("https://x.dev");
  const calls = [];
  api.__setDeps({ fetch: async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ ok: 1 }) }; },
    token: async () => "TKN" });
  const r = await api.get("/v1/progress");
  assert.strictEqual(calls[0][0], "https://x.dev/v1/progress");
  assert.strictEqual(calls[0][1].headers.Authorization, "Bearer TKN");
  assert.deepStrictEqual(r, { ok: 1 });
});
test("rejects when not configured", async () => {
  api.__setBase("");
  const r = await api.get("/v1/progress").catch(e => e);
  assert.strictEqual(r.error, "api-not-configured");
});
```
- [ ] **Step 2: FAIL** — `node --test tests/api.test.js`.
- [ ] **Step 3: `assets/js/api.js`** — UMD dual-export (like `chat.js`). Testable seams `__setBase`, `__setDeps` (inject fetch + token getter); in browser, base from `root.IP_CONFIG.API_URL`, token from `root.IP.auth.client().auth.getSession()`.
```js
  let _base = (root.IP_CONFIG && root.IP_CONFIG.API_URL) || "";
  let _fetch = (typeof fetch !== "undefined") ? fetch.bind(globalThis) : null;
  let _token = async () => { const c = root.IP && root.IP.auth && root.IP.auth.client(); if (!c) return null;
    const { data } = await c.auth.getSession(); return data && data.session ? data.session.access_token : null; };
  function __setBase(b){ _base=b||""; } function __setDeps(d){ if(d.fetch)_fetch=d.fetch; if(d.token)_token=d.token; }
  function configured(){ return !!_base; }
  async function _req(method, path, body){
    if (!_base) return Promise.reject({ error:"api-not-configured" });
    const tk = await _token();
    const headers = { "content-type":"application/json" }; if (tk) headers.Authorization = "Bearer "+tk;
    const res = await _fetch(_base + path, { method, headers, body: body!=null ? JSON.stringify(body) : undefined });
    if (!res.ok) return Promise.reject({ error:"http-"+res.status });
    return res.json();
  }
  const api = { configured, get:(p)=>_req("GET",p), post:(p,b)=>_req("POST",p,b), put:(p,b)=>_req("PUT",p,b), __setBase, __setDeps };
```
- [ ] **Step 4: PASS** → full suite 60 + 3 = 63.
- [ ] **Step 5:** `config.js` add `API_URL: ""` (public; comment: Render URL when deployed, empty = local-only). `index.html` add `<script src="assets/js/api.js"></script>` before `sync.js`.
- [ ] **Step 6: Commit** — `git add assets/js/api.js tests/api.test.js assets/js/config.js index.html && git commit -m "feat(web): IP.api client + API_URL config"`

## Task 7: Refactor `IP.sync` to use the API (fallback local)

**Files:** Modify `assets/js/sync.js`; add cases to `tests/sync.test.js` (or its existing merge test file).
**Interfaces:** Consumes `IP.api` (`configured()`, `get`, `post`). Produces two pure exported adapters (anti-corruption layer) tested in isolation: `toApiSnapshot(local)` and `fromApiSnapshot(api, localForGoal)`. Keeps the existing pure `merge(local, server)` and its tests unchanged.

> **DESIGN NOTE (shape mismatch — resolved here).** The frontend store snapshot and the API's normalized `Snapshot` are DIFFERENT shapes; they must be translated by an adapter, not passed through. Do NOT change either shape — add the adapter.
> | frontend (store.snapshot) | API Snapshot (`/v1/progress`) |
> |---|---|
> | `progress: {[id]: bool}` | `topics: {[id]: true}` (only truthy) |
> | `cards: {[k]: {interval, ease, reps, due}}` (`due` = number) | `cards: {[k]: {due_at, interval, ease, reps}}` (`due`↔`due_at`) |
> | `quizBest: {[id]: pct}` | `quizBest: {[id]: pct}` (1:1) |
> | `bookmarks: [id]` | `bookmarks: [id]` (1:1) |
> | `streak: {count, lastActiveDate, dailyGoal}` | `streak: {current, longest, last_day} \| null` |
> | `lang`, `theme`, `track:{role,level}` (top-level) | `settings: {lang, theme, track_role, track_level}` |
> Asymmetric fields: `dailyGoal` is FRONTEND-ONLY (preserve from local on the way back; never sent/lost); `longest` is API-ONLY (derive `max(server longest, count)` on push; dropped on pull). `due`(number)↔`due_at` (keep the number, just rename the field).

- [ ] **Step 1: adapters (pure, exported, TDD).** Add to `sync.js`:
```js
function toApiSnapshot(s) {
  s = s || {};
  const topics = {};
  Object.keys(s.progress || {}).forEach((id) => { if (s.progress[id]) topics[id] = true; });
  const cards = {};
  Object.keys(s.cards || {}).forEach((k) => { const c = s.cards[k] || {};
    cards[k] = { due_at: (c.due != null ? c.due : null), interval: Number(c.interval) || 0, ease: Number(c.ease) || 2.5, reps: Number(c.reps) || 0 }; });
  const tr = s.track || {};
  const streak = s.streak
    ? { current: Number(s.streak.count) || 0, longest: Math.max(Number(s.streak.longest) || 0, Number(s.streak.count) || 0), last_day: s.streak.lastActiveDate || null }
    : null;
  return { topics, cards, quizBest: Object.assign({}, s.quizBest || {}), bookmarks: (s.bookmarks || []).slice(),
    streak, settings: { lang: s.lang, theme: s.theme, track_role: tr.role, track_level: tr.level } };
}
function fromApiSnapshot(a, localForGoal) {
  a = a || {};
  const progress = {};
  Object.keys(a.topics || {}).forEach((id) => { progress[id] = true; });
  const cards = {};
  Object.keys(a.cards || {}).forEach((k) => { const c = a.cards[k] || {};
    cards[k] = { interval: Number(c.interval) || 0, ease: Number(c.ease) || 2.5, reps: Number(c.reps) || 0, due: (c.due_at != null ? c.due_at : 0) }; });
  const set = a.settings || {};
  const dailyGoal = (localForGoal && localForGoal.streak && localForGoal.streak.dailyGoal) || 1;
  const track = (set.track_role || set.track_level) ? { role: set.track_role || null, level: set.track_level || null } : null;
  return { lang: set.lang, theme: set.theme, track, progress, cards,
    quizBest: Object.assign({}, a.quizBest || {}), bookmarks: (a.bookmarks || []).slice(),
    streak: a.streak ? { count: Number(a.streak.current) || 0, lastActiveDate: a.streak.last_day || null, dailyGoal } : { count: 0, lastActiveDate: null, dailyGoal },
    schemaVersion: 1 };
}
```
Write tests FIRST: round-trip `fromApiSnapshot(toApiSnapshot(local))` preserves progress/cards(due↔due_at)/quizBest/bookmarks/streak.count/lang/theme/track and keeps a local `dailyGoal`; empty inputs → all-empty shapes (no throw).
- [ ] **Step 2: gate `pull()`.** At the top: `if (IP.api && IP.api.configured()) { const apiSnap = await IP.api.get("/v1/progress").catch(() => null); return apiSnap ? fromApiSnapshot(apiSnap, (_store() && _store().snapshot())) : null; }` then the existing Supabase pull remains as the else branch (do NOT delete it — it's the no-regression fallback when `API_URL` is empty).
- [ ] **Step 3: gate `push(state)`.** At the top: `if (IP.api && IP.api.configured()) { try { await IP.api.post("/v1/progress/sync", toApiSnapshot(state)); _dirty = false; } catch (e) { console.warn("[sync] api push failed", e); _dirty = true; } return; }` then the existing Supabase upsert remains as the else branch. (Routing the debounced push through `/v1/progress/sync` — the server-merge endpoint — is correct and idempotent; server preserves `attempts`/`learned_at` per T4. Granular per-field endpoints exist server-side and can be adopted as a later optimization; not needed for F1.)
- [ ] **Step 4:** `onLogin`, `schedulePush`, `start`, `setApplyCallback` are UNCHANGED — they call `pull`/`push`, which now branch internally. Confirm `onLogin`'s existing `merge(local, server)` still works (server is now `fromApiSnapshot(...)`), so first-login (empty server + local data) still merges and pushes exactly once. Do NOT remove the pure `merge` export.
- [ ] **Step 5: Verify** — `node --check assets/js/sync.js`; `node --test tests/` (merge + api + new adapter tests green; ≥72). Assert: adapters round-trip; `API_URL` empty ⇒ `pull`/`push` take the Supabase branch (mock `IP.api.configured→false`, assert no `IP.api.get/post` call); `configured→true` ⇒ `pull` calls `IP.api.get("/v1/progress")` and `push` calls `IP.api.post("/v1/progress/sync", <adapted>)` (mock `IP.api`, assert the adapted body). Manual e2e against a running local API is in the Task 8 checklist.
- [ ] **Step 6: Commit** — `git add assets/js/sync.js tests/ && git commit -m "refactor(web): IP.sync routes progress through API via snapshot adapter (Supabase fallback when API_URL empty)"`

## Task 8: Backfill script + deploy guide

**Files:** Create `api/scripts/backfill.ts`, `docs/superpowers/DEPLOY-PHASE-F1.md`. Modify `api/package.json` (add `pg` + `@types/pg` as devDependencies for the reader; add `"backfill": "ts-node scripts/backfill.ts"`).
**Interfaces:** `backfill.ts` = standalone `ts-node` script. **Reads** `public.user_state` from Supabase Postgres via `pg` (env `SUPABASE_DB_URL` = Supabase pooler connection string) — Postgres stays the source of the legacy blob. **Writes** into DynamoDB single-table via `@aws-sdk/lib-dynamodb` `BatchWriteCommand` (same env as the API: `AWS_REGION`/`DDB_TABLE`/`DDB_ENDPOINT`/creds), using the `keys` builders. Idempotent (`PutCommand` overwrites by pk+sk). Safe to re-run.

- [ ] **Step 1: `backfill.ts`** — `const { rows } = await pgClient.query("select user_id, state from public.user_state")`. For each row, parse the JSONB blob (`{progress, cards, quizBest, bookmarks?, streak?}` shape used by `IP.store`) into DynamoDB items keyed by `pk = userPk(user_id)`: `progress` keys → `topicSk`, `cards` → `cardSk` (with `{due_at,interval,ease,reps}`), `quizBest` → `quizSk` (`{best_pct,attempts:0}`), `bookmarks` → `bookSk`, `streak` → `STREAK_SK`. Collect items and write with `BatchWriteCommand` in chunks of **25**. Log per-user counts. Wrap each user in try/catch (skip malformed, log and continue).
- [ ] **Step 2: Dry-run guard** — support `--dry` flag: print the items that would be written (count per user + total), no writes. Default = write.
- [ ] **Step 3: `DEPLOY-PHASE-F1.md`** — steps: (1) **AWS setup**: create an AWS account, an IAM user with a least-privilege DynamoDB policy (Query/PutItem/DeleteItem/BatchWriteItem/DescribeTable/CreateTable on the `ip_progress` table), note `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`; run `AWS_REGION=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... DDB_TABLE=ip_progress npm --prefix api run create-table` once. (2) **Render**: new Web Service from repo, root `api/`, set env `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DDB_TABLE`, `SUPABASE_JWT_SECRET` (Supabase → Settings → API → JWT Secret), `ALLOWED_ORIGINS` (`https://kyle41io.github.io`); leave `DDB_ENDPOINT` unset; deploy → get URL. (3) put that URL into `assets/js/config.js` `API_URL` + push (Pages redeploys). (4) run backfill once: `SUPABASE_DB_URL=<pooler> AWS_REGION=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... DDB_TABLE=ip_progress npm --prefix api run backfill` (try `--dry` first). (5) **Local dev**: `docker compose -f api/docker-compose.dev.yml up -d`, then `DDB_ENDPOINT=http://localhost:8001 npm --prefix api run create-table`, run API with `DDB_ENDPOINT` set. (6) e2e checklist (login → progress persists across devices; `API_URL` empty still works local-only; user isolation). Note: secrets never in repo — set only in Render/env.
- [ ] **Step 4: Verify** — `npm --prefix api run build` (type-checks backfill via tsc/ts-node config) or `npx --prefix api tsc --noEmit`. `node --test tests/` 63 green. (Actual backfill run needs the live Postgres + DynamoDB — documented, not run in the build.)
- [ ] **Step 5: Commit** — `git add api/ docs/superpowers/DEPLOY-PHASE-F1.md && git commit -m "feat(api): user_state→DynamoDB backfill script + Phase F1 deploy guide"`

---

## Final verification
- [ ] `npm --prefix api run build` succeeds; `npm --prefix api test` (merge + guard) green; `npm --prefix api run test:e2e` (health + 401 pass; isolation skipped without DB or green with DB).
- [ ] `node --test tests/` → 63/63 (60 + api 3; merge tests unchanged).
- [ ] `API_URL` empty ⇒ site runs local-only, no console errors (verify via the Playwright audit script `scratchpad/audit.js`).
- [ ] No secret in repo (`git grep` for keys); `config.js` only public `API_URL`.
- [ ] After deploy (DEPLOY-PHASE-F1.md): login → learn/flashcard/quiz/bookmark/streak persist in normalized tables (SQL check), survive reload + second device; backfilled users keep progress; A can't read B.

## Self-Review (đã chạy)
1. **Coverage**: spec §3 arch→T1; §4 schema→T2; §5 backfill→T8; §6 API→T4; §7 frontend→T6+T7; §9 secrets/config→T1/T6/T8; §10 tests→T3/T4/T5/T6 + final; §11 nghiệm thu→Final. ✔
2. **Placeholders**: ProgressService full CRUD described (T4 S6) with method list + DynamoDB commands; `keys` builders + single-table item shapes given (T2); no TBD. Backfill blob shape referenced to `IP.store` actual keys (implementer reads store.js). ✔
3. **Consistency**: `Snapshot` shape identical across merge.ts (T4), controller, api.js, sync.js; endpoints in T4 controller == spec §6 == T7 mapping == api.js usage; `JwtAuthGuard(ConfigService)` ctor matches its spec (T3) and injection (T4 module); `keys` SK prefixes + item attrs (T2) match ProgressService `parseSk`/`toSnapshot` and backfill (T4/T8). DB pivot Postgres→DynamoDB applied across T2/T4/T5/T8; T1/T3/T6/T7 unaffected. ✔
4. **Env reality**: `npm install`/build need network; if unavailable the implementer must flag (Task 1 S10) rather than fake — don't mark done on a non-building app.
