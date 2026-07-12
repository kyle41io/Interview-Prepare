import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { InboxService } from "./inbox.service";

// Interface (erases to Object) so the whitelist ValidationPipe passes the body
// through — a decorated DTO class would be stripped of undecorated props.
interface ReadBody {
  created_at?: string;
  id?: string;
}

@Controller("v1/notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: InboxService) {}
  @Get()
  list(@CurrentUser() u: AuthUser, @Query("limit") limit?: string) {
    return this.svc.listNotifications(u.id, limit ? Number(limit) : 30);
  }
  @Post("read")
  read(@CurrentUser() u: AuthUser, @Body() b: ReadBody) {
    return this.svc.markRead(u.id, b.created_at || "", b.id || "");
  }
  @Post("read-all")
  readAll(@CurrentUser() u: AuthUser) {
    return this.svc.markAllRead(u.id);
  }
}
