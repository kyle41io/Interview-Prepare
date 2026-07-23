const test = require("node:test");
const assert = require("node:assert");
const gating = require("../assets/js/gating.js");

const TOPICS = {
  microservices: { id: "microservices", tier: "pro" },
  "system-design": { id: "system-design", tier: "pro" },
  dsa: { id: "dsa" },
  react: { id: "react", tier: "free" },
};

test("isProTopic true only when tier === 'pro'", () => {
  assert.strictEqual(gating.isProTopic(TOPICS, "microservices"), true);
  assert.strictEqual(gating.isProTopic(TOPICS, "system-design"), true);
  assert.strictEqual(gating.isProTopic(TOPICS, "dsa"), false);
  assert.strictEqual(gating.isProTopic(TOPICS, "react"), false);
});

test("isProTopic false for unknown id", () => {
  assert.strictEqual(gating.isProTopic(TOPICS, "nope"), false);
  assert.strictEqual(gating.isProTopic(null, "dsa"), false);
});

test("visibleTopicPool keeps everything for Pro users", () => {
  const order = ["dsa", "microservices", "react", "system-design"];
  assert.deepStrictEqual(gating.visibleTopicPool(order, TOPICS, true), order);
});

test("visibleTopicPool drops Pro topics for non-Pro, preserving order", () => {
  const order = ["dsa", "microservices", "react", "system-design"];
  assert.deepStrictEqual(
    gating.visibleTopicPool(order, TOPICS, false),
    ["dsa", "react"]
  );
});
