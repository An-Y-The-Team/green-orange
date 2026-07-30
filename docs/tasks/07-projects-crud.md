# [Intermediate] Implement Projects / Công trình

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #05
> **Good for:** 1 student — the first **visible** business resource.

## Background

**Công trình (Project)** is the spine of the GreenOrange business: a job runs
through a lifecycle (inquiry → khảo sát → báo giá → hợp đồng → thi công → nghiệm thu
→ quyết toán → thanh toán → đóng). This is the v1 shape of that lifecycle, and it is
what you build here.

Unlike the flat resources, there is **no skeleton file** here: you create the model,
the route file, _and_ register the router in `main.py`. `/projects` is one of the few
paths whose **name** survived the v2 cutover — crm-web still calls
`GET /projects`, `GET /projects/{id}`, `POST /projects`
(see [`projects/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/projects/queries.ts>)
and [`projects/actions/create-project.ts`](<../../apps/crm-web/src/app/(dashboard)/projects/actions/create-project.ts>)),
but the **field shapes differ** (v2 has 8 English stages and no `progress`), so do
not treat those files as your contract.

The field table below **is** the contract for this task. (It used to be checked
against a `Project` type in crm-web; that file is gone — see
[00 — Choose your backend](00-choose-your-backend.md).)

## Fields (match the table below exactly)

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
   (prefix `/projects`, protected by `CurrentUser`). Copy `clients.py`.
4. **Wire it up** — add `projects` to the import and `app.include_router(...)` calls
   in [`app/main.py`](../../apps/crm-api/app/main.py). _(This step is new — the flat
   resources were already wired.)_
5. **Migration:** `uv run alembic revision --autogenerate -m "projects"` →
   `uv run alembic upgrade head`.
6. **Test** — `tests/test_projects.py`, mirroring `test_clients.py`.

## Acceptance criteria

- [ ] `GET/POST/PATCH/DELETE /projects` and `GET /projects/{id}` all work in `/docs`.
- [ ] Router is registered in `main.py` (the routes appear in `/docs`).
- [ ] `ProjectPublic` matches the field table above 1:1 (including optional
      `schedule_outcome` and `progress` as `0..100`).
- [ ] Migration + `tests/test_projects.py` committed and passing.
- [ ] A `curl` round-trip creates a project and reads it back at `/projects/{id}`.

## Hints & references

- Reference shape: [`clients.py`](../../apps/crm-api/app/api/routes/clients.py).
- `code` is a human business key (not the PK). Several later resources reference a
  project by `code` (see tasks 08–11) — index it now.
- Optional column: `schedule_outcome: str | None = Field(default=None)`.

## Definition of done

`/projects` list, read, create, update and delete all work in `/docs` and are covered
by tests. Next: [08 — Costs & Acceptances](08-costs-and-acceptances.md).
</content>
