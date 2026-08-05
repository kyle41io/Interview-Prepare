import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, AuthUser } from "@ip/auth";
import { BillingService } from "./billing.service";
import { CreatePaymentDto, AdminDecideDto, AdminListQueryDto } from "./dto";
import { AdminGuard } from "./admin.guard";
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
  @Get("payment/current")
  current(@CurrentUser() u: AuthUser) { return this.svc.getCurrentPayment(u.id); }

  @Get("admin/payments")
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminList(@Query() q: AdminListQueryDto) { return this.svc.listPayments(q.status); }
  @Post("admin/payment/approve")
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminApprove(@Body() b: AdminDecideDto) { return this.svc.approve(b); }
  @Post("admin/payment/reject")
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminReject(@Body() b: AdminDecideDto) { return this.svc.reject(b); }
}
