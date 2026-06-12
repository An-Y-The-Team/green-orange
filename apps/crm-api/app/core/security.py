"""Password hashing + JWT helpers.

Two auth strategies share this module:

  • Local JWT (auth_mode="local", the teaching default): we hash passwords with
    argon2 (pwdlib), and mint/verify our own HS256 tokens.
  • Authentik OIDC (auth_mode="oidc", a later milestone): we DON'T mint tokens;
    Authentik does. We only verify its RS256 tokens against its JWKS. That part
    is a clearly-marked stub below — implementing it is the OIDC milestone.
"""

from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_password_hash = PasswordHash.recommended()


def hash_password(plain: str) -> str:
    return _password_hash.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _password_hash.verify(plain, hashed)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """Create a signed HS256 JWT whose `sub` claim is the username."""
    minutes = expires_minutes or settings.access_token_expire_minutes
    expire = datetime.now(UTC) + timedelta(minutes=minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """Return the `sub` (username) from a valid local token, else None."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.InvalidTokenError:
        return None
    return payload.get("sub")


def verify_oidc_token(token: str) -> str | None:
    """Validate an Authentik-issued OIDC access token. (OIDC milestone — TODO.)

    Reference implementation outline for students/future work:
      1. Fetch  {oidc_issuer}/.well-known/openid-configuration  (cache it).
      2. Fetch the `jwks_uri` from that document and cache the JWKS.
      3. Use jwt.PyJWKClient(jwks_uri).get_signing_key_from_jwt(token) to get
         the RS256 signing key.
      4. jwt.decode(token, key, algorithms=["RS256"],
                    audience=settings.oidc_audience, issuer=settings.oidc_issuer)
      5. Return the `preferred_username` / `email` / `sub` claim.

    Enable by setting AUTH_MODE=oidc plus OIDC_ISSUER and OIDC_AUDIENCE in .env.
    """
    raise NotImplementedError(
        "OIDC verification not implemented yet — this is the Authentik milestone."
    )
