import { isActive, extendExpiry, toView } from "./entitlement";
import { buildVietqrUrl, genProCode } from "./vietqr";
const NOW = Date.parse("2026-07-10T00:00:00Z");
describe("entitlement", () => {
  it("isActive: active + future expiry = true; expired or none = false", () => {
    expect(isActive({ status: "active", expires_at: "2026-08-10T00:00:00Z" }, NOW)).toBe(true);
    expect(isActive({ status: "active", expires_at: "2026-06-10T00:00:00Z" }, NOW)).toBe(false);
    expect(isActive(null as any, NOW)).toBe(false);
    expect(isActive({ status: "expired", expires_at: "2026-08-10T00:00:00Z" }, NOW)).toBe(false);
  });
  it("extendExpiry: from now when no current, stacks on future current", () => {
    expect(extendExpiry("2026-07-10T00:00:00Z", null, 30)).toBe("2026-08-09T00:00:00.000Z");
    expect(extendExpiry("2026-07-10T00:00:00Z", "2026-07-20T00:00:00Z", 30)).toBe("2026-08-19T00:00:00.000Z");
  });
  it("toView maps to {tier,status,expires_at,isPro}", () => {
    expect(toView({ tier: "pro", status: "active", expires_at: "2026-08-10T00:00:00Z" }, NOW))
      .toEqual({ tier: "pro", status: "active", expires_at: "2026-08-10T00:00:00Z", isPro: true });
    expect(toView(null, NOW)).toEqual({ tier: "free", status: "none", expires_at: null, isPro: false });
  });
});
describe("vietqr", () => {
  it("builds a vietqr url with amount + addInfo", () => {
    const u = buildVietqrUrl("970407", "19036335023019", "NGUYEN VAN KIEN", 49000, "PRO-ABC123");
    expect(u).toContain("970407-19036335023019");
    expect(u).toContain("amount=49000");
    expect(u).toContain("addInfo=PRO-ABC123");
  });
  it("genProCode: PRO- prefix, deterministic with seeded rand", () => {
    let i = 0; const rand = () => [0, 0, 0, 0, 0, 0][i++] ?? 0;
    expect(genProCode(rand)).toMatch(/^PRO-[A-Z0-9]{6}$/);
  });
});
