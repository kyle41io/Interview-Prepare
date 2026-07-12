import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { GmailAccountService } from "./gmail-account.service";
interface ConnectBody { code?: string; redirect_uri?: string; }
@Controller("v1/gmail")
export class GmailController {
  constructor(private readonly accounts: GmailAccountService) {}
  @Post("connect") @UseGuards(JwtAuthGuard) connect(@CurrentUser() u: AuthUser, @Body() b: ConnectBody) { return this.accounts.connect(u.id, b.code || "", b.redirect_uri || ""); }
  @Get("status") @UseGuards(JwtAuthGuard) status(@CurrentUser() u: AuthUser) { return this.accounts.status(u.id); }
  @Post("disconnect") @UseGuards(JwtAuthGuard) disconnect(@CurrentUser() u: AuthUser) { return this.accounts.disconnect(u.id); }
}
