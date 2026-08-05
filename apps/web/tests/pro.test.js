const test = require("node:test");
const assert = require("node:assert");
const pro = require("../assets/js/pro.js");

test("vietqrUrl builds exact URL", () => {
  assert.strictEqual(pro.vietqrUrl(49000, "PRO-ABC234"),
    "https://img.vietqr.io/image/970407-19036335023019-compact2.jpg?amount=49000&addInfo=PRO-ABC234&accountName=NGUYEN%20VAN%20KIEN");
});
test("isAdmin", () => {
  assert.strictEqual(pro.isAdmin("u1", ["u1","u2"]), true);
  assert.strictEqual(pro.isAdmin("u3", ["u1"]), false);
  assert.strictEqual(pro.isAdmin(null, ["u1"]), false);
});

/* ---- API routing ---- */

function withApi(calls, overrides) {
  global.window = global;
  const o = overrides || {};
  global.IP = {
    api: {
      get: async (p) => {
        calls.push(["get", p]);
        if (o.get) return o.get(p);
        if (p === "/v1/billing/entitlement") {
          return { tier: "pro", status: "active", expires_at: "2999-01-01T00:00:00Z", isPro: true };
        }
        return { sections: [] };
      },
      post: async (p, b) => {
        calls.push(["post", p, b]);
        if (o.post) return o.post(p, b);
        return { code: "PRO-X", amount: 49000, vietqr: { url: "u" } };
      },
    },
    auth: {
      getUser: () => (o.user !== undefined ? o.user : { id: "u1" }),
    },
  };
}

test("init + isPro use the API entitlement", async () => {
  const calls = [];
  withApi(calls);
  await pro.init();
  assert.ok(calls.some((c) => c[1] === "/v1/billing/entitlement"));
  assert.strictEqual(pro.isPro(), true);
});

test("createPayment posts to the API", async () => {
  const calls = [];
  withApi(calls);
  const r = await pro.createPayment();
  assert.deepStrictEqual(calls.find((c) => c[0] === "post")[1], "/v1/billing/payment");
  assert.strictEqual(r.code, "PRO-X");
});

test("createPayment posts { plan } when a plan is given", async () => {
  const calls = [];
  withApi(calls);
  await pro.createPayment("pro-year");
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/payment");
  assert.deepStrictEqual(call[2], { plan: "pro-year" });
});

test("submitPayment posts to the submit path", async () => {
  const calls = [];
  withApi(calls);
  await pro.submitPayment("PRO-ABC123");
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/payment/PRO-ABC123/submit");
});

test("adminApprove(item) posts {userId,code} for an API item", async () => {
  const calls = [];
  withApi(calls);
  await pro.adminApprove({ userId: "u1", code: "PRO-X" });
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/admin/payment/approve");
  assert.deepStrictEqual(call[2], { userId: "u1", code: "PRO-X" });
});

test("adminReject(item) posts {userId,code} to the reject path", async () => {
  const calls = [];
  withApi(calls);
  await pro.adminReject({ userId: "u2", code: "PRO-Y" });
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/admin/payment/reject");
  assert.deepStrictEqual(call[2], { userId: "u2", code: "PRO-Y" });
});

test("sections maps .sections[].section from the API", async () => {
  const calls = [];
  withApi(calls, {
    get: (p) => {
      if (p === "/v1/billing/entitlement") {
        return { tier: "pro", status: "active", expires_at: "2999-01-01T00:00:00Z", isPro: true };
      }
      return { sections: [{ position: 1, title: "Intro", section: { html: "<p>hi</p>" } }] };
    },
  });
  await pro.init(); // populate _ent so isPro() is true
  const secs = await pro.sections("topic-api-test-" + Math.random());
  assert.deepStrictEqual(secs, [{ html: "<p>hi</p>" }]);
});

test("adminListPayments GETs the admin list filtered by status", async () => {
  const calls = [];
  withApi(calls, { get: () => [{ code: "B", status: "submitted" }] });
  const list = await pro.adminListPayments("submitted");
  assert.strictEqual(calls.find((c) => c[0] === "get")[1], "/v1/billing/admin/payments?status=submitted");
  assert.strictEqual(list[0].code, "B");
});

test("init leaves the entitlement null when the request is rejected, and isPro() is false", async () => {
  const calls = [];
  withApi(calls, { get: () => { throw new Error("network"); } });
  await pro.init();
  assert.strictEqual(pro.isPro(), false);
});

test("init with no signed-in user clears the entitlement without calling the API", async () => {
  const calls = [];
  withApi(calls, { user: null });
  await pro.init();
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(pro.isPro(), false);
});
