import { JwtAuthGuard } from "./jwt.guard";
import { UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
const SECRET = "test-secret";
function ctx(auth?: string) {
  const req: any = { headers: auth ? { authorization: auth } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}
describe("JwtAuthGuard", () => {
  const guard = new JwtAuthGuard({ get: () => SECRET } as any);
  it("rejects missing token", () => { expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException); });
  it("rejects bad signature", () => {
    const t = jwt.sign({ sub: "u1" }, "wrong"); expect(() => guard.canActivate(ctx("Bearer " + t))).toThrow(UnauthorizedException);
  });
  it("rejects expired", () => {
    const t = jwt.sign({ sub: "u1", exp: Math.floor(Date.now()/1000) - 10 }, SECRET);
    expect(() => guard.canActivate(ctx("Bearer " + t))).toThrow(UnauthorizedException);
  });
  it("accepts valid + sets user", () => {
    const t = jwt.sign({ sub: "u1", email: "a@b.c" }, SECRET);
    const c = ctx("Bearer " + t); expect(guard.canActivate(c)).toBe(true);
    expect(c._req.user).toEqual({ id: "u1", email: "a@b.c" });
  });
});
