# crm-api — Student task backlog

A guided backlog for learning backend development on **`apps/crm-api`** (FastAPI +
SQLModel + Postgres). Each file below is written like a **GitHub issue** — copy one
into a new issue (title + body) and assign it to a student, or just work through
them in order.

The golden rule of this repo: **`clients` is the fully-worked reference.**
Almost every task is "do for resource X what `clients` already does." If you're
stuck, open [`app/api/routes/clients.py`](../../apps/crm-api/app/api/routes/clients.py)
and [`app/models/client.py`](../../apps/crm-api/app/models/client.py) side by side.

> **⚠️ This backlog builds the v1 contract, and the UI has moved to v2.** A
> complete **NestJS** backend (`apps/crm-api-nest`, port 8001) is the only one that
> serves the current `apps/crm-web`. Pointing `CRM_API_URL` at this Python backend
> (port 8000) does **not** produce a working app — the endpoint set and the field
> shapes both diverged at the v2 cutover. Read
> [00 — Choose your backend](00-choose-your-backend.md) first; it lists exactly
> what diverged and how to verify your work without the UI.

## How the UI and the API fit together (and where that stopped)

The Next.js UI (`apps/crm-web`) has a **seam**: `CRM_API_URL` decides which backend
every page fetches from — one env var, no UI code changes. It is **required**; there
is no offline/bundled-data mode, so crm-web needs a running backend with a seeded
database to render anything (root [`README.md`](../../README.md) has the setup). That
seam still exists, but crm-web now speaks the **v2** contract, so feeding it from this
v1 backend yields empty pages rather than live data (a failing list read degrades to
`[]`).

Your contract of record for this track is therefore the **backend's own** schemas —
the `*Public` models in [`apps/crm-api/app/models/`](../../apps/crm-api/app/models/)
— not crm-web's per-feature `types.ts` files, which describe v2.

The v1 resource map you are building against:

| Resource              | Endpoint                     | Backend status                          |
| --------------------- | ---------------------------- | --------------------------------------- |
| Clients               | `/clients`                   | ✅ done — the reference                 |
| Contacts              | `/contacts`                  | ✅ done (task 05's worked example)      |
| Projects              | `/projects`                  | ✅ done                                 |
| Leads / Deals / Tasks | `/leads`, `/deals`, `/tasks` | 🟡 `501` skeletons — flat-CRUD practice |
| Costs & Acceptances   | `/costs`, `/acceptances`     | 🔴 no backend yet (v1-only concept)     |
| Quotes                | `/quotes`                    | 🔴 no backend yet                       |
| Contracts             | `/contracts`                 | 🔴 no backend yet                       |
| Contract templates    | `/contract-templates`        | 🔴 no backend yet                       |
| Payment milestones    | `/payment-milestones`        | 🔴 no backend yet                       |
| Crew & Assignments    | `/crew`, `/assignments`      | 🔴 no backend yet                       |

> Verify every one of these through Swagger (<http://localhost:8000/docs>) and
> `uv run pytest`. The UI is not a usable signal for this backend anymore.

## The learning arc

### Tier 1 — Basics: get the app running (do these first, in order)

1. [01 — Set up your environment & run the API](01-environment-setup.md)
2. [02 — Log in & call a protected endpoint](02-auth-and-protected-endpoints.md)
3. [03 — Connect the UI to the API](03-connect-ui-to-api.md)
4. [04 — Study the reference & run the test suite](04-study-reference-and-tests.md)

### Tier 2 — Intermediate: implement the missing features

**2a. Learn the CRUD pattern on a flat resource**

5. [05 — Implement Contacts CRUD (guided)](05-contacts-crud.md)

**2b. Build out the v1 GreenOrange domain**

6. [07 — Implement Projects / Công trình](07-projects-crud.md)
7. [08 — Implement Costs & Acceptances (project sub-resources)](08-costs-and-acceptances.md)
8. [09 — Implement Quotes / Báo giá (with line items)](09-quotes-crud.md)
9. [10 — Implement Contracts / Hợp đồng](10-contracts-crud.md)
10. [11 — Implement Payment Milestones / Thu-Nợ (with a business rule)](11-payment-milestones.md)
11. [12 — Implement Contract Templates / Mẫu hợp đồng](12-contract-templates.md)
12. [13 — Implement Crew & Assignments / Nhân sự (roster + join table)](13-crew-and-assignments.md)
13. [14 — Link a client to a project](14-link-client-to-project.md)

## Suggested split for 3 students

- **Everyone:** Tier 1 (01–04) + task 05 (Contacts) together — same starting line.
- Then split Tier 2: e.g. Student A → Projects + Costs/Acceptances; Student B →
  Quotes + Contract templates; Student C → Contracts + Payment milestones; rotate
  Crew/Assignments and the `/leads` `/deals` `/tasks` 501 skeletons.

Every task ends with the same "Definition of done": **the endpoint works in
`/docs` and a test covers it.** Where a task's own text still says "the UI shows
live data", read that as the two checks above — the v2 UI is not driven by this
backend (see [00 — Choose your backend](00-choose-your-backend.md)).

## Conventions used in these issues

- `area:backend`, `good first issue`, `difficulty:*` are suggested GitHub labels.
- "Depends on: #NN" means finish that task first.
- Commands assume you're in `apps/crm-api/` and using **uv** (`uv run …`).
