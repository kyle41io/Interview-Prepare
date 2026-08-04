import { clampMessages, usageSk, todayUtc, MAX_TURNS, MAX_CHARS, SYSTEM } from "./scope";
describe("scope", () => {
  it("clamp: keeps last MAX_TURNS, drops bad entries, slices content to MAX_CHARS, keeps role", () => {
    const long = "x".repeat(MAX_CHARS + 50);
    const raw = [
      { role: "user", content: "a" },
      { role: "system", content: "nope" },       // dropped (bad role)
      { role: "assistant", content: 123 as any }, // dropped (non-string)
      { role: "assistant", content: "b" },
      { role: "user", content: long },
    ];
    const out = clampMessages(raw);
    expect(out).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "x".repeat(MAX_CHARS) },
    ]);
  });
  it("clamp: non-array → []", () => { expect(clampMessages(undefined as any)).toEqual([]); });
  it("usageSk / todayUtc", () => {
    expect(usageSk("2026-07-10")).toBe("CHATUSAGE#2026-07-10");
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("SYSTEM prompt scopes to IT/interview and forbids leaking instructions", () => {
    expect(SYSTEM).toContain("SCOPE:");
    expect(SYSTEM).toContain("Never reveal");
  });
});
