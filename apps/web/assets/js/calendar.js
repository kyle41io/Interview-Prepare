/* IP.calendar — pure calendar layout + reminder date helpers (no I/O, no DOM).
   Dual-export: root.IP.calendar always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  root.IP = root.IP || {};
  root.IP.calendar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function pad2(n) { return String(n).padStart(2, "0"); }

  /* Pure: 42-cell month grid (6 rows x 7 cols), Sunday-first.
     month is 0-based. Padding cells (before the 1st / after the last) are null. */
  function monthGrid(year, month) {
    var startWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var cells = [];
    for (var i = 0; i < 42; i++) {
      var dayNum = i - startWeekday + 1;
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        cells.push({ date: year + "-" + pad2(month + 1) + "-" + pad2(dayNum), inMonth: true, day: dayNum });
      } else {
        cells.push({ date: null, inMonth: false, day: null });
      }
    }
    return cells;
  }

  /* Pure: does this reminder timestamp carry an explicit UTC offset?

     Two kinds of timestamp live in the reminder table and they mean different
     things. One carries an offset — "2026-08-22T09:00:00+07:00", what the
     scanner writes once the classifier has read a time out of an email — and is
     a real instant: 09:00 in Vietnam is 02:00 in London, and a reader in London
     wants to see their own 02:00. The other has no offset, or the bare "Z" the
     manual add form writes (see buildWhen), and is floating wall-clock: an
     interview the user typed as "3pm" is 3pm wherever they read it.

     The bare "Z" reads as floating rather than as UTC because that is what this
     app has always written it to mean. The scanner never emits one — its
     normalizeDate turns "Z" into "+00:00" — so a Z here came from buildWhen. */
  function hasZone(v) {
    return /[+-]\d{2}:?\d{2}$/.test(String(v == null ? "" : v).trim());
  }

  /* Pure: strip a trailing zone designator from a reminder timestamp. */
  function floatingIso(v) {
    return v == null ? "" : String(v).replace(/(Z|[+-]\d{2}:?\d{2})$/, "");
  }

  /* Pure: reminder timestamp -> Date, or null if it cannot be read.

     For a zone-bearing value that is the instant itself. For a floating one the
     digits are re-read as UTC, which makes the getUTC* accessors hand back
     exactly what was written — the trick that keeps a floating time from
     drifting with the browser's zone. Date-only values become midnight. */
  function whenDate(v) {
    var s = v == null ? "" : String(v).trim();
    if (!s) return null;
    var iso = hasZone(s) ? s : (floatingIso(s).length <= 10 ? floatingIso(s) + "T00:00:00Z" : floatingIso(s) + "Z");
    var d = new Date(iso.replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  }

  /* Pure: which calendar cell a reminder belongs in, "YYYY-MM-DD".

     A real instant is bucketed by the viewer's own day, so a 00:30+07:00 slot
     shows up on the previous day for a reader in London — the day it is for
     them. A floating time is bucketed by the digits, which never shift. */
  function whenDateKey(v) {
    var s = v == null ? "" : String(v).trim();
    if (!s) return null;
    if (!hasZone(s)) return s.slice(0, 10) || null;
    var d = whenDate(s);
    if (!d) return null;
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  /* Pure: reminder timestamp -> "HH:MM" for display.
     Local for a real instant, verbatim for a floating one. */
  function formatWhenTime(v, locale) {
    var d = whenDate(v);
    if (!d) return "";
    var opts = { hour: "2-digit", minute: "2-digit" };
    if (!hasZone(v)) opts.timeZone = "UTC";
    return d.toLocaleTimeString(locale || undefined, opts);
  }

  /* Pure: map a manual-entry {kind,date,time} to reminder-table timestamp columns.
     kind "deadline" -> deadline_at; anything else -> due_at. */
  function buildWhen(opts) {
    opts = opts || {};
    if (!opts.date) return { due_at: null, deadline_at: null };
    // Reminder times are floating wall-clock (an interview at "3pm" is 3pm for the
    // user, not an absolute instant). Store the digits verbatim as UTC so they
    // round-trip unchanged regardless of the browser's timezone; the calendar
    // renders them back in UTC. See remDateKey / the panel time formatter.
    var iso = opts.date + "T" + (opts.time || "00:00") + ":00.000Z";
    if (opts.kind === "deadline") return { due_at: null, deadline_at: iso };
    return { due_at: iso, deadline_at: null };
  }

  return {
    monthGrid: monthGrid, buildWhen: buildWhen, floatingIso: floatingIso,
    hasZone: hasZone, whenDate: whenDate, whenDateKey: whenDateKey, formatWhenTime: formatWhenTime,
  };
});
