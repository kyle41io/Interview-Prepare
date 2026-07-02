const test = require("node:test");
const assert = require("node:assert");
const pro = require("../assets/js/pro.js");

test("genProCode format + charset", () => {
  const c = pro.genProCode(() => 0.5);
  assert.match(c, /^PRO-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  // deterministic with injected rand
  assert.strictEqual(pro.genProCode(() => 0), "PRO-AAAAAA");
});
test("extendExpiry from now when no current expiry", () => {
  const out = pro.extendExpiry("2026-07-02T00:00:00.000Z", null, 30);
  assert.strictEqual(out, "2026-08-01T00:00:00.000Z");
});
test("extendExpiry stacks on future expiry", () => {
  const out = pro.extendExpiry("2026-07-02T00:00:00.000Z", "2026-07-10T00:00:00.000Z", 30);
  assert.strictEqual(out, "2026-08-09T00:00:00.000Z");
});
test("extendExpiry ignores past expiry", () => {
  const out = pro.extendExpiry("2026-07-02T00:00:00.000Z", "2026-06-01T00:00:00.000Z", 30);
  assert.strictEqual(out, "2026-08-01T00:00:00.000Z");
});
test("vietqrUrl builds exact URL", () => {
  assert.strictEqual(pro.vietqrUrl(49000, "PRO-ABC234"),
    "https://img.vietqr.io/image/970407-19036335023019-compact2.jpg?amount=49000&addInfo=PRO-ABC234&accountName=NGUYEN%20VAN%20KIEN");
});
test("isAdmin", () => {
  assert.strictEqual(pro.isAdmin("u1", ["u1","u2"]), true);
  assert.strictEqual(pro.isAdmin("u3", ["u1"]), false);
  assert.strictEqual(pro.isAdmin(null, ["u1"]), false);
});
