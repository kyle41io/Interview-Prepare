import { AdminGuard } from "./admin.guard";
import { ForbiddenException } from "@nestjs/common";
const ctx = (userId?: string) => ({ switchToHttp: () => ({ getRequest: () => ({ user: userId ? { id: userId } : undefined }) }) }) as any;
const cfg = (uids: string) => ({ get: (_: string) => uids }) as any;
describe("AdminGuard", () => {
  it("allows a uid in ADMIN_UIDS", () => {
    expect(new AdminGuard(cfg("a,b,c")).canActivate(ctx("b"))).toBe(true);
  });
  it("rejects a uid not in ADMIN_UIDS", () => {
    expect(() => new AdminGuard(cfg("a,b,c")).canActivate(ctx("z"))).toThrow(ForbiddenException);
  });
  it("rejects when no user / empty ADMIN_UIDS", () => {
    expect(() => new AdminGuard(cfg("a,b")).canActivate(ctx())).toThrow(ForbiddenException);
    expect(() => new AdminGuard(cfg("")).canActivate(ctx("a"))).toThrow(ForbiddenException);
  });
});
