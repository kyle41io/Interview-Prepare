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
  it("markRead is a no-op (ok:false) when the notification doesn't exist (attribute_exists guard)", async () => {
    const err: any = new Error("cond"); err.name = "ConditionalCheckFailedException";
    const send = jest.fn().mockRejectedValue(err);
    const out = await svc(send).markRead("u1", "2026-07-10T00:00:00Z", "nope");
    expect(out).toEqual({ ok: false });
    expect(send.mock.calls[0][0].input.ConditionExpression).toBe("attribute_exists(sk)");
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

  /* assets/js/gmail.js fetchReminders() requests "upcoming,done" — the shape of
     the Supabase .in("status", [...]) query the API replaced. Matching the raw
     parameter against one status returned nothing, so the reminders page was
     always empty even with reminders in the table. */
  it("listReminders accepts a comma-separated set of statuses", async () => {
    const send = jest.fn().mockResolvedValue({ Items: [
      { id: "r1", status: "upcoming", due_at: "2026-08-01" },
      { id: "r2", status: "done", due_at: "2026-08-02" },
      { id: "r3", status: "dismissed", due_at: "2026-08-03" },
    ] });
    const out = await svc(send).listReminders("u1", "upcoming,done");
    expect(out.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("listReminders tolerates spaces around the commas", async () => {
    const send = jest.fn().mockResolvedValue({ Items: [
      { id: "r1", status: "upcoming", due_at: "2026-08-01" },
      { id: "r2", status: "done", due_at: "2026-08-02" },
    ] });
    const out = await svc(send).listReminders("u1", " upcoming , done ");
    expect(out.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("listReminders treats a blank status as no filter", async () => {
    const send = jest.fn().mockResolvedValue({ Items: [
      { id: "r1", status: "upcoming", due_at: "2026-08-01" },
      { id: "r2", status: "dismissed", due_at: "2026-08-02" },
    ] });
    const out = await svc(send).listReminders("u1", "");
    expect(out.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});

/* Endpoints the frontend (assets/js/gmail.js) has always called but which the
   migrated API never implemented, so they 404'd against AWS. */
describe("InboxService - delete paths", () => {
  it("deleteReminder scopes the key to the caller's own pk", async () => {
    const send = jest.fn().mockResolvedValue({});
    const out = await svc(send).deleteReminder("u1", "r1");
    const arg = send.mock.calls[0][0].input;
    expect(arg.Key).toEqual({ pk: "USER#u1", sk: "REMINDER#r1" });
    expect(out).toEqual({ ok: true });
  });

  it("deleteReminder of a missing reminder is a no-op, not an error", async () => {
    const send = jest.fn().mockResolvedValue({});
    await expect(svc(send).deleteReminder("u1", "gone")).resolves.toEqual({ ok: true });
  });

  it("clearReadNotifications deletes read items and keeps unread ones", async () => {
    const send = jest.fn()
      .mockResolvedValueOnce({ Items: [
        { sk: "NOTIF#2026-07-10T00:00:00Z#a", read: true },
        { sk: "NOTIF#2026-07-09T00:00:00Z#b", read: false },
        { sk: "NOTIF#2026-07-08T00:00:00Z#c", read: true },
      ] })
      .mockResolvedValue({});
    const out = await svc(send).clearReadNotifications("u1");
    expect(out).toEqual({ ok: true, deleted: 2 });
    expect(send).toHaveBeenCalledTimes(3); // 1 query + 2 deletes
    const deleted = send.mock.calls.slice(1).map((c: any) => c[0].input.Key.sk);
    expect(deleted).toEqual(["NOTIF#2026-07-10T00:00:00Z#a", "NOTIF#2026-07-08T00:00:00Z#c"]);
  });
});
