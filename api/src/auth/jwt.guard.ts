import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const h = req.headers["authorization"] || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) throw new UnauthorizedException("no token");
    const secret = this.config.get<string>("SUPABASE_JWT_SECRET");
    if (!secret) throw new UnauthorizedException("auth not configured");
    let payload: any;
    try { payload = jwt.verify(token, secret, { algorithms: ["HS256"] }); }
    catch { throw new UnauthorizedException("invalid token"); }
    if (!payload?.sub) throw new UnauthorizedException("no subject");
    req.user = { id: payload.sub, email: payload.email };
    return true;
  }
}
