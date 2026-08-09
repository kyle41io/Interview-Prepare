import { clampMessages, usageSk, todayUtc, MAX_MESSAGES, MAX_CHARS, SYSTEM } from "./scope";
describe("scope", () => {
  it("clamp: keeps the tail, drops bad entries, slices content to MAX_CHARS, keeps role", () => {
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
  it("clamp: keeps at most MAX_MESSAGES and never opens on an assistant reply", () => {
    // 20 messages, alternating, so the last MAX_MESSAGES start on an assistant.
    const raw = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "m" + i,
    }));
    const out = clampMessages(raw);
    expect(out.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(out[0].role).toBe("user");
    expect(out[out.length - 1]).toEqual({ role: "assistant", content: "m19" });
  });
  it("clamp: drops a leading assistant even on a short conversation", () => {
    const out = clampMessages([{ role: "assistant", content: "hi" }, { role: "user", content: "q" }]);
    expect(out).toEqual([{ role: "user", content: "q" }]);
  });
  it("usageSk / todayUtc", () => {
    expect(usageSk("2026-07-10")).toBe("CHATUSAGE#2026-07-10");
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("SYSTEM prompt scopes to IT/interview and forbids leaking instructions", () => {
    expect(SYSTEM).toContain("SCOPE:");
    expect(SYSTEM).toContain("Never reveal");
  });
});
