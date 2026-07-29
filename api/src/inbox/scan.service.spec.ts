import { ScanService } from "./scan.service";

function build(opts: { seenFirst?: boolean; classify?: () => Promise<any>; meta?: any } = {}) {
  const puts: any[] = [];
  const send = jest.fn(async (cmd: any) => {
    // GetCommand (seen check) vs PutCommand (markSeen) — distinguished by the
    // Item the DocumentClient carries on writes.
    if (cmd?.input?.Item) {
      puts.push(cmd.input.Item);
      return {};
    }
    return { Item: opts.seenFirst ? { sk: "SEEN#m1" } : undefined };
  });
  const dyn = { doc: { send }, inboxTable: "ip_inbox" } as any;
  const google = {
    refreshAccessToken: async () => "acc",
    recentQuery: () => "newer_than:2d in:inbox",
    listRecent: async () => [{ id: "m1" }],
    getMeta: async () => ("meta" in opts ? opts.meta : { subject: "Interview at Acme", from: "r@a.com", snippet: "schedule interview" }),
  } as any;
  const accounts = { listActiveAccounts: async () => [{ userId: "u1", refresh_token: "rt", email: "u@example.com" }], setLastScan: jest.fn() } as any;
  const inbox = { addNotification: jest.fn(async () => ({ id: "n" })), addReminder: jest.fn(async () => ({ id: "r" })) } as any;
  const provider = {
    classify: opts.classify || (async () => ({ is_recruiting: true, kind: "interview", company: "Acme", title: "Interview", event_at: "2026-08-01T09:00:00Z", deadline_at: null, summary: "s" })),
  } as any;
  return { svc: new ScanService(dyn, google, accounts, inbox, provider), inbox, seenIds: () => puts.filter((i) => String(i.sk).startsWith("SEEN#")).map((i) => i.sk) };
}

describe("ScanService.scanAll", () => {
  it("classifies a recruiting message → notification + reminder", async () => {
    const { svc, inbox } = build();
    const out = await svc.scanAll();
    expect(out).toEqual({ scanned: 1, accounts: 1 });
    expect(inbox.addNotification).toHaveBeenCalledTimes(1);
    expect(inbox.addReminder).toHaveBeenCalledTimes(1); // interview + event_at
  });

  it("idempotent: an already-seen message creates nothing", async () => {
    const { svc, inbox } = build({ seenFirst: true });
    const out = await svc.scanAll();
    expect(out.scanned).toBe(0);
    expect(inbox.addNotification).not.toHaveBeenCalled();
  });

  it("a failed classification leaves the message unseen so the next run retries it", async () => {
    const { svc, inbox, seenIds } = build({ classify: async () => { throw new Error("429 rate limited"); } });
    const out = await svc.scanAll();
    expect(out.scanned).toBe(0);
    expect(inbox.addNotification).not.toHaveBeenCalled();
    // The bug this guards: marking seen before classifying dropped the mail forever.
    expect(seenIds()).toEqual([]);
  });

  it("marks a decided message seen so it is never reclassified", async () => {
    const { svc, seenIds } = build({ classify: async () => ({ is_recruiting: false }) });
    await svc.scanAll();
    expect(seenIds()).toEqual(["SEEN#m1"]);
  });

  it("a failed metadata fetch leaves the message unseen", async () => {
    const { svc, seenIds } = build({ meta: null });
    const out = await svc.scanAll();
    expect(out.scanned).toBe(0);
    expect(seenIds()).toEqual([]);
  });

  it("debug mode reports the query, the account and each message outcome", async () => {
    const { svc } = build();
    const out = await svc.scanAll({ debug: true });
    expect(out.debug).toEqual([
      {
        email: "u@example.com",
        token_refresh: "ok",
        query: "newer_than:2d in:inbox",
        listed: 1,
        messages: [{ id: "m1", subject: "Interview at Acme", from: "r@a.com", outcome: "notified", kind: "interview", reminder: true }],
      },
    ]);
  });

  it("debug mode names the reason a message was skipped", async () => {
    const { svc } = build({ classify: async () => { throw new Error("boom"); } });
    const out = await svc.scanAll({ debug: true });
    expect(out.debug![0].messages[0]).toMatchObject({ outcome: "classify-failed", error: "boom" });
  });

  it("omits the debug key entirely when not requested", async () => {
    const { svc } = build();
    expect(await svc.scanAll()).not.toHaveProperty("debug");
  });
});
