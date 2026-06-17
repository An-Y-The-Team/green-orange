# [Intermediate] Implement Leads, Deals & Tasks CRUD

> **Labels:** `area:backend` · `crud` · `difficulty:medium`
> **Depends on:** #05
> **Good for:** 3 sub-tasks — split one resource per student.

## Background

Three more flat `501` skeletons (`leads`, `deals`, `tasks`) follow the **exact same
pattern** you just did for contacts (#05). They're grouped into one ticket so a team
of three can take one each. There are no new concepts — this is deliberate
repetition to lock in the workflow.

For each resource the workflow is identical:
**model → register in `__init__.py` → replace the `501` routes → migration → test.**
Match the corresponding TypeScript type in
[`apps/crm-web/src/types/index.ts`](../../apps/crm-web/src/types/index.ts).

## Fields

### Leads — match the `Lead` type

| Field     | Type | Notes                                                             |
| --------- | ---- | ----------------------------------------------------------------- |
| `id`      | int  | server-assigned                                                   |
| `name`    | str  | index it                                                          |
| `company` | str  |                                                                   |
| `source`  | str  | e.g. "website", "referral"                                        |
| `status`  | str  | `"new" \| "contacted" \| "qualified" \| "lost"` (default `"new"`) |
| `value`   | int  | estimated value                                                   |
| `owner`   | str  |                                                                   |

### Deals — match the `Deal` type

| Field        | Type | Notes                                                          |
| ------------ | ---- | -------------------------------------------------------------- |
| `id`         | int  | server-assigned                                                |
| `title`      | str  | index it                                                       |
| `company`    | str  |                                                                |
| `stage`      | str  | `"prospect" \| "proposal" \| "negotiation" \| "won" \| "lost"` |
| `amount`     | int  |                                                                |
| `close_date` | date | use `datetime.date`, serializes as `YYYY-MM-DD`                |

### Tasks — match the `Task` type

| Field      | Type | Notes                                                  |
| ---------- | ---- | ------------------------------------------------------ |
| `id`       | int  | server-assigned                                        |
| `title`    | str  | index it                                               |
| `due_date` | date |                                                        |
| `status`   | str  | `"todo" \| "in_progress" \| "done"` (default `"todo"`) |
| `priority` | str  | `"low" \| "medium" \| "high"`                          |
| `assignee` | str  |                                                        |

> The route prefixes (`/leads`, `/deals`, `/tasks`) and the `main.py` includes
> already exist — you only replace the stub body.

## Task (per resource)

1. Define the model + `Create`/`Public`/`Update` schemas in `app/models/<name>.py`.
2. Register it in [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py).
3. Replace the `501` stub in `app/api/routes/<name>.py` with the five CRUD handlers
   (protected by `CurrentUser`).
4. `uv run alembic revision --autogenerate -m "<name>"` → `uv run alembic upgrade head`.
5. Add `tests/test_<name>.py`.

## Acceptance criteria (tick per resource)

- [ ] **Leads:** five `/leads` endpoints work; fields match the `Lead` type; migration + test committed.
- [ ] **Deals:** five `/deals` endpoints work; `close_date` returns as `YYYY-MM-DD`; migration + test committed.
- [ ] **Tasks:** five `/tasks` endpoints work; fields match the `Task` type; migration + test committed.
- [ ] `uv run pytest -q` passes for all three.

## Hints & references

- This is the same shape as [#05 — Contacts](05-contacts-crud.md); reuse it.
- Reference: [`customer.py`](../../apps/crm-api/app/models/customer.py) +
  [`customers.py`](../../apps/crm-api/app/api/routes/customers.py).
- For the `date` fields, see how `customer.py` types `created_at` with
  `datetime.date`.

## Definition of done

All three flat resources are working, tested CRUD endpoints. You've now done the
pattern four times — the GreenOrange tasks reuse it with new modeling twists.
Next: [07 — Projects / Công trình](07-projects-crud.md).
</content>
