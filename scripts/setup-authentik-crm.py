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

    # crm-web's Người dùng page (docs/authentik-user-management-future.md):
    python3 scripts/setup-authentik-crm.py --user-admin

`--user-admin` idempotently creates what that page needs and prints the
service account's API token (put it in apps/crm-web/.env as AUTHENTIK_ADMIN_TOKEN;
re-running prints the same key again):
  • group `crm-admins` — the page's access gate; add the admin + secretary to it,
  • service account `crm-user-admin` with only the user/group permissions listed
    in USER_ADMIN_PERMISSIONS (never superuser — this token can mint accounts),
  • recovery flow `crm-recovery` (password prompt → user write, reusing the
    default password-change stages) set as the default brand's Recovery flow —
    without it Authentik answers the "create recovery link" call with 400.
Manual equivalent in the Admin UI, if the script can't reach the instance:
Directory → Groups → create `crm-admins`; Directory → Users → Create Service
account `crm-user-admin`, then its Permissions tab → assign the codenames below,
and Directory → Tokens → create an `api`-intent token for it (the app password
the service-account dialog hands out is NOT accepted as an API Bearer);
Flows → create a `recovery` flow binding `default-password-change-prompt` and
`default-password-change-write`; System → Brands → set it as Recovery flow.
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

# --- --user-admin objects (crm-web Người dùng page) ---
USER_ADMIN_GROUP = "crm-admins"
USER_ADMIN_ACCOUNT = "crm-user-admin"
USER_ADMIN_TOKEN_ID = "crm-user-admin-api"
RECOVERY_FLOW_SLUG = "crm-recovery"
# Global permissions, verified against the 2025.10 API (/rbac/permissions/).
# Exactly what list / create / edit / deactivate / recovery link / group
# membership need — no delete_user, no impersonate, no superuser.
USER_ADMIN_PERMISSIONS = [
    "authentik_core.view_user",
    "authentik_core.add_user",
    "authentik_core.change_user",
    "authentik_core.reset_user_password",
    "authentik_core.view_group",
    "authentik_core.add_user_to_group",
    "authentik_core.remove_user_from_group",
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


def by_name(path: str, key: str, value: str) -> dict | None:
    # `?search=` is a contains-match; pin it to the exact name so `crm-admins`
    # can't resolve to a `crm-admins-old` someone created by hand.
    results = api("GET", f"{path}?search={value}")["results"]
    return next((r for r in results if r.get(key) == value), None)


def user_admin() -> None:
    group = by_name("/core/groups/", "name", USER_ADMIN_GROUP) or api(
        "POST", "/core/groups/", {"name": USER_ADMIN_GROUP}
    )

    account = first("/core/users/", username=USER_ADMIN_ACCOUNT)
    if not account:
        created = api(
            "POST",
            "/core/users/service_account/",
            {"name": USER_ADMIN_ACCOUNT, "create_group": False, "expiring": False},
        )
        account = {"pk": created["user_pk"]}
    # The token that dialog/endpoint returns is an `app_password` — Authentik's
    # API auth rejects it ("Token invalid/expired"). Bearer needs intent=api.
    # expiring=False: a key that silently dies after the default ~360 days would
    # brick the page with no warning.
    if not first("/core/tokens/", identifier=USER_ADMIN_TOKEN_ID):
        api(
            "POST",
            "/core/tokens/",
            {
                "identifier": USER_ADMIN_TOKEN_ID,
                "intent": "api",
                "user": account["pk"],
                "expiring": False,
                "description": "crm-web Người dùng page (AUTHENTIK_ADMIN_TOKEN)",
            },
        )
    token = api("GET", f"/core/tokens/{USER_ADMIN_TOKEN_ID}/view_key/")["key"]
    # Direct user permissions, no role/group indirection. Assigning is additive
    # and re-assigning an existing permission is a no-op, so this is idempotent.
    api(
        "POST",
        f"/rbac/permissions/assigned_by_users/{account['pk']}/assign/",
        {"permissions": USER_ADMIN_PERMISSIONS},
    )

    flow = first("/flows/instances/", slug=RECOVERY_FLOW_SLUG)
    if not flow:
        prompt = by_name(
            "/stages/prompt/stages/", "name", "default-password-change-prompt"
        )
        write = by_name("/stages/user_write/", "name", "default-password-change-write")
        if not (prompt and write):
            sys.exit("Missing default password-change stages — is Authentik booted?")
        flow = api(
            "POST",
            "/flows/instances/",
            {
                "name": "CRM – đặt lại mật khẩu",
                "slug": RECOVERY_FLOW_SLUG,
                "title": "Đặt mật khẩu mới",
                "designation": "recovery",
                # NOT require_unauthenticated: the recovery-link API plans this
                # flow under the (authenticated) service account's request and
                # would reject it as "not applicable".
                "authentication": "none",
            },
        )
        api(
            "POST",
            "/flows/bindings/",
            {"target": flow["pk"], "stage": prompt["pk"], "order": 0},
        )
        api(
            "POST",
            "/flows/bindings/",
            {"target": flow["pk"], "stage": write["pk"], "order": 10},
        )
    brand = first("/core/brands/", default="true")
    if brand and not brand.get("flow_recovery"):
        api(
            "PATCH",
            f"/core/brands/{brand['brand_uuid']}/",
            {"flow_recovery": flow["pk"]},
        )

    print("=== crm-web user admin ===")
    print(f"Group        : {group['name']} (add the admin + secretary to it)")
    print(f"Service acct : {USER_ADMIN_ACCOUNT} (pk {account['pk']})")
    print(f"Recovery flow: {RECOVERY_FLOW_SLUG} (brand default)")
    print("\n--- apps/crm-web/.env (prod: Dockhand secret store) ---")
    print(f"AUTHENTIK_ADMIN_TOKEN={token}")


def main() -> None:
    app = first("/core/applications/", slug=APP_SLUG)
    if app and app.get("provider"):
        provider = api("GET", f"/providers/oauth2/{app['provider']}/")
        print(f"Existing '{APP_SLUG}' application found — reusing.\n")
    else:
        # Implicit consent: it's a first-party app, so skip the "allow this app
        # to access your info?" prompt — login is seamless after authentication.
        auth_flow = first(
            "/flows/instances/",
            slug="default-provider-authorization-implicit-consent",
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
    print("\n--- apps/crm-api/.env AND/OR apps/crm-api-nest/.env (same var names) ---")
    print("AUTH_MODE=oidc")
    print(f"OIDC_ISSUER={issuer}")
    print(f"OIDC_AUDIENCE={provider['client_id']}")
    print("\n--- apps/crm-web/.env.local ---")
    print(f"AUTH_AUTHENTIK_ID={provider['client_id']}")
    print(f"AUTH_AUTHENTIK_SECRET={provider['client_secret']}")
    print(f"AUTH_AUTHENTIK_ISSUER={issuer}")


if __name__ == "__main__":
    user_admin() if "--user-admin" in sys.argv[1:] else main()
