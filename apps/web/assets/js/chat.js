/* IP.chat — chat history truncation, quota, markdown-lite, client state (Phase D, Task 2)
   Dual-export: root.IP.chat always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.IP = root.IP || {};
  root.IP.chat = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  /* Pure, non-mutating: keep last maxTurns entries, clamp each content to maxChars */
  function truncateHistory(messages, maxTurns, maxChars) {
    maxTurns = maxTurns || 10;
    maxChars = maxChars || 4000;
    return (messages || []).slice(-maxTurns).map(function (m) {
      return {
        role: m.role,
        content: String(m.content == null ? "" : m.content).slice(0, maxChars),
      };
    });
  }

  /* Pure: message quota by tier */
  function quotaLimit(isPro) {
    return isPro ? 50 : 3;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  /* Pure: minimal markdown -> HTML (fenced code, inline code, bold, newlines) */
  function mdLite(text) {
    var parts = String(text).split(/```/); // odd indices = code blocks
    return parts.map(function (seg, i) {
      if (i % 2 === 1) {
        return '<pre class="chat-code"><code>' +
          escapeHtml(seg.replace(/^\n/, "").replace(/\n$/, "")) +
          "</code></pre>";
      }
      var h = escapeHtml(seg);
      h = h.replace(/`([^`]+)`/g, function (_, x) { return "<code>" + x + "</code>"; });
      h = h.replace(/\*\*([^*]+)\*\*/g, function (_, x) { return "<b>" + x + "</b>"; });
      h = h.replace(/\n/g, "<br>");
      return h;
    }).join("");
  }

  var _hist = [];
  var _cbs = [];

  function _emit() {
    _cbs.forEach(function (f) { f(); });
  }

  function getHistory() {
    return _hist;
  }

  function reset() {
    _hist = [];
    _emit();
  }

  function onChange(cb) {
    _cbs.push(cb);
  }

  /* Stateful: send a chat message through the API. The user turn is pushed
     optimistically so the UI can render it immediately, and popped again if the
     request fails. */
  async function send(text) {
    _hist.push({ role: "user", content: text });
    _emit();
    try {
      var data = await root.IP.api.post("/v1/chat", { messages: truncateHistory(_hist, 10, 4000) });
      _hist.push({ role: "assistant", content: data.text });
      _emit();
      return { text: data.text, remaining: data.remaining };
    } catch (e) {
      _hist.pop();
      _emit();
      // API 429 → the signal app.js expects. Two tiers share the status: the
      // daily cap and, on demo accounts, the 5-turn session cap.
      if (e && e.status === 429) {
        var code = e.body && e.body.error;
        return { error: code === "quota-session" ? "quota-session" : "quota", remaining: 0 };
      }
      return { error: (e && e.error) || (e && e.message) || "error" };
    }
  }

  return {
    truncateHistory: truncateHistory,
    quotaLimit: quotaLimit,
    mdLite: mdLite,
    send: send,
    reset: reset,
    onChange: onChange,
    getHistory: getHistory,
  };
});
