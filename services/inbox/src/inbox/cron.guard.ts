import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CronGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>("CRON_SECRET");
    const got = context.switchToHttp().getRequest().headers["x-cron-secret"];
    if (!secret || got !== secret) throw new ForbiddenException("forbidden");
    return true;
  }
}
