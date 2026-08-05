import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const uid = req.user?.id;
    const admins = (this.config.get<string>("ADMIN_UIDS") || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!uid || !admins.includes(uid)) throw new ForbiddenException("admin only");
    return true;
  }
}
