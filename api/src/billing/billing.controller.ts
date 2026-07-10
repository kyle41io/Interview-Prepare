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
