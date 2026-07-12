import { InboxService } from "./inbox.service";
const svc = (send: jest.Mock) => new InboxService({ doc: { send }, inboxTable: "ip_inbox" } as any);
describe("InboxService", () => {
  it("listNotifications queries newest-first with limit and maps items", async () => {
    const send = jest.fn().mockResolvedValue({ Items: [{ id: "n1", type: "interview", title: "t", body: "b", read: false, source: "m1", created_at: "2026-07-10T00:00:00Z", sk: "NOTIF#2026-07-10T00:00:00Z#n1" }] });
    const out = await svc(send).listNotifications("u1", 30);
    const arg = send.mock.calls[0][0].input;
    expect(arg.ScanIndexForward).toBe(false); expect(arg.Limit).toBe(30);
    expect(arg.ExpressionAttributeValues[":pfx"]).toBe("NOTIF#");
    expect(out[0]).toEqual({ id: "n1", type: "interview", title: "t", body: "b", read: false, source: "m1", created_at: "2026-07-10T00:00:00Z" });
  });
  it("markAllRead updates only unread items", async () => {
    const send = jest.fn()
      .mockResolvedValueOnce({ Items: [{ sk: "NOTIF#2026-07-10T00:00:00Z#a", read: false }, { sk: "NOTIF#2026-07-09T00:00:00Z#b", read: true }] })
      .mockResolvedValue({});
    const out = await svc(send).markAllRead("u1");
    expect(out.updated).toBe(1); // only 'a'
    expect(send).toHaveBeenCalledTimes(2); // 1 query + 1 update
  });
  it("listReminders filters by status and sorts by due_at", async () => {
    const send = jest.fn().mockResolvedValue({ Items: [
      { id: "r2", status: "upcoming", due_at: "2026-08-02", kind: "interview", title: "B" },
      { id: "r1", status: "upcoming", due_at: "2026-08-01", kind: "test", title: "A" },
      { id: "r3", status: "done", due_at: "2026-07-01", kind: "test", title: "C" },
    ] });
    const out = await svc(send).listReminders("u1", "upcoming");
    expect(out.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});
