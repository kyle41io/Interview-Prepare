/* IP.gmail — recruiting-email prefilter, ICS builder, notifications/reminders client state (Phase E, Task 2)
   Dual-export: root.IP.gmail always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.IP = root.IP || {};
  root.IP.gmail = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  /* Pure: does this subject/snippet look like a recruiting email? (VI + EN keywords) */
  var RE = /(interview|phỏng\s*v[aấ]n|assessment|coding\s*test|\btest\b|take[-\s]?home|offer|onboarding|tuy[eể]n|recruit|application|regret|unfortunately|shortlist|screening|hiring|vòng)/i;
  function looksRecruiting(subject, snippet) {
    return RE.test(String(subject || "") + " " + String(snippet || ""));
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  /* Pure: ISO string -> YYYYMMDDTHHMMSSZ (UTC basic format) */
  function icsDate(iso) {
    var d = new Date(iso);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
      "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  }

  /* Pure: RFC5545 text escaping */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  /* Pure: build a VCALENDAR/VEVENT ICS string from a reminder-like object */
  function buildICS(r) {
    var when = r.due_at || r.deadline_at;
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Interview Prep//EN", "BEGIN:VEVENT",
      "UID:" + (r.id || (r.source || "rem") + "@interviewprep"),
      "DTSTAMP:" + icsDate(new Date(0).toISOString()),
      "DTSTART:" + icsDate(when),
      "SUMMARY:" + esc(r.title),
      "DESCRIPTION:" + esc((r.company ? r.company + " — " : "") + (r.kind || "")),
      "END:VEVENT", "END:VCALENDAR",
    ];
    return lines.join("\r\n");
  }

  /* Pure: emoji for a notification/reminder type */
  function notifIcon(type) {
    return ({ test: "📝", interview: "📅", offer: "🎉", rejection: "🙏", other: "✉️" })[type] || "✉️";
  }

  var _notifications = [];

  function _client() {
    return root.IP && root.IP.auth ? root.IP.auth.client() : null;
  }

  /* Stateful: fetch latest notifications for the signed-in user; accesses client() at call time only */
  async function fetchNotifications() {
    var c = _client();
    if (!c) return [];
    try {
      var res = await c.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
      _notifications = (res && res.data) || [];
      return _notifications;
    } catch (e) {
      return [];
    }
  }

  /* Stateful: count of unread notifications from the local cache */
  function unreadCount() {
    return (_notifications || []).filter(function (n) { return !n.read_at; }).length;
  }

  /* Stateful: mark a single notification read */
  async function markRead(id) {
    var c = _client();
    if (!c) return false;
    try {
      await c.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      _notifications = (_notifications || []).map(function (n) {
        return n.id === id ? Object.assign({}, n, { read_at: new Date().toISOString() }) : n;
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: mark all notifications read */
  async function markAllRead() {
    var c = _client();
    if (!c) return false;
    try {
      await c.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
      _notifications = (_notifications || []).map(function (n) {
        return Object.assign({}, n, { read_at: n.read_at || new Date().toISOString() });
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: fetch upcoming reminders */
  async function fetchReminders() {
    var c = _client();
    if (!c) return [];
    try {
      var res = await c.from("reminders").select("*").in("status", ["upcoming"]).order("due_at");
      return (res && res.data) || [];
    } catch (e) {
      return [];
    }
  }

  /* Stateful: change a reminder's status */
  async function setReminderStatus(id, status) {
    var c = _client();
    if (!c) return false;
    try {
      await c.from("reminders").update({ status: status }).eq("id", id);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: subscribe to realtime INSERTs on the notifications table */
  function subscribeRealtime(onInsert) {
    var c = _client();
    if (!c) return null;
    try {
      return c.channel("notif")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, onInsert)
        .subscribe();
    } catch (e) {
      return null;
    }
  }

  /* Stateful: Gmail connection status via Edge Function */
  async function status() {
    var c = _client();
    if (!c) return null;
    try {
      var res = await c.functions.invoke("gmail-status");
      return (res && res.data) || null;
    } catch (e) {
      return null;
    }
  }

  /* Stateful: kick off Gmail OAuth connect flow */
  async function connect() {
    if (!(root.IP && root.IP.auth && root.IP.auth.connectGmail)) return false;
    try {
      await root.IP.auth.connectGmail();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: disconnect Gmail via Edge Function */
  async function disconnect() {
    var c = _client();
    if (!c) return false;
    try {
      await c.functions.invoke("gmail-connect", { body: { action: "disconnect" } });
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    looksRecruiting: looksRecruiting,
    icsDate: icsDate,
    buildICS: buildICS,
    notifIcon: notifIcon,
    fetchNotifications: fetchNotifications,
    unreadCount: unreadCount,
    markRead: markRead,
    markAllRead: markAllRead,
    fetchReminders: fetchReminders,
    setReminderStatus: setReminderStatus,
    subscribeRealtime: subscribeRealtime,
    status: status,
    connect: connect,
    disconnect: disconnect,
  };
});
