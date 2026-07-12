import { ScanService } from "./scan.service";
function build(seenFirst = false) {
  const send = jest.fn()
    .mockResolvedValueOnce({ Item: seenFirst ? { sk: "SEEN#m1" } : undefined }) // seen() check
    .mockResolvedValue({}); // markSeen + others
  const dyn = { doc: { send }, inboxTable: "ip_inbox" } as any;
  const google = {
    refreshAccessToken: async () => "acc",
    listRecent: async () => [{ id: "m1" }],
    getMeta: async () => ({ subject: "Interview at Acme", from: "r@a.com", snippet: "schedule interview" }),
  } as any;
  const accounts = { listActiveAccounts: async () => [{ userId: "u1", refresh_token: "rt" }], setLastScan: jest.fn() } as any;
  const inbox = { addNotification: jest.fn(async () => ({ id: "n" })), addReminder: jest.fn(async () => ({ id: "r" })) } as any;
  const provider = { classify: async () => ({ is_recruiting: true, kind: "interview", company: "Acme", title: "Interview", event_at: "2026-08-01T09:00:00Z", deadline_at: null, summary: "s" }) } as any;
  return { svc: new ScanService(dyn, google, accounts, inbox, provider), inbox };
}
describe("ScanService.scanAll", () => {
  it("classifies a recruiting message → notification + reminder", async () => {
    const { svc, inbox } = build(false);
    const out = await svc.scanAll();
    expect(out).toEqual({ scanned: 1, accounts: 1 });
    expect(inbox.addNotification).toHaveBeenCalledTimes(1);
    expect(inbox.addReminder).toHaveBeenCalledTimes(1); // interview + event_at
  });
  it("idempotent: an already-seen message creates nothing", async () => {
    const { svc, inbox } = build(true);
    const out = await svc.scanAll();
    expect(out.scanned).toBe(0);
    expect(inbox.addNotification).not.toHaveBeenCalled();
  });
});
