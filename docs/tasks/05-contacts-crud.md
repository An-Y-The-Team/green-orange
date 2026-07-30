# [Intermediate] Implement Contacts CRUD (guided)

> **Labels:** `area:backend` · `crud` · `good first issue` · `difficulty:medium`
> **Depends on:** #04
> **Good for:** 1 student — this is the canonical "first real backend ticket."

## Background

`contacts` starts as a `501` stub
([`app/api/routes/contacts.py`](../../apps/crm-api/app/api/routes/contacts.py)).
Your job: make it a full CRUD resource by **mirroring `clients`**. This is the
flat, no-surprises resource — get the _workflow_ (model → register → routes →
migration → test) into muscle memory here; tasks 07–14 reuse it.

The field table below **is** the contract for this task. (It used to be checked
against a `Contact` type in crm-web; that file is gone and v2's `Contact` is a
different shape — see [00 — Choose your backend](00-choose-your-backend.md).)

## Fields (must match the table below exactly)

| Field     | Type | Notes                        |
| --------- | ---- | ---------------------------- |
| `id`      | int  | server-assigned (table only) |
| `name`    | str  | index it, like `customers`   |
| `email`   | str  |                              |
| `phone`   | str  |                              |
| `title`   | str  | job title                    |
| `company` | str  |                              |

> Note: unlike `Client`, `Contact` has **no** `created_at` — match the table
> above, don't add fields it doesn't list.

## Task

1. **Model** — in [`app/models/contact.py`](../../apps/crm-api/app/models/contact.py)
   define `ContactBase`, `Contact(table=True)`, `ContactCreate`, `ContactPublic`,
   `ContactUpdate` (copy `client.py`'s structure; drop `created_at`/`status`).
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

5. **Test** — add `tests/test_contacts.py` mirroring `tests/test_clients.py`
   (create → list → get → update → delete, plus a 401-without-token check).

## Acceptance criteria

- [ ] All five `/contacts` endpoints work in `/docs` (no more `501`).
- [ ] Unauthenticated requests get `401`; authenticated CRUD round-trips.
- [ ] `ContactPublic` fields match the field table above 1:1.
- [ ] An Alembic migration for the `contact` table is committed.
- [ ] `tests/test_contacts.py` passes under `uv run pytest -q`.
- [ ] A `curl` round-trip against `/contacts` returns your rows. _(crm-web is not a
      signal here — it no longer has a v1 `/contacts` page.)_

## Hints & references

- Copy from: [`app/models/client.py`](../../apps/crm-api/app/models/client.py)
  and [`app/api/routes/clients.py`](../../apps/crm-api/app/api/routes/clients.py).
- The step list is also embedded as comments at the top of `routes/contacts.py`.
- Forgot to register the model? `create_all` / autogenerate won't see the table.

## Definition of done

`/contacts` is a working, tested CRUD resource that matches the field table above.
Next: [07 — Implement Projects / Công trình](07-projects-crud.md). _(The `/leads`,
`/deals` and `/tasks` 501 skeletons are extra flat-CRUD practice on the same
pattern — see [the backlog index](README.md).)_
</content>
