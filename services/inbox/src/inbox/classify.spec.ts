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
    expect(normalizeDate("2026-08-21T14:00:00Z")).toBe("2026-08-21T14:00:00Z");
    expect(normalizeDate("2026-08-21T14:00")).toBe("2026-08-21T14:00");
    expect(normalizeDate("2026-08-21T14:00:00+07:00")).toBe("2026-08-21T14:00:00+07:00");
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
    expect(normalizeDate("  2026-08-21T14:00:00Z ")).toBe("2026-08-21T14:00:00Z");
  });
});
