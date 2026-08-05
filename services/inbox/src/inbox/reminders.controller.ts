import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, AuthUser } from "@ip/auth";
import { InboxService } from "./inbox.service";

// Interface (erases to Object) so the whitelist ValidationPipe passes the body through.
interface StatusBody {
  status?: string;
}

// Shape posted by assets/js/gmail.js createReminder(). `status` is accepted and
// ignored: new reminders always start "upcoming" (see InboxService.addReminder).
interface CreateBody {
  kind?: string;
  title?: string;
  company?: string | null;
  due_at?: string | null;
  deadline_at?: string | null;
  source?: string;
  status?: string;
}

@Controller("v1/reminders")
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly svc: InboxService) {}
  @Get()
  list(@CurrentUser() u: AuthUser, @Query("status") status?: string) {
    return this.svc.listReminders(u.id, status || "upcoming");
  }
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() b: CreateBody) {
    if (!b?.title) throw new BadRequestException("title required");
    return this.svc.addReminder(u.id, {
      kind: b.kind || "other",
      title: b.title,
      company: b.company ?? undefined,
      due_at: b.due_at ?? undefined,
      deadline_at: b.deadline_at ?? undefined,
      source: b.source || "manual",
    });
  }
  @Put(":id")
  setStatus(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() b: StatusBody) {
    if (!b?.status) throw new BadRequestException("status required");
    return this.svc.setReminderStatus(u.id, id, b.status);
  }
  @Delete(":id")
  remove(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.svc.deleteReminder(u.id, id);
  }
}
