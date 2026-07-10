import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { ProgressService } from "./progress.service";
import { TopicDto, FlashcardDto, QuizDto, BookmarkDto, StreakDto, SettingsDto } from "./dto";
import { Snapshot } from "./merge";

@UseGuards(JwtAuthGuard)
@Controller("v1/progress")
export class ProgressController {
  constructor(private readonly svc: ProgressService) {}

  @Get()
  get(@CurrentUser() u: AuthUser) {
    return this.svc.getSnapshot(u.id);
  }

  @Post("sync")
  // Typed as the Snapshot interface (erases to `Object`), so the global
  // whitelisting ValidationPipe passes the full body through untouched. A
  // decorated DTO here would be stripped to {} (no per-field validators), so
  // do NOT switch this to a class DTO. mergeSnapshot() normalizes partial input.
  sync(@CurrentUser() u: AuthUser, @Body() b: Snapshot) {
    return this.svc.sync(u.id, b as any);
  }

  @Put("topic/:id")
  topic(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() b: TopicDto) {
    return this.svc.setTopic(u.id, id, b.learned);
  }

  @Post("flashcard/:key")
  card(@CurrentUser() u: AuthUser, @Param("key") key: string, @Body() b: FlashcardDto) {
    return this.svc.setFlashcard(u.id, key, b);
  }

  @Put("quiz/:id")
  quiz(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() b: QuizDto) {
    return this.svc.setQuiz(u.id, id, b.pct);
  }

  @Put("bookmark/:id")
  bookmark(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() b: BookmarkDto) {
    return this.svc.setBookmark(u.id, id, b.on);
  }

  @Put("streak")
  streak(@CurrentUser() u: AuthUser, @Body() b: StreakDto) {
    return this.svc.setStreak(u.id, b);
  }
}

@UseGuards(JwtAuthGuard)
@Controller("v1/settings")
export class SettingsController {
  constructor(private readonly svc: ProgressService) {}

  @Put()
  settings(@CurrentUser() u: AuthUser, @Body() b: SettingsDto) {
    return this.svc.setSettings(u.id, b);
  }
}
