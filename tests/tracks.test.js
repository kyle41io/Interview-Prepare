const test = require("node:test");
const assert = require("node:assert");
const tracks = require("../assets/js/tracks.js");

const T = [
  { id: "swe-junior", role: "swe", level: "junior", items: ["dsa", "databases", "ghost", "system-design"] },
  { id: "devops", role: "devops", level: "", items: ["docker-k8s", "cicd"] },
];
const VALID = ["dsa", "databases", "system-design", "docker-k8s", "cicd"]; // 'ghost' missing

test("getTrack matches role+level", () => {
  assert.strictEqual(tracks.getTrack("swe", "junior", T).id, "swe-junior");
  assert.strictEqual(tracks.getTrack("devops", "", T).id, "devops");
  assert.strictEqual(tracks.getTrack("swe", "senior", T), null);
});
test("resolveItems drops unknown ids, keeps order", () => {
  assert.deepStrictEqual(
    tracks.resolveItems(T[0], VALID),
    ["dsa", "databases", "system-design"]
  );
});
test("progressOf computes done/total/pct over resolved items", () => {
  const p = tracks.progressOf(T[0], { dsa: true, databases: true }, VALID);
  assert.deepStrictEqual(p, { done: 2, total: 3, pct: 67 });
});
test("nextTopic returns first unlearned, else last", () => {
  assert.strictEqual(tracks.nextTopic(T[0], { dsa: true }, VALID), "databases");
  assert.strictEqual(tracks.nextTopic(T[0], { dsa: true, databases: true, "system-design": true }, VALID), "system-design");
});
