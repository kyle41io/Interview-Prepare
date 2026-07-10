import { createParamDecorator, ExecutionContext } from "@nestjs/common";
export interface AuthUser { id: string; email?: string; }
export const CurrentUser = createParamDecorator((_d, ctx: ExecutionContext): AuthUser =>
  ctx.switchToHttp().getRequest().user);
