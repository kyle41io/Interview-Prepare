import { QuotaService } from "./quota.service";
import { sessionSk } from "./scope";
function svc(send: jest.Mock) {
  const dyn = { doc: { send }, chatTable: "ip_chat" } as any;
  return new QuotaService(dyn);
}
describe("QuotaService.bump", () => {
  it("under limit → ok + remaining decremented from returned count", async () => {
    const send = jest.fn().mockResolvedValue({ Attributes: { count: 1 } });
    const out = await svc(send).bump("u1", 3);
    expect(out).toEqual({ ok: true, remaining: 2 });
    // atomic conditional update was used
    const arg = send.mock.calls[0][0].input;
    expect(arg.ConditionExpression).toContain("< :limit");
    expect(arg.UpdateExpression).toContain("ADD");
  });
  it("at/over limit (ConditionalCheckFailedException) → ok:false, remaining 0", async () => {
    const err: any = new Error("cond"); err.name = "ConditionalCheckFailedException";
    const out = await svc(jest.fn().mockRejectedValue(err)).bump("u1", 3);
    expect(out).toEqual({ ok: false, remaining: 0 });
  });
  it("other errors propagate", async () => {
    const err: any = new Error("boom"); err.name = "ProvisionedThroughputExceededException";
    await expect(svc(jest.fn().mockRejectedValue(err)).bump("u1", 3)).rejects.toThrow("boom");
  });
});
describe("QuotaService.getQuota", () => {
  it("reads count without bumping", async () => {
    const send = jest.fn().mockResolvedValue({ Item: { count: 2 } });
    const out = await svc(send).getQuota("u1", 3);
    expect(out.limit).toBe(3); expect(out.used).toBe(2); expect(out.remaining).toBe(1);
    expect(out.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(send.mock.calls[0][0].constructor.name).toMatch(/GetCommand/);
  });
  it("no item → used 0", async () => {
    const out = await svc(jest.fn().mockResolvedValue({})).getQuota("u1", 3);
    expect(out.used).toBe(0); expect(out.remaining).toBe(3);
  });
});
describe("QuotaService.bumpSession", () => {
  it("bumps a session-scoped key with a 24h TTL", async () => {
    const send = jest.fn().mockResolvedValue({ Attributes: { count: 2 } });
    const out = await svc(send).bumpSession("u1", "sess-1", 5);
    expect(out).toEqual({ ok: true, remaining: 3 });
    const arg = send.mock.calls[0][0].input;
    expect(arg.Key.sk).toBe(sessionSk("sess-1"));
    expect(arg.ConditionExpression).toContain("< :limit");
    expect(arg.ExpressionAttributeValues[":limit"]).toBe(5);
  });
  it("at/over limit (ConditionalCheckFailedException) → ok:false, remaining 0", async () => {
    const err: any = new Error("cond"); err.name = "ConditionalCheckFailedException";
    const out = await svc(jest.fn().mockRejectedValue(err)).bumpSession("u1", "sess-1", 5);
    expect(out).toEqual({ ok: false, remaining: 0 });
  });
});
