import { userPk, topicSk, cardSk, quizSk, bookSk, STREAK_SK, SETTINGS_SK, parseSk } from "./keys";

describe("keys", () => {
  it("builds partition + sort keys", () => {
    expect(userPk("u1")).toBe("USER#u1");
    expect(topicSk("t1")).toBe("TOPIC#t1");
    expect(cardSk("q1:2")).toBe("CARD#q1:2");
    expect(quizSk("t1")).toBe("QUIZ#t1");
    expect(bookSk("t1")).toBe("BOOK#t1");
  });

  it("round-trips prefixed keys via parseSk (ids may contain '#')", () => {
    expect(parseSk(topicSk("t1"))).toEqual({ type: "TOPIC", id: "t1" });
    expect(parseSk(cardSk("a#b"))).toEqual({ type: "CARD", id: "a#b" });
  });

  it("parses singleton keys", () => {
    expect(parseSk(STREAK_SK)).toEqual({ type: "STREAK", id: "" });
    expect(parseSk(SETTINGS_SK)).toEqual({ type: "SETTINGS", id: "" });
  });
});
