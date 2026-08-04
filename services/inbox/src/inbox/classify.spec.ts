import { RECRUIT_RE } from "./classify";

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
