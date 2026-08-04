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

/* ---- New level-less role paths (Frontend / Backend) ---- */
const trackData = require("../assets/data/tracks.js"); // registers into a shim PREP

test("frontend + backend tracks resolve to their full item lists", () => {
  const fe = tracks.getTrack("frontend", "", trackData.tracks);
  const be = tracks.getTrack("backend", "", trackData.tracks);
  assert.ok(fe, "frontend track exists");
  assert.ok(be, "backend track exists");
  assert.deepStrictEqual(
    tracks.resolveItems(fe, trackData.validIds),
    ["dsa", "react", "redux", "vue", "typescript", "fe-security", "skeleton-loading", "rest-grpc", "system-design", "behavioral"]
  );
  assert.deepStrictEqual(
    tracks.resolveItems(be, trackData.validIds),
    ["dsa", "oop", "databases", "rest-grpc", "nodejs", "dotnet", "django", "ecommerce", "elasticsearch", "db-internals", "system-design", "behavioral"]
  );
});

test("every previously-orphan topic is reachable from at least one track", () => {
  const reachable = new Set();
  trackData.tracks.forEach((trk) => (trk.items || []).forEach((id) => reachable.add(id)));
  ["vue", "skeleton-loading", "dotnet", "django", "ecommerce", "elasticsearch"].forEach((id) => {
    assert.ok(reachable.has(id), id + " should be reachable");
  });
});
