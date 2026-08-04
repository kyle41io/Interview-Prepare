/* IP.gmail — ICS builder plus the notifications/reminders API client and cache.
   Dual-export: root.IP.gmail always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.IP = root.IP || {};
  root.IP.gmail = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

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
    ];
    // Only emit DTSTART when we actually have a date (avoid DTSTART:NaN...).
    // Strip the trailing "Z": reminder times are floating wall-clock (see
    // IP.calendar.buildWhen), so emit a floating DTSTART with no timezone —
    // calendar apps then show the exact time from the email, not a shifted one.
    if (when) lines.push("DTSTART:" + icsDate(when).slice(0, -1));
    lines.push(
      "SUMMARY:" + esc(r.title),
      "DESCRIPTION:" + esc((r.company ? r.company + " — " : "") + (r.kind || "")),
      "END:VEVENT", "END:VCALENDAR"
    );
    return lines.join("\r\n");
  }

  /* Pure: emoji for a notification/reminder type */
  function notifIcon(type) {
    return ({ test: "📝", interview: "💼", offer: "🎉", rejection: "🙏", deadline: "⏰", other: "✉️" })[type] || "✉️";
  }

  var _notifications = [];

  function _api() {
    return root.IP.api;
  }

  /* Stateful: fetch latest notifications for the signed-in user */
  async function fetchNotifications() {
    try {
      _notifications = (await _api().get("/v1/notifications")) || [];
      return _notifications;
    } catch (e) {
      return [];
    }
  }

  /* Stateful: mark a single notification read. Takes the notification object,
     not just an id — the API needs created_at+id to build its DynamoDB key. */
  async function markRead(notif) {
    var id = notif && notif.id;
    try {
      await _api().post("/v1/notifications/read", { created_at: notif && notif.created_at, id: id });
      _notifications = (_notifications || []).map(function (n) {
        return n.id === id ? Object.assign({}, n, { read: true }) : n;
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: mark all notifications read */
  async function markAllRead() {
    try {
      await _api().post("/v1/notifications/read-all", {});
      _notifications = (_notifications || []).map(function (n) {
        return Object.assign({}, n, { read: true });
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: delete every read notification for the signed-in user so the bell
     queue stays short. Unread rows are left untouched. */
  async function deleteReadNotifications() {
    try {
      await _api().del("/v1/notifications/read");
      _notifications = (_notifications || []).filter(function (n) { return !n.read; });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: fetch reminders for the calendar (upcoming + completed) */
  async function fetchReminders() {
    try {
      return (await _api().get("/v1/reminders?status=upcoming,done")) || [];
    } catch (e) {
      return [];
    }
  }

  /* Stateful: change a reminder's status */
  async function setReminderStatus(id, status) {
    try {
      await _api().put("/v1/reminders/" + encodeURIComponent(id), { status: status });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: create a manual calendar reminder (source:"manual").
     Returns the created row on success, else null. */
  async function createReminder(opts) {
    var when = (root.IP && root.IP.calendar)
      ? root.IP.calendar.buildWhen(opts)
      : { due_at: null, deadline_at: null };
    var row = {
      kind: opts.kind || "other",
      title: opts.title || "",
      company: opts.company || null,
      due_at: when.due_at,
      deadline_at: when.deadline_at,
      source: "manual",
      status: "upcoming",
    };
    try {
      return (await _api().post("/v1/reminders", row)) || null;
    } catch (e) {
      return null;
    }
  }

  /* Stateful: hard-delete a reminder (used only for source:"manual" events). */
  async function deleteReminder(id) {
    try {
      await _api().del("/v1/reminders/" + encodeURIComponent(id));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: Gmail connection status */
  async function status() {
    try {
      return (await _api().get("/v1/gmail/status")) || null;
    } catch (e) {
      return null;
    }
  }

  /* Stateful: kick off Gmail OAuth connect flow. The refresh token Google hands
     back on the consent redirect is forwarded to the API by IP.auth. */
  async function connect() {
    if (!(root.IP && root.IP.auth && root.IP.auth.connectGmail)) return false;
    try {
      await root.IP.auth.connectGmail();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: disconnect Gmail */
  async function disconnect() {
    try {
      await _api().post("/v1/gmail/disconnect", {});
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    icsDate: icsDate,
    buildICS: buildICS,
    notifIcon: notifIcon,
    fetchNotifications: fetchNotifications,
    markRead: markRead,
    markAllRead: markAllRead,
    deleteReadNotifications: deleteReadNotifications,
    fetchReminders: fetchReminders,
    setReminderStatus: setReminderStatus,
    createReminder: createReminder,
    deleteReminder: deleteReminder,
    status: status,
    connect: connect,
    disconnect: disconnect,
  };
});
