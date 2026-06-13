# Milestone: Self-hosted Authentik OIDC for the CRM

Status: **Phase 1 + 2 done & verified; Phase 3 (crm-web login) in progress.** The
execution checklist for switching the CRM from local username/password JWT auth to
self-hosted **Authentik** as the identity provider.

Decisions locked:

- **Frontend login**: **Auth.js (NextAuth v5)** using its built-in Authentik
  provider (handles authorization-code + PKCE, session cookie, refresh).
- **Backend**: FastAPI verifies Authentik's RS256 access tokens against its JWKS;
  no shared secret.

## Topology

**One shared Authentik on the VPS, with a dedicated `crm-dev` application kept
separate from a future `crm` production application** (same instance, two apps).

- **Daily student work runs in `AUTH_MODE=local`** — no Authentik needed at all
  (just Postgres + crm-api + crm-web). The CRUD/REST/authorization learning all
  happens here. Authentik is the SSO layer added on top, not a per-student
  dependency.
- **Shared `crm-dev` app** (redirect `http://localhost:3002/...`) is what everyone
  points at when working on/with SSO. The instructor owns Authentik admin and
  creates the 4 user accounts. Students share the `crm-dev` `client_id`/`secret`
  (acceptable for a dev client; use a PKCE public client if you want to avoid a
  shared secret).
- **Future `crm` prod app** is created separately (its own redirect on the real
  domain, ideally its own signing key) — never the same app as dev, so student
  experimentation can't affect prod config.
- The opt-in **`docker-compose.authentik.yml` stays as an optional personal
  sandbox** for anyone who wants to poke at IdP admin without touching the shared
  instance.

Why this and not Authentik-per-machine: a local install per person generates
_different_ `client_id`/`secret`/`issuer`, so config diverges per machine and
can't be shared/debugged consistently — plus 4× the container overhead.

The code is **issuer-agnostic**: `OIDC_ISSUER`/`client_id` (backend) and
`AUTH_AUTHENTIK_*` (frontend) are env-only, so "where Authentik lives" is just
config. `scripts/setup-authentik-crm.py` defaults to creating the `crm-dev` app and
works against either the local sandbox or the VPS (`AUTHENTIK_URL` + `AUTHENTIK_API_TOKEN`).

## Architecture

```text
Browser → crm-web → redirect → Authentik (/application/o/authorize/) → login
        ← code+PKCE ← callback (/api/auth/callback/authentik)
crm-web (server) holds the session; forwards the Authentik ACCESS token as Bearer
crm-web → crm-api   Authorization: Bearer <authentik access token>
crm-api  verifies signature via Authentik JWKS + checks iss/aud  → user identity
```

What changes vs. today: Authentik issues tokens (we stop minting them). crm-api's
`verify_oidc_token` does real validation; crm-web's data layer sends the user's
session token instead of the dev `CRM_API_TOKEN`. Both are already branch-points
in the code (`AUTH_MODE`, the Bearer header), so this is additive.

---

## Phase 1 — Run Authentik (opt-in compose) ✅ DONE

Implemented as `docker-compose.authentik.yml` + `.env.authentik.example` (gitignored
real `.env.authentik`). Authentik runs **`redis`, `server` (UI on `9000`/`9443`), and
`worker`** — it does **not** run its own Postgres. Instead it uses the **shared
Postgres** from `docker-compose.yml`, which now hosts three databases —
`cms`, `crm`, `authentik` — in one container (added to `POSTGRES_MULTIPLE_DATABASES`).
The Authentik stack joins that container's network (`green-orange-net`, declared
external) and connects by the service alias `postgres`. The `/var/run/docker.sock`
mount from Authentik's official template is omitted (only needed for managed
outposts; the CRM uses plain OIDC).

```bash
cp .env.authentik.example .env.authentik
# generate secrets (PG_* in the example already match the shared Postgres):
echo "AUTHENTIK_SECRET_KEY=$(openssl rand -base64 60 | tr -d '\n')"  >> .env.authentik
echo "AUTHENTIK_BOOTSTRAP_TOKEN=$(openssl rand -hex 32)"             >> .env.authentik
# (set AUTHENTIK_BOOTSTRAP_PASSWORD too — that's the akadmin password)

docker compose up -d postgres                                        # shared DB FIRST
docker compose -f docker-compose.authentik.yml --env-file .env.authentik up -d
```

`AUTHENTIK_BOOTSTRAP_*` auto-create the `akadmin` superuser + an API token on first
boot (fresh `authentik` DB only), so setup is reproducible and scriptable.

**Provider + application via script** (instead of the manual UI flow):

```bash
python3 scripts/setup-authentik-crm.py
```

This idempotently creates the **`crm-dev`** OAuth2/OpenID provider (confidential
client, **signed with the self-signed cert so access tokens are RS256 JWTs** —
critical; without a signing key Authentik issues opaque tokens JWKS can't verify)

- application, and prints the OIDC coordinates + ready-to-paste env. Verified live:
  `…/application/o/crm-dev/.well-known/openid-configuration` and `…/jwks/` serve an
  RS256 key. (Create the prod app later with `APP_SLUG=crm`.)

Resulting OIDC coordinates (slug `crm-dev`):

- Issuer: `http://localhost:9000/application/o/crm-dev/` _(trailing slash matters)_
- Discovery: `…/.well-known/openid-configuration` · JWKS: `…/jwks/`
- Client id/secret: printed by the script (also visible in the Authentik UI).

Manual UI fallback (if you skip the script): log in at `http://localhost:9000` as
`akadmin`, create an OAuth2/OpenID provider (set a **signing key**, redirect URI
`http://localhost:3002/api/auth/callback/authentik`), then an application slug `crm-dev`.

---

## Phase 2 — crm-api: `verify_oidc_token` ✅ DONE & VERIFIED

Implemented in [apps/crm-api/app/core/security.py](../apps/crm-api/app/core/security.py):
a module-cached `PyJWKClient` (resolves `jwks_uri` from the issuer's discovery doc),
RS256 verification with `iss` + (optional) `aud` checks, returning
`preferred_username`/`email`/`sub`. Any bad/expired/malformed token → `None` → 401.

Key details learned while building:

- **`pyjwt[crypto]`** is required — plain `pyjwt` raises `MissingCryptographyError`
  on RS256. Added the `[crypto]` extra (pulls `cryptography`).
- Wrap **both** `get_signing_key_from_jwt` _and_ `jwt.decode` in one try/except —
  a malformed token raises `DecodeError` from the former, not just `decode`.
- [app/api/deps.py](../apps/crm-api/app/api/deps.py) does **provision-on-first-login**:
  a valid OIDC token for an unknown username creates a local `User` row (empty
  password — they authenticate via OIDC, never locally).
- Confirmed against the live local Authentik: access-token `iss` = the issuer and
  `aud` = the `client_id`, so the audience check is enabled by default.

Enable with `.env`: `AUTH_MODE=oidc`, `OIDC_ISSUER=<issuer>`, `OIDC_AUDIENCE=<client_id>`
(the setup script prints these). Tests: [tests/test_oidc.py](../apps/crm-api/tests/test_oidc.py)
monkeypatches the verifier (no live Authentik) to cover provisioning + rejection.

Verified end-to-end: minted a real Authentik token (client-credentials grant) →
`GET /auth/me` returned the provisioned identity, `GET /customers` → 200, garbage
token → 401.

---

## Phase 3 — crm-web: Auth.js (NextAuth v5) login ✅ DONE & VERIFIED

Implemented with `next-auth@5.0.0-beta.31` and the edge-safe split-config pattern:

- [src/auth.config.ts](../apps/crm-web/src/auth.config.ts) — edge-safe config + the
  Authentik provider. **Auth is opt-in**: `authEnabled` is true only when
  `AUTH_AUTHENTIK_ISSUER` is set. With it unset (local/mock dev) the dashboard
  stays open and no `AUTH_SECRET` is needed. `jwt`/`session` callbacks persist the
  Authentik access token + **refresh-on-expiry** against `…/token/`.
- [src/auth.ts](../apps/crm-web/src/auth.ts) — the full `NextAuth()` instance
  (`handlers`, `auth`, `signIn`, `signOut`) for the Node runtime.
- [src/app/api/auth/[...nextauth]/route.ts](../apps/crm-web/src/app/api/auth/[...nextauth]/route.ts) — the handlers.
- [src/middleware.ts](../apps/crm-web/src/middleware.ts) — when enabled, the Auth.js
  middleware redirects anonymous users to `/login`; when disabled it's a
  pass-through (no gate, no secret required).
- [src/app/login/page.tsx](../apps/crm-web/src/app/login/page.tsx) — sign-in page
  (`signIn("authentik")` server action); [(dashboard)/layout.tsx](<../apps/crm-web/src/app/(dashboard)/layout.tsx>)
  shows the user + a `signOut` button when authenticated.
- [src/lib/api/index.ts](../apps/crm-web/src/lib/api/index.ts) — `getBearer()` now
  sends the **session access token** when OIDC is on, falling back to the dev
  `CRM_API_TOKEN`. The `apiFetch`/`apiFetchSafe` split is unchanged.
- `src/types/next-auth.d.ts` augments the session/JWT with `accessToken`.

Env (crm-web): `AUTH_SECRET` (`openssl rand -hex 32`), `AUTH_AUTHENTIK_ID/SECRET/ISSUER`
— added to Turbo `passThroughEnv`; the setup script prints ready-to-paste values.

Verified (automated, short of the browser consent screen): build passes with the
auth route + middleware; anonymous `/dashboard` → `307 /login`;
`/api/auth/providers` lists the `authentik` OIDC provider; initiating sign-in
redirects to `…/application/o/authorize/` with `response_type=code`, the correct
`client_id`/`redirect_uri`, `scope=openid email profile offline_access`, and **PKCE**
(`code_challenge_method=S256`).

## Final manual check (needs a browser + an Authentik user)

1. `docker compose up -d postgres` and `docker compose -f docker-compose.authentik.yml --env-file .env.authentik up -d`.
2. `python3 scripts/setup-authentik-crm.py` → paste the printed env into
   `apps/crm-api/.env` (AUTH*MODE=oidc + OIDC*\_) and `apps/crm-web/.env.local`
   (AUTH\_\_ ), and add `AUTH_SECRET`.
3. In Authentik (`http://localhost:9000`, akadmin) create a normal user account.
4. Start crm-api (`AUTH_MODE=oidc`) + crm-web; visit `http://localhost:3002` → land
   on `/login` → "Đăng nhập với Authentik" → log in → back at `/dashboard`, and the
   customer list shows live Postgres data (the session token, verified by crm-api).

## Production notes (defer with the rest of prod wiring)

- Authentik behind Caddy on its own subdomain (e.g. `auth.dichvuyan.com`); set the
  prod redirect URI on the provider; `AUTHENTIK_BOOTSTRAP_*` for unattended setup.
- Real signing key (not the self-signed default) and rotate `AUTHENTIK_SECRET_KEY`.
- crm-api `OIDC_ISSUER`/`OIDC_AUDIENCE` point at the public Authentik URL.

## Open questions to resolve when building

- **User provisioning**: auto-create CRM `User` rows on first OIDC login, or
  pre-seed? (Recommend auto-create.)
- **Authorization granularity**: just authenticated-or-not, or map Authentik
  groups → CRM roles (RBAC)? The CMS already does RBAC — could mirror.
- **`aud` claim**: confirm Authentik's access-token audience against `client_id`
  on the live instance and adjust the verifier/scope mapping accordingly.
