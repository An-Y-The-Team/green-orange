# [Basics] Study the reference & run the test suite

> **Labels:** `area:backend` · `orientation` · `testing` · `difficulty:easy`
> **Depends on:** #01
> **Good for:** every student — do this right before you start writing code.

## Background

Before implementing anything, read the one resource that is **fully done** and the
test that covers it. Every Tier-2 task is "replicate this shape." Ten minutes here
saves an hour later.

The pattern (straight from the SQLModel docs) is: a shared `*Base` of common
fields, a `table=True` model adding db-only columns (`id`, `created_at`), and
separate **Create / Public / Update** schemas. The route file then exposes five
operations — **list, read, create, update, delete** — each protected by
`CurrentUser`.

## What you'll learn

- The model + schema split (`Base` / table / `Create` / `Public` / `Update`)
- The five-operation CRUD route shape
- How tests run against in-memory SQLite (no Postgres needed)

## Task

1. **Read these three files top-to-bottom**, in order:
   - [`app/models/customer.py`](../../apps/crm-api/app/models/customer.py) — the model + 4 schemas
   - [`app/api/routes/customers.py`](../../apps/crm-api/app/api/routes/customers.py) — the 5 CRUD handlers
   - [`tests/test_customers.py`](../../apps/crm-api/tests/test_customers.py) — how it's tested
2. **Run the test suite:**

   ```bash
   uv run pytest -q
   ```

   It uses in-memory SQLite, so it needs neither Postgres nor a running server.
3. **Answer these for yourself** (write the answers in the issue comments):
   - Why does `CustomerCreate` *not* include `id` or `created_at`?
   - Why is every field on `CustomerUpdate` optional?
   - What does `_user: CurrentUser` do on each route, and what happens if it's removed?
   - Where is the model *registered* so its table gets created?
     (Hint: [`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py).)

## Acceptance criteria

- [ ] `uv run pytest -q` passes locally.
- [ ] You can point to where `list / read / create / update / delete` each live in
      `customers.py`.
- [ ] You answered the four questions above.

## Hints & references

- SQLModel multiple-models pattern is documented in
  `node_modules`/the SQLModel site, but `customer.py`'s comments summarize it.
- The migration that created the initial schema:
  [`alembic/versions/`](../../apps/crm-api/alembic/versions/).

## Definition of done

You understand the reference resource well enough to copy its shape. You're ready
for Tier 2.
Next: [05 — Implement Contacts CRUD](05-contacts-crud.md).
</content>
