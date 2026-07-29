# [Intermediate] Implement Crew & Assignments / Nhân sự (roster + phân công)

> **Labels:** `area:backend` · `crud` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #07
> **Good for:** 1 student — two related resources (a flat roster + a join table).

## Background

**Nhân sự (Crew)** is the small team — roughly 8–20 people — that actually staffs
the công trình: thợ chính, thợ phụ, nhân viên vệ sinh, giám sát, lái xe. The
**`/crew`** page is a flat roster (list → detail → add/edit), and each crew member
can be **phân công (assigned)** onto one or more projects. The project detail page
gains an **"Đội thi công"** tab that lists who's on the job, and each crew member's
detail page shows which công trình they're on.

So there are **two resources**:

- **Crew** — the roster itself (a flat CRUD table, closest to `clients`: it has a
  `created_at` and a status enum).
- **Assignment (Phân công)** — a **join row** linking a crew member to a project by
  `project_code`, exactly like Costs/Acceptances join to a project (#08). It carries
  `crew_id` + `project_code` (+ optional on-site role and start date).

The **entire UI is already built** (`apps/crm-web`) — it just has no v1 backend to
read from:

- Roster + add/edit dialog + detail:
  [`crew/`](<../../apps/crm-web/src/app/(dashboard)/crew>) — the sidebar entry
  **Nhân sự** (`/crew`) is live, so finishing this backend makes a visible page come
  alive.
- Data calls live in
  [`crew/queries.ts`](<../../apps/crm-web/src/app/(dashboard)/crew/queries.ts>)
  (`listCrew` → `/crew`, `getCrewMember` → `/crew/{id}`, `listAssignments` →
  `/assignments`) and the server actions
  [`crew/actions/members.ts`](<../../apps/crm-web/src/app/(dashboard)/crew/actions/members.ts>)
  (`createCrewMember` / `updateCrewMember` / `deleteCrewMember` →
  `POST` / `PATCH` / `DELETE /crew`) and
  [`crew/actions/assignments.ts`](<../../apps/crm-web/src/app/(dashboard)/crew/actions/assignments.ts>)
  (`createAssignment` → `POST /assignments`).
- The assignment UI is the **"Đội thi công"** tab on the project detail page
  ([`assignments-tab.tsx`](<../../apps/crm-web/src/app/(dashboard)/projects/[id]/components/assignments-tab/assignments-tab.tsx>)).

This backend doesn't exist yet, so pointed at `apps/crm-api` the roster comes back
empty and assignments never persist. This task builds the missing API.

> **Types are feature-scoped** (this repo keeps domain types in the feature folder,
> not a central file): `CrewMember` / `Assignment` in
> [`crew/types.ts`](<../../apps/crm-web/src/app/(dashboard)/crew/types.ts>) and the
> `CrewRole` / `CrewStatus` enums in
> [`crew/enums.ts`](<../../apps/crm-web/src/app/(dashboard)/crew/enums.ts>). The
> API's `*Public` shapes must match these 1:1 (snake_case, same enum string values).

## Fields

### Crew — match the `CrewMember` type

| Field        | Type        | Notes                                                             |
| ------------ | ----------- | ----------------------------------------------------------------- |
| `id`         | int         | server-assigned                                                   |
| `name`       | str         | index it, like `clients`                                          |
| `phone`      | str         |                                                                   |
| `role`       | str         | `"tho_chinh" \| "tho_phu" \| "ve_sinh" \| "giam_sat" \| "lai_xe"` |
| `day_rate`   | int         | ngày công, VND                                                    |
| `status`     | str         | `"dang_lam" \| "tam_nghi" \| "nghi_viec"`                         |
| `note`       | str \| None | optional free text                                                |
| `created_at` | date        | default today (like `clients`)                                    |

### Assignment — match the `Assignment` type

| Field          | Type         | Notes                                                      |
| -------------- | ------------ | ---------------------------------------------------------- |
| `id`           | int          | server-assigned                                            |
| `crew_id`      | int          | FK → `crew.id` (no cascade); index it                      |
| `project_code` | str          | parent project's `code` — index it (string link, like #08) |
| `role_on_site` | str \| None  | optional, e.g. "Tổ trưởng ca sáng"                         |
| `start_date`   | date \| None | optional                                                   |

## Task

1. **Crew model** — `app/models/crew.py` (`CrewBase`/`Crew(table=True)`/
   `CrewCreate`/`CrewPublic`/`CrewUpdate`). Copy `client.py`'s structure (it also
   has `created_at` + a status enum); index `name`.
2. **Assignment model** — `app/models/assignment.py` (same five-class shape); index
   `crew_id` and `project_code`. `crew_id` is an FK to `crew.id`.
3. **Register** both in
   [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py) so their
   tables are created.
4. **Crew routes** — `app/api/routes/crew.py`, full CRUD, `CurrentUser`-protected,
   mounted at **`/crew`** (`list_crew`, `get_crew`, `create_crew`, `update_crew`,
   `delete_crew`).
5. **Assignment routes** — `app/api/routes/assignments.py`, mounted at
   **`/assignments`**, `CurrentUser`-protected:
   - `GET /assignments` — list, with optional `project_code: str | None` **and**
     `crew_id: int | None` query params that filter when provided (same pattern as
     `GET /costs?project_code=…` in #08). The UI's project tab and crew detail page
     both read this list.
   - `POST /assignments` — **set-replace** semantics: the UI sends
     `{ "project_code": str, "crew_ids": int[] }` (see `crew/actions/assignments.ts`).
     Delete the
     existing assignments for that `project_code`, then insert one row per `crew_id`,
     and return the resulting rows. _(A simpler per-row create is an acceptable
     stretch-down if set-replace is too much; but matching the UI payload is the
     goal.)_
   - Optional: `DELETE /assignments/{id}`.
6. **Register** both routers in
   [`app/main.py`](../../apps/crm-api/app/main.py).
7. **Migration:** `uv run alembic revision --autogenerate -m "crew_assignments"` →
   `uv run alembic upgrade head` (creates `crew` **and** `assignment`, with the FK).
8. **Tests:** `tests/test_crew.py` (CRUD + 401-without-token) and
   `tests/test_assignments.py` (filter by `project_code`/`crew_id`; the set-replace
   POST overwrites a project's crew).

## Acceptance criteria

- [ ] Full CRUD on `/crew` works in `/docs`; unauthenticated requests get `401`.
- [ ] `CrewPublic` / `AssignmentPublic` match the `CrewMember` / `Assignment` types
      1:1 (snake_case, same enum string values).
- [ ] `GET /assignments?project_code=CT-2026-001` returns only that project's rows;
      `GET /assignments?crew_id=1` returns only that member's rows.
- [ ] `POST /assignments` with `{ project_code, crew_ids }` replaces that project's
      assignment set and returns the new rows.
- [ ] Both routers registered; migration + tests committed and passing under
      `uv run pytest -q`.
- [ ] Verified in `/docs` + `uv run pytest`, not the UI — crm-web speaks v2, so it
      will not light up against this backend (see
      [00 — Choose your backend](00-choose-your-backend.md)).

## Hints & references

- Copy from: [`app/models/client.py`](../../apps/crm-api/app/models/client.py)
  (Crew is the same shape — `created_at` + status enum) and
  [`app/api/routes/clients.py`](../../apps/crm-api/app/api/routes/clients.py).
- The `project_code` link is just a string column with a filter param — same idea as
  [#08 — Costs & Acceptances](08-costs-and-acceptances.md). `crew_id` **is** a real
  FK to `crew.id` (don't cascade-delete contracts… er, crew rows — removing a member
  shouldn't be silently destructive; the no-cascade FK is the safe teaching choice).
- The set-replace `POST /assignments` is the one twist: it's "make the project's crew
  exactly this list," not "append one row." Do it in a transaction: `delete` where
  `project_code == payload.project_code`, then `add` the new rows, then `commit`.
- `role_on_site` and `start_date` are **nullable** — the bulk assign dialog doesn't
  send them, so they must allow `NULL`.

## Definition of done

The **Nhân sự** roster and the project **Đội thi công** tab work against the live
API: you can add/edit crew, assign a set of people to a công trình, and see them on
both the project detail page and each member's detail page.
This is the last resource in the backlog — every GreenOrange page now has a backend.
