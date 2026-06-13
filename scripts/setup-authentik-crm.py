#!/usr/bin/env python3
"""Idempotently create a CRM OAuth2/OpenID provider + application in Authentik,
then print the OIDC coordinates for crm-api / crm-web.

Works against either:
  • the local opt-in sandbox (docker-compose.authentik.yml) — defaults below, or
  • the shared Authentik on the VPS — set AUTHENTIK_URL + AUTHENTIK_API_TOKEN.

Topology (decided for this project): one shared Authentik, with a dedicated
`crm-dev` application for development (this script's default) kept SEPARATE from a
future `crm` production application. To create the prod app later, re-run with
APP_SLUG=crm APP_NAME="CRM" CRM_REDIRECT_URIS=https://crm.<domain>/api/auth/callback/authentik.

Stdlib only — no pip installs.

    # local sandbox:
    python3 scripts/setup-authentik-crm.py
    # shared VPS instance:
    AUTHENTIK_URL=https://auth.example.com AUTHENTIK_API_TOKEN=<token> \
        python3 scripts/setup-authentik-crm.py

Re-running is safe: it reuses an existing application with the same slug.
"""

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("AUTHENTIK_URL", "http://localhost:9000").rstrip("/")
APP_SLUG = os.environ.get("APP_SLUG", "crm-dev")
APP_NAME = os.environ.get("APP_NAME", "CRM (dev)")
# One or more allowed OAuth callback URLs (comma-separated). All students share
# localhost:3002, so one entry covers the whole dev team.
REDIRECT_URIS = [
    u.strip()
    for u in os.environ.get(
        "CRM_REDIRECT_URIS", "http://localhost:3002/api/auth/callback/authentik"
    ).split(",")
    if u.strip()
]


def _read_token() -> str:
    # Prefer an explicit API token (the VPS instance), else the local sandbox's
    # bootstrap token from .env.authentik.
    tok = os.environ.get("AUTHENTIK_API_TOKEN") or os.environ.get(
        "AUTHENTIK_BOOTSTRAP_TOKEN"
    )
    if tok:
        return tok
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(here, ".env.authentik")
    if os.path.exists(env_path):
        for line in open(env_path):
            if line.startswith("AUTHENTIK_BOOTSTRAP_TOKEN="):
                return line.split("=", 1)[1].strip()
    sys.exit(
        "No API token. Set AUTHENTIK_API_TOKEN (VPS) or AUTHENTIK_BOOTSTRAP_TOKEN "
        "(local sandbox), or put the latter in .env.authentik."
    )


TOKEN = _read_token()


def api(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{BASE}/api/v3{path}", data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit(f"API {method} {path} failed: {e.code}\n{e.read().decode()}")


def first(path: str, **filters) -> dict | None:
    q = "&".join(f"{k}={v}" for k, v in filters.items())
    results = api("GET", f"{path}?{q}")["results"]
    return results[0] if results else None


def scope_pks(names: list[str]) -> list[str]:
    out = []
    for n in names:
        m = first(
            "/propertymappings/provider/scope/", scope_name=n, managed__isnull="false"
        )
        if m:
            out.append(m["pk"])
    return out


def main() -> None:
    app = first("/core/applications/", slug=APP_SLUG)
    if app and app.get("provider"):
        provider = api("GET", f"/providers/oauth2/{app['provider']}/")
        print(f"Existing '{APP_SLUG}' application found — reusing.\n")
    else:
        auth_flow = first(
            "/flows/instances/",
            slug="default-provider-authorization-explicit-consent",
        )
        inval_flow = first(
            "/flows/instances/", slug="default-provider-invalidation-flow"
        )
        cert = first("/crypto/certificatekeypairs/", has_key="true")
        if not (auth_flow and inval_flow and cert):
            sys.exit("Missing default flows or signing cert — is Authentik booted?")

        provider = api(
            "POST",
            "/providers/oauth2/",
            {
                "name": APP_NAME,
                "authorization_flow": auth_flow["pk"],
                "invalidation_flow": inval_flow["pk"],
                "client_type": "confidential",
                "signing_key": cert["pk"],  # makes access tokens RS256 JWTs
                "sub_mode": "user_username",  # `sub` = username
                "redirect_uris": [
                    {"matching_mode": "strict", "url": u} for u in REDIRECT_URIS
                ],
                "property_mappings": scope_pks(
                    ["openid", "email", "profile", "offline_access"]
                ),
            },
        )
        api(
            "POST",
            "/core/applications/",
            {"name": APP_NAME, "slug": APP_SLUG, "provider": provider["pk"]},
        )
        print(f"Created '{APP_NAME}' OAuth2 provider + application.\n")

    issuer = f"{BASE}/application/o/{APP_SLUG}/"
    print("=== OIDC coordinates ===")
    print(f"Issuer       : {issuer}")
    print(f"Discovery    : {issuer}.well-known/openid-configuration")
    print(f"JWKS         : {issuer}jwks/")
    print(f"Client ID    : {provider['client_id']}")
    print(f"Client secret: {provider['client_secret']}")
    print(f"Redirect URIs: {', '.join(REDIRECT_URIS)}")
    print("\n--- apps/crm-api/.env ---")
    print("AUTH_MODE=oidc")
    print(f"OIDC_ISSUER={issuer}")
    print(f"OIDC_AUDIENCE={provider['client_id']}")
    print("\n--- apps/crm-web/.env.local ---")
    print(f"AUTH_AUTHENTIK_ID={provider['client_id']}")
    print(f"AUTH_AUTHENTIK_SECRET={provider['client_secret']}")
    print(f"AUTH_AUTHENTIK_ISSUER={issuer}")


if __name__ == "__main__":
    main()
