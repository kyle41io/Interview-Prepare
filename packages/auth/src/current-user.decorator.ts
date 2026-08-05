import { createParamDecorator, ExecutionContext } from "@nestjs/common";
export interface AuthUser { id: string; email?: string; sessionId?: string; }
export const CurrentUser = createParamDecorator((_d, ctx: ExecutionContext): AuthUser =>
  ctx.switchToHttp().getRequest().user);
