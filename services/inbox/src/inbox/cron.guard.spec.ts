import { CronGuard } from "./cron.guard";
import { ForbiddenException } from "@nestjs/common";
const ctx = (hdr?: string) => ({ switchToHttp: () => ({ getRequest: () => ({ headers: hdr ? { "x-cron-secret": hdr } : {} }) }) }) as any;
const cfg = (s: string) => ({ get: () => s }) as any;
describe("CronGuard", () => {
  it("allows the matching secret", () => {
    expect(new CronGuard(cfg("s3cr3t")).canActivate(ctx("s3cr3t"))).toBe(true);
  });
  it("rejects wrong/missing secret and empty config", () => {
    expect(() => new CronGuard(cfg("s3cr3t")).canActivate(ctx("nope"))).toThrow(ForbiddenException);
    expect(() => new CronGuard(cfg("s3cr3t")).canActivate(ctx())).toThrow(ForbiddenException);
    expect(() => new CronGuard(cfg("")).canActivate(ctx("x"))).toThrow(ForbiddenException);
  });
});
