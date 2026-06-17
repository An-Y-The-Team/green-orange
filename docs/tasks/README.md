# crm-api — Student task backlog

A guided backlog for learning backend development on **`apps/crm-api`** (FastAPI +
SQLModel + Postgres). Each file below is written like a **GitHub issue** — copy one
into a new issue (title + body) and assign it to a student, or just work through
them in order.

The golden rule of this repo: **`customers` is the fully-worked reference.**
Almost every task is "do for resource X what `customers` already does." If you're
stuck, open [`app/api/routes/customers.py`](../../apps/crm-api/app/api/routes/customers.py)
and [`app/models/customer.py`](../../apps/crm-api/app/models/customer.py) side by side.

## How the UI and the API fit together

The Next.js UI (`apps/crm-web`) has a **seam**: with `CRM_API_URL` unset it renders
built-in mock data; set it and every page fetches the real backend instead — **no
UI code changes**. So you build the API, and the matching page "lights up" with
live data. The contract is the field names: the API's `*Public` response must match
the TypeScript types in
[`apps/crm-web/src/types/index.ts`](../../apps/crm-web/src/types/index.ts) exactly
(snake_case, same enum values).

Two families of resources are still missing a backend:

| UI page (nav)                                       | Endpoint the UI calls                 | Backend status                          |
| --------------------------------------------------- | ------------------------------------- | --------------------------------------- |
| Khách hàng (`/customers`)                           | `/customers`                          | ✅ done — the reference                 |
| _(unlinked)_ `/contacts` `/leads` `/deals` `/tasks` | `/contacts` …                         | 🟡 `501` skeletons — flat-CRUD practice |
| Công trình (`/projects`)                            | `/projects`, `/costs`, `/acceptances` | 🔴 no backend yet                       |
| Báo giá (`/quotes`)                                 | `/quotes`                             | 🔴 no backend yet                       |
| Hợp đồng (`/contracts`)                             | `/contracts`                          | 🔴 no backend yet                       |
| Thu / Nợ (`/receivables`)                           | `/payment-milestones`                 | 🔴 no backend yet                       |

> The flat resources (contacts/leads/deals/tasks) have pages on disk but they are
> **not in the sidebar** — verify them via `/docs` and tests, or by visiting
> `/contacts` directly. The GreenOrange resources (projects/quotes/contracts/
> receivables) **are** in the sidebar, so finishing their backend makes the visible
> app come alive.

## The learning arc

### Tier 1 — Basics: get the app running (do these first, in order)

1. [01 — Set up your environment & run the API](01-environment-setup.md)
2. [02 — Log in & call a protected endpoint](02-auth-and-protected-endpoints.md)
3. [03 — Connect the UI to the API](03-connect-ui-to-api.md)
4. [04 — Study the reference & run the test suite](04-study-reference-and-tests.md)

### Tier 2 — Intermediate: implement the missing features

**2a. Learn the CRUD pattern on a flat resource** 5. [05 — Implement Contacts CRUD (guided)](05-contacts-crud.md) 6. [06 — Implement Leads, Deals & Tasks (more reps)](06-leads-deals-tasks-crud.md)

**2b. Bring the visible business UI to life (GreenOrange domain)** 7. [07 — Implement Projects / Công trình](07-projects-crud.md) 8. [08 — Implement Costs & Acceptances (project sub-resources)](08-costs-and-acceptances.md) 9. [09 — Implement Quotes / Báo giá (with line items)](09-quotes-crud.md) 10. [10 — Implement Contracts / Hợp đồng](10-contracts-crud.md) 11. [11 — Implement Payment Milestones / Thu-Nợ (with a business rule)](11-payment-milestones.md)

## Suggested split for 3 students

- **Everyone:** Tier 1 (01–04) + task 05 (Contacts) together — same starting line.
- Then split Tier 2: e.g. Student A → Leads + Projects; Student B → Deals + Quotes;
  Student C → Tasks + Contracts; rotate Costs/Acceptances + Payment Milestones.

Every task ends with the same "Definition of done": **the endpoint works in
`/docs`, a test covers it, and (where the page is linked) the UI shows live data.**

## Conventions used in these issues

- `area:backend`, `good first issue`, `difficulty:*` are suggested GitHub labels.
- "Depends on: #NN" means finish that task first.
- Commands assume you're in `apps/crm-api/` and using **uv** (`uv run …`).
  </content>
  </invoke>
