# [Advanced] Stop losing the race for a document code / Cấp mã hồ sơ không trượt

> **Issue:** [#80](https://github.com/An-Y-The-Team/green-orange/issues/80)
> **Labels:** `area:backend` · `logic` · `domain:greenorange` · `difficulty:hard`
> **Depends on:** #70 (you are finishing the sentence that ticket started)
> **Good for:** 1 student who has landed at least one of 01–03, or a pair. No
> new table, no new column, no migration — and no pure function to hide behind
> either. This is the first ticket where the database is the problem, not the
> place the answer gets stored.

## Background

[01](01-document-code-sequencing.md) ended with a question it would not let you
answer:

> **2. The race.** Two creates land in the same millisecond, both read the same
> highest code, both format `-004`. What actually happens? … Then: what would
> you do about it, and why is it not worth doing today?
>
> You are **not** implementing a fix for this.

Today it is worth doing. Here is the sentence you wrote in that ticket's
Decisions block:

> Two concurrent requests may calculate the same next code, but the unique code
> constraint allows only one insert and rejects the other.

That is correct, and it is the whole problem. **One of the two secretaries
loses.** She filled in a công trình — tên, khách hàng, địa điểm, ngày hẹn — and
the server answered:

> `409` · "a record with these unique values already exists"

She did not enter a unique value. She has no idea what already exists. The only
field that collided is one she never saw, because the server picked it for her
half a millisecond ago. From where she is standing the app simply refused a
perfectly good công trình, and her recourse is to type it again and hope.

That message comes from the global handler in
[`app/main.py`](../../apps/crm-api/app/main.py), which maps SQLSTATE `23505`
onto a 409 for every table at once:

```python
_INTEGRITY_MESSAGES = {
    "23503": "record is still referenced by related records",
    "23505": "a record with these unique values already exists",
}
```

It is a good safety net. It is a terrible answer to this particular collision,
because this one is **the server's fault and the server can fix it**: take the
next code and try again. Nobody needs to be told about it.

### Where it happens, and why the two sites are not the same

Both allocators call `next_code`, which reads the highest issued code and adds
one — a read, then a write, with a gap in between:

| Prefix | Call site                                                                                         | The collision surfaces at |
| ------ | ------------------------------------------------------------------------------------------------- | ------------------------- |
| `CT`   | [`app/api/routes/projects.py`](../../apps/crm-api/app/api/routes/projects.py) `create_project`    | `session.flush()`         |
| `HD`   | [`app/api/routes/contracts.py`](../../apps/crm-api/app/api/routes/contracts.py) `create_contract` | `session.commit()`        |

Read `create_project` before you plan anything:

```python
session.add(project)
# flush(), not commit(): the auto-seeded stage-5 checklist goes in the SAME
# transaction as the project, so no công trình can exist without it.
session.flush()
for name in DEFAULT_PAPERWORK:
    session.add(PaperworkItem(project_id=project.id, name=name))
session.commit()
```

The unique violation fires on that `flush()` — **before** the paperwork rows
exist, in the middle of a transaction that is supposed to be all-or-nothing.
`create_contract` has no flush at all, so its violation arrives at `commit()`,
after everything is staged.

Same bug, two different moments. Anything you write has to survive both, and
the obvious fix — wrap the handler body in a `for` loop and call it again —
seeds `DEFAULT_PAPERWORK` twice on the second pass if you get the rollback
wrong. There is a test for exactly that, and it is the one that will catch you.

### The twin has it too

[`crm-api-nest/src/common/code.ts`](../../apps/crm-api-nest/src/common/code.ts)
carries the same race and says so in its own comment:

```ts
// ponytail: not race-safe under concurrent inserts — fine for this app, same
// caveat the Python backend carries.
```

You are not touching TypeScript; the maintainer mirrors this once it merges.
Read it anyway — and note that whatever you design here has to be expressible
in Prisma, so a solution that leans on a SQLAlchemy-only trick is a solution
that breaks the contract the moment it is mirrored.

## What you're building

**There is no stub waiting for you this time, and no pure function to start
from.** That is the step up. In 01 the year was a parameter so you could test
January without a clock; in 02 the windows were tuples so you could test
overlap without a fixture. A race has no such seam: the bug lives _between_ a
read and a write, and a function that takes tuples cannot have a "between".

So the design is yours. What has to be true when you are done:

- A create whose code collides **retries with the next code** instead of
  answering 409, and the caller never learns it happened.
- The retry is **bounded**. `.claude/code-review.md` lists _"Infinite loops,
  unbounded retry/work"_ under what blocks a merge; a loop that spins until it
  wins is a worse bug than the one you started with.
- When the budget runs out, the client gets a **409 that is still honest** —
  something a person can act on, not a lie about unique values.
- A retry **writes nothing twice**. No duplicated paperwork checklist, no
  half-seeded công trình, no orphan.
- An integrity error that is **not** a code collision is **not retried**. A
  duplicate `tax_code` or a broken foreign key must fail on the first attempt,
  exactly as it does today.

`next_code`'s signature does not change. Neither does any response model.

A reasonable shape is a helper in
[`app/core/rules.py`](../../apps/crm-api/app/core/rules.py) that owns the
allocate-write-retry cycle and takes the write as a callback, so both routes
share one definition of "try again":

```python
def with_allocated_code(
    session: Session, model: type, prefix: str, write: Callable[[str], T]
) -> T: ...
```

You do not have to use that shape. You do have to end up with **one** copy of
the retry rule, not one per route — that is the same argument
[02](02-crew-double-booking.md) made about `with_overlaps` and `ranges_overlap`,
and `overdue_clauses()` in
[`app/api/routes/receivables.py`](../../apps/crm-api/app/api/routes/receivables.py)
makes it again in two sentences.

### The word you are looking for is SAVEPOINT

When `flush()` raises, the session is poisoned: SQLAlchemy will refuse further
work until somebody rolls back. Roll back the whole transaction and you have
thrown away the caller's other writes. `session.begin_nested()` opens a
SAVEPOINT you can roll back to instead, leaving everything before it intact.
That is the primitive this ticket is really about; the retry loop around it is
five lines.

## The tests are the spec

[`tests/test_code_race.py`](../../apps/crm-api/tests/test_code_race.py) already
exists and already fails. Make it green.

```sh
cd apps/crm-api
uv run pytest -m exercise     # your nine tests
uv run pytest -q              # everything else — keep it green the whole time
```

Nine tests. **None of them are concurrent**, and that is the lesson, not a
shortcut: the suite runs one in-memory SQLite connection
([`tests/conftest.py`](../../apps/crm-api/tests/conftest.py)), so a genuine
two-writer race is not available to you. It is also not what you need. You are
not testing that the race happens — the database guarantees that. You are
testing **what your code does when it is handed the loss**, and that you can
stage deterministically by taking the code out from under the allocator on
purpose.

**Five of the nine fail today. Four already pass, and that is deliberate** — the
four greens are the guards on how you are allowed to fix the five reds. Today
nothing retries, so "does not spin", "leaves no debris", "does not retry
somebody else's conflict" and "does not retry when nothing collided" are all
trivially true. Your retry is what puts them at risk. `uv run pytest -m exercise`
should read `5 failed, 4 passed` for this module before you start.

The four worth reading first:

- `test_a_collision_is_retried_and_the_caller_never_sees_it` — the code is
  stolen between allocation and write; the response is still `201`, with the
  next code.
- `test_the_checklist_is_seeded_exactly_once_after_a_retry` — one công trình,
  one `DEFAULT_PAPERWORK` set. This is the test that fails if you retried by
  re-running the handler instead of rolling back to a savepoint.
- `test_a_permanently_taken_code_gives_up_instead_of_spinning` — every attempt
  collides. It must end, and it must end as a 409.
- `test_a_duplicate_tax_code_is_not_retried` — a different unique constraint,
  failing on attempt one. Retrying somebody else's conflict is how a bounded
  loop turns a clear error into a slow, confusing one.

## Decide and defend

Three, and none of them has an answer written down anywhere in this repo.

**1. Retry, or make the collision impossible?** Postgres has `SEQUENCE`, and an
allocation table with a row per (prefix, year) would serialise the whole
question away. Both are race-free without any retry at all. Both also hand you
numbers that do not restart in January without intervention, and burn a number
every time a transaction rolls back — which [01](01-document-code-sequencing.md)
decided was acceptable for deletes but never considered for failures. Does that
decision survive? And remember the twin: whatever you choose has to be sayable
in Prisma.

**2. How many attempts, and what does the loser see?** Pick a number and defend
it — not "5 felt right", but what it is a budget _for_. Then: when it is spent,
what does the secretary read? "Conflict" is what she gets today and it is the
thing this ticket exists to stop saying.

**3. Which integrity errors are yours?** SQLSTATE `23505` means _some_ unique
constraint failed, not that **your** code column did. Telling them apart means
reading the constraint name off the driver's exception — which is
Postgres-shaped, while your tests run on SQLite, where the same failure arrives
with no `sqlstate` at all (look at `getattr(exc.orig, "sqlstate", None)` in
`app/main.py` and work out what it returns under SQLite). So: do you parse
driver-specific error text, or do you restructure so you never have to ask? Say
which, and say what it costs you.

## Decisions (fill this in — this is part of the deliverable)

> Replace this block. One short paragraph each, with the reason, not just the
> choice.

- **Retry or sequence, and why:** …
- **The attempt budget, and what the client sees when it runs out:** …
- **How you tell your conflict from somebody else's:** …

## Task

1. **Make it fail on purpose first.** Before you write a fix, take a code out
   from under `create_project` and watch the 409 arrive. One sentence in the PR
   describing what the secretary sees and why the message is wrong. Everything
   here follows from that sentence.
2. **Find the seam.** Decide where the retry lives so that both `CT` and `HD`
   share one copy of it, and write down why you put it there.
3. **Build the allocate-write-retry cycle** around `session.begin_nested()`.
   Bound it. Make exhaustion a deliberate, readable failure.
4. **Wire `create_project`.** This is the hard one: the checklist must be seeded
   exactly once, in the same transaction as the project, after a retry as much
   as after a clean first pass.
5. **Wire `create_contract`.** Its collision arrives at a different moment. If
   your helper only works for one of the two, it is not the seam.
6. **Leave other people's conflicts alone.** A duplicate `tax_code` fails on the
   first attempt with the message it has today.
7. **Make the tests pass**, then delete the `pytestmark` line from
   `tests/test_code_race.py`. Leave `pyproject.toml` alone — the `exercise`
   marker stays for the next ticket.
8. **Fill in the Decisions block** and answer all three.

## Acceptance criteria

- [ ] `uv run pytest -q` runs your nine tests alongside everything else and is
      green. (`git grep pytestmark apps/crm-api/tests/test_code_race.py` comes
      back empty.)
- [ ] `uv run ruff check .` is clean.
- [ ] A create whose first code is taken still returns **201**, with the next
      code — no 409, no retry visible to the client.
- [ ] A công trình created through a retry has **exactly one** copy of
      `DEFAULT_PAPERWORK`.
- [ ] A code that is taken on every attempt ends in a bounded number of tries
      and answers 409 — the suite finishes, it does not hang.
- [ ] A duplicate `tax_code` still fails on the first attempt, unretried.
- [ ] `next_code`'s signature is unchanged, and no response model is in the
      diff.
- [ ] `git diff --stat` touches **no** `alembic/versions/`, no `app/models/`,
      no `apps/crm-web/`, and no table definition.
- [ ] The Decisions block is filled in, each with a reason.

## Hints & references

- `session.begin_nested()` is a SAVEPOINT and a context manager. Leaving its
  block with an exception rolls back **to the savepoint**, not to the start of
  the transaction. That distinction is the ticket.
- After a failed `flush()`, the session needs a rollback before it will accept
  anything else. Find out what SQLAlchemy raises if you forget — the error text
  is a good teacher.
- `IntegrityError.orig` is the driver's exception. Everything engine-specific
  lives there, which is exactly why leaning on it is a judgement call and not a
  free win.
- The retry belongs around **allocate + write together**. Allocating once and
  retrying only the insert re-uses the code that just lost, forever.
- `DEFAULT_PAPERWORK` is in
  [`app/api/routes/projects.py`](../../apps/crm-api/app/api/routes/projects.py).
  Count the rows in the test, not the attempts.
- **Read the write path you already fixed:** `next_code` in
  [`app/core/rules.py`](../../apps/crm-api/app/core/rules.py) and the
  `ponytail:` comment you rewrote in 01. That comment is about to become untrue
  again — rewrite it once more so it names what is still true.
- **The rules are written down:** [`.claude/code-review.md`](../../.claude/code-review.md)
  lists _"Race conditions: Check-then-act patterns must have DB-level
  uniqueness constraints, not just application-level checks"_ and _"Atomic
  transactions: Multiple related DB writes are committed in a single
  transaction — no mid-way partial state"_. You are being graded against both
  at once, and they pull in opposite directions. That tension is the ticket.
- **No migration.** If `alembic` appears in your diff, you have answered a
  different question — a good one, possibly, but write it in the Decisions
  block instead of in a migration.

## Definition of done

Two secretaries clicking "Tạo công trình" in the same millisecond both get a
công trình, with different codes, each with exactly one paperwork checklist;
somebody else's duplicate still fails the way it always did; the retry cannot
run forever; the three judgement calls are written down and argued; and nothing
outside `app/core/rules.py`, the two route files and
`tests/test_code_race.py` changed.
