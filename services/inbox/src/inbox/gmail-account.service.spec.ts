import { GmailAccountService } from "./gmail-account.service";
function make(send: jest.Mock, exchange = async () => ({ refresh_token: "rt", email: "e@x.com" })) {
  const google = { exchangeCode: jest.fn(exchange) } as any;
  return { svc: new GmailAccountService({ doc: { send }, inboxTable: "ip_inbox" } as any, google), google, send };
}
describe("GmailAccountService", () => {
  it("connect exchanges the code and stores refresh_token, returns only {connected,email}", async () => {
    const send = jest.fn().mockResolvedValue({});
    const { svc, google } = make(send);
    const out = await svc.connect("u1", "code123", "https://app/cb");
    expect(google.exchangeCode).toHaveBeenCalledWith("code123", "https://app/cb");
    expect(out).toEqual({ connected: true, email: "e@x.com" });
    const item = send.mock.calls[0][0].input.Item;
    expect(item.refresh_token).toBe("rt"); expect(item.active).toBe(true);
    expect(out).not.toHaveProperty("refresh_token"); // never returned to client
  });
  it("status maps active/email/last_scan", async () => {
    const { svc } = make(jest.fn().mockResolvedValue({ Item: { active: true, email: "e@x.com", last_scan: "2026-07-10" } }));
    expect(await svc.status("u1")).toEqual({ connected: true, email: "e@x.com", last_scan: "2026-07-10" });
  });
  it("disconnect clears the refresh token", async () => {
    const send = jest.fn().mockResolvedValue({});
    await make(send).svc.disconnect("u1");
    const arg = send.mock.calls[0][0].input;
    expect(arg.ExpressionAttributeValues[":f"]).toBe(false);
    expect(arg.ExpressionAttributeValues[":e"]).toBe("");
  });
});

/* The browser receives a Google refresh token straight from Supabase
   (provider_refresh_token). Before this path existed, the API only accepted an
   OAuth code, so assets/js/auth.js kept posting to a Supabase Edge Function
   that is no longer deployed and Gmail never connected on AWS. */
describe("GmailAccountService.connectWithRefreshToken", () => {
  it("stores the supplied refresh token as an active account without calling Google", async () => {
    const send = jest.fn().mockResolvedValue({});
    const exchangeCode = jest.fn();
    const s = new GmailAccountService(
      { doc: { send }, inboxTable: "ip_inbox" } as any,
      { exchangeCode } as any,
    );
    const out = await s.connectWithRefreshToken("u1", "rt-123", "a@b.c");
    expect(exchangeCode).not.toHaveBeenCalled();
    const item = send.mock.calls[0][0].input.Item;
    expect(item.pk).toBe("USER#u1");
    expect(item.refresh_token).toBe("rt-123");
    expect(item.email).toBe("a@b.c");
    expect(item.active).toBe(true);
    expect(out).toEqual({ connected: true, email: "a@b.c" });
  });

  it("tolerates a missing email", async () => {
    const send = jest.fn().mockResolvedValue({});
    const s = new GmailAccountService(
      { doc: { send }, inboxTable: "ip_inbox" } as any,
      { exchangeCode: jest.fn() } as any,
    );
    const out = await s.connectWithRefreshToken("u1", "rt", null);
    expect(out).toEqual({ connected: true, email: null });
    expect(send.mock.calls[0][0].input.Item.email).toBeNull();
  });
});
