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
    ];
    // Only emit DTSTART when we actually have a date (avoid DTSTART:NaN...).
    if (when) lines.push("DTSTART:" + icsDate(when));
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

  function _client() {
    return root.IP && root.IP.auth ? root.IP.auth.client() : null;
  }

  /* API seam (Phase F, Task 5): route through IP.api when configured; else Supabase fallback below. */
  function _api() {
    return root.IP && root.IP.api;
  }

  function _apiOn() {
    var a = _api();
    return !!(a && a.configured && a.configured());
  }

  /* Stateful: fetch latest notifications for the signed-in user; accesses client() at call time only */
  async function fetchNotifications() {
    if (_apiOn()) {
      try {
        _notifications = (await _api().get("/v1/notifications")) || [];
        return _notifications;
      } catch (e) {
        return [];
      }
    }
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
    return (_notifications || []).filter(function (n) { return !n.read; }).length;
  }

  /* Stateful: mark a single notification read. Signature (Task 5): takes the
     notification object, not just an id — the API needs created_at+id to build
     its DynamoDB key. */
  async function markRead(notif) {
    var id = notif && notif.id;
    if (_apiOn()) {
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
    var c = _client();
    if (!c) return false;
    try {
      await c.from("notifications").update({ read: true }).eq("id", id);
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
    if (_apiOn()) {
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
    var c = _client();
    if (!c) return false;
    try {
      await c.from("notifications").update({ read: true }).eq("read", false);
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
    if (_apiOn()) {
      try {
        await _api().del("/v1/notifications/read");
        _notifications = (_notifications || []).filter(function (n) { return !n.read; });
        return true;
      } catch (e) {
        return false;
      }
    }
    var c = _client();
    if (!c) return false;
    try {
      await c.from("notifications").delete().eq("read", true);
      _notifications = (_notifications || []).filter(function (n) { return !n.read; });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: fetch reminders for the calendar (upcoming + completed) */
  async function fetchReminders() {
    if (_apiOn()) {
      try {
        return (await _api().get("/v1/reminders?status=upcoming,done")) || [];
      } catch (e) {
        return [];
      }
    }
    var c = _client();
    if (!c) return [];
    try {
      var res = await c.from("reminders").select("*").in("status", ["upcoming", "done"]).order("due_at");
      return (res && res.data) || [];
    } catch (e) {
      return [];
    }
  }

  /* Stateful: change a reminder's status */
  async function setReminderStatus(id, status) {
    if (_apiOn()) {
      try {
        await _api().put("/v1/reminders/" + encodeURIComponent(id), { status: status });
        return true;
      } catch (e) {
        return false;
      }
    }
    var c = _client();
    if (!c) return false;
    try {
      await c.from("reminders").update({ status: status }).eq("id", id);
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
    if (_apiOn()) {
      try {
        return (await _api().post("/v1/reminders", row)) || null;
      } catch (e) {
        return null;
      }
    }
    var c = _client();
    if (!c) return null;
    var user = root.IP && root.IP.auth && root.IP.auth.getUser && root.IP.auth.getUser();
    if (!user || !user.id) return null;
    row.user_id = user.id;
    try {
      var res = await c.from("reminders").insert(row).select().single();
      return (res && res.data) || null;
    } catch (e) {
      return null;
    }
  }

  /* Stateful: hard-delete a reminder (used only for source:"manual" events). */
  async function deleteReminder(id) {
    if (_apiOn()) {
      try {
        await _api().del("/v1/reminders/" + encodeURIComponent(id));
        return true;
      } catch (e) {
        return false;
      }
    }
    var c = _client();
    if (!c) return false;
    try {
      await c.from("reminders").delete().eq("id", id);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: subscribe to realtime INSERTs on the notifications table.
     No-op under the API path — DynamoDB has no push; the bell polls on open. */
  function subscribeRealtime(onInsert) {
    if (_apiOn()) return null;
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

  /* Stateful: Gmail connection status */
  async function status() {
    if (_apiOn()) {
      try {
        return (await _api().get("/v1/gmail/status")) || null;
      } catch (e) {
        return null;
      }
    }
    var c = _client();
    if (!c) return null;
    try {
      var res = await c.functions.invoke("gmail-status");
      return (res && res.data) || null;
    } catch (e) {
      return null;
    }
  }

  /* Stateful: kick off Gmail OAuth connect flow (Supabase fallback only; see connectWithCode for the API path) */
  async function connect() {
    if (!(root.IP && root.IP.auth && root.IP.auth.connectGmail)) return false;
    try {
      await root.IP.auth.connectGmail();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful (Task 5, API path): complete Gmail OAuth by exchanging the auth
     code for tokens via the API. The Google code-acquisition/redirect flow
     itself is unchanged; the OAuth callback should call this with the
     returned code + redirect_uri once wired up (see deploy notes). */
  async function connectWithCode(code, redirectUri) {
    if (!_apiOn()) return false;
    try {
      await _api().post("/v1/gmail/connect", { code: code, redirect_uri: redirectUri });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Stateful: disconnect Gmail */
  async function disconnect() {
    if (_apiOn()) {
      try {
        await _api().post("/v1/gmail/disconnect", {});
        return true;
      } catch (e) {
        return false;
      }
    }
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
    deleteReadNotifications: deleteReadNotifications,
    fetchReminders: fetchReminders,
    setReminderStatus: setReminderStatus,
    createReminder: createReminder,
    deleteReminder: deleteReminder,
    subscribeRealtime: subscribeRealtime,
    status: status,
    connect: connect,
    connectWithCode: connectWithCode,
    disconnect: disconnect,
  };
});
