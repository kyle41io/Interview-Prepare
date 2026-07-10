# Phase F1 — NestJS API skeleton + Progress domain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đứng một API NestJS (modular monolith) phục vụ dữ liệu học qua schema Postgres chuẩn hoá, thay blob JSONB + merge-client bằng REST API + merge-server; frontend tĩnh gọi API qua JWT Supabase.

**Architecture:** `api/` = NestJS 10 app riêng trong repo (GitHub Pages chỉ serve root, bỏ qua `api/`). Prisma nối Postgres của Supabase; migration `f1_progress` tạo 6 bảng chuẩn hoá. `JwtAuthGuard` verify JWT Supabase (HS256, `SUPABASE_JWT_SECRET`). `ProgressModule` cung cấp snapshot/sync/CRUD. Frontend thêm `IP.api` + chuyển `IP.sync` sang API (fallback local khi `API_URL` rỗng).

**Tech Stack:** NestJS 10, Prisma 5, `jsonwebtoken` (verify HS256), Jest + supertest (API), `node --test` (frontend), Docker + Render.

## Global Constraints
- **Node 18** (env: v18.20.8). Pin **NestJS 10.x**, **Prisma 5.x**, `jsonwebtoken@9` — đều chạy Node 18. KHÔNG dùng NestJS 11 (tránh rủi ro engine).
- **`api/` là workspace tách biệt** (own `package.json`); frontend tĩnh ở root KHÔNG đổi kiến trúc no-build; GitHub Pages bỏ qua `api/`.
- **Không secret trong repo.** API đọc secrets từ env: `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS`, `PORT`. `config.js` (frontend) chỉ thêm `API_URL` (public; rỗng ⇒ local-only).
- **Auth**: mọi route `/v1/*` cần `Authorization: Bearer <supabase access_token>`; guard verify chữ ký HS256 + `exp`, gắn `req.user = { id: payload.sub, email: payload.email }`. `/health` không auth.
- **Authz**: mọi truy vấn lọc `where user_id = currentUser.id`. Không tin `user_id` từ body/param.
- **KHÔNG dùng model Fable** ở bất kỳ đâu (không liên quan F1 nhưng giữ quy ước).
- **Adopt, đừng phá**: Prisma introspect bảng cũ (profiles/entitlements/…); migration F1 chỉ THÊM 6 bảng mới + RLS. Không sửa/migrate bảng cũ.
- **Frontend fallback**: `API_URL` rỗng ⇒ `IP.api` báo "không cấu hình", `IP.sync` chạy local-only (không lỗi, không mất tính năng học offline).
- **Suite**: `node --test tests/` giữ **60/60 + test mới**; `npm --prefix api test` xanh.
- CORS: chỉ `https://kyle41io.github.io` + `http://localhost:8000` (đọc từ `ALLOWED_ORIGINS`, phân tách phẩy).
- **Line numbers ước lượng — locate bằng grep.**

## File Structure
**Create (API):** `api/package.json` `api/tsconfig.json` `api/tsconfig.build.json` `api/nest-cli.json` `api/.gitignore` `api/.env.example` `api/Dockerfile` `api/render.yaml` `api/src/main.ts` `api/src/app.module.ts` `api/src/config/config.module.ts` `api/src/health/health.controller.ts` `api/src/prisma/schema.prisma` `api/src/prisma/prisma.service.ts` `api/src/prisma/prisma.module.ts` `api/src/auth/jwt.guard.ts` `api/src/auth/current-user.decorator.ts` `api/src/auth/auth.module.ts` `api/src/progress/dto.ts` `api/src/progress/merge.ts` `api/src/progress/progress.service.ts` `api/src/progress/progress.controller.ts` `api/src/progress/progress.module.ts` `api/src/progress/merge.spec.ts` `api/src/auth/jwt.guard.spec.ts` `api/test/app.e2e-spec.ts` `api/scripts/backfill.ts`
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

## Task 2: Prisma + adopt schema + f1_progress migration

**Files:** Create `api/src/prisma/schema.prisma`, `prisma.service.ts`, `prisma.module.ts`, migration SQL under `api/src/prisma/migrations/`.
**Interfaces:** Produces `PrismaService` (injectable, extends PrismaClient) exposing models `topicProgress`, `flashcardReview`, `quizScore`, `bookmark`, `streak`, `userSettings`. Consumed by ProgressModule + backfill.

- [ ] **Step 1: `schema.prisma`** — datasource + the 6 new models. (Adopt-only models like profiles aren't required for F1 queries; reference `user_id` as a plain uuid with an FK via SQL migration, not a Prisma relation, to avoid pulling the whole legacy schema.)
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model TopicProgress {
  userId    String   @map("user_id") @db.Uuid
  topicId   String   @map("topic_id")
  status    String   @default("learned")
  learnedAt DateTime? @map("learned_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  @@id([userId, topicId])
  @@map("topic_progress")
}
model FlashcardReview {
  userId   String @map("user_id") @db.Uuid
  cardKey  String @map("card_key")
  dueAt    DateTime? @map("due_at") @db.Timestamptz(6)
  interval Int    @default(0)
  ease     Float  @default(2.5)
  reps     Int    @default(0)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  @@id([userId, cardKey])
  @@map("flashcard_reviews")
}
model QuizScore {
  userId   String @map("user_id") @db.Uuid
  topicId  String @map("topic_id")
  bestPct  Int    @default(0) @map("best_pct")
  attempts Int    @default(0)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  @@id([userId, topicId])
  @@map("quiz_scores")
}
model Bookmark {
  userId    String @map("user_id") @db.Uuid
  topicId   String @map("topic_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  @@id([userId, topicId])
  @@map("bookmarks")
}
model Streak {
  userId    String @id @map("user_id") @db.Uuid
  current   Int    @default(0)
  longest   Int    @default(0)
  lastDay   DateTime? @map("last_day") @db.Date
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  @@map("streak")
}
model UserSettings {
  userId     String @id @map("user_id") @db.Uuid
  lang       String?
  theme      String?
  trackRole  String? @map("track_role")
  trackLevel String? @map("track_level")
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  @@map("user_settings")
}
```
- [ ] **Step 2: Migration SQL** — Create `api/src/prisma/migrations/<timestamp>_f1_progress/migration.sql` (or generate via `prisma migrate dev --create-only`). Content = `CREATE TABLE` for the 6 tables with `references public.profiles(id) on delete cascade`, `enable row level security`, and own-row policies:
```sql
create table if not exists public.topic_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null, status text not null default 'learned',
  learned_at timestamptz, updated_at timestamptz not null default now(),
  primary key (user_id, topic_id));
alter table public.topic_progress enable row level security;
create policy "own tp" on public.topic_progress using (auth.uid()=user_id) with check (auth.uid()=user_id);
-- ... repeat pattern for flashcard_reviews, quiz_scores, bookmarks, streak, user_settings
```
  (Full SQL for all 6 tables; `for all` policy own-row. RLS is defense-in-depth; the API uses a privileged connection.)
- [ ] **Step 3: `prisma.service.ts`**
```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```
- [ ] **Step 4: `prisma.module.ts`** (global)
```ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```
  Add `PrismaModule` to `app.module.ts` imports.
- [ ] **Step 5: Generate + verify** — `npm --prefix api run prisma:generate` → client generated (types available). `npm --prefix api run build` still succeeds. (Applying the migration to the real DB happens at deploy — documented in Task 8; do NOT require a live DB to build.)
- [ ] **Step 6: Commit** — `git add api/src/prisma api/src/app.module.ts && git commit -m "feat(api): Prisma + f1_progress migration (normalized tables + RLS)"`

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
- [ ] **Step 6: `progress.service.ts`** — reads all 6 tables for `getSnapshot`; `sync` = read server snapshot → `mergeSnapshot` → persist merged (upserts) → return merged; each setter = one upsert/delete. (Full CRUD using `this.prisma.<model>.upsert/delete/findMany` filtered by `userId`.) Include `toSnapshot(rows)` assembling the Snapshot shape used by the controller/tests.
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
**Interfaces:** Consumes the running Nest app via supertest. Uses a `SUPABASE_JWT_SECRET=test-secret` env + tokens signed in-test. **DB**: uses a real Postgres from `DATABASE_URL` if provided; if absent, the progress e2e is skipped with a clear `console.warn` (health + 401 still run without DB).

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
  const dbOn = !!process.env.DATABASE_URL;
  (dbOn ? it : it.skip)("progress isolation: A can't see B", async () => {
    await request(app.getHttpServer()).put("/v1/progress/topic/dsa").set("Authorization", tok("user-A")).send({ learned: true }).expect(200);
    const b = await request(app.getHttpServer()).get("/v1/progress").set("Authorization", tok("user-B")).expect(200);
    expect(b.body.topics.dsa).toBeUndefined();
  });
});
```
- [ ] **Step 3: Run** — `npm --prefix api run test:e2e`. Expected: health + 401 pass; isolation runs if `DATABASE_URL` set else skipped (warn). (Locally without DB → 2 pass, 1 skip. That's acceptable; the isolation test runs in CI/deploy with DB.)
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

**Files:** Modify `assets/js/sync.js`; keep/adjust its tests.
**Interfaces:** Consumes `IP.api`. When `IP.api.configured()`: `pull()` = `GET /v1/progress` → apply via existing applyCallback; `push`/change handlers → call the matching `IP.api` endpoint (debounced); first login with empty server + local data → `POST /v1/progress/sync` once. When NOT configured: behave exactly as today (local-only; no network). Keep the pure `merge` function + its tests (server now authoritative, but merge still used for the one-time sync payload/back-compat).

- [ ] **Step 1:** Read `assets/js/sync.js`; identify `pull`, `push`, `onLogin`, `schedulePush`, `setApplyCallback`. Gate the Supabase-specific data calls behind `if (IP.api && IP.api.configured())` → route to `IP.api`; else fall through to existing behavior (or no-op network). Do NOT remove the pure `merge` export.
- [ ] **Step 2:** Map state changes to endpoints: topic learned → `PUT /v1/progress/topic/:id {learned}`; flashcard review → `POST /v1/progress/flashcard/:key {...}`; quiz best → `PUT /v1/progress/quiz/:id {pct}`; bookmark → `PUT /v1/progress/bookmark/:id {on}`; streak → `PUT /v1/progress/streak {...}`; settings (lang/theme/track) → `PUT /v1/settings`. Debounce rapid changes (reuse existing schedulePush timer; batch not required for F1 — per-change PUT is fine at this scale).
- [ ] **Step 3: `onLogin`** → `await IP.api.get("/v1/progress")`; if server snapshot is empty AND local has data → `IP.api.post("/v1/progress/sync", localSnapshot)` then apply merged; else apply server snapshot.
- [ ] **Step 4: Verify** — `node --check assets/js/sync.js`; `node --test tests/` (merge tests + api tests green, 63). Manual: `API_URL` empty → app works local-only (no network errors); set `API_URL` to a running local API + logged in → changes hit endpoints (verify in API logs / DB). (Full end-to-end needs the deployed API — covered in Task 8 checklist.)
- [ ] **Step 5: Commit** — `git add assets/js/sync.js tests/ && git commit -m "refactor(web): IP.sync uses API for progress (local-only fallback)"`

## Task 8: Backfill script + deploy guide

**Files:** Create `api/scripts/backfill.ts`, `docs/superpowers/DEPLOY-PHASE-F1.md`.
**Interfaces:** `backfill.ts` = standalone `ts-node` script: reads all `user_state` rows (raw SQL via Prisma `$queryRaw`), maps the JSONB blob (`{progress, cards, quizBest, bookmarks?, streak?}` shape used by `IP.store`) into the 6 tables via idempotent upserts. Safe to re-run.

- [ ] **Step 1: `backfill.ts`** — connect via `DATABASE_URL`; `const rows = await prisma.$queryRaw\`select user_id, state from public.user_state\``; for each, parse blob and upsert topic_progress (from `progress` keys), flashcard_reviews (from `cards`), quiz_scores (from `quizBest`), bookmarks, streak. Log counts. `on conflict do update`. Wrap in try/catch per-row (skip malformed, log).
- [ ] **Step 2: Dry-run guard** — support `--dry` flag: print what would be written, no writes. Default = write.
- [ ] **Step 3: `DEPLOY-PHASE-F1.md`** — steps: (1) SQL Editor run `f1_progress` migration (or `prisma migrate deploy` with `DATABASE_URL`); (2) Render: new Web Service from repo, root `api/`, set env `DATABASE_URL` (Supabase pooler string), `SUPABASE_JWT_SECRET` (Settings→API→JWT Secret), `ALLOWED_ORIGINS`; deploy → get URL; (3) put that URL into `assets/js/config.js` `API_URL` + push (Pages redeploys); (4) run backfill once: `DATABASE_URL=... npm --prefix api run backfill`; (5) e2e test checklist (login → progress persists across devices; API_URL empty still works; user isolation). Note secrets never in repo.
- [ ] **Step 4: Verify** — `npx --prefix api tsc --noEmit scripts/backfill.ts` (or `npm --prefix api run build` includes it via ts-node at runtime — just type-check). `node --test tests/` 63 green.
- [ ] **Step 5: Commit** — `git add api/scripts docs/superpowers/DEPLOY-PHASE-F1.md && git commit -m "feat(api): user_state→normalized backfill script + Phase F1 deploy guide"`

---

## Final verification
- [ ] `npm --prefix api run build` succeeds; `npm --prefix api test` (merge + guard) green; `npm --prefix api run test:e2e` (health + 401 pass; isolation skipped without DB or green with DB).
- [ ] `node --test tests/` → 63/63 (60 + api 3; merge tests unchanged).
- [ ] `API_URL` empty ⇒ site runs local-only, no console errors (verify via the Playwright audit script `scratchpad/audit.js`).
- [ ] No secret in repo (`git grep` for keys); `config.js` only public `API_URL`.
- [ ] After deploy (DEPLOY-PHASE-F1.md): login → learn/flashcard/quiz/bookmark/streak persist in normalized tables (SQL check), survive reload + second device; backfilled users keep progress; A can't read B.

## Self-Review (đã chạy)
1. **Coverage**: spec §3 arch→T1; §4 schema→T2; §5 backfill→T8; §6 API→T4; §7 frontend→T6+T7; §9 secrets/config→T1/T6/T8; §10 tests→T3/T4/T5/T6 + final; §11 nghiệm thu→Final. ✔
2. **Placeholders**: ProgressService full CRUD described (T4 S6) with method list + Prisma calls; migration SQL pattern given for all 6 tables; no TBD. Backfill blob shape referenced to `IP.store` actual keys (implementer reads store.js). ✔
3. **Consistency**: `Snapshot` shape identical across merge.ts (T4), controller, api.js, sync.js; endpoints in T4 controller == spec §6 == T7 mapping == api.js usage; `JwtAuthGuard(ConfigService)` ctor matches its spec (T3) and injection (T4 module); Prisma model @map names match migration table/column names (T2). ✔
4. **Env reality**: `npm install`/build need network; if unavailable the implementer must flag (Task 1 S10) rather than fake — don't mark done on a non-building app.
