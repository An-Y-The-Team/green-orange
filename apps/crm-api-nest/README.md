# crm-api-nest — GreenOrange CRM backend

The production backend for the GreenOrange CRM (cleaning & construction
services). **NestJS + Prisma**, run with **Bun**, on **port 8001**, backed by its
own **`crm_nest`** database in the shared Postgres. `apps/crm-web` talks to it
via `CRM_API_URL=http://localhost:8001`.

Domain source of truth: `docs/features/crm-business-flow.md` (the Công Trình
lifecycle and cross-entity rules) and `docs/features/crm-database-schema.md`
(the v2 schema this app implements).

## Run it

```bash
docker compose up -d postgres        # creates crm_nest on first boot
cd apps/crm-api-nest
cp .env.example .env                 # DATABASE_URL → crm_nest, AUTH_MODE=local
# deps are installed at the repo root: bun install
bun run db:migrate:dev               # dev; prod uses `bun run migrate` (prisma migrate deploy)
bun run seed                         # demo user admin/admin + starter data
bun run dev                          # http://localhost:8001
```

Or from the repo root, `turbo run dev` starts everything (crm-web on 3002, this
on 8001). Smoke test:

```bash
curl -s http://localhost:8001/health
# {"status":"ok","auth_mode":"local"}
curl -s -X POST http://localhost:8001/auth/token -d "username=admin&password=admin"
```

`bun run test` covers the contract-critical pure logic (code formatting,
serialization, gates).

## Env

| Var                                         | Meaning                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                              | Postgres, database `crm_nest`                                                              |
| `PORT`                                      | default `8001`                                                                             |
| `AUTH_MODE`                                 | `local` (default) or `oidc`                                                                |
| `JWT_SECRET`, `ACCESS_TOKEN_EXPIRE_MINUTES` | local mode HS256 tokens                                                                    |
| `SEED_USER`, `SEED_PASSWORD`                | user created by `bun run seed` (keep matching crm-web's `CRM_DEV_USER`/`CRM_DEV_PASSWORD`) |
| `OIDC_ISSUER`, `OIDC_AUDIENCE`              | oidc mode: Authentik issuer (+ optional audience)                                          |
| `CORS_ORIGINS`                              | crm-web origin(s), comma-separated                                                         |

## Auth

- `AUTH_MODE=local`: `POST /auth/token` (OAuth2 password form) argon2-verifies
  the seeded user and mints an HS256 JWT.
- `AUTH_MODE=oidc`: validates Authentik-issued RS256 tokens against the issuer
  JWKS and provisions the user on first login.

Every route requires `Authorization: Bearer …` except `/health` and
`/auth/token`.

## Serialization contract

Applied globally by `src/common/serialize.interceptor.ts`:

- snake_case JSON — Prisma fields are snake_case, emitted verbatim.
- `BigInt` (integer VND — money exceeds int32) → JSON number.
- Prisma `Decimal` (quantity, hours) → JSON number.
- `*_date` columns (`@db.Date`) → `'YYYY-MM-DD'`.
- `*_at` columns (timestamps) → full ISO string (`appointment_at` keeps its time).

Business codes (`CT-…` projects, `HD-…` contracts) are server-assigned.

## Endpoints

### Clients (`src/clients/`)

- `GET|POST /clients`, `GET|PATCH|DELETE /clients/:id` — creating an
  `individual` client auto-creates its default contact + location; delete
  refused (409) while the client has projects.
- `GET|POST /contacts`, `GET|PATCH|DELETE /contacts/:id` — `?client_id=`
  filter; delete refused while referenced by locations or projects.
- `GET|POST /locations`, `GET|PATCH|DELETE /locations/:id` — manager contact
  must belong to the same client; delete refused while the location has projects.

### Projects (`src/projects/`)

- `GET|POST /project-types`, `GET|PATCH|DELETE /project-types/:id` — delete
  refused while in use.
- `GET /projects` (`?client_id&stage&status`), `POST /projects` — assigns
  `code` (CT-…); working contact defaults to the location manager, decision
  maker to the working contact; ≥1 type required.
- `GET|PATCH|DELETE /projects/:id` — PATCH enforces the **stage gates**
  (forward moves only; backward is free): `contract` needs latest quote =
  `deal`; `execution` needs `client_signed_date` + a paid deposit milestone +
  all paperwork approved; `settlement` needs `acceptance_sub_status =
'passed'`; `closed` needs no unpaid milestones/bills. Cancelling requires
  `cancel_reason`.
- `GET|POST /project-notes`, `DELETE /project-notes/:id`
- `GET|POST /attachments`, `DELETE /attachments/:id` — `kind`-tagged, may hang
  off a paperwork item.

### Quotes (`src/quotes/`)

- `GET /quotes` (`?project_id=`), `GET /quotes/:id`, `POST /quotes` — versioned
  per project; item amounts and total computed server-side.
- `PATCH /quotes/:id` — **draft only**; sent versions are immutable.
- `POST /quotes/:id/send` — logs channel/sender, flips draft → `waiting`.
- `POST /quotes/:id/decide` — waiting → `deal | on_hold | rejected`, stamps
  `decided_date`.
- `POST /quotes/:id/revise` — bargaining loop: copies the quote into a new
  draft version (frozen originals stay).
- `DELETE /quotes/:id` — draft only.

### Contracts (`src/contracts/`)

- `GET /contracts` (`?project_id=`), `GET|PATCH|DELETE /contracts/:id`,
  `POST /contracts` — assigns `code` (HD-…); signing without a date stamps
  today; delete draft-only.
- `GET|POST /contract-templates`, `GET|PATCH /contract-templates/:id` — Lexical
  body for the printable contract; `letterhead | national` header.

### Paperwork (`src/paperwork/`)

- `GET|POST /paperwork-items`, `GET|PATCH|DELETE /paperwork-items/:id` —
  status `preparing | submitted | approved`.
- `POST /paperwork-items/defaults` — seeds the default checklist items
  for a project, skipping ones it already has.

### Receivables (`src/receivables/`)

- `GET|POST /settlements`, `GET|PATCH|DELETE /settlements/:id` — creating a
  settlement also creates its draft bill; status steps `draft → sent → signed`;
  **signing officializes its bill**; delete draft-only (removes the bill too).
- `GET /bills` (`?project_id&status`), `GET|PATCH /bills/:id` — no POST/DELETE
  (bills live and die with their settlement); status forward-only
  `draft → official → sent → paid`; `total_amount` editable only while
  draft/official; sent/paid dates auto-stamped.
- `GET|POST /payment-milestones`, `GET|PATCH|DELETE /payment-milestones/:id` —
  `deposit | progress | acceptance`; status steps
  `not_due → awaiting_payment → paid` (overdue is derived, never stored);
  delete only while `not_due`.

### Crew (`src/crew/`)

- `GET|POST /crew-roles`, `GET|PATCH|DELETE /crew-roles/:id`
- `GET|POST /crew`, `GET|PATCH|DELETE /crew/:id` — members with employment
  type, default role, status.
- `GET|POST /assignments`, `PATCH|DELETE /assignments/:id` — responses include
  `overlaps` (double-booking is allowed; the UI warns, never blocks).
- `GET /timekeeping` (`?project_id&crew_member_id&status&from&to`),
  `POST /timekeeping` — upsert per (member, project, day, source); manual is
  source of truth and is born `approved`. `DELETE /timekeeping/:id`.
- `POST /timekeeping/:id/decide` — `{status: approved|rejected}`, the operator's
  duyệt/từ chối for Zalo submissions. Only `pending` rows are decidable (409
  otherwise), so it can never touch a manual row. `GET /timekeeping/summary`
  counts `approved` hours only.

### Worker (`src/worker/`) — Zalo mini app only

Class-level `@Worker()`: these routes accept **only** crew tokens, and every
other route rejects them. A worker sees exactly their own rows.

- `GET /worker/me`, `GET /worker/projects` — projects they're assigned to today,
  excluding closed ones.
- `GET /worker/shift` — `{shift: {...} | null}`, always an envelope: a bare
  `null` is an empty 200 body the app cannot parse. `stale` means the shift
  started on an earlier business day, i.e. they forgot to chấm công ra.
- `POST /worker/clock-in` — `{project_id}`, and no time: the **server** stamps
  `start_time` in `Asia/Ho_Chi_Minh`, so a wrong or tampered phone clock cannot
  change what is recorded. Writes `hours: 0`, `status: open`. Refuses a day they
  aren't assigned to (403), a locked project (409), a shift already running even
  on another công trình (409), and a second clock-in the same day (409, pointing
  at đơn bù công).
- `POST /worker/clock-out` — no body; the open shift is found by the token.
  Hours come from the two stamps' **full dates**, not the `"HH:mm"` pair — that
  is what distinguishes an 8-hour overnight from a shift abandoned for a day.
  Past 16h the hours clamp to 16 and `flag` becomes `over_cap`. `work_date` is
  never recomputed: a 01:00 clock-out belongs to the day it started, and moving
  it would move the row off its composite key. Flips the row to `pending`.
  Retrying after a lost response returns today's already-closed row, not a 404.
  Deliberately does **not** check the project's stage: a công trình closed
  mid-shift must not leave the worker unable to close the shift.
- `POST /worker/remedy` — đơn bù công: `{project_id, work_date, start_time,
end_time, reason, note?}` with `reason` required. **Refused (409) for a shift
  already clocked in AND out** while it is still `pending` — that one is the
  office's to correct, not the worker's — and a `start_time` the server stamped
  survives every remedy, so rejecting a shift does not make its stamps editable.
  The CLAIMED-times path, so
  hours come from the pair (`end_time` at-or-before `start_time` is overnight,
  +24h) and a span over 16h is a 400. Upserts as `pending` with `remedy_reason`
  set — the discriminator that tells the operator these times were typed, not
  stamped. Refuses an unassigned day (403) and a locked project (409); an
  already-`approved` row is locked (409), pending/rejected rows are overwritable
  so a rejected day can be resubmitted. Closing an `open` shift keeps the
  server's `start_time` — only the giờ ra is the worker's to claim.
  Errors are Vietnamese — the app shows them verbatim.
- `GET /worker/timekeeping` (`?from&to`, 31-day default window).

### Auth & health

- `POST /auth/token` (public) — local password grant.
- `POST /auth/zalo-token` (public) — Zalo mini-app login. Takes the zmp-sdk
  `{token, access_token}` pair, exchanges it at `graph.zalo.me/v2.0/me/info`
  (needs `ZALO_APP_SECRET`), matches the number against `CrewMember.phone`, and
  mints a 30-day **crew** token. Crew tokens are HS256 even under
  `AUTH_MODE=oidc`, so `JWT_SECRET` is required for this path.
- `GET /auth/me` — current user.
- `GET /health` (public) — `{status, auth_mode}`.

## Docker

`Dockerfile` builds an internal-only image whose CMD runs
`prisma migrate deploy` before starting the server, so the schema is applied on
every container start. Deploy notes: repo `DEPLOY.md` §6c.
