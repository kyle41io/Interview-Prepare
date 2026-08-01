import { isDemoEmail, limitsFor, DEMO_DAILY, DEMO_SESSION, FREE_DAILY, PRO_DAILY } from "./limits";

describe("isDemoEmail", () => {
  const LIST = "demo@example.com,demo.pro@example.com";

  it("matches a listed email", () => {
    expect(isDemoEmail("demo@example.com", LIST)).toBe(true);
    expect(isDemoEmail("demo.pro@example.com", LIST)).toBe(true);
  });

  it("does not match an unlisted email", () => {
    expect(isDemoEmail("someone@else.com", LIST)).toBe(false);
  });

  it("is case-insensitive and tolerates whitespace in the list", () => {
    expect(isDemoEmail("DEMO@example.com", " demo@example.com , demo.pro@example.com ")).toBe(true);
  });

  it("returns false for a missing email or an empty list", () => {
    expect(isDemoEmail(undefined, LIST)).toBe(false);
    expect(isDemoEmail("demo@example.com", "")).toBe(false);
    expect(isDemoEmail("demo@example.com", undefined as any)).toBe(false);
  });

  it("never treats the empty string as a member of the list", () => {
    // A naive split("") on an empty list yields [""], which would match a
    // user whose email is missing — turning every anonymous caller into a demo.
    expect(isDemoEmail("", "")).toBe(false);
  });
});

describe("limitsFor", () => {
  it("gives demo accounts 5 per session and 30 per day", () => {
    expect(limitsFor({ isPro: false, isDemo: true })).toEqual({ daily: DEMO_DAILY, session: DEMO_SESSION });
    expect(limitsFor({ isPro: false, isDemo: true })).toEqual({ daily: 30, session: 5 });
  });

  it("caps the demo Pro account at the demo limits, not the Pro 50", () => {
    expect(limitsFor({ isPro: true, isDemo: true })).toEqual({ daily: 30, session: 5 });
  });

  it("leaves ordinary free and Pro users unchanged with no session tier", () => {
    expect(limitsFor({ isPro: false, isDemo: false })).toEqual({ daily: FREE_DAILY, session: null });
    expect(limitsFor({ isPro: true, isDemo: false })).toEqual({ daily: PRO_DAILY, session: null });
    expect(FREE_DAILY).toBe(3);
    expect(PRO_DAILY).toBe(50);
  });
});
