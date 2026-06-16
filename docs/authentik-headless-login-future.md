# Future option: fully-inline Authentik login via the Headless Flow Executor

Status: **Deferred design note — not currently planned.** The CRM intentionally
keeps the **standard OAuth2 Authorization Code + PKCE redirect** flow (see
[authentik-oidc-milestone.md](./authentik-oidc-milestone.md)) because it is the
canonical, transferable pattern and is the right thing to teach the students who
own `crm-api`.

This document is kept for the day a **real client** requires a fully-branded,
**inline** login where the user never navigates away from the page they're on
(e.g. a customer-facing portal where bouncing to `auth.<domain>` is unacceptable).
It captures *how* to build that with Authentik's Flow Executor API so the design
work doesn't have to be re-derived.

## When to reach for this (and when NOT to)

Use this **only** when fully-inline login is a hard product requirement. It carries
real costs:

- The user's **password transits crm-web's server** (you lose the SSO property that
  the relying party never sees credentials).
- The headless executor supports only **Identification, Password, and
  Authenticator-Validation** stages — no consent UI, captcha, email verification,
  MFA *enrollment*, social login, or passkeys through this path.
- It is **Authentik-proprietary** and brittle against Authentik version bumps
  (hand-rolled cookie/CSRF/redirect handling).

Cheaper alternatives that also achieve "never leaves the page" while keeping the
standard flow intact:

- **Silent iframe + popup** — `prompt=none` hidden-iframe re-auth for users already
  signed in at Authentik; a popup for first login. Keeps the hosted UI, passkeys,
  MFA, and keeps passwords off crm-web.
- **Redirect + return-to** — keep the redirect, just preserve and restore the URL
  the user was on. Zero risk, most faithful to how SSO actually works.

Prefer those unless the inline requirement is non-negotiable.

## Why server-side (not browser → Authentik)

The flow executor stores state in an Authentik **session cookie**, and the executor
lives on a different origin (`auth.` vs the app domain). A browser fetch would need
cross-site cookies + CORS on Authentik. Driving it **server-side inside a NextAuth
Credentials provider** sidesteps both: crm-web's Node runtime holds a per-login
cookie jar, and the result slots into NextAuth's existing JWT/refresh path with no
token-plumbing changes. `crm-api` needs **no changes** — same RS256 token, same
`verify_oidc_token`, same provision-on-first-login.

## Implementation

### 1. Headless flow helper — new file `apps/crm-web/src/lib/authentik-flow.ts`

A single `headlessLogin(username, password)` that runs server-to-server against
Authentik and returns `{ accessToken, refreshToken, expiresAt }` or a typed failure
(`"invalid_credentials"` | `"unsupported_stage"` | `"error"`). Uses `fetch` with
`redirect: "manual"` and a hand-rolled cookie jar (parse `set-cookie`, replay as
`Cookie`). Sequence:

1. **PKCE** — generate `code_verifier` + S256 `code_challenge` via Web Crypto (edge-safe).
2. `GET {issuerOrigin}/application/o/authorize/?response_type=code&client_id=…&redirect_uri=…&scope=openid email profile offline_access&state=…&code_challenge=…&code_challenge_method=S256`
   with `redirect: "manual"`. Capture the `authentik_*` session/CSRF cookies and the
   **flow slug** from the `Location` (`/if/flow/<slug>/…`) — don't hardcode it.
3. `GET {origin}/api/v3/flows/executor/<slug>/?query=…` (send cookies) → expect `ak-stage-identification`.
4. `POST …/executor/<slug>/` `{ "component": "ak-stage-identification", "uid_field": username }`.
5. `POST …/executor/<slug>/` `{ "component": "ak-stage-password", "password": password }`.
   - Wrong password → `ak-stage-password` again with `response_errors` → return `invalid_credentials`.
   - Any stage other than identification/password/redirect (e.g.
     `ak-stage-authenticator-validation`, captcha, consent) → return
     `unsupported_stage` (UI falls back to hosted login).
6. The terminating challenge is a redirect (`xak-flow-redirect` / `type: "redirect"`)
   back to the authorize finalize URL. `GET` it (cookies, manual redirect) → 302 to
   `redirect_uri?code=…`. Capture `code` from `Location`; **do not** follow into crm-web.
7. `POST {origin}/application/o/token/` (`grant_type=authorization_code`, `code`,
   `code_verifier`, `redirect_uri`, `client_id`, `client_secret`) →
   `{ access_token, refresh_token, expires_in }`.

**Gotcha to verify against the running instance:** Authentik may require a CSRF
token on session-authenticated POSTs — capture the `authentik_csrf` cookie and echo
it as the `X-authentik-CSRF` header on the executor POSTs. Confirm empirically during
step 4/5 and add the header only if 403s appear.

`redirect_uri` reuses the **already-registered** `…/api/auth/callback/authentik` (no
browser ever lands there in this path; it only has to match a registered URI for the
code exchange).

### 2. Credentials provider — edit `apps/crm-web/src/auth.config.ts`

Add a `Credentials` provider to the existing `providers` array (kept gated by
`authEnabled`, alongside the `Authentik` provider which remains for the fallback). Its
`authorize({ username, password })` calls `headlessLogin`; on success returns
`{ id, name, email, accessToken, refreshToken, expiresAt }`, else `null`. The helper
is fetch/Web-Crypto only → safe to keep in this edge-shared config.

Extend the **`jwt` callback** to also seed tokens from the credentials path (initial
sign-in passes `user`, not `account`):

```ts
if (user?.accessToken) {
  return { ...token, accessToken: user.accessToken,
           expiresAt: user.expiresAt, refreshToken: user.refreshToken };
}
```

The existing expiry/refresh block is provider-agnostic and keeps working for both paths.

### 3. Types — edit `apps/crm-web/src/types/next-auth.d.ts`

Augment `next-auth`'s `User` with optional `accessToken?`, `refreshToken?`,
`expiresAt?` so the `authorize` return value and the `jwt({ user })` access typecheck.

### 4. Inline login overlay — new client component `apps/crm-web/src/components/login-overlay.tsx`

A non-dismissible dialog (reuse `@yan/ui` Dialog/Card/Button/Input + the
`react-hook-form` + zod pattern already used in the app) with username + password
fields. On submit: `signIn("credentials", { username, password, redirect: false })`
(from `next-auth/react`); on success `router.refresh()` so the now-authenticated
layout re-renders the page in place; on `unsupported_stage` / repeated failure show an
**"Other ways to sign in"** link to `/login` (the hosted fallback).

### 5. Gate in the layout, not the middleware — so the URL is preserved

- **`apps/crm-web/src/app/(dashboard)/layout.tsx`:** when `authEnabled && !session`,
  render the page chrome with `<LoginOverlay />` and **withhold `children`**
  (children's crm-api fetches need a token; not rendering them avoids 401s). The
  requested URL stays put; after login `router.refresh()` reveals the page.
- **`apps/crm-web/src/middleware.ts`:** stop redirecting dashboard routes to `/login`
  (that would defeat the overlay). Make the matched middleware pass-through; gating
  lives in the layout (still server-enforced) and crm-api remains the hard boundary
  (it rejects tokenless requests). Keep `/login` reachable for the fallback flow.

### 6. Fallback `/login` — unchanged

`apps/crm-web/src/app/login/page.tsx` keeps its hosted-UI `signIn("authentik")`
button. It's the target of the overlay's "Other ways to sign in" link and the
post-`signOut` landing page — so passkeys, social login, MFA enrollment, captcha, and
password reset still work for any stage the headless path can't handle.

## Files touched (summary)

| File | Change |
| --- | --- |
| `apps/crm-web/src/lib/authentik-flow.ts` | new — `headlessLogin()` flow-executor + token-exchange driver |
| `apps/crm-web/src/components/login-overlay.tsx` | new — inline credentials dialog |
| `apps/crm-web/src/auth.config.ts` | add Credentials provider; extend `jwt` callback |
| `apps/crm-web/src/types/next-auth.d.ts` | augment `User` with token fields |
| `apps/crm-web/src/app/(dashboard)/layout.tsx` | render overlay + withhold children when unauthenticated |
| `apps/crm-web/src/middleware.ts` | pass-through (drop redirect-to-/login for dashboard routes) |

## Verification (end-to-end, local)

1. Start the local Authentik sandbox and register the dev app:
   `docker compose -f docker-compose.local.yml --profile authentik up --build`, then
   `python3 scripts/setup-authentik-crm.py` → paste the printed `AUTH_AUTHENTIK_*`
   into `apps/crm-web/.env.local` and `AUTH_MODE=oidc` / `OIDC_*` into
   `apps/crm-api/.env`.
2. `turbo run dev`. Open a **deep link** while logged out → the login overlay appears
   **on that URL**; the address bar does not change.
3. Valid creds → overlay closes, the same page renders with live data; Network shows
   the crm-api call carrying `Authorization: Bearer …`.
4. Wrong password → inline error, no navigation.
5. Enable MFA on a test user → overlay detects `unsupported_stage` and surfaces the
   "Other ways to sign in" → `/login` hosted fallback, which completes MFA.
6. `turbo run lint` and `turbo run build` clean; confirm token refresh still works.

## Reference

- Authentik Flow Executor API: `GET`/`POST /api/v3/flows/executor/:slug/`
  (flow state lives in the HTTP session cookie; obtain it before the first executor call).
- Standard flow this would supplement: [authentik-oidc-milestone.md](./authentik-oidc-milestone.md).
