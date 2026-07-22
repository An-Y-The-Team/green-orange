import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JWTPayload, createRemoteJWKSet, jwtVerify } from "jose";

// Verifies Authentik-issued RS256 access tokens (AUTH_MODE=oidc). Mirrors the
// Python backend: discover the issuer's JWKS, verify signature + iss + optional
// aud, resolve identity as preferred_username → email → sub.
@Injectable()
export class OidcService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer = (process.env.OIDC_ISSUER ?? "").replace(/\/$/, "");
  private readonly audience = process.env.OIDC_AUDIENCE || undefined;
  // Canonical issuer from the discovery doc. Authentik's `iss` claim keeps its
  // trailing slash, so verifying against the slash-stripped env value (fine for
  // URL building above) fails jose's exact-match issuer check → blanket 401s.
  private canonicalIssuer?: string;

  private async getJwks() {
    if (this.jwks) return this.jwks;
    const res = await fetch(`${this.issuer}/.well-known/openid-configuration`);
    if (!res.ok) throw new UnauthorizedException("OIDC discovery failed");
    const conf = (await res.json()) as { jwks_uri: string; issuer: string };
    this.canonicalIssuer = conf.issuer;
    this.jwks = createRemoteJWKSet(new URL(conf.jwks_uri));
    return this.jwks;
  }

  async verify(token: string): Promise<JWTPayload> {
    const jwks = await this.getJwks();
    const { payload } = await jwtVerify(token, jwks, {
      issuer: this.canonicalIssuer,
      audience: this.audience,
    });
    return payload;
  }

  identity(payload: JWTPayload): string {
    return (
      (payload.preferred_username as string) ||
      (payload.email as string) ||
      (payload.sub as string) ||
      "unknown"
    );
  }
}
