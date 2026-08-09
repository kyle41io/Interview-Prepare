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

function setup(opts = {}) {
  global.window = global;
  const cell = opts.cell || {};
  global.IP = {
    api: { post: async (p, b) => { (opts.calls || []).push([p, b]); if (opts.reject) throw opts.reject; return { text: "hello", remaining: 5 }; } },
    // Mirrors IP.store's surface: get/set with a silent flag, and a note of
    // whether the write announced itself (it must not — see chat.js).
    store: {
      get: (k, fb) => (k in cell ? cell[k] : fb),
      set: (k, v, o) => { cell[k] = v; if (!(o && o.silent)) (opts.notified || []).push(k); },
    },
  };
  chat.reset();
}
/* Re-require the module with an empty cache: the only honest way to test that
   a conversation survives a page load rather than living in a closure. */
function reload() {
  delete require.cache[require.resolve("../assets/js/chat.js")];
  return require("../assets/js/chat.js");
}
test("send routes through IP.api POST /v1/chat", async () => {
  const calls = []; setup({ calls });
  const r = await chat.send("hi");
  assert.strictEqual(calls[0][0], "/v1/chat");
  assert.deepStrictEqual(calls[0][1].messages[0], { role: "user", content: "hi" });
  assert.strictEqual(r.text, "hello"); assert.strictEqual(r.remaining, 5);
});
test("send maps a 429 rejection to error:quota", async () => {
  const err = new Error("http-429"); err.status = 429; err.error = "http-429";
  setup({ reject: err });
  const r = await chat.send("hi");
  assert.strictEqual(r.error, "quota");
});
test("send maps a session-cap 429 to error:quota-session", async () => {
  const err = new Error("http-429"); err.status = 429; err.error = "http-429";
  err.body = { error: "quota-session", remaining: 0 };
  setup({ reject: err });
  const r = await chat.send("hi");
  // The two tiers must stay distinct: the daily cap is about spend, the session
  // cap clears on re-login, and they need different copy.
  assert.strictEqual(r.error, "quota-session");
});
test("send maps a daily-cap 429 body to error:quota", async () => {
  const err = new Error("http-429"); err.status = 429; err.error = "http-429";
  err.body = { error: "quota", remaining: 0 };
  setup({ reject: err });
  const r = await chat.send("hi");
  assert.strictEqual(r.error, "quota");
});
test("capTurns keeps the last N exchanges", () => {
  const msgs = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: "m" + i }));
  const out = chat.capTurns(msgs, 6);
  assert.strictEqual(out.length, 12);
  assert.strictEqual(out[0].content, "m8");
  assert.strictEqual(out[11].content, "m19");
});
test("capTurns never leaves an assistant reply at the head", () => {
  // 13 messages = a full window plus a fresh question, the shape send() produces.
  const msgs = Array.from({ length: 13 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: "m" + i }));
  const out = chat.capTurns(msgs, 6);
  assert.strictEqual(out[0].role, "user");
  assert.strictEqual(out[out.length - 1].content, "m12");
});
test("the conversation is written to the store, silently", async () => {
  const cell = {}, notified = [];
  setup({ cell, notified });
  await chat.send("hi");
  assert.deepStrictEqual(cell.chatHistory, [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ]);
  // A notify here would schedule a sync push carrying nothing.
  assert.deepStrictEqual(notified, []);
});
test("a stored conversation is read back on the next load", async () => {
  const cell = {};
  setup({ cell });
  await chat.send("hi");
  const fresh = reload();
  assert.deepStrictEqual(fresh.getHistory(), [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ]);
});
test("a malformed stored conversation is discarded, not sent", () => {
  const cell = { chatHistory: [{ role: "system", content: "x" }, { role: "user", content: 7 }, "junk"] };
  setup({ cell });
  const fresh = reload();
  assert.deepStrictEqual(fresh.getHistory(), []);
});
test("history stops growing at MAX_TURNS exchanges", async () => {
  const calls = [], cell = {};
  setup({ calls, cell });
  for (let i = 0; i < 9; i++) await chat.send("q" + i);
  const hist = chat.getHistory();
  assert.strictEqual(hist.length, chat.MAX_TURNS * 2);
  assert.strictEqual(hist[0].content, "q3");          // the first three exchanges aged out
  assert.strictEqual(hist[0].role, "user");
  // What went to the API is that same window, so the assistant sees the context
  // the user can see and nothing older.
  const sent = calls[calls.length - 1][1].messages;
  assert.ok(sent.length <= chat.MAX_TURNS * 2);
  assert.strictEqual(sent[0].role, "user");
  assert.strictEqual(sent[sent.length - 1].content, "q8");
});
test("a failed send rolls back the optimistic user turn", async () => {
  const err = new Error("boom"); err.error = "server-error";
  setup({ reject: err });
  const r = await chat.send("hi");
  assert.strictEqual(r.error, "server-error");
  assert.deepStrictEqual(chat.getHistory(), []);
});
