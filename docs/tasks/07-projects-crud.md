# [Intermediate] Implement Projects / Công trình

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #05
> **Good for:** 1 student — the first **visible** business resource.

## Background

**Công trình (Project)** is the spine of the GreenOrange business: a job runs
through a lifecycle (inquiry → khảo sát → báo giá → hợp đồng → thi công → nghiệm thu
→ quyết toán → thanh toán → đóng). The UI for it is already built — list page, detail
page with a stage pipeline and tabs — but its backend **does not exist yet**, so the
**Công trình** sidebar page is empty in live mode.

Unlike the flat resources, there is **no skeleton file** here: you create the model,
the route file, _and_ register the router in `main.py`. The crm-web side already
calls `GET /projects`, `GET /projects/{id}`, and `POST /projects`
(see [`projects/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/projects/queries.ts>)
and [`projects/actions/add-project.ts`](<../../apps/crm-web/src/app/(dashboard)/projects/actions/add-project.ts>)).

The matching type is `Project` in
[`apps/crm-web/src/types/index.ts`](../../apps/crm-web/src/types/index.ts).

## Fields (match the `Project` TS type exactly)

| Field              | Type        | Notes                                                                                                                                                   |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | int         | server-assigned                                                                                                                                         |
| `code`             | str         | business key, e.g. `CT-001` — index it (other records reference it)                                                                                     |
| `name`             | str         |                                                                                                                                                         |
| `customer`         | str         | customer name                                                                                                                                           |
| `type`             | str         | `"ve_sinh" \| "thi_cong"`                                                                                                                               |
| `address`          | str         | site address                                                                                                                                            |
| `stage`            | str         | one of the 10 lifecycle stages (`yeu_cau`, `khao_sat`, `bao_gia`, `hop_dong`, `chuan_bi`, `thi_cong`, `nghiem_thu`, `quyet_toan`, `thanh_toan`, `dong`) |
| `schedule_outcome` | str \| None | optional: `"on_time" \| "delayed" \| "early"`                                                                                                           |
| `start_date`       | date        |                                                                                                                                                         |
| `end_date`         | date        |                                                                                                                                                         |
| `manager`          | str         |                                                                                                                                                         |
| `contract_value`   | int         | revenue (VND)                                                                                                                                           |
| `estimated_cost`   | int         | budgeted internal cost (VND)                                                                                                                            |
| `progress`         | int         | 0..100                                                                                                                                                  |

## Task

1. **Model** — `app/models/project.py`: `ProjectBase` / `Project(table=True)` /
   `ProjectCreate` / `ProjectPublic` / `ProjectUpdate`. Make `schedule_outcome`
   `str | None = None`. Index `code`.
2. **Register** in [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py).
3. **Routes** — new `app/api/routes/projects.py` with the five CRUD handlers
   (prefix `/projects`, protected by `CurrentUser`). Copy `customers.py`.
4. **Wire it up** — add `projects` to the import and `app.include_router(...)` calls
   in [`app/main.py`](../../apps/crm-api/app/main.py). _(This step is new — the flat
   resources were already wired.)_
5. **Migration:** `uv run alembic revision --autogenerate -m "projects"` →
   `uv run alembic upgrade head`.
6. **Test** — `tests/test_projects.py`, mirroring `test_customers.py`.

## Acceptance criteria

- [ ] `GET/POST/PATCH/DELETE /projects` and `GET /projects/{id}` all work in `/docs`.
- [ ] Router is registered in `main.py` (the routes appear in `/docs`).
- [ ] `ProjectPublic` matches the `Project` type 1:1 (including optional
      `schedule_outcome` and `progress` as `0..100`).
- [ ] Migration + `tests/test_projects.py` committed and passing.
- [ ] **The Công trình page lights up:** with `CRM_API_URL` set, `/projects` in
      crm-web shows your DB rows and the detail page `/projects/{id}` loads.

## Hints & references

- Reference shape: [`customers.py`](../../apps/crm-api/app/api/routes/customers.py).
- `code` is a human business key (not the PK). Several later resources reference a
  project by `code` (see tasks 08–11) — index it now.
- Optional column: `schedule_outcome: str | None = Field(default=None)`.

## Definition of done

The Công trình list + detail pages render live data from your new `/projects` API.
Next: [08 — Costs & Acceptances](08-costs-and-acceptances.md).
</content>
