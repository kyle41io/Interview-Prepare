import { BadRequestException, Body, Controller, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { InboxService } from "./inbox.service";

// Interface (erases to Object) so the whitelist ValidationPipe passes the body through.
interface StatusBody {
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
  @Put(":id")
  setStatus(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() b: StatusBody) {
    if (!b?.status) throw new BadRequestException("status required");
    return this.svc.setReminderStatus(u.id, id, b.status);
  }
}
