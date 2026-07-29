/* Regression guard for the boot sequence around the private-S3 content fetch.

   This code has now regressed twice with zero automated coverage, because the
   whole sequence lives inside a DOMContentLoaded callback in a browser IIFE with
   no module export. Following tests/quiz-empty.test.js, the functions under test
   are lifted out of the real source text and run against stubs — extracting from
   the file (rather than restating the logic here) is what makes these regression
   tests: remove a guard in app.js and these fail.

   What is covered:
     - a throwing / missing IP.content still ends on a painted page
     - the loading affordance during the content wait
     - the held scroll restore
     - the stale-user re-check when the content wait outlives the session
     - the late repaint not overriding navigation or destroying a chat draft
     - Flashcards distinguishing "no content" from "nothing due"
     - an empty quiz bank explaining itself
*/
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const APP = path.join(__dirname, "..", "assets", "js", "app.js");
const SRC = fs.readFileSync(APP, "utf8");

/* Lift a named function's source text out of app.js by counting braces.
   The counter is deliberately simple and is NOT string-, comment- or regex-aware:
   a "}" inside a string literal, a comment or a regex would end the extraction
   early. That is worth knowing because a truncated body can still parse and still
   make a test pass — green for the wrong reason. It is correct for every function
   extracted here today; if you extract one containing a braced string/comment/
   regex, check the slice before trusting the result. */
function extract(name) {
  const start = SRC.indexOf("function " + name + "(");
  assert.ok(start >= 0, name + " no longer exists in app.js");
  let depth = 0;
  for (let i = SRC.indexOf("{", start); i < SRC.length; i++) {
    if (SRC[i] === "{") depth++;
    else if (SRC[i] === "}" && --depth === 0) return SRC.slice(start, i + 1);
  }
  throw new Error("unbalanced braces extracting " + name);
}

const quiet = { warn() {}, error() {}, info() {}, log() {} };

/* ------------------------------------------------------------------ *
 * Finding 1 — a missing IP.content must not throw out of the listener  *
 * ------------------------------------------------------------------ */

function contentGuards(IP) {
  return new Function(
    "IP", "console",
    extract("contentLoad") + "\n" + extract("contentClearCache") +
    "\nreturn { contentLoad: contentLoad, contentClearCache: contentClearCache };",
  )(IP, quiet);
}

test("contentLoad survives a content module that never loaded", async () => {
  const g = contentGuards({});           // IP.content undefined — the script 404'd
  const n = await g.contentLoad();
  assert.ok(n === 0 || n === undefined, "degrades to no content instead of throwing");
});

test("contentLoad survives a load() that throws synchronously", async () => {
  const g = contentGuards({ content: { load() { throw new TypeError("boom"); } } });
  assert.strictEqual(await g.contentLoad(), 0);
});

test("contentLoad survives a load() that rejects", async () => {
  const g = contentGuards({ content: { load: () => Promise.reject(new Error("offline")) } });
  assert.strictEqual(await g.contentLoad(), 0);
});

test("contentLoad passes the topic count through on success", async () => {
  const g = contentGuards({ content: { load: () => Promise.resolve(31) } });
  assert.strictEqual(await g.contentLoad(), 31);
});

test("contentClearCache survives a missing content module", () => {
  assert.doesNotThrow(() => contentGuards({}).contentClearCache());
});

test("contentClearCache still clears when the module is present", () => {
  let cleared = 0;
  contentGuards({ content: { clearCache() { cleared++; } } }).contentClearCache();
  assert.strictEqual(cleared, 1);
});

/* ------------------------------------------------------------------ *
 * Findings 1 + 3 — the auth handler                                    *
 * ------------------------------------------------------------------ */

function bootHarness(opts) {
  const o = opts || {};
  const calls = { applied: [], render: 0, updateAuthUI: 0, restore: 0, loading: 0, scroll: 0 };
  const deps = {
    IP: { auth: { getUser: o.getUser || (() => null) } },
    whenContentReady: o.whenContentReady || (() => Promise.resolve()),
    paintContentLoading() { calls.loading++; },
    restoreContentBoundView() { calls.restore++; },
    onAuthChange(u) {
      calls.applied.push(u);
      if (o.onAuthChangeThrows) throw new TypeError("IP.content is undefined");
    },
    render() { calls.render++; },
    updateAuthUI() {
      calls.updateAuthUI++;
      if (o.updateAuthUIThrows) throw new Error("DOM gone");
    },
    applyPendingScroll() { calls.scroll++; },
    console: quiet,
  };
  const names = Object.keys(deps);
  const built = new Function(
    ...names,
    `let _authEventSeen = false;
     let _contentReady = ${!!o.contentReady};
     let _authReady = false;
     let _renderedUid;
     ${extract("bootFailsafe")}
     ${extract("handleAuthEvent")}
     return {
       handleAuthEvent: handleAuthEvent,
       state: function () { return { seen: _authEventSeen, ready: _authReady }; },
     };`,
  )(...names.map((n) => deps[n]));
  return { calls, handleAuthEvent: built.handleAuthEvent, state: built.state };
}

const USER = { id: "u1" };

test("a throw inside the handler still leaves a painted page", () => {
  // The exact production trigger: IP.content undefined -> TypeError. auth.js
  // swallows listener exceptions and the 1500 ms net has already stood down, so
  // an unguarded throw here is a permanently blank page.
  const h = bootHarness({ contentReady: true, onAuthChangeThrows: true });
  assert.doesNotThrow(() => h.handleAuthEvent(USER));
  assert.strictEqual(h.state().ready, true, "_authReady must be set so the app is not stuck pre-boot");
  assert.ok(h.calls.updateAuthUI + h.calls.render > 0, "something must have painted");
});

test("a throw on the signed-out path also still paints", () => {
  const h = bootHarness({ contentReady: true, onAuthChangeThrows: true });
  assert.doesNotThrow(() => h.handleAuthEvent(null));
  assert.strictEqual(h.state().ready, true);
});

test("the failsafe still renders when updateAuthUI itself throws", () => {
  const h = bootHarness({ contentReady: true, onAuthChangeThrows: true, updateAuthUIThrows: true });
  assert.doesNotThrow(() => h.handleAuthEvent(USER));
  assert.strictEqual(h.calls.render, 1, "nothing had been drawn, so render() is the last resort");
});

test("a rejected content wait still leaves a painted page", async () => {
  const h = bootHarness({ whenContentReady: () => Promise.reject(new Error("boom")) });
  h.handleAuthEvent(USER);
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(h.state().ready, true);
  assert.ok(h.calls.updateAuthUI + h.calls.render > 0, "a rejected wait must not swallow the paint");
});

test("a throw inside the deferred callback still leaves a painted page", async () => {
  const h = bootHarness({ getUser: () => USER, onAuthChangeThrows: true });
  h.handleAuthEvent(USER);
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(h.state().ready, true);
});

test("the handler marks the auth event seen before anything that can throw", () => {
  const h = bootHarness({ contentReady: true, onAuthChangeThrows: true });
  h.handleAuthEvent(USER);
  assert.strictEqual(h.state().seen, true);
});

test("a loading affordance is painted while the content wait is in flight", () => {
  const h = bootHarness({ getUser: () => USER });
  h.handleAuthEvent(USER);
  assert.strictEqual(h.calls.loading, 1, "up to 8 s of wait must not be a blank page");
  assert.deepStrictEqual(h.calls.applied, [], "nothing is applied until content settles");
});

test("a user whose session ended during the content wait is not applied", async () => {
  // SIGNED_OUT landed while the bundle was in flight. That event painted the
  // logged-out landing; applying the stale user now would drape signed-in chrome
  // over it and fire sync.onLogin() / pro.init() while signed out.
  const h = bootHarness({ getUser: () => null });
  h.handleAuthEvent(USER);
  await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual(h.calls.applied, [], "stale user must not be applied");
  assert.strictEqual(h.calls.restore, 0, "nor its view restored");
});

test("a different user signed in during the wait is not overwritten by the stale one", async () => {
  const h = bootHarness({ getUser: () => ({ id: "u2" }) });
  h.handleAuthEvent(USER);
  await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual(h.calls.applied, []);
});

test("the still-current user is applied normally once content settles", async () => {
  const h = bootHarness({ getUser: () => USER });
  h.handleAuthEvent(USER);
  await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual(h.calls.applied, [USER]);
  assert.strictEqual(h.calls.restore, 1, "the PREP-dependent half of the saved view runs first");
});

test("once content is ready the handler applies synchronously, with no wait", () => {
  const h = bootHarness({ contentReady: true, getUser: () => USER });
  h.handleAuthEvent(USER);
  assert.deepStrictEqual(h.calls.applied, [USER]);
  assert.strictEqual(h.calls.loading, 0, "no spinner once content is already in");
});

test("a signed-out event never waits on content", () => {
  const h = bootHarness({});
  h.handleAuthEvent(null);
  assert.deepStrictEqual(h.calls.applied, [null]);
  assert.strictEqual(h.calls.loading, 0, "the logged-out landing is unchanged");
});

/* ------------------------------------------------------------------ *
 * Finding A — a sign-out during the content wait still wipes the device *
 * ------------------------------------------------------------------ */

/* Unlike bootHarness this runs the *real* onAuthChange, because the bug is the
   interaction between it and the deferred apply: the flag the sign-out branch
   reads was only ever set where the signed-in user is finally applied. */
function wipeHarness() {
  const calls = { clearCache: 0, clearAll: 0, reload: 0, loading: 0, onLogin: 0 };
  let release;
  const wait = new Promise((r) => { release = r; });
  let currentUser = null;

  const deps = {
    IP: {
      auth: { getUser: () => currentUser },
      sync: { onLogin() { calls.onLogin++; } },     // stands in for "the session was applied"
      pro: { init: () => ({ then() {} }) },
      store: { clearAll() { calls.clearAll++; } },
    },
    console: quiet,
    State: { mode: "learn", topic: "dsa" },
    updateAuthUI() {},
    hydrateProSections() {},
    loadUpgradeData() {},
    loadAdminData() {},
    contentClearCache() { calls.clearCache++; },
    window: {},                                    // no Notification — skips the prompt
    location: { reload() { calls.reload++; } },
    whenContentReady: () => wait,
    paintContentLoading() { calls.loading++; },
    restoreContentBoundView() {},
    render() {},
    applyPendingScroll() {},
  };
  const names = Object.keys(deps);
  const built = new Function(
    ...names,
    `let _authEventSeen = false;
     let _contentReady = false;
     let _authReady = false;
     let _renderedUid;
     let _wasAuthed = false;
     let _notifSubbed = false;
     ${extract("bootFailsafe")}
     ${extract("handleAuthEvent")}
     ${extract("onAuthChange")}
     return { handleAuthEvent: handleAuthEvent };`,
  )(...names.map((n) => deps[n]));

  return {
    calls,
    signIn(u) { currentUser = u; built.handleAuthEvent(u); },
    signOut() { currentUser = null; built.handleAuthEvent(null); },
    settleContent() { release(); return new Promise((r) => setImmediate(r)); },
  };
}

test("signing out while the content bundle is in flight still wipes the device", async () => {
  // The window is up to CONTENT_WAIT_MS wide and needs no click from the user to
  // hit — a cross-tab sign-out or a refresh-token invalidation lands here, and the
  // sign-out menu is not even visible yet. Skipping the wipe leaves the departing
  // user's ip_* progress and their ~1.3 MB cached bundle on the device, so the
  // next account to sign in renders the previous user's progress.
  const h = wipeHarness();
  h.signIn(USER);
  assert.strictEqual(h.calls.loading, 1, "precondition: we are inside the content wait");
  assert.strictEqual(h.calls.onLogin, 0, "precondition: the user has not been applied yet");

  h.signOut();
  assert.strictEqual(h.calls.clearCache, 1, "the cached bundle must go");
  assert.strictEqual(h.calls.clearAll, 1, "and the ip_* progress with it");
  assert.strictEqual(h.calls.reload, 1, "on a page that restarts clean");

  await h.settleContent();
  assert.strictEqual(h.calls.onLogin, 0, "and the stale user is still never applied");
});

test("signing out after content has settled wipes the device as it always did", async () => {
  const h = wipeHarness();
  h.signIn(USER);
  await h.settleContent();
  assert.strictEqual(h.calls.onLogin, 1, "the session was established");
  h.signOut();
  assert.deepStrictEqual(
    [h.calls.clearCache, h.calls.clearAll, h.calls.reload], [1, 1, 1],
    "the path that already worked keeps working",
  );
});

test("a visitor who was never signed in is not wiped or reloaded", () => {
  // INITIAL_SESSION fires with no user for every logged-out visitor. Wiping or
  // reloading there would put the landing page in a reload loop.
  const h = wipeHarness();
  h.signOut();
  assert.deepStrictEqual([h.calls.clearCache, h.calls.clearAll, h.calls.reload], [0, 0, 0]);
  assert.strictEqual(h.calls.loading, 0, "and the signed-out path never waits on content");
});

test("a second signed-out event does not wipe a second time", () => {
  const h = wipeHarness();
  h.signIn(USER);
  h.signOut();
  h.signOut();
  assert.strictEqual(h.calls.reload, 1, "the first wipe clears the flag it read");
});

/* ------------------------------------------------------------------ *
 * Finding 2 — loading paint + held scroll                              *
 * ------------------------------------------------------------------ */

function fakeDoc(mainHtml) {
  const main = { innerHTML: mainHtml };
  return { doc: { getElementById: (id) => (id === "content" ? main : null) }, main };
}

test("paintContentLoading fills an empty #content with a legible wait state", () => {
  const f = fakeDoc("");
  new Function("document", "t", "UI", extract("paintContentLoading") + "\npaintContentLoading();")(
    f.doc, (m) => m.en, { contentLoading: { vi: "Đang tải nội dung…", en: "Loading content…" } },
  );
  assert.match(f.main.innerHTML, /Loading content/);
});

test("paintContentLoading never paints over content that already rendered", () => {
  const f = fakeDoc("<div>real content</div>");
  new Function("document", "t", "UI", extract("paintContentLoading") + "\npaintContentLoading();")(
    f.doc, (m) => m.en, { contentLoading: { en: "Loading content…" } },
  );
  assert.strictEqual(f.main.innerHTML, "<div>real content</div>");
});

function scrollHarness(pending, scrollHeight, innerHeight, signedIn) {
  let landed = null;
  const out = new Function(
    "_pendingScroll", "document", "window", "IP",
    `${extract("applyPendingScroll")}
     applyPendingScroll();
     return _pendingScroll;`,
  )(
    pending,
    { documentElement: { scrollHeight: scrollHeight } },
    { innerHeight: innerHeight, scrollTo: (x, y) => { landed = y; } },
    { auth: { enabled: () => true, getUser: () => (signedIn === false ? null : { id: "u1" }) } },
  );
  return { remaining: out, landed };
}

test("a saved scroll is held when the page is too short to hold it", () => {
  // The 8 s cap paints an empty app. Scrolling to 900 there lands at 0 and
  // consumes the restore for nothing.
  const r = scrollHarness(900, 700, 700);
  assert.strictEqual(r.landed, null, "must not scroll against an unpopulated page");
  assert.strictEqual(r.remaining, 900, "and must keep the value for the repaint");
});

test("a saved scroll is applied once the page is tall enough", () => {
  const r = scrollHarness(900, 4000, 700);
  assert.strictEqual(r.landed, 900);
  assert.strictEqual(r.remaining, null, "consumed");
});

test("a zero scroll is consumed rather than held forever", () => {
  const r = scrollHarness(0, 700, 700);
  assert.strictEqual(r.remaining, null);
});

test("no pending scroll is a no-op", () => {
  const r = scrollHarness(null, 4000, 700);
  assert.strictEqual(r.landed, null);
});

test("the logged-out landing consumes the scroll exactly as it did before", () => {
  // The landing is short and render() already forces it to the top, so holding
  // the value there would be a change to the signed-out path for no benefit.
  const r = scrollHarness(900, 700, 700, false);
  assert.strictEqual(r.landed, 900, "signed-out behaviour is unchanged");
  assert.strictEqual(r.remaining, null);
});

/* ------------------------------------------------------------------ *
 * Finding 4 — the late repaint                                         *
 * ------------------------------------------------------------------ */

function lateHarness(painted, current, draft, opts) {
  const o = opts || {};
  const calls = { restore: 0, render: 0, scroll: 0, buildCardQueue: 0 };
  const ta = draft == null ? null : { value: draft, selectionStart: draft.length, setSelectionRange() {}, focus() {} };
  const State = { mode: current.mode, topic: current.topic };
  const Cards = { queue: [] };
  const deps = {
    _paintedMode: painted.mode,
    _paintedTopic: painted.topic,
    State,
    // "content landed" unless a test asks for the degraded empty-PREP case
    PREP: { order: o.prepOrder || ["dsa", "sql"], topics: { dsa: {}, sql: {} } },
    IP: { auth: { getUser: () => (o.signedOut ? null : { id: "u1" }) } },
    restoreContentBoundView() { calls.restore++; },
    buildCardQueue() { calls.buildCardQueue++; Cards.queue = ["c1", "c2", "c3"]; },
    render() { calls.render++; },
    applyPendingScroll() { calls.scroll++; },
    document: { getElementById: (id) => (id === "chatInput" ? ta : null) },
  };
  const names = Object.keys(deps);
  const out = new Function(
    ...names,
    `let _restoreDone = false;
     let _restoreTopic = ${JSON.stringify(o.restoreTopic || null)};
     ${extract("repaintLate")}
     repaintLate();
     return { restoreDone: _restoreDone, restoreTopic: _restoreTopic };`,
  )(...names.map((n) => deps[n]));
  return { calls, restoreDone: out.restoreDone, restoreTopic: out.restoreTopic, ta, Cards, State };
}

test("a late repaint restores the saved view when the user has not navigated", () => {
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "learn", topic: "dsa" }, null);
  assert.strictEqual(h.calls.restore, 1);
  assert.strictEqual(h.calls.render, 1);
});

test("a late repaint does not yank a user who navigated during the dead window", () => {
  // The user opened Quiz while the bundle was still in flight. Re-applying the
  // restored view would pull them straight back out of it.
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "quiz", topic: null }, null);
  assert.strictEqual(h.calls.restore, 0, "the saved view lost the race to a live navigation");
  assert.strictEqual(h.restoreDone, true, "and is retired so it cannot be applied later either");
  assert.strictEqual(h.calls.render, 1, "the new content is still painted");
});

test("navigating to a different topic also counts as navigation", () => {
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "learn", topic: "sql" }, null);
  assert.strictEqual(h.calls.restore, 0);
});

test("a late repaint preserves an unsent chat draft", () => {
  // render() rebuilds #content from State; the draft lives only in the DOM.
  const h = lateHarness({ mode: "chat", topic: null }, { mode: "chat", topic: null }, "half-written question");
  assert.strictEqual(h.ta.value, "half-written question");
});

test("a late repaint with no chat box on screen is fine", () => {
  assert.doesNotThrow(() => lateHarness({ mode: "learn", topic: null }, { mode: "learn", topic: null }, null));
});

test("a late repaint rebuilds the card queue of a user who navigated to Flashcards", () => {
  // Opening Flashcards during the dead window ran buildCardQueue() against an
  // empty PREP, so the queue is empty. Retiring the saved view must not also skip
  // that rebuild: renderCards reads an empty queue with a now non-empty
  // studyPool() as "All done! No cards due right now." and hides a full deck that
  // really is due, recoverable only by a tab re-click, a reload, or a
  // "Study all again" that resets scheduling.
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "cards", topic: null }, null);
  assert.strictEqual(h.calls.restore, 0, "the saved view is still retired — no yanking");
  assert.strictEqual(h.restoreDone, true);
  assert.strictEqual(h.calls.buildCardQueue, 1, "but the mode the user is actually in is rebuilt");
  assert.ok(h.Cards.queue.length > 0, "so the due deck is on screen instead of a false empty state");
});

test("a late repaint retires the saved topic when the user navigated", () => {
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "cards", topic: null }, null,
    { restoreTopic: "sql" });
  assert.strictEqual(h.restoreTopic, null, "it lost the race and must not be applied later either");
  assert.strictEqual(h.State.mode, "cards", "the user stays where they navigated to");
});

test("a late repaint does not rebuild a card queue for a mode that has none", () => {
  // Quiz needs nothing here — renderQuiz recomputes studyPool() on every render.
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "quiz", topic: null }, null);
  assert.strictEqual(h.calls.buildCardQueue, 0);
  assert.strictEqual(h.calls.render, 1);
});

test("a late repaint does not rebuild the queue when no content registered", () => {
  // The load settled having registered nothing (offline, cold cache). Building
  // against an empty PREP would just produce another empty queue; Flashcards'
  // own no-content guard is what should speak there.
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "cards", topic: null }, null,
    { prepOrder: [] });
  assert.strictEqual(h.calls.buildCardQueue, 0);
});

test("a late repaint that lands after the session ended does nothing", () => {
  // The bundle can turn up long after the cap let the page paint, by which time a
  // sign-out may have replaced the app with the logged-out landing. render()
  // hard-gates logged-out anyway, but restoring would still mutate
  // State.mode/State.topic, and saveView() persists that.
  const h = lateHarness({ mode: "learn", topic: "dsa" }, { mode: "cards", topic: null }, null,
    { signedOut: true });
  assert.strictEqual(h.calls.render, 0, "nothing is repainted over the landing");
  assert.strictEqual(h.calls.restore, 0);
  assert.strictEqual(h.calls.buildCardQueue, 0, "and no State is mutated for saveView to pick up");
});

/* ------------------------------------------------------------------ *
 * Finding 5 — Flashcards must not claim "all caught up" with no content *
 * ------------------------------------------------------------------ */

function cardsHarness(topics, poolIds, queue) {
  const UI = {
    allTopics: { en: "All topics" }, due: { en: "cards due" },
    noCards: { en: "All done! No cards due right now." },
    studyAgain: { en: "Study all again" },
    contentUnavailable: { en: "Content could not be loaded. Reload the page, or sign in again." },
  };
  return new Function(
    "State", "t", "UI", "PREP", "Cards", "studyPool", "countDue",
    extract("renderCards") + "\nreturn renderCards();",
  )(
    { lang: "en" }, (m) => m.en, UI, { topics }, { queue: queue, pos: 0, topic: "all" },
    () => poolIds, () => 0,
  );
}

test("Flashcards says content is missing rather than 'all caught up'", () => {
  const html = cardsHarness({}, [], []);
  assert.match(html, /could not be loaded/);
  assert.doesNotMatch(html, /All done/, "congratulating the user for a deck they never received");
  assert.doesNotMatch(html, /fcResetTopic/, "and offering a Study-again button that does nothing");
});

test("Flashcards still shows the genuine all-caught-up screen", () => {
  const html = cardsHarness({ dsa: { id: "dsa", title: { en: "DSA" } } }, ["dsa"], []);
  assert.match(html, /All done/);
  assert.doesNotMatch(html, /could not be loaded/);
});

/* ------------------------------------------------------------------ *
 * Finding 7 — an empty quiz bank explains itself                       *
 * ------------------------------------------------------------------ */

function startQuizHarness(topics, poolIds) {
  const toasts = [];
  const Quiz = { topic: null, questions: [], pos: 0, correct: 0, answered: false, picked: -1, finished: false };
  const startQuiz = new Function(
    "PREP", "studyPool", "Quiz", "toast", "t", "UI",
    extract("buildQuiz") + "\n" + extract("startQuiz") + "\nreturn startQuiz;",
  )(
    { topics }, () => poolIds, Quiz, (m) => toasts.push(m), (m) => m.en,
    { quizNoBank: { en: "This topic has no quiz questions yet." } },
  );
  return { Quiz, startQuiz, toasts };
}

test("picking a topic with an empty quiz bank explains the bounce", () => {
  const h = startQuizHarness({ dsa: { id: "dsa" } }, ["dsa"]);
  h.startQuiz("dsa");
  assert.strictEqual(h.Quiz.topic, null, "still refuses to enter the crashing question view");
  assert.strictEqual(h.toasts.length, 1, "but no longer silently");
  assert.match(h.toasts[0], /no quiz questions/);
});

test("starting a quiz that does have questions says nothing", () => {
  const h = startQuizHarness(
    { dsa: { id: "dsa", quiz: [{ q: "a", options: ["1", "2"], answer: 0 }] } }, ["dsa"],
  );
  h.startQuiz("dsa");
  assert.strictEqual(h.Quiz.topic, "dsa");
  assert.deepStrictEqual(h.toasts, []);
});

/* ------------------------------------------------------------------ *
 * Finding 6 — "clear all data" drops the content cache too             *
 * ------------------------------------------------------------------ */

test("the settings clear-all-data action drops the content cache", () => {
  // The bundle is cached outside the "ip_" prefix that store.clearAll sweeps, so
  // without this a "clear all data" leaves ~1.3 MB of content behind.
  //
  // Caveat: [^}]* stops at the first "}", so this only sees the handler while its
  // body stays brace-free. Add an if/function/object literal in there and the
  // match either truncates or fails outright — if this starts failing after an
  // edit that kept contentClearCache(), widen the pattern rather than assuming a
  // real regression. The assertion itself is real; only the extraction is fragile.
  const m = SRC.match(/confirm\(t\(UI\.confirmClear\)\)\)\s*\{([^}]*)\}/);
  assert.ok(m, "the clear-all-data handler moved");
  assert.match(m[1], /contentClearCache\(\)/);
  assert.ok(m[1].indexOf("contentClearCache()") < m[1].indexOf("location.reload()"),
    "must clear before the reload that ends the page");
});
