"""Password hashing + JWT helpers.

Two auth strategies share this module:

  • Local JWT (auth_mode="local", the teaching default): we hash passwords with
    argon2 (pwdlib), and mint/verify our own HS256 tokens.
  • Authentik OIDC (auth_mode="oidc", a later milestone): we DON'T mint tokens;
    Authentik does. We only verify its RS256 tokens against its JWKS. That part
    is a clearly-marked stub below — implementing it is the OIDC milestone.
"""

from datetime import UTC, datetime, timedelta

import httpx
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from pwdlib import PasswordHash

from app.core.config import settings

_password_hash = PasswordHash.recommended()

# Lazily-built, cached JWKS client for Authentik OIDC verification. Built once
# (resolving the jwks_uri from the issuer's discovery doc) and reused so the
# JWKS isn't refetched per request; PyJWKClient caches the keys internally.
_jwks_client: PyJWKClient | None = None


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


def _get_jwks_client() -> PyJWKClient:
    """Resolve the issuer's jwks_uri (via OIDC discovery) and cache the client."""
    global _jwks_client
    if _jwks_client is None:
        if not settings.oidc_issuer:
            raise RuntimeError("OIDC_ISSUER is not configured (AUTH_MODE=oidc).")
        discovery_url = (
            settings.oidc_issuer.rstrip("/") + "/.well-known/openid-configuration"
        )
        jwks_uri = httpx.get(discovery_url, timeout=10).raise_for_status().json()[
            "jwks_uri"
        ]
        _jwks_client = PyJWKClient(jwks_uri)
    return _jwks_client


def verify_oidc_token(token: str) -> str | None:
    """Validate an Authentik-issued OIDC access token; return its username.

    Verifies the RS256 signature against Authentik's JWKS and checks `iss` (and
    `aud` when OIDC_AUDIENCE is set). Returns the user identity from the standard
    claims, or None if the token is invalid/expired. Config errors (bad issuer,
    JWKS unreachable) raise — those are misconfiguration, not a bad token.

    Enable with AUTH_MODE=oidc plus OIDC_ISSUER and OIDC_AUDIENCE in .env.
    """
    decode_kwargs: dict = {"algorithms": ["RS256"], "issuer": settings.oidc_issuer}
    if settings.oidc_audience:
        decode_kwargs["audience"] = settings.oidc_audience
    try:
        # get_signing_key_from_jwt parses the (untrusted) header, so a malformed
        # token raises here — catch alongside signature/claim failures from decode.
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(token, signing_key.key, **decode_kwargs)
    except (jwt.InvalidTokenError, PyJWKClientError):
        return None
    return claims.get("preferred_username") or claims.get("email") or claims.get("sub")
