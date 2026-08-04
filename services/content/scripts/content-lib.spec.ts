import { validateTopic, findDuplicateIds } from "./content-lib.mjs";

const ok = { id: "dsa", title: { vi: "A", en: "B" }, sections: [{ id: "s" }] };

describe("validateTopic", () => {
  it("accepts a well-formed topic", () => {
    expect(validateTopic(ok)).toEqual([]);
  });
  it("rejects a missing id", () => {
    expect(validateTopic({ ...ok, id: "" })).toContain("missing id");
  });
  it("rejects a missing vi title", () => {
    expect(validateTopic({ ...ok, title: { en: "B" } })).toContain("missing title.vi");
  });
  it("rejects a missing en title — both languages are required", () => {
    expect(validateTopic({ ...ok, title: { vi: "A" } })).toContain("missing title.en");
  });
  it("rejects empty sections", () => {
    expect(validateTopic({ ...ok, sections: [] })).toContain("empty sections");
  });
  it("rejects a non-object topic without throwing", () => {
    expect(validateTopic(undefined).length).toBeGreaterThan(0);
  });
});

describe("findDuplicateIds", () => {
  it("returns nothing for unique ids", () => {
    expect(findDuplicateIds([{ id: "a" }, { id: "b" }])).toEqual([]);
  });
  it("reports each duplicated id once", () => {
    expect(findDuplicateIds([{ id: "a" }, { id: "a" }, { id: "a" }])).toEqual(["a"]);
  });
});
