import { HttpException } from "@nestjs/common";
import { ChatService } from "./chat.service";

const MSGS = [{ role: "user", content: "hi" }];

function build(over: any = {}) {
  const quota = {
    bump: jest.fn().mockResolvedValue({ ok: true, remaining: 9 }),
    bumpSession: jest.fn().mockResolvedValue({ ok: true, remaining: 4 }),
    getQuota: jest.fn().mockResolvedValue({ limit: 3, used: 0, remaining: 3, day: "2026-08-01" }),
    ...over.quota,
  };
  const provider = { complete: jest.fn().mockResolvedValue({ text: "ok" }), ...over.provider };
  const billing = { getEntitlement: jest.fn().mockResolvedValue({ isPro: false }), ...over.billing };
  const config = { get: (k: string) => (k === "DEMO_EMAILS" ? "demo@example.com" : undefined), ...over.config };
  const history = { get: jest.fn().mockResolvedValue([]), save: jest.fn().mockResolvedValue(undefined), ...over.history };
  return { svc: new ChatService(quota as any, provider as any, billing as any, config as any, history as any), quota, provider, history };
}

describe("ChatService demo caps", () => {
  it("applies 3/day and no session tier to an ordinary user", async () => {
    const { svc, quota } = build();
    await svc.chat({ id: "u1", email: "real@user.com", sessionId: "s1" }, MSGS);
    expect(quota.bump).toHaveBeenCalledWith("u1", 3);
    expect(quota.bumpSession).not.toHaveBeenCalled();
  });

  it("applies 30/day and 5/session to a demo user", async () => {
    const { svc, quota } = build();
    await svc.chat({ id: "u1", email: "demo@example.com", sessionId: "s1" }, MSGS);
    expect(quota.bump).toHaveBeenCalledWith("u1", 30);
    expect(quota.bumpSession).toHaveBeenCalledWith("u1", "s1", 5);
  });

  it("rejects on the session cap without ever touching the daily counter", async () => {
    const { svc, quota, provider } = build({ quota: { bumpSession: jest.fn().mockResolvedValue({ ok: false, remaining: 0 }) } });
    await expect(svc.chat({ id: "u1", email: "demo@example.com", sessionId: "s1" }, MSGS)).rejects.toThrow(HttpException);
    // The daily pool is shared across every reviewer using the demo login, so a
    // request rejected by the session cap must not consume any of it.
    expect(quota.bump).not.toHaveBeenCalled();
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("rejects on the daily cap once the session check has passed", async () => {
    const { svc, quota, provider } = build({ quota: { bump: jest.fn().mockResolvedValue({ ok: false, remaining: 0 }) } });
    await expect(svc.chat({ id: "u1", email: "demo@example.com", sessionId: "s1" }, MSGS)).rejects.toThrow(HttpException);
    expect(quota.bumpSession).toHaveBeenCalledWith("u1", "s1", 5);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("falls back to the daily cap alone when session_id is missing", async () => {
    const { svc, quota, provider } = build();
    await svc.chat({ id: "u1", email: "demo@example.com" }, MSGS);
    expect(quota.bump).toHaveBeenCalledWith("u1", 30);
    expect(quota.bumpSession).not.toHaveBeenCalled();
    // A missing claim must never mean "uncapped".
    expect(provider.complete).toHaveBeenCalled();
  });

  it("caps a demo Pro account at the demo daily limit, not 50", async () => {
    const { svc, quota } = build({ billing: { getEntitlement: jest.fn().mockResolvedValue({ isPro: true }) } });
    await svc.chat({ id: "u1", email: "demo@example.com", sessionId: "s1" }, MSGS);
    expect(quota.bump).toHaveBeenCalledWith("u1", 30);
  });
});

describe("ChatService history", () => {
  it("saves the exchange, reply included, under the user's own key", async () => {
    const { svc, history } = build();
    await svc.chat({ id: "u1", email: "real@user.com", sessionId: "s1" }, MSGS);
    expect(history.save).toHaveBeenCalledWith("u1", null, [
      { role: "user", content: "hi" },
      { role: "assistant", content: "ok" },
    ]);
  });

  it("keeps a demo visitor's conversation on their session", async () => {
    const { svc, history } = build();
    await svc.chat({ id: "u1", email: "demo@example.com", sessionId: "s1" }, MSGS);
    expect(history.save.mock.calls[0][1]).toBe("s1");
    expect((await svc.historyFor({ id: "u1", email: "demo@example.com", sessionId: "s1" })).messages).toEqual([]);
    expect(history.get).toHaveBeenCalledWith("u1", "s1");
  });

  it("stores nothing for a demo request with no session to attribute it to", async () => {
    // Otherwise every reviewer sharing the public login would read the last
    // visitor's conversation.
    const { svc, history } = build();
    await svc.chat({ id: "u1", email: "demo@example.com" }, MSGS);
    expect(history.save).not.toHaveBeenCalled();
    expect(await svc.historyFor({ id: "u1", email: "demo@example.com" })).toEqual({ messages: [] });
    expect(history.get).not.toHaveBeenCalled();
  });

  it("a failed reply saves nothing", async () => {
    const { svc, history } = build({ provider: { complete: jest.fn().mockRejectedValue(new Error("boom")) } });
    await expect(svc.chat({ id: "u1", email: "real@user.com" }, MSGS)).rejects.toThrow("boom");
    expect(history.save).not.toHaveBeenCalled();
  });
});
