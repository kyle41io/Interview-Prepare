/* IP.onboarding — single-screen role -> level picker (Phase A, direction B)
   Dual-export: root.IP.onboarding always set; module.exports in Node. */
(function (root, factory) {
  "use strict";
  var api = factory();
  root.IP = root.IP || {};
  root.IP.onboarding = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /* ---- internal state ---- */
  var _cb = null;           // onPick callback
  var _expanded = null;     // roleId currently expanded (for level chips)
  var _selectedLevel = {};  // { roleId: levelId }

  /* ---- public API ---- */

  function shouldShow() {
    var track = (typeof window !== "undefined" && window.IP && window.IP.store)
      ? window.IP.store.get("track", null)
      : null;
    return !track;
  }

  function onPick(cb) {
    _cb = cb;
  }

  /* render({t, fa, ICON}) → HTML string */
  function render(ctx) {
    var t    = ctx.t;
    var fa   = ctx.fa;
    var ICON = ctx.ICON;

    var roles = (typeof PREP !== "undefined" ? PREP.roles : []) || [];
    var levels = (typeof PREP !== "undefined" ? PREP.levels : {}) || {};

    var rows = roles.map(function (role) {
      var soon      = !!role.comingSoon;
      var hasLevels = role.levels && role.levels.length > 0;
      var expanded  = _expanded === role.id && !soon;
      var selLv     = _selectedLevel[role.id] || (hasLevels ? role.levels[0] : "");

      /* level chips (only when expanded) */
      var chipsHtml = "";
      if (expanded && hasLevels) {
        var chips = role.levels.map(function (lv) {
          var active = selLv === lv;
          return '<button class="ob-chip' + (active ? " ob-chip--active" : "") + '"'
            + ' data-ob-level="' + lv + '" data-ob-role="' + role.id + '">'
            + t(levels[lv] || { vi: lv, en: lv })
            + '</button>';
        }).join("");
        chipsHtml = '<div class="ob-chips">' + chips + '</div>';
      }

      /* Start button */
      var startHtml = "";
      if (!soon) {
        if (!hasLevels) {
          /* level-less role — Start shown directly */
          startHtml = '<button class="ob-start btn" data-ob-start="1" data-ob-role="' + role.id + '" data-ob-level="">'
            + (t({ vi: "Bắt đầu", en: "Start" }))
            + '</button>';
        } else if (expanded) {
          /* has levels and is expanded — show Start with current chip selection */
          startHtml = '<button class="ob-start btn" data-ob-start="1" data-ob-role="' + role.id + '" data-ob-level="' + selLv + '">'
            + (t({ vi: "Bắt đầu", en: "Start" }))
            + '</button>';
        }
      }

      /* coming-soon badge */
      var soonBadge = soon
        ? '<span class="ob-badge ob-badge--soon">' + t({ vi: "Sắp ra mắt", en: "Coming soon" }) + '</span>'
        : "";

      /* progress line (sub-label) */
      var subLabel = "";
      if (!soon) {
        subLabel = hasLevels
          ? '<span class="ob-sub">' + t({ vi: "Chọn level", en: "Pick a level" }) + '</span>'
          : '<span class="ob-sub">' + t({ vi: "Một lộ trình", en: "Single track" }) + '</span>';
      }

      return '<div class="ob-row' + (soon ? " ob-row--disabled" : "") + (expanded ? " ob-row--open" : "") + '"'
        + ' data-ob-role-row="' + role.id + '"'
        + (soon ? '' : ' style="cursor:pointer"')
        + '>'
        + '<div class="ob-row-head">'
        +   '<span class="ob-icon">' + fa(role.icon) + '</span>'
        +   '<div class="ob-info">'
        +     '<span class="ob-name">' + t(role.title) + '</span>'
        +     subLabel
        +   '</div>'
        +   soonBadge
        +   (hasLevels && !soon ? '<span class="ob-chev">' + (expanded ? "▲" : "▼") + '</span>' : "")
        +   startHtml
        + '</div>'
        + chipsHtml
        + '</div>';
    }).join("");

    return '<div class="ob-wrap fade-in">'
      + '<div class="ob-hero">'
      +   '<h1>' + t({ vi: "Chọn lộ trình của bạn", en: "Choose your path" }) + '</h1>'
      +   '<p>' + t({ vi: "Chọn vai trò và cấp độ để bắt đầu ôn luyện.", en: "Select a role and level to start preparing." }) + '</p>'
      + '</div>'
      + '<div class="ob-list">' + rows + '</div>'
      + '</div>';
  }

  /* handleClick(target) → true (picked + fired cb) | "rerender" | false */
  function handleClick(target) {
    /* 1. Start button */
    var startEl = target.closest("[data-ob-start]");
    if (startEl) {
      var role  = startEl.dataset.obRole;
      var level = startEl.dataset.obLevel || "";
      if (_cb) _cb({ role: role, level: level });
      return true;
    }

    /* 2. Level chip */
    var chipEl = target.closest("[data-ob-level]");
    if (chipEl) {
      var r = chipEl.dataset.obRole;
      var l = chipEl.dataset.obLevel;
      _selectedLevel[r] = l;
      /* keep expanded, just re-render to reflect active chip + update start button level */
      return "rerender";
    }

    /* 3. Role row (expand/collapse) */
    var rowEl = target.closest("[data-ob-role-row]");
    if (rowEl) {
      /* skip disabled rows */
      if (rowEl.classList.contains("ob-row--disabled")) return false;
      var rid = rowEl.dataset.obRoleRow;
      _expanded = (_expanded === rid) ? null : rid;
      return "rerender";
    }

    return false;
  }

  /* expose pickRole for external use (optional) */
  function pickRole(roleId) {
    _expanded = roleId;
  }

  return { render: render, handleClick: handleClick, shouldShow: shouldShow, onPick: onPick, pickRole: pickRole };
});
