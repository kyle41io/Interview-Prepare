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
  return { svc: new ChatService(quota as any, provider as any, billing as any, config as any), quota, provider };
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

  it("rejects on the daily cap without ever touching the session tier", async () => {
    const { svc, quota, provider } = build({ quota: { bump: jest.fn().mockResolvedValue({ ok: false, remaining: 0 }) } });
    await expect(svc.chat({ id: "u1", email: "demo@example.com", sessionId: "s1" }, MSGS)).rejects.toThrow(HttpException);
    expect(quota.bumpSession).not.toHaveBeenCalled();
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("rejects on the session cap once the daily check has passed", async () => {
    const { svc, provider } = build({ quota: { bumpSession: jest.fn().mockResolvedValue({ ok: false, remaining: 0 }) } });
    await expect(svc.chat({ id: "u1", email: "demo@example.com", sessionId: "s1" }, MSGS)).rejects.toThrow(HttpException);
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
