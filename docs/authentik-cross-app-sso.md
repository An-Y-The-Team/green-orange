# Cross-app SSO across the suite (crm-web · cms · web)

Status: **research / design.** How to extend the existing Authentik SSO so one
browser session spans the whole product suite without re-login. `crm-web` is
already an OIDC client; this doc is about bringing `cms` (and optionally `web`)
under the same Authentik.

## The mental model — Authentik *is* the shared session

There is nothing to "share" between the apps. The shared session is the
**Authentik IdP session cookie** on `auth.dichvuyan.com`. Each app stays its own
OIDC client (its own Authentik application/client_id, its own local session
cookie). SSO is an emergent property of every app pointing at the same IdP:

```text
                 ┌──────────────────────────────────────┐
                 │  Authentik @ auth.dichvuyan.com        │  ← the ONE shared session
                 │  (holds the IdP session cookie)        │     one Authentik app per RP
                 └───┬───────────────┬───────────────┬────┘
      crm-web (RP) ──┘   cms/Directus (RP)            └── web/Next (RP, only if needed)
      NextAuth JWT cookie   Directus session cookie       NextAuth JWT cookie
```

First login to app A → Authentik sets its own cookie. Later, app B redirects to
Authentik's `/authorize` → Authentik sees the live session → bounces straight
back with a code, **no credential prompt**. That is the whole SSO. App cookies
are never shared across subdomains — only the IdP session is.

This is the canonical multi-RP OIDC pattern, and it's the one to use here: it
keeps the standard mental model students already learned from the CRM milestone,
and avoids the brittle cross-domain-cookie hack (see "Rejected" below).

## Current topology

| App | Domain | Auth today |
| --- | --- | --- |
| `apps/web` (Next.js marketing site) | `dichvuyan.com` | none — public, reads Directus |
| `apps/cms` (Directus 12) | `cms.dichvuyan.com` | local admin login |
| `crm-web` | `crm.` / `quanly.dichvuyan.com` | **Authentik OIDC ✓** (redirect + headless) |
| Authentik (IdP) | `auth.dichvuyan.com` | — |

All are subdomains of one parent domain, and Authentik is already the shared
IdP — the two facts that make suite-wide SSO a config exercise, not a rebuild.

## Per-app work

### crm-web — done

Already an Authentik OIDC RP (`apps/crm-web/src/auth.config.ts`, redirect +
headless). Nothing to change.

### cms (Directus 12) — native OIDC, no code

Directus has built-in OIDC SSO via env vars. Create a **separate Authentik
application/provider** for Directus (same split you already use for
`crm-dev` vs `crm`), then set on the `cms` container:

```sh
AUTH_PROVIDERS="authentik"
AUTH_AUTHENTIK_DRIVER="openid"
AUTH_AUTHENTIK_CLIENT_ID="<directus provider client_id>"
AUTH_AUTHENTIK_CLIENT_SECRET="<secret>"
AUTH_AUTHENTIK_ISSUER_URL="https://auth.dichvuyan.com/application/o/directus/.well-known/openid-configuration"
AUTH_AUTHENTIK_IDENTIFIER_KEY="email"
AUTH_AUTHENTIK_ALLOW_PUBLIC_REGISTRATION="true"   # auto-provision on first login (mirrors crm-api)
AUTH_AUTHENTIK_DEFAULT_ROLE_ID="<directus role uuid>"
AUTH_AUTHENTIK_MODE="session"                      # session cookie, not JWT-in-URL
AUTH_AUTHENTIK_LABEL="Đăng nhập với Authentik"
# optional: Authentik groups → Directus roles (RBAC parity with the CRM)
AUTH_AUTHENTIK_ROLE_MAPPING='{"crm-admins":"<directus admin role uuid>"}'
AUTH_AUTHENTIK_GROUP_CLAIM_NAME="groups"
# optional: force SSO-only (keep unset to leave local admin as break-glass)
# AUTH_DISABLE_DEFAULT="true"
```

- **Redirect URI** to register on the Authentik provider:
  `https://cms.dichvuyan.com/auth/login/authentik/callback`.
- **Signing key must be set on the provider** so access tokens are RS256 — the
  exact gotcha already documented in `authentik-oidc-milestone.md` (no signing
  key → opaque tokens).
- The Directus login page then shows an "Authentik" button. With a live
  Authentik session it's a one-hop silent bounce.
- Cookie: same parent domain, so `SameSite=Lax` is fine — no need for
  `SESSION_COOKIE_SAME_SITE=None`. Set `SESSION_COOKIE_SECURE=true` (HTTPS).

Easiest to fold the Directus application into `scripts/setup-authentik-crm.py`
(a `--app directus` variant) so it's created idempotently alongside `crm-dev`.

### web (apps/web) — probably nothing

`apps/web` is a public marketing site with no auth (preview already uses
`?secret=`). Add SSO here **only if a gated area actually exists** (e.g. an
internal preview/admin route). If so, mirror `crm-web` exactly: NextAuth v5 +
Authentik provider as a third RP, its own Authentik app, redirect
`https://dichvuyan.com/api/auth/callback/authentik`. Otherwise skip it (YAGNI).

## Seamless vs. redirect — set expectations

- **Full-page redirect SSO (recommended):** with a live Authentik session it's a
  sub-second bounce, no password. Standard and robust everywhere.
- **Zero-flash silent auth (`prompt=none` in a hidden iframe):** don't build it.
  Authentik's cookie is third-party inside the iframe and modern browsers block
  that (Safari ITP, Chrome third-party-cookie phase-out). The redirect bounce is
  the pragmatic "seamless".

## Cross-cutting decisions before building

1. **Single logout.** Shared session cuts both ways: logging out of `crm-web`
   does **not** end the Authentik session by default (Auth.js `signOut` clears
   only the local cookie), so the next app still auto-logs-in. For true SLO, hit
   Authentik's `end_session_endpoint` on logout. Decide: local logout (simple)
   vs. global SLO.
2. **One identity, consistent roles.** Map Authentik **groups → roles** in both
   `crm-api` and Directus so the same person has coherent permissions
   everywhere. (Already an open question in `authentik-oidc-milestone.md`.)
3. **Rejected — literal cookie sharing.** You *could* set the NextAuth cookie to
   domain `.dichvuyan.com` + a shared `AUTH_SECRET` so `crm-web` and `web` share
   one JWT — but Directus can't join that scheme, so it wouldn't unify all three,
   and it's the brittle path the teaching-ROI rule warns against. Multi-RP OIDC
   is the answer.

## Minimal path

Directus is the only app that gains real SSO value and needs **zero code** — a
new Authentik application + the env block above. That alone delivers genuine
cross-app SSO between CRM and CMS. Add `apps/web` only if a gated area exists.

See also: `authentik-oidc-milestone.md` (the CRM OIDC build),
`authentik-headless-login-future.md` (inline login), and `DEPLOY.md` §6 (Caddy
subdomains, `X-Forwarded-Proto` for Authentik).
