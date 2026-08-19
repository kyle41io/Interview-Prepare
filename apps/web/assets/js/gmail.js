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

  /* Pure: Date -> YYYYMMDDTHHMMSS in ICS basic format, read in UTC. */
  function basic(d, suffix) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
      "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + suffix;
  }

  /* Pure: reminder timestamp -> ICS DTSTART value.

     RFC5545 spells the same distinction the reminder table makes. A scanned time
     carries an offset and is a real instant, so it exports as UTC with the "Z"
     suffix and whatever calendar receives it shows the reader their own hour. A
     hand-typed time is floating, and a DTSTART with no zone is defined as local
     time wherever the event is read — which is what "3pm" meant when it was
     typed. Converting one of those to UTC is what shifts an exported interview. */
  function icsDate(iso) {
    var d = zone().whenDate(iso);
    return d ? basic(d, zone().hasZone(iso) ? "Z" : "") : "";
  }

  /* Pure: IP.calendar's zone helpers, with a local fallback so the ICS builder
     stays usable on its own (the tests require this module alone). */
  function zone() {
    var cal = root.IP && root.IP.calendar;
    if (cal && cal.whenDate && cal.hasZone) return cal;
    var hasZone = function (v) { return /[+-]\d{2}:?\d{2}$/.test(String(v == null ? "" : v).trim()); };
    return {
      hasZone: hasZone,
      whenDate: function (v) {
        var s = String(v == null ? "" : v).trim();
        if (!s) return null;
        var bare = s.replace(/(Z|[+-]\d{2}:?\d{2})$/, "");
        var d = new Date((hasZone(s) ? s : bare + (bare.length <= 10 ? "T00:00:00Z" : "Z")).replace(" ", "T"));
        return isNaN(d.getTime()) ? null : d;
      },
    };
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
      "DTSTAMP:" + basic(new Date(0), "Z"),
    ];
    // Only emit DTSTART when we actually have a date (avoid DTSTART:NaN...).
    // icsDate decides whether it carries a zone; see there.
    if (when) lines.push("DTSTART:" + icsDate(when));
    lines.push(
      "SUMMARY:" + esc(r.title),
      "DESCRIPTION:" + esc((r.company ? r.company + " — " : "") + (r.kind || "")),
      "END:VEVENT", "END:VCALENDAR"
    );
    return lines.join("\r\n");
  }

  /* Pure: Font Awesome markup for a notification/reminder type. Returns an
     element rather than a class string because both call sites (the bell menu
     and the reminder list) drop it straight into a template. */
  function notifIcon(type) {
    var cls = ({
      test: "fa-solid fa-pen-ruler", interview: "fa-solid fa-user-tie",
      offer: "fa-solid fa-file-signature", rejection: "fa-solid fa-circle-minus",
      deadline: "fa-regular fa-clock", other: "fa-regular fa-envelope",
    })[type] || "fa-regular fa-envelope";
    return '<i class="' + cls + '"></i>';
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
