---
name: crm-401-stale-dev-token
description: Root cause of recurring CRM 401s in local/mock dev — CRM_API_TOKEN in apps/crm-web/.env is a hardcoded JWT that expires 30min after mint and is never regenerated
metadata:
  type: project
---

Found 2026-07-19 while investigating "constant 401 errors" between crm-web and crm-api.

**Root cause**: `apps/crm-web/.env` commits a literal, pre-minted `CRM_API_TOKEN` JWT
(local HS256, `sub: admin`). crm-api's `ACCESS_TOKEN_EXPIRE_MINUTES=30` (`apps/crm-api/app/core/config.py:16`)
means that token is only valid for 30 minutes after whoever minted it ran the
`curl .../auth/token` command in the `.env` comment. It is not auto-refreshed —
it's a static string in a checked-in dev env file. Once expired, every
`apiFetch`/`apiSend` call in `apps/crm-web/src/lib/http.ts` sends an expired
bearer, `decode_access_token` (`apps/crm-api/app/core/security.py:46`) raises
`jwt.ExpiredSignatureError` (subclass of `InvalidTokenError`), returns `None`,
and `get_current_user` (`apps/crm-api/app/api/deps.py:21`) raises 401
"Could not validate credentials" for literally every protected route.

**How to confirm**: decode the token's `exp` claim and compare to now; if in
the past, that's the 401 cause. Fix in dev is just re-minting via the curl
command in the `.env` comment. This is NOT an OIDC/Authentik problem — OIDC
(`AUTH_MODE=oidc` + `AUTH_AUTHENTIK_ISSUER`) is fully scaffolded but unset by
default (`authEnabled` false), so local dev never touches that path at all.
See [[crm-architecture-decisions]] for the two-auth-mode design (this memory
is about a specific stale-token footgun in that design, not the design itself).

**Design implication for planning a "real" auth system**: a real system should
either (a) not rely on a long-lived static token surviving in a committed env
file, or (b) make CRM_API_TOKEN a long-lived/no-expiry dev-only token in local
mode specifically, or (c) turn on AUTH_MODE=oidc end-to-end so tokens come from
a live user session instead of a copy-pasted curl output.
