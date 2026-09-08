# User management inside crm-web via the Authentik API

Status: **Built 2026-09-08** (Steps 1–3; prod rollout is DEPLOY.md §6e). This note
was the agreed design (2026-07-22) and is kept as the rationale; the section
"What was built" records where it differs from the plan below.

Decision context (2026-07-22): the cheaper alternatives were considered and
declined — a sidebar link to Authentik's own admin UI (`/if/admin/`), and
CRM-side RBAC via token claims. The requirement is managing users **without
leaving the CRM**.

## What was built (deltas from the design)

| Where                                                       | What                                                                                                                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/crm-web/src/utils/authentik-admin/authentik-admin.ts` | `akFetch`, `usersEnabled`, the gate (`isUserAdmin` / `requireUserAdmin`), `userActionError`. Base URL = the **issuer's origin** (public URL), no separate `AUTHENTIK_ADMIN_URL`. |
| `apps/crm-web/src/app/(dashboard)/settings/users/`          | List, `new/`, `[id]/` (edit + lock/unlock + Đặt lại mật khẩu + Nhóm), one action per mutation, `group-changes.ts` (tested) for the group rules.                                  |
| `scripts/setup-authentik-crm.py --user-admin`               | Phase 0 as code: group `crm-admins`, service account, **`api`-intent token**, recovery flow `crm-recovery` on the brand. Manual fallback in its docstring.                       |
| Entry point                                                 | A gated card on **Danh mục** (`/settings`), not a sidebar item — the nav is a static client list, a server-checked card needs no plumbing.                                       |
| Onboarding                                                  | **Recovery link only.** No `set_password`, no admin-typed passwords. The link renders once, inline, never in a URL.                                                              |
| Guardrails                                                  | Deactivate never delete; no self-lock; superuser groups hidden **and** refused; no leaving `crm-admins` yourself; reset link refused for a locked account.                       |

Facts learned on authentik **2025.10** that the plan below got wrong:

- The token `POST /core/users/service_account/` returns is an **app password** and the
  API rejects it as a Bearer. A separate `POST /core/tokens/` with `intent: api` is
  needed (`view_key` reads it back, so it is re-printable).
- `POST /core/users/{id}/recovery/` returns `{ link }` only (no `token`, no
  `token_duration` param); default validity 1 day. It requires a Recovery flow on the
  brand or answers 400 "Recovery flow not applicable to user". The flow must **not** be
  `require_unauthenticated` — the API plans it under the service account's request.
- Permissions are granted **directly to the service-account user**
  (`/rbac/permissions/assigned_by_users/{id}/assign/`), no role needed:
  `view_user, add_user, change_user, reset_user_password, view_group,
add_user_to_group, remove_user_from_group`.
- A `"use server"` module may export only async functions — tsc does not catch it.

---

The rest of this note is the original design, unchanged.

## Architecture

`crm-web` server code talks **directly to the Authentik REST API** with a
service-account token. The CRM backends (`crm-api`, `crm-api-nest`) are not
involved — this is IdP administration, not CRM data.

```
Browser → crm-web server actions/queries → Authentik /api/v3/  (service-account token)
```

- The token is **server-only** (no `NEXT_PUBLIC_` prefix), same pattern as
  `CRM_API_URL`.
- All Authentik endpoint strings live in ONE file (`utils/authentik-admin/`) so
  Authentik version bumps have a single blast radius. Pinned tag at design
  time: `2025.10`.

## Security model (read this before building anything)

1. **This page is an IdP takeover surface.** A token that can create users can
   mint an admin and own everything downstream. The access gate ships in
   Phase 1, before any mutation exists.
2. **Least-privilege service account** — NOT the bootstrap `akadmin` token.
   Create a dedicated service account with only user/group management grants.
3. **Gate the page AND every server action.** Server actions are directly
   callable endpoints; hiding the sidebar link is not security. v1 gate: look
   up the session user via `GET /core/users/?username=<session user>` and
   require `is_superuser` OR membership in a designated admin group
   (`crm-admins`). One server-side API call per view, no Authentik config
   changes. If CRM-wide RBAC lands later, move the gate to a token claim —
   don't build claims plumbing just for this.
4. **Deactivate, never delete** (`is_active=false`) — reversible, keeps audit
   history. Authentik's event log attributes every API action to the service
   account.

## Phase 0 — Service account (operator step, ~5 min)

Authentik Admin UI → Directory → Users → **New user → Service Account**
(`crm-user-admin`), then grant user/group management permissions (assign the
relevant RBAC role or group — not superuser). Store the app password:

- Local: `AUTHENTIK_ADMIN_TOKEN` + `AUTHENTIK_ADMIN_URL=http://localhost:9000`
  in `apps/crm-web/.env`.
- Prod: token in the **Dockhand secret store**; URL derives from `AUTH_DOMAIN`
  in `docker-compose.prod.yml`. The operator creates the prod service account
  on the VPS instance (prod Authentik is VPN-only — see DEPLOY.md §6a).

Note: app passwords default to ~360-day expiry — set a calendar reminder or a
far expiry explicitly; a silently expired token bricks the page.

## Phase 1 — Read-only list + gate (security-critical)

New files, following the house feature pattern (feature-scoped types,
`queries.ts` for reads, actions per mutation):

| File                                           | Contents                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/authentik-admin/authentik-admin.ts` | ~40-line server-only fetch wrapper: `akFetch<T>(path, init?)` with token header; `usersEnabled = Boolean(process.env.AUTHENTIK_ADMIN_TOKEN)` |
| `app/(dashboard)/users/page.tsx`               | **`force-dynamic`** (runtime-only env — the known build-freeze trap, see the force-dynamic rule), renders the table                          |
| `app/(dashboard)/users/queries.ts`             | `listUsers()` → `GET /core/users/?page_size=…&search=…`                                                                                      |
| `app/(dashboard)/users/types.ts`               | `AkUser` type                                                                                                                                |

- Sidebar: "Người dùng" link in `AppSidebar`, rendered only when
  `usersEnabled` and the caller passes the gate.
- Columns: username, name, email, groups, active, last login. Search via query
  param.

## Phase 2 — Mutations

Server actions (same `useActionState` + zod + form-dialog pattern as
`client-form-dialog`), each re-checking the gate:

- **Create** — `POST /core/users/` then `POST /core/users/{id}/set_password/`
  (dialog: username, name, email, initial password).
- **Edit** — `PATCH /core/users/{id}/` (name, email).
- **Deactivate / reactivate** — `PATCH is_active`.
- **Reset password** — `POST /core/users/{id}/recovery/` → returns a recovery
  **link**; show in a copy-to-clipboard dialog (admin hands it to the user;
  crm-web never sends email).

## Phase 3 — Group membership

- `GET /core/groups/` list; per-user dialog with checkboxes.
- `POST /core/groups/{uuid}/add_user/` / `…/remove_user/`.

## Deliberately out of scope (link to Authentik admin instead)

MFA device management, active-session revocation, permission/role editing,
hard deletion, group CRUD. One "Nâng cao → Authentik" link covers them —
rare, sensitive operations that belong in the IdP's own UI.

## Size estimate

Phase 1 ≈ 4 files / ~200 lines. Phase 2 ≈ +3 actions + 2 dialogs.
Phase 3 ≈ +1 action + 1 dialog.

## Verification (local sandbox)

1. `docker compose -f docker-compose.local.yml --profile authentik up -d`,
   create the service account (Phase 0), put its token in
   `apps/crm-web/.env`.
2. As a gated-in admin: list renders real Authentik users; create a user; log
   in as that user via the login overlay; deactivate them → next login fails;
   recovery link opens Authentik's reset flow.
3. As a non-admin user: `/users` is denied and the sidebar link is absent;
   calling a mutation action directly is rejected.
4. `turbo run lint` / `turbo run build` clean; `/users` shows `ƒ (Dynamic)` in
   the build route table.

## Reference

- Authentik API docs: `https://docs.goauthentik.io/` (API generated from
  OpenAPI v3; browsable at `<authentik>/api/v3/` schema).
- Endpoints used: `/core/users/` (+ `set_password`, `recovery`),
  `/core/groups/` (+ `add_user`, `remove_user`), RBAC assignment for the
  service account.
- Service accounts: Authentik docs → System Management → Service Accounts.
- Related design notes: [authentik-oidc-milestone.md](./authentik-oidc-milestone.md),
  [authentik-headless-login-future.md](./authentik-headless-login-future.md).
