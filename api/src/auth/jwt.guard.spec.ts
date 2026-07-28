import { JwtAuthGuard } from "./jwt.guard";
import { UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";

const SECRET = "test-secret";
const JWKS_URL = "https://proj.supabase.co/auth/v1/.well-known/jwks.json";

function ctx(auth?: string) {
  const req: any = { headers: auth ? { authorization: auth } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}

/** Config double: HS256 secret only, no JWKS URL (legacy / local-dev shape). */
const hsOnly = { get: (k: string) => (k === "SUPABASE_JWT_SECRET" ? SECRET : undefined) } as any;

describe("JwtAuthGuard - HS256 (legacy shared secret)", () => {
  const guard = new JwtAuthGuard(hsOnly);

  it("rejects missing token", async () => {
    await expect(guard.canActivate(ctx())).rejects.toThrow(UnauthorizedException);
  });

  it("rejects bad signature", async () => {
    const t = jwt.sign({ sub: "u1" }, "wrong");
    await expect(guard.canActivate(ctx("Bearer " + t))).rejects.toThrow(UnauthorizedException);
  });

  it("rejects expired", async () => {
    const t = jwt.sign({ sub: "u1", exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
    await expect(guard.canActivate(ctx("Bearer " + t))).rejects.toThrow(UnauthorizedException);
  });

  it("accepts valid + sets user", async () => {
    const t = jwt.sign({ sub: "u1", email: "a@b.c" }, SECRET);
    const c = ctx("Bearer " + t);
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(c._req.user).toEqual({ id: "u1", email: "a@b.c" });
  });

  it("rejects a token with no subject", async () => {
    const t = jwt.sign({ email: "a@b.c" }, SECRET);
    await expect(guard.canActivate(ctx("Bearer " + t))).rejects.toThrow(UnauthorizedException);
  });
});

/**
 * Supabase projects on the current API keys sign access tokens with ES256 and
 * publish the public key at the project's JWKS endpoint. Those are the tokens
 * the live app actually sends; verifying them against the HS256 shared secret
 * fails, which is what made every authenticated request 401.
 */
describe("JwtAuthGuard - ES256 (Supabase JWKS)", () => {
  let privateKey: any;
  let otherPrivateKey: any;
  let guard: JwtAuthGuard;

  beforeAll(async () => {
    const kp = await generateKeyPair("ES256");
    privateKey = kp.privateKey;
    const jwk: any = await exportJWK(kp.publicKey);
    jwk.alg = "ES256";
    jwk.kid = "test-kid";

    // A key deliberately NOT in the published set, to prove foreign-signed
    // tokens are rejected rather than trusted.
    const other = await generateKeyPair("ES256");
    otherPrivateKey = other.privateKey;

    const keySet = createLocalJWKSet({ keys: [jwk] });
    const config = {
      get: (k: string) => {
        if (k === "SUPABASE_JWT_SECRET") return SECRET;
        if (k === "SUPABASE_JWKS_URL") return JWKS_URL;
        return undefined;
      },
    } as any;
    // Inject the local key set in place of the remote JWKS fetch.
    guard = new JwtAuthGuard(config, () => keySet as any);
  });

  const sign = (key: any, claims: Record<string, unknown>, kid = "test-kid") =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);

  it("accepts a JWKS-signed token + sets user", async () => {
    const t = await sign(privateKey, { sub: "u9", email: "es@b.c" });
    const c = ctx("Bearer " + t);
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(c._req.user).toEqual({ id: "u9", email: "es@b.c" });
  });

  it("rejects a token signed by a key outside the published set", async () => {
    const t = await sign(otherPrivateKey, { sub: "u9" });
    await expect(guard.canActivate(ctx("Bearer " + t))).rejects.toThrow(UnauthorizedException);
  });

  it("rejects an expired JWKS-signed token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const t = await new SignJWT({ sub: "u9" })
      .setProtectedHeader({ alg: "ES256", kid: "test-kid" })
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(privateKey);
    await expect(guard.canActivate(ctx("Bearer " + t))).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a JWKS-signed token with no subject", async () => {
    const t = await sign(privateKey, { email: "es@b.c" });
    await expect(guard.canActivate(ctx("Bearer " + t))).rejects.toThrow(UnauthorizedException);
  });

  it("still accepts HS256 tokens, so legacy tokens keep working", async () => {
    const t = jwt.sign({ sub: "u1", email: "a@b.c" }, SECRET);
    const c = ctx("Bearer " + t);
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(c._req.user).toEqual({ id: "u1", email: "a@b.c" });
  });

  it("rejects 'none' algorithm tokens", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ sub: "u1" })).toString("base64url");
    await expect(guard.canActivate(ctx(`Bearer ${header}.${body}.`))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe("JwtAuthGuard - misconfiguration", () => {
  it("rejects when neither a secret nor a JWKS URL is configured", async () => {
    const guard = new JwtAuthGuard({ get: () => undefined } as any);
    const t = jwt.sign({ sub: "u1" }, SECRET);
    await expect(guard.canActivate(ctx("Bearer " + t))).rejects.toThrow(UnauthorizedException);
  });
});
