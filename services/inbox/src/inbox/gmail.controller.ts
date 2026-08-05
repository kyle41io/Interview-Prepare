import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, AuthUser } from "@ip/auth";
import { GmailAccountService } from "./gmail-account.service";
import { CronGuard } from "./cron.guard";
import { ScanService } from "./scan.service";
interface ConnectBody { code?: string; redirect_uri?: string; refresh_token?: string; email?: string; }
// Guards are PER-METHOD: connect/status/disconnect require the user JWT, but the
// cron-triggered scan is machine-called across all users and uses CronGuard instead.
@Controller("v1/gmail")
export class GmailController {
  constructor(private readonly accounts: GmailAccountService, private readonly scan_: ScanService) {}
  @Post("connect") @UseGuards(JwtAuthGuard) connect(@CurrentUser() u: AuthUser, @Body() b: ConnectBody) {
    // Prefer the refresh token Supabase already handed the browser; fall back to
    // exchanging an OAuth authorization code.
    if (b.refresh_token) return this.accounts.connectWithRefreshToken(u.id, b.refresh_token, b.email ?? null);
    return this.accounts.connect(u.id, b.code || "", b.redirect_uri || "");
  }
  @Get("status") @UseGuards(JwtAuthGuard) status(@CurrentUser() u: AuthUser) { return this.accounts.status(u.id); }
  @Post("disconnect") @UseGuards(JwtAuthGuard) disconnect(@CurrentUser() u: AuthUser) { return this.accounts.disconnect(u.id); }
  // ?debug=1 returns the per-message trace (subjects included), so it stays
  // behind CronGuard like the scan itself.
  @Post("scan") @UseGuards(CronGuard) scan(@Query("debug") debug?: string) { return this.scan_.scanAll({ debug: debug === "1" || debug === "true" }); }
}
