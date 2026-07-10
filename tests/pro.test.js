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

/* ---- IP.api gating: routes through the API when configured, else Supabase fallback ---- */

function withApi(configured, calls, overrides) {
  global.window = global;
  const o = overrides || {};
  global.IP = {
    api: {
      configured: () => configured,
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
      client: () => (o.client !== undefined ? o.client : null),
      getUser: () => (o.user !== undefined ? o.user : { id: "u1" }),
    },
  };
}

test("init + isPro use the API entitlement when configured", async () => {
  const calls = [];
  withApi(true, calls);
  await pro.init();
  assert.ok(calls.some((c) => c[1] === "/v1/billing/entitlement"));
  assert.strictEqual(pro.isPro(), true);
});

test("createPayment posts to the API when configured", async () => {
  const calls = [];
  withApi(true, calls);
  const r = await pro.createPayment();
  assert.deepStrictEqual(calls.find((c) => c[0] === "post")[1], "/v1/billing/payment");
  assert.strictEqual(r.code, "PRO-X");
});

test("createPayment posts { plan } when a plan is given", async () => {
  const calls = [];
  withApi(true, calls);
  await pro.createPayment("pro-year");
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/payment");
  assert.deepStrictEqual(call[2], { plan: "pro-year" });
});

test("submitPayment posts to the submit path", async () => {
  const calls = [];
  withApi(true, calls);
  await pro.submitPayment("PRO-ABC123");
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/payment/PRO-ABC123/submit");
});

test("adminApprove(item) posts {userId,code} for an API item", async () => {
  const calls = [];
  withApi(true, calls);
  await pro.adminApprove({ userId: "u1", code: "PRO-X" });
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/admin/payment/approve");
  assert.deepStrictEqual(call[2], { userId: "u1", code: "PRO-X" });
});

test("adminReject(item) posts {userId,code} to the reject path", async () => {
  const calls = [];
  withApi(true, calls);
  await pro.adminReject({ userId: "u2", code: "PRO-Y" });
  const call = calls.find((c) => c[0] === "post");
  assert.strictEqual(call[1], "/v1/billing/admin/payment/reject");
  assert.deepStrictEqual(call[2], { userId: "u2", code: "PRO-Y" });
});

test("sections maps .sections[].section from the API", async () => {
  const calls = [];
  withApi(true, calls, {
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

test("not configured => no IP.api calls (Supabase fallback path)", async () => {
  const calls = [];
  withApi(false, calls);
  await pro.init().catch(() => {});
  assert.strictEqual(calls.length, 0);
});

test("adminListPayments Supabase fallback unwraps {requests} and honors status", async () => {
  const calls = [];
  const fakeClient = {
    functions: {
      invoke: async (name, opts) => {
        calls.push([name, opts]);
        return {
          data: { requests: [{ code: "A", status: "pending" }, { code: "B", status: "submitted" }] },
          error: null,
        };
      },
    },
  };
  withApi(false, calls, { client: fakeClient });
  const list = await pro.adminListPayments("submitted");
  assert.ok(Array.isArray(list));
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].code, "B");
});
