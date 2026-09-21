# [Intermediate] Batch the client list counts / Đếm địa điểm và công trình trong một truy vấn

> **Issue:** [#78](https://github.com/An-Y-The-Team/green-orange/issues/78)
> **Labels:** `area:backend` · `logic` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** — (nothing; 01 and 02 touch different files, so this one can
> run alongside either)
> **Good for:** 1 student — one pure function, two queries, and a trap that
> gives you the wrong number without ever raising. No new table, no new column,
> no migration.

## Background

The **khách hàng** list shows two numbers per row: how many **địa điểm** that
client has, and how many **công trình**. The secretary sorts by name, scans the
column, and rings the ones with nothing on the books.

Here is how those two numbers are fetched, at the bottom of
[`app/api/routes/clients.py`](../../apps/crm-api/app/api/routes/clients.py):

```python
return [
    ClientListItem(
        **row.model_dump(),
        counts=ClientCounts(
            locations=_count_by_client(session, Location, row.id),
            projects=_count_by_client(session, Project, row.id),
        ),
    )
    for row in rows
]


def _count_by_client(session: Session, model: type, client_id: int) -> int:
    # ponytail: one COUNT per row per relation — a page of 100 clients is 200
    # cheap indexed counts. Swap in two grouped counts over the page's ids if a
    # list read ever shows up in a profile.
    return session.exec(
        select(func.count()).select_from(model).where(model.client_id == client_id)
    ).one()
```

Read the loop again. `_count_by_client` runs **inside** it, twice per row.

`paged` already costs two queries — one `COUNT` for the `X-Total-Count` header,
one for the rows. Add two per client and a default page
(`DEFAULT_PAGE_SIZE = 100`, [`app/api/common.py:21`](../../apps/crm-api/app/api/common.py))
costs **202 queries**. A maximum page (`MAX_PAGE_SIZE = 500`) costs **1002**.
Every one of them is a fast indexed count — `client_id` is indexed on both
tables — which is exactly why nobody has noticed. They are fast and there are a
thousand of them.

That comment has been sitting there naming its own replacement since the day it
was written. This ticket is that replacement.

### The part that makes this a logic ticket

The obvious fix is wrong, and it is wrong **silently**.

Reach for one query — join both relations, group by client — and you get this:

```sql
SELECT client.id, count(location.id), count(project.id)
FROM client
LEFT JOIN location ON location.client_id = client.id
LEFT JOIN project  ON project.client_id  = client.id
GROUP BY client.id
```

A client with 3 địa điểm and 2 công trình does not produce 5 rows. It produces
**6** — every location paired with every project — so both counts come back
`6`. No error. No 500. The column just prints a number that is not true, for
every client that has more than one of both.

It is the same failure shape as the blank "Trùng lịch" column in
[02](02-crew-double-booking.md): the request succeeds, the page renders, and
the wrong thing looks exactly like the right thing.

### The twin already does this correctly

Unusually for this backlog,
[`crm-api-nest/src/clients/clients.module.ts`](../../apps/crm-api-nest/src/clients/clients.module.ts)
does **not** have the same hole:

```ts
include: { _count: { select: { locations: true, projects: true } } },
```

Prisma's `_count` emits correlated subqueries — one round trip, no fan-out.
That is where the `_count` wire name on `ClientListItem` comes from
([`app/models/client.py`](../../apps/crm-api/app/models/client.py)):

```python
class ClientListItem(ClientPublic):
    # Prisma's `_count` block. Leading underscores are reserved by Pydantic, so
    # the field is named `counts` and serialized under the wire name.
    counts: ClientCounts = Field(serialization_alias="_count")
```

So for once you are bringing Python up to the TypeScript, not the other way
round — and there is nothing for the maintainer to mirror afterwards. Read the
Prisma version before you start. Then note that it solves the fan-out by not
joining at all, which is one of the two answers available to you.

## What you're building

One pure function, in [`app/api/common.py`](../../apps/crm-api/app/api/common.py)
beside `paged` and `order_by` — a stub is waiting for you there:

```python
def counts_by_id(rows: Iterable[tuple[int, int]], ids: Iterable[int]) -> dict[int, int]: ...
```

`[(3, 2), (7, 1)]` plus ids `[3, 7, 9]` gives `{3: 2, 7: 1, 9: 0}`.

Look at what it takes: **tuples and ids**, not a session and not a model. No
database, no ORM, no clock — so every interesting case (a client with nothing,
a row for a client that isn't on this page, an empty page) is one line in a
test instead of a fixture. That is the same instinct as `overlapping_ids` in
[02](02-crew-double-booking.md) and `business_day_range` in
[01](01-document-code-sequencing.md).

Every id gets a key. An absent client is `0` — a real "none" — never a missing
key the caller has to guess about. There is already a function in this codebase
that makes exactly that promise for exactly that reason: `_by_status` in
[`app/api/routes/receivables.py`](../../apps/crm-api/app/api/routes/receivables.py),
whose comment reads _"Every status present, so a consumer never has to handle a
missing key — an absent bucket is a real zero, not unknown."_ Read it.

Then `list_clients` fetches the page as it does now, and resolves both counts
with **two grouped queries over the page's ids** instead of two hundred
individual ones. `_count_by_client` goes away entirely.

## The tests are the spec

[`tests/test_counts.py`](../../apps/crm-api/tests/test_counts.py) already exists
and already fails. Make it green.

```sh
cd apps/crm-api
uv run pytest -m exercise     # your twelve tests
uv run pytest -q              # everything else — keep it green the whole time
```

Twelve tests: eight pure ones with no database anywhere, then four that drive
the real endpoint. They are deselected from the normal run so `main` stays
green while you work.

**Nine of the twelve fail today. Three already pass, and that is deliberate** —
the current per-row counts are slow, not wrong, so the three that check the
numbers themselves are guards: they must be just as green after your refactor
as they are now. Break one and you have traded two hundred queries for a wrong
answer, which is the worse trade. `uv run pytest -m exercise` should read
`9 failed, 3 passed` before you start.

Two are worth reading before you write anything:

- `test_a_client_with_both_kinds_of_rows_counts_them_separately` — three địa
  điểm, two công trình, and it wants `3` and `2`. This is the fan-out test. The
  naive join returns `6` and `6` and this is the only thing that will tell you.
- `test_a_page_of_clients_costs_a_constant_number_of_queries` — it counts the
  SQL statements the endpoint actually emits, via the `query_counter` fixture
  in [`tests/conftest.py`](../../apps/crm-api/tests/conftest.py). Two clients
  and twenty clients must cost the same. Read that fixture; it is a
  `before_cursor_execute` listener and about six lines, and it is the only
  honest way to assert "no N+1".

## Decide and defend

Three questions. The first has two defensible answers, the second has none
written down anywhere, and the third you are explicitly not allowed to build.

**1. Two grouped queries, or one?** You can keep the single-query shape and
rescue it with `COUNT(DISTINCT location.id)` — that is correct, and it is also
a wider join and a distinct sort. Or you can run one small grouped query per
relation, which is what the `ponytail:` comment suggested and what Prisma does.
Pick one, and say what the fan-out taught you about `GROUP BY` reaching across
two collections at once. "It was slow" is not the answer to this question;
"it was wrong" is the beginning of one.

**2. Do closed công trình count?** A client whose three jobs all finished last
year currently reads "3 công trình", the same as a client with three live ones.
Is that the number the person scanning this column wants? Nothing in the
codebase decides this today — you do. (`Project.stage == "closed"`, and
`assert_project_open` in [`app/core/rules.py`](../../apps/crm-api/app/core/rules.py)
shows how the rest of the app asks that question.) Whatever you pick, the
shipped tests must still pass — if your answer changes what they should assert,
say so in the PR.

**3. Why not just store the number?** `client` could carry a `location_count`
column, updated whenever a địa điểm is added or removed, and then the list read
is free. This is not a hypothetical: this codebase already maintains a derived
column that way — `_sync_name_norm` in
[`app/models/__init__.py`](../../apps/crm-api/app/models/__init__.py) keeps
every `*_norm` search key correct on `before_insert` and `before_update`,
with a docstring arguing why that belongs in an event and not in four handlers.

So the precedent exists, and the argument for it is already written down. **You
are not implementing this.** Three to five sentences in the Decisions block on
why two grouped queries per list read still beat a column somebody has to keep
true forever — and what would have to change for you to switch sides.

## Decisions (fill this in — this is part of the deliverable)

> Replace this block. One short paragraph each, with the reason, not just the
> choice.

- **One query or two, and what the fan-out taught you:** …
- **Whether a closed công trình counts:** …
- **Why not a stored counter column:** …

## Task

1. **Reproduce the wrong answer first.** Before you fix anything, write the
   naive two-`LEFT JOIN` `GROUP BY` against a client with three địa điểm and two
   công trình, and look at what comes back. One sentence in the PR on what you
   saw. Everything else in this ticket follows from that number.
2. **Implement `counts_by_id`** in
   [`app/api/common.py`](../../apps/crm-api/app/api/common.py), replacing the
   `NotImplementedError` stub. Keep the docstring — it is the contract.
3. **Make the eight pure tests pass**: `uv run pytest -m exercise`. No database
   involved in any of them.
4. **Rewrite the tail of `list_clients`.** Two grouped queries over the ids on
   the page, then `counts_by_id` twice, then build the response. **Do not change
   the endpoint's signature or `ClientListItem`** — if you got this right,
   neither `app/models/` nor `apps/crm-web/` is in your diff.
5. **Delete `_count_by_client`.** It has no other callers. Ruff will tell you
   which import went unused with it.
6. **Mind the empty page.** A filter that matches nothing gives you zero ids,
   and `WHERE client_id IN ()` is not a thing you want to send to Postgres.
   Decide what happens and make it deliberate, not accidental.
7. **Make the last four tests pass**, then delete the `pytestmark` line from
   `tests/test_counts.py`. The tests guard the behaviour from then on. Leave
   `pyproject.toml` alone — the `exercise` marker stays for the next ticket.
8. **Fill in the Decisions block** above and answer all three.

## Acceptance criteria

- [ ] `uv run pytest -q` runs your twelve tests alongside everything else and
      is green. (`git grep pytestmark apps/crm-api/tests/test_counts.py` comes
      back empty.)
- [ ] `uv run ruff check .` is clean.
- [ ] A page of 100 khách hàng costs the **same number of queries** as a page of
      2 — proven by `query_counter`, not by eye.
- [ ] A client with 3 địa điểm and 2 công trình reports `3` and `2`. Not `6`
      and `6`.
- [ ] A client with no địa điểm and no công trình reports `0` and `0`, present
      in the response, never a missing key.
- [ ] A địa điểm belonging to one client never advances another client's count.
- [ ] `counts_by_id([], [4, 5])` returns `{4: 0, 5: 0}` — provable with no
      database.
- [ ] `git diff --stat` touches **no** `alembic/versions/`, no `app/models/`,
      no `apps/crm-web/`, and no table definition.
- [ ] The Decisions block is filled in, each with a reason.

## Hints & references

- **Copy the instinct from:** `_by_status` in
  [`app/api/routes/receivables.py`](../../apps/crm-api/app/api/routes/receivables.py)
  — a grouped query turned into a dict where every key is present. It is the
  answer to half this ticket, already written, forty lines long, in this repo.
- `func.count()` with `.group_by(model.client_id)` gives you
  `(client_id, count)` pairs straight out of Postgres. That is exactly the
  shape `counts_by_id` takes, which is not a coincidence.
- `col.in_(ids)` for the page scope. Fetch counts for the hundred clients you
  are about to return, not for every client in the table.
- `dict(rows)` then `.get(id, 0)` in a comprehension is the whole function.
  Resist making it clever.
- The two relations live on different tables but have the same column name
  (`client_id` on both `Location` and `Project`), so one helper covers both —
  same as `_count_by_client` managed with its `model: type` parameter.
- **The N+1 rule is written down**:
  [`.claude/code-review.md`](../../.claude/code-review.md) lists _"N+1 queries:
  Per-row queries inside a loop without batching"_ under what blocks a merge.
  This is that, in the codebase, with a comment admitting it.
- **The NestJS twin** is
  [`crm-api-nest/src/clients/clients.module.ts`](../../apps/crm-api-nest/src/clients/clients.module.ts).
  For once it is already right, so there is nothing to mirror after this merges
  — but read its `_count` block before you choose between one query and two.
- **No migration.** If `alembic` appears in your diff, the answer is wrong.
  Every column you need already exists and is already indexed.

## Definition of done

`uv run pytest -q` is green with the exercise tests included, the khách hàng
list costs four queries instead of two hundred and two, the numbers in the
column are the numbers on the books, the three judgement calls are written down
and argued, and nothing outside `app/api/common.py`,
`app/api/routes/clients.py` and `tests/test_counts.py` changed.
