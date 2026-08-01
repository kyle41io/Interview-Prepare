import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";

type KeySet = ReturnType<typeof createRemoteJWKSet>;

/** Accepted on the JWKS path only. "none" and HS* are excluded so a token
 *  cannot choose its own verification route (algorithm confusion). */
const ASYMMETRIC_ALGS = ["ES256", "RS256"];

/**
 * Verifies Supabase access tokens.
 *
 * Supabase projects on the current API keys sign tokens asymmetrically (ES256)
 * and publish the public key at <project>/auth/v1/.well-known/jwks.json, so the
 * legacy HS256 shared secret cannot verify them - that mismatch made every
 * authenticated request 401. Both routes are supported: the token's own `alg`
 * header selects one, and each accepts only its own algorithms.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private keySet?: KeySet;

  constructor(
    private readonly config: ConfigService,
    // Seam for tests: swaps the remote JWKS fetch for a local key set.
    // @Optional() is required - without it Nest tries to resolve this parameter
    // as a provider, fails on the bare Function type, and the whole module
    // fails to initialise (every route 500s). A default value alone does not
    // exempt a constructor parameter from injection.
    @Optional()
    private readonly keySetFactory: (url: string) => KeySet = (url) =>
      createRemoteJWKSet(new URL(url)),
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const h = req.headers["authorization"] || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) throw new UnauthorizedException("no token");

    const alg = this.algOf(token);
    const payload = alg.startsWith("HS") ? this.verifyHs(token) : await this.verifyJwks(token, alg);

    if (!payload?.sub) throw new UnauthorizedException("no subject");
    // session_id identifies one login session; the chat per-session cap keys on
    // it. Legacy HS256 tokens may omit it, so it stays optional — callers must
    // treat a missing value as "no session tier", never as "no cap".
    req.user = { id: payload.sub, email: payload.email, sessionId: payload.session_id };
    return true;
  }

  /** Reads the `alg` header only to route; the signature is still verified. */
  private algOf(token: string): string {
    const decoded = jwt.decode(token, { complete: true });
    const alg = decoded?.header?.alg;
    if (!alg || alg === "none") throw new UnauthorizedException("invalid token");
    return alg;
  }

  private verifyHs(token: string): any {
    const secret = this.config.get<string>("SUPABASE_JWT_SECRET");
    if (!secret) throw new UnauthorizedException("auth not configured");
    try {
      return jwt.verify(token, secret, { algorithms: ["HS256"] });
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }

  private async verifyJwks(token: string, alg: string): Promise<any> {
    if (!ASYMMETRIC_ALGS.includes(alg)) throw new UnauthorizedException("invalid token");
    const url = this.config.get<string>("SUPABASE_JWKS_URL");
    if (!url) throw new UnauthorizedException("auth not configured");
    // Cached across invocations; jose handles refresh and rate-limiting, so a
    // warm Lambda container does not refetch the JWKS per request.
    this.keySet ??= this.keySetFactory(url);
    try {
      const { payload } = await jwtVerify(token, this.keySet, { algorithms: ASYMMETRIC_ALGS });
      return payload;
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }
}
