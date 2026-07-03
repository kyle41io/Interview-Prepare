const test = require("node:test");
const assert = require("node:assert");
const chat = require("../assets/js/chat.js");

test("truncateHistory keeps last N turns", () => {
  const msgs = Array.from({ length: 15 }, (_, i) => ({ role: "user", content: "m" + i }));
  const out = chat.truncateHistory(msgs, 10, 4000);
  assert.strictEqual(out.length, 10);
  assert.strictEqual(out[0].content, "m5");
  assert.strictEqual(out[9].content, "m14");
});
test("truncateHistory clamps content length", () => {
  const out = chat.truncateHistory([{ role: "user", content: "x".repeat(5000) }], 10, 4000);
  assert.strictEqual(out[0].content.length, 4000);
});
test("truncateHistory does not mutate input", () => {
  const msgs = [{ role: "user", content: "y".repeat(5000) }];
  chat.truncateHistory(msgs, 10, 4000);
  assert.strictEqual(msgs[0].content.length, 5000);
});
test("quotaLimit by tier", () => {
  assert.strictEqual(chat.quotaLimit(true), 50);
  assert.strictEqual(chat.quotaLimit(false), 3);
});
test("mdLite escapes HTML", () => {
  assert.strictEqual(chat.mdLite("<script>"), "&lt;script&gt;");
});
test("mdLite renders bold and inline code", () => {
  assert.strictEqual(chat.mdLite("a **b** `c`"), "a <b>b</b> <code>c</code>");
});
test("mdLite renders fenced code block without inner formatting", () => {
  const out = chat.mdLite("```\nx = 1 && y\n```");
  assert.match(out, /<pre class="chat-code"><code>x = 1 &amp;&amp; y<\/code><\/pre>/);
});
