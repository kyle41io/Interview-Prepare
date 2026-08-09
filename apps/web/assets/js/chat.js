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

  /* How much conversation the assistant sees, and how much survives a reload.
     Six exchanges is the product decision; everything below derives from it. */
  var MAX_TURNS = 6;
  var MAX_CHARS = 4000;
  var STORE_KEY = "chatHistory";

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

  /* Pure: keep the last `maxTurns` exchanges, where an exchange is a user
     message and the reply to it.

     Counting messages alone is not enough. The window is trimmed right after
     the new user turn is appended, which lands mid-exchange, so a plain
     slice can leave an assistant reply at the head — and a conversation that
     opens on an assistant message is rejected by the model API, which
     requires the first message to be a user turn. The orphan head is dropped
     instead, costing at most one stale reply. */
  function capTurns(messages, maxTurns) {
    var out = (messages || []).slice(-(maxTurns || MAX_TURNS) * 2);
    while (out.length && out[0].role !== "user") out.shift();
    return out;
  }

  /* Pure: only well-formed turns survive a round trip through storage, so a
     hand-edited or half-written localStorage value cannot reach the API. */
  function sanitize(messages) {
    return (Array.isArray(messages) ? messages : []).filter(function (m) {
      return m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
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

  var _hist = null;   // null = not yet read back from storage
  var _cbs = [];

  function _emit() {
    _cbs.forEach(function (f) { f(); });
  }

  function _store() {
    return root.IP && root.IP.store;
  }

  /* The conversation is device-local: it is written silently so the sync layer
     does not schedule a snapshot push on every message. The snapshot does not
     carry chat history, so that push would send nothing and cost a request.
     Sign-out already wipes it — store.clearAll() sweeps the whole ip_ prefix. */
  function _persist() {
    var s = _store();
    if (s && s.set) s.set(STORE_KEY, _hist, { silent: true });
  }

  function getHistory() {
    if (_hist === null) {
      var s = _store();
      _hist = capTurns(sanitize(s && s.get ? s.get(STORE_KEY, []) : []), MAX_TURNS);
    }
    return _hist;
  }

  function reset() {
    _hist = [];
    _persist();
    _emit();
  }

  function onChange(cb) {
    _cbs.push(cb);
  }

  /* Stateful: send a chat message through the API. The user turn is pushed
     optimistically so the UI can render it immediately, and popped again if the
     request fails. */
  async function send(text) {
    _hist = capTurns(getHistory().concat([{ role: "user", content: text }]), MAX_TURNS);
    _persist();
    _emit();
    try {
      var data = await root.IP.api.post("/v1/chat", { messages: truncateHistory(_hist, MAX_TURNS * 2, MAX_CHARS) });
      _hist.push({ role: "assistant", content: data.text });
      _persist();
      _emit();
      return { text: data.text, remaining: data.remaining };
    } catch (e) {
      _hist.pop();
      _persist();
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
    MAX_TURNS: MAX_TURNS,
    truncateHistory: truncateHistory,
    capTurns: capTurns,
    quotaLimit: quotaLimit,
    mdLite: mdLite,
    send: send,
    reset: reset,
    onChange: onChange,
    getHistory: getHistory,
  };
});
