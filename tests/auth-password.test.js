const test = require("node:test");
const assert = require("node:assert");

// auth.js reads globals off `window`; give it one before requiring.
global.window = global;
const auth = require("../assets/js/auth.js");

function stubSupabase(behaviour) {
  global.IP_CONFIG = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon" };
  global.supabase = { createClient: () => ({ auth: behaviour }) };
}

test("signUpWithPassword returns ok on success", async () => {
  let seen = null;
  stubSupabase({ signUp: async (args) => { seen = args; return { data: {}, error: null }; } });
  const r = await auth.signUpWithPassword({ email: "a@b.com", username: "kyle", password: "hunter22" });
  assert.deepStrictEqual(r, { ok: true });
  assert.strictEqual(seen.email, "a@b.com");
  assert.strictEqual(seen.password, "hunter22");
  // username rides in as full_name so _ensureProfile picks it up unchanged
  assert.strictEqual(seen.options.data.full_name, "kyle");
});

test("signUpWithPassword surfaces the Supabase error message", async () => {
  stubSupabase({ signUp: async () => ({ data: null, error: { message: "User already registered" } }) });
  const r = await auth.signUpWithPassword({ email: "a@b.com", username: "k", password: "hunter22" });
  assert.deepStrictEqual(r, { ok: false, code: "User already registered" });
});

test("signInWithPassword returns ok on success", async () => {
  let seen = null;
  stubSupabase({ signInWithPassword: async (args) => { seen = args; return { data: {}, error: null }; } });
  const r = await auth.signInWithPassword({ email: "a@b.com", password: "hunter22" });
  assert.deepStrictEqual(r, { ok: true });
  assert.deepStrictEqual(seen, { email: "a@b.com", password: "hunter22" });
});

test("signInWithPassword surfaces the Supabase error message", async () => {
  stubSupabase({ signInWithPassword: async () => ({ data: null, error: { message: "Invalid login credentials" } }) });
  const r = await auth.signInWithPassword({ email: "a@b.com", password: "nope" });
  assert.deepStrictEqual(r, { ok: false, code: "Invalid login credentials" });
});

test("both methods fail closed when Supabase is not configured", async () => {
  delete global.IP_CONFIG;
  delete global.supabase;
  assert.deepStrictEqual(
    await auth.signUpWithPassword({ email: "a@b.com", username: "k", password: "hunter22" }),
    { ok: false, code: "auth-unavailable" }
  );
  assert.deepStrictEqual(
    await auth.signInWithPassword({ email: "a@b.com", password: "hunter22" }),
    { ok: false, code: "auth-unavailable" }
  );
});
