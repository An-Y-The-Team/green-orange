# [Intermediate] Implement Costs & Acceptances (project sub-resources)

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #07
> **Good for:** 1 student — two small related resources.

## Background

The **project detail page** has tabs that log what happens on-site: **Chi phí
(Costs)** — materials, labour, equipment, and incidents/breakages — and **Nghiệm thu
(Acceptances)** — the client hand-over/inspection that gates final payment. Both are
**sub-resources of a project**: each row carries the parent's `project_code`.

The UI already calls `GET /costs`, `POST /costs`, `GET /acceptances`,
`POST /acceptances` (see
[`projects/queries.ts`](../../apps/crm-web/src/app/(dashboard)/projects/queries.ts),
[`add-cost.ts`](../../apps/crm-web/src/app/(dashboard)/projects/actions/add-cost.ts),
[`add-acceptance.ts`](../../apps/crm-web/src/app/(dashboard)/projects/actions/add-acceptance.ts)).
Types: `Cost` and `Acceptance` in
[`src/types/index.ts`](../../apps/crm-web/src/types/index.ts).

The teaching twist: these list endpoints are queried **across all projects** and the
UI joins them by `project_code`. Implement basic list + create (read/update/delete
optional but encouraged), and add a **filter query param** `project_code`.

## Fields

### Cost — match the `Cost` type

| Field | Type | Notes |
| --- | --- | --- |
| `id` | int | server-assigned |
| `project_code` | str | parent project's `code` — index it |
| `date` | date | |
| `category` | str | `"vat_tu" \| "nhan_cong" \| "thiet_bi" \| "su_co" \| "khac"` |
| `description` | str | |
| `amount` | int | VND |
| `is_incident` | bool | true for `su_co` breakages |

### Acceptance — match the `Acceptance` type

| Field | Type | Notes |
| --- | --- | --- |
| `id` | int | server-assigned |
| `project_code` | str | parent project's `code` — index it |
| `date` | date | |
| `status` | str | `"cho_nghiem_thu" \| "da_nghiem_thu" \| "co_van_de"` |
| `inspector` | str | |
| `client_rep` | str | client representative |
| `notes` | str | |

## Task

For **each** of `cost` and `acceptance`:

1. Model + schemas in `app/models/cost.py` / `app/models/acceptance.py`; index
   `project_code`.
2. Register both in [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py).
3. Route files `app/api/routes/costs.py` (prefix `/costs`) and
   `acceptances.py` (prefix `/acceptances`); at minimum `list` + `create`,
   protected by `CurrentUser`. Add an optional `project_code: str | None` query
   param to the list endpoint that filters when provided
   (`select(Cost).where(Cost.project_code == project_code)`).
4. Register both routers in [`app/main.py`](../../apps/crm-api/app/main.py).
5. Migrations: `uv run alembic revision --autogenerate -m "costs_acceptances"` →
   `upgrade head`.
6. Tests: `tests/test_costs.py`, `tests/test_acceptances.py`.

## Acceptance criteria

- [ ] `GET/POST /costs` and `GET/POST /acceptances` work in `/docs`.
- [ ] `GET /costs?project_code=CT-001` returns only that project's costs.
- [ ] Field shapes match the `Cost` / `Acceptance` types 1:1.
- [ ] Both routers registered in `main.py`; migrations + tests committed and passing.
- [ ] On a project detail page in crm-web (live mode), the **Chi phí** and **Nghiệm
      thu** tabs show live rows for that project.

## Hints & references

- These are flat CRUD tables plus one filter param — the `project_code` link is
  just a string column (no FK required for the teaching version, though a FK is a
  good stretch goal).
- The acceptance status `da_nghiem_thu` becomes meaningful in
  [#11 — Payment Milestones](11-payment-milestones.md) (it gates collection).

## Definition of done

The project detail tabs render live costs and acceptances.
Next: [09 — Quotes / Báo giá](09-quotes-crud.md).
</content>
