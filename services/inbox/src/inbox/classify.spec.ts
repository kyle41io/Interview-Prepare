import { RECRUIT_RE, normalizeDate } from "./classify";

/** The prefilter runs before the LLM call in ScanService, so a false negative
 *  silently drops a real recruiting mail and a false positive costs a token
 *  spend on junk. Both directions are worth pinning. */
describe("RECRUIT_RE", () => {
  const matches = (subject: string, snippet: string) =>
    RECRUIT_RE.test(subject + " " + snippet);

  it("matches English recruiting mail", () => {
    expect(matches("Interview invitation", "we'd like to schedule")).toBe(true);
    expect(matches("Coding assessment", "HackerRank test link")).toBe(true);
  });

  it("matches Vietnamese recruiting mail", () => {
    expect(matches("Thư mời phỏng vấn", "vòng kỹ thuật")).toBe(true);
  });

  it("does not match unrelated mail", () => {
    expect(matches("Your Amazon order", "has shipped")).toBe(false);
  });
});

/** The model is told to answer ISO 8601 or null and mostly does — but rows
 *  written by earlier runs hold `deadline_at: true`, which is what a boolean
 *  answer does when it is passed through unchecked. A reminder carrying a junk
 *  date is worse than no reminder: the calendar keys the day off the ISO prefix,
 *  so the event exists in the table and appears nowhere on screen. */
describe("normalizeDate", () => {
  it("keeps a real timestamp", () => {
    expect(normalizeDate("2026-08-21T14:00")).toBe("2026-08-21T14:00");
    expect(normalizeDate("2026-08-21T14:00:00")).toBe("2026-08-21T14:00:00");
  });

  /** The offset is kept, and it is the whole point: "09:00+07:00" says both what
   *  hour the recruiter wrote and which zone that hour belongs to. The calendar
   *  needs both to show the reader their own time — 09:00 for a candidate in
   *  Vietnam, 02:00 for one in London. What must never happen is this function
   *  converting the hour itself, which is how a 09:00 interview would be stored
   *  as 02:00 and shown as 02:00 to the person it was actually 09:00 for. */
  it("keeps the offset the email's hour belongs to", () => {
    expect(normalizeDate("2026-08-22T09:00:00+07:00")).toBe("2026-08-22T09:00:00+07:00");
    expect(normalizeDate("2026-08-22T09:00:00+0700")).toBe("2026-08-22T09:00:00+0700");
    expect(normalizeDate("2026-08-21T14:00-05:00")).toBe("2026-08-21T14:00-05:00");
  });

  /** The web app writes a bare "Z" to mean a floating hand-typed time (see
   *  IP.calendar.hasZone), so a scanned row must not look like one: "+00:00"
   *  says the same instant while staying unambiguously zone-bearing. */
  it("spells a bare Z as +00:00 so it reads as a real instant", () => {
    expect(normalizeDate("2026-08-21T14:00:00Z")).toBe("2026-08-21T14:00:00+00:00");
  });

  it("normalizes a space separator to T", () => {
    expect(normalizeDate("2026-08-21 14:00:00+07:00")).toBe("2026-08-21T14:00:00+07:00");
  });

  it("keeps a date with no time — a day on the calendar still beats nothing", () => {
    expect(normalizeDate("2026-08-21")).toBe("2026-08-21");
  });

  it("rejects everything that is not a date", () => {
    expect(normalizeDate(true)).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate("unknown")).toBeNull();
    expect(normalizeDate("next Tuesday")).toBeNull();
    expect(normalizeDate("07/08 3:30pm")).toBeNull();
    expect(normalizeDate("2026-13-45T99:00:00Z")).toBeNull();
  });

  it("trims incidental whitespace", () => {
    expect(normalizeDate("  2026-08-21T14:00:00Z ")).toBe("2026-08-21T14:00:00+00:00");
  });
});
