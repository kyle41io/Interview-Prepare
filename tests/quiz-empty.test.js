/* Regression guard for the degraded-content path.

   Learning banks now live in private S3 and are fetched after sign-in, so an
   empty PREP is reachable in production (expired session, unseeded bucket,
   network down). Quiz was the one screen that crashed there: the picker offered
   "All topics", Start built a zero-question quiz, and renderQuiz then did
   `Quiz.questions[Quiz.pos].options.map` on undefined — which throws while
   assigning main.innerHTML, leaving the app dead rather than merely empty.

   app.js is a browser IIFE with no module export, so the function under test is
   lifted out of the real source and run against stubs. Extracting from the file
   (rather than copying the logic here) is what makes this a regression test:
   drop the guard in app.js and these fail. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const APP = path.join(__dirname, "..", "assets", "js", "app.js");
const SRC = fs.readFileSync(APP, "utf8");

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

const BUILD_QUIZ = extract("buildQuiz");

function harness(topics, poolIds) {
  const Quiz = { topic: null, questions: [], pos: 0, correct: 0, answered: false, picked: -1, finished: false };
  const buildQuiz = new Function(
    "PREP", "studyPool", "Quiz",
    BUILD_QUIZ + "\nreturn buildQuiz;",
  )({ topics }, () => poolIds, Quiz);
  return { Quiz, buildQuiz };
}

const withQuestions = {
  dsa: { id: "dsa", quiz: [{ q: "a", options: ["1", "2"], answer: 0, explain: "x" }] },
};

test("Start quiz on an empty registry leaves the picker instead of crashing", () => {
  const h = harness({}, []);
  h.buildQuiz("all");
  assert.deepStrictEqual(h.Quiz.questions, []);
  assert.strictEqual(h.Quiz.topic, null, "a null topic keeps renderQuiz on the picker branch");
});

test("a populated registry still starts the quiz normally", () => {
  const h = harness(withQuestions, ["dsa"]);
  h.buildQuiz("all");
  assert.strictEqual(h.Quiz.questions.length, 1);
  assert.strictEqual(h.Quiz.topic, "all");
  h.buildQuiz("dsa");
  assert.strictEqual(h.Quiz.topic, "dsa");
  assert.strictEqual(h.Quiz.questions[0]._topic, "dsa");
});

test("a topic missing from PREP does not throw", () => {
  const h = harness({}, []);
  assert.doesNotThrow(() => h.buildQuiz("dsa"));
  assert.strictEqual(h.Quiz.topic, null);
});

test("a topic present but with no quiz bank does not enter the question view", () => {
  const h = harness({ dsa: { id: "dsa" } }, ["dsa"]);
  h.buildQuiz("dsa");
  assert.strictEqual(h.Quiz.topic, null);
  h.buildQuiz("all");
  assert.strictEqual(h.Quiz.topic, null);
});

test("renderQuiz's picker branch also guards a zero-length question set", () => {
  assert.match(SRC, /!Quiz\.topic\s*\|\|\s*!Quiz\.questions\.length/);
});
