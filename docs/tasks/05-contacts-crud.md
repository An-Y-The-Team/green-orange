# [Intermediate] Implement Contacts CRUD (guided)

> **Labels:** `area:backend` · `crud` · `good first issue` · `difficulty:medium`
> **Depends on:** #04
> **Good for:** 1 student — this is the canonical "first real backend ticket."

## Background

`contacts` is currently a `501` stub
([`app/api/routes/contacts.py`](../../apps/crm-api/app/api/routes/contacts.py)).
Your job: make it a full CRUD resource by **mirroring `customers`**. This is the
flat, no-surprises resource — get the _workflow_ (model → register → routes →
migration → test) into muscle memory here; tasks 06–11 reuse it.

The matching UI type is `Contact` in
[`apps/crm-web/src/types/index.ts`](../../apps/crm-web/src/types/index.ts).

## Fields (must match the `Contact` TS type exactly)

| Field     | Type | Notes                        |
| --------- | ---- | ---------------------------- |
| `id`      | int  | server-assigned (table only) |
| `name`    | str  | index it, like `customers`   |
| `email`   | str  |                              |
| `phone`   | str  |                              |
| `title`   | str  | job title                    |
| `company` | str  |                              |

> Note: unlike `Customer`, the `Contact` type has **no** `created_at` — match the
> TS type, don't add fields it doesn't have.

## Task

1. **Model** — in [`app/models/contact.py`](../../apps/crm-api/app/models/contact.py)
   define `ContactBase`, `Contact(table=True)`, `ContactCreate`, `ContactPublic`,
   `ContactUpdate` (copy `customer.py`'s structure; drop `created_at`/`status`).
2. **Register** the model in
   [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py) (uncomment
   the `Contact` import and add it to `__all__`) so its table is created.
3. **Routes** — replace the `501` stub in `routes/contacts.py` with the five
   handlers (`list_contacts`, `get_contact`, `create_contact`, `update_contact`,
   `delete_contact`), each taking `SessionDep` + `CurrentUser`, using the
   `*Public` response models. The router is already included in `main.py`.
4. **Migration:**

   ```bash
   uv run alembic revision --autogenerate -m "contacts"
   uv run alembic upgrade head
   ```

5. **Test** — add `tests/test_contacts.py` mirroring `tests/test_customers.py`
   (create → list → get → update → delete, plus a 401-without-token check).

## Acceptance criteria

- [ ] All five `/contacts` endpoints work in `/docs` (no more `501`).
- [ ] Unauthenticated requests get `401`; authenticated CRUD round-trips.
- [ ] `ContactPublic` fields match the `Contact` TS type 1:1.
- [ ] An Alembic migration for the `contact` table is committed.
- [ ] `tests/test_contacts.py` passes under `uv run pytest -q`.
- [ ] Visiting `/contacts` in crm-web (live mode) shows your data. _(The page is on
      disk but not in the sidebar — navigate to it directly.)_

## Hints & references

- Copy from: [`app/models/customer.py`](../../apps/crm-api/app/models/customer.py)
  and [`app/api/routes/customers.py`](../../apps/crm-api/app/api/routes/customers.py).
- The step list is also embedded as comments at the top of `routes/contacts.py`.
- Forgot to register the model? `create_all` / autogenerate won't see the table.

## Definition of done

`/contacts` is a working, tested CRUD resource that matches the UI contract.
Next: [06 — Leads, Deals & Tasks](06-leads-deals-tasks-crud.md).
</content>
