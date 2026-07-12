import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";
import { GmailAccountService } from "./gmail-account.service";
import { CronGuard } from "./cron.guard";
import { ScanService } from "./scan.service";
interface ConnectBody { code?: string; redirect_uri?: string; }
// Guards are PER-METHOD: connect/status/disconnect require the user JWT, but the
// cron-triggered scan is machine-called across all users and uses CronGuard instead.
@Controller("v1/gmail")
export class GmailController {
  constructor(private readonly accounts: GmailAccountService, private readonly scan_: ScanService) {}
  @Post("connect") @UseGuards(JwtAuthGuard) connect(@CurrentUser() u: AuthUser, @Body() b: ConnectBody) { return this.accounts.connect(u.id, b.code || "", b.redirect_uri || ""); }
  @Get("status") @UseGuards(JwtAuthGuard) status(@CurrentUser() u: AuthUser) { return this.accounts.status(u.id); }
  @Post("disconnect") @UseGuards(JwtAuthGuard) disconnect(@CurrentUser() u: AuthUser) { return this.accounts.disconnect(u.id); }
  @Post("scan") @UseGuards(CronGuard) scan() { return this.scan_.scanAll(); }
}
