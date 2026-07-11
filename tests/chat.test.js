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

function setup(configured, opts = {}) {
  global.window = global;
  global.IP = {
    api: { configured: () => configured, post: async (p, b) => { (opts.calls || []).push([p, b]); if (opts.reject) throw opts.reject; return { text: "hello", remaining: 5 }; } },
    auth: { client: () => opts.client || null },
  };
  chat.reset();
}
test("send routes through IP.api POST /v1/chat when configured", async () => {
  const calls = []; setup(true, { calls });
  const r = await chat.send("hi");
  assert.strictEqual(calls[0][0], "/v1/chat");
  assert.deepStrictEqual(calls[0][1].messages[0], { role: "user", content: "hi" });
  assert.strictEqual(r.text, "hello"); assert.strictEqual(r.remaining, 5);
});
test("send maps a 429 rejection to error:quota", async () => {
  const err = new Error("http-429"); err.status = 429; err.error = "http-429";
  setup(true, { reject: err });
  const r = await chat.send("hi");
  assert.strictEqual(r.error, "quota");
});
test("not configured → uses Supabase edge fn (no IP.api call)", async () => {
  const calls = [];
  const client = { functions: { invoke: async (name, o) => { calls.push([name, o]); return { data: { text: "sb", remaining: 2 }, error: null }; } } };
  setup(false, { client });
  const r = await chat.send("hi");
  assert.strictEqual(r.text, "sb");
});
