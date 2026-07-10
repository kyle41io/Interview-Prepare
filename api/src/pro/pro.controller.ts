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
