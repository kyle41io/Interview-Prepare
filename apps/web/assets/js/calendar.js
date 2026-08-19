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

  /* Pure: strip a trailing zone designator from a reminder timestamp.

     Reminder times are floating wall-clock — an interview at "3pm" is 3pm for
     the user, not an absolute instant — and every renderer formats them in UTC
     to keep them that way. The scanner now reads dates out of email bodies, and
     the classifier attaches the sender's offset: "2026-08-22T09:00:00+07:00" for
     a 09:00 interview, which a UTC render turns into 02:00. The digits written
     there are already local to that offset, so the zone is dropped, not applied.

     The scanner strips it server-side too; this keeps rows already written — and
     anything hand-edited — showing the hour the email actually said. */
  function floatingIso(v) {
    return v == null ? "" : String(v).replace(/(Z|[+-]\d{2}:?\d{2})$/, "");
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

  return { monthGrid: monthGrid, buildWhen: buildWhen, floatingIso: floatingIso };
});
