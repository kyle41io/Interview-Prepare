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
    getMeta: async () => ("meta" in opts ? opts.meta : { subject: "Interview at Acme", from: "r@a.com", snippet: "schedule interview", date: "Wed, 19 Aug 2026 08:10:00 +0700", body: "Vòng 1 lúc 14:00 ngày 21/08/2026 tại HQ." }),
  } as any;
  const accounts = { listActiveAccounts: async () => [{ userId: "u1", refresh_token: "rt", email: "u@example.com" }], setLastScan: jest.fn() } as any;
  const inbox = { addNotification: jest.fn(async () => ({ id: "n" })), addReminder: jest.fn(async () => ({ id: "r" })) } as any;
  const inputs: string[] = [];
  const classify = opts.classify || (async () => ({ is_recruiting: true, kind: "interview", company: "Acme", title: "Interview", event_at: "2026-08-01T09:00:00Z", deadline_at: null, summary: "s" }));
  const provider = {
    classify: async (arg: { system: string; input: string }) => {
      inputs.push(arg.input);
      return classify();
    },
  } as any;
  return {
    svc: new ScanService(dyn, google, accounts, inbox, provider),
    inbox,
    classifyInput: () => inputs[0] || "",
    seenIds: () => puts.filter((i) => String(i.sk).startsWith("SEEN#")).map((i) => i.sk),
  };
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

/** The bug these cover: an interview invite produced a notification but no
 *  calendar event, because the only text the classifier ever saw was the
 *  subject plus Gmail's ~200-character snippet. Real invitations put the
 *  schedule in the body, so event_at came back null and the reminder — the one
 *  thing the calendar renders — was never written. */
describe("ScanService date extraction", () => {
  it("shows the classifier the body and the email's own date", async () => {
    const { svc, classifyInput } = build();
    await svc.scanAll();
    const input = classifyInput();
    expect(input).toContain("Vòng 1 lúc 14:00 ngày 21/08/2026");
    // Without a reference date the model cannot resolve "next Tuesday", and
    // guesses the year.
    expect(input).toContain("Wed, 19 Aug 2026 08:10:00 +0700");
    expect(input).toContain("Subject: Interview at Acme");
  });

  it("a date found only in the body still becomes a reminder", async () => {
    const { svc, inbox } = build({
      classify: async () => ({ is_recruiting: true, kind: "interview", company: "TechPlus", title: "Thư mời phỏng vấn", event_at: "2026-08-21T14:00:00", deadline_at: null, summary: "s" }),
    });
    await svc.scanAll();
    expect(inbox.addReminder).toHaveBeenCalledWith("u1", expect.objectContaining({ kind: "interview", due_at: "2026-08-21T14:00:00" }));
  });

  it("a junk date from the model creates no reminder and is never stored", async () => {
    const { svc, inbox } = build({
      classify: async () => ({ is_recruiting: true, kind: "interview", company: "X", title: "T", event_at: null, deadline_at: true, summary: "s" }),
    });
    await svc.scanAll();
    expect(inbox.addNotification).toHaveBeenCalledTimes(1); // the mail still reaches the bell
    expect(inbox.addReminder).not.toHaveBeenCalled();       // but nothing invisible on the calendar
  });

  it("passes only normalized dates through to the reminder", async () => {
    const { svc, inbox } = build({
      classify: async () => ({ is_recruiting: true, kind: "test", company: "X", title: "T", event_at: "not a date", deadline_at: "2026-09-01", summary: "s" }),
    });
    await svc.scanAll();
    expect(inbox.addReminder).toHaveBeenCalledWith("u1", expect.objectContaining({ due_at: undefined, deadline_at: "2026-09-01" }));
  });

  it("debug mode reports no reminder when the mail carries no date", async () => {
    const { svc } = build({
      classify: async () => ({ is_recruiting: true, kind: "interview", company: "X", title: "T", event_at: null, deadline_at: null, summary: "s" }),
    });
    const out = await svc.scanAll({ debug: true });
    expect(out.debug![0].messages[0]).toMatchObject({ outcome: "notified", kind: "interview", reminder: false });
  });
});

/** The rule the user asked for: a date in a recruiting mail belongs on the
 *  calendar whatever the mail is called. The kind gate used to be
 *  (interview|test), so an offer with a signing deadline or a task with a due
 *  date produced a notification and nothing to plan around. */
describe("ScanService reminder for any dated recruiting mail", () => {
  const dated = (kind: string, extra: any = {}) => ({
    is_recruiting: true, kind, company: "X", title: "T",
    event_at: "2026-08-22T09:00:00", deadline_at: null, summary: "s", ...extra,
  });

  it.each(["offer", "other", "rejection", "test", "interview"])("%s with a date becomes a reminder", async (kind) => {
    const { svc, inbox } = build({ classify: async () => dated(kind) });
    await svc.scanAll();
    expect(inbox.addReminder).toHaveBeenCalledWith("u1", expect.objectContaining({ kind, due_at: "2026-08-22T09:00:00" }));
  });

  it("an offer whose only date is a deadline still lands on the calendar", async () => {
    const { svc, inbox } = build({ classify: async () => dated("offer", { event_at: null, deadline_at: "2026-08-30" }) });
    await svc.scanAll();
    expect(inbox.addReminder).toHaveBeenCalledWith("u1", expect.objectContaining({ kind: "offer", deadline_at: "2026-08-30" }));
  });

  it("no date is still no reminder — there is no day to put it on", async () => {
    const { svc, inbox } = build({ classify: async () => dated("offer", { event_at: null, deadline_at: null }) });
    await svc.scanAll();
    expect(inbox.addNotification).toHaveBeenCalledTimes(1);
    expect(inbox.addReminder).not.toHaveBeenCalled();
  });
});
