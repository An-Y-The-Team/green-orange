# [Intermediate] Fix document code sequencing / Đánh số hồ sơ theo năm

> **Issue:** [#70](https://github.com/An-Y-The-Team/green-orange/issues/70)
> **Labels:** `area:backend` · `logic` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** — (nothing; this is the first task of the v2 series)
> **Good for:** 1 student — a logic-and-judgement ticket. No new table, no new
> column, no migration. Just one function that has been quietly wrong for a
> while.

## Background

Every **công trình** and every **hợp đồng** gets a code stamped on it by the
server: `CT-2026-001`, `HD-2026-004`. It goes on the printed hợp đồng, on the
báo giá, on the đề nghị thanh toán. When the secretary phones a client about a
job, the code is what she reads out.

Here is the entire thing that produces it, in
[`app/core/rules.py`](../../apps/crm-api/app/core/rules.py):

```python
def next_code(session: Session, model: type, prefix: str) -> str:
    highest = session.exec(select(func.max(model.id))).one()
    return f"{prefix}-2026-{(highest or 0) + 1:03d}"
```

Read it again. That `2026` is not a variable. It is typed into the string.

**On the first of January it will be wrong**, and it will keep being wrong,
silently, on every document the company prints, until somebody notices that
last year's jobs and this year's jobs have the same numbers on them. Nothing
crashes. Nothing 500s. The codes just quietly stop meaning anything.

That is defect number one. There are three more:

2. **The series never restarts.** A Vietnamese document series starts again at
   001 each January — that is the whole point of putting the year in the code.
   This one counts to infinity.
3. **The number is the row's database id**, not the number of documents
   actually issued. `max(id) + 1`. Delete a công trình and the next one skips a
   number. Insert a row with an explicit id — which the seed scripts do — and
   the two drift apart entirely. The NestJS twin has a whole raw-SQL workaround
   for this, and its comment says it out loud: without it, `nextCode()` "would
   reissue a seeded code."
4. **It is not race-safe.** Two people clicking "Tạo công trình" at the same
   instant read the same `max` and get the same code. More on that below —
   you are not being asked to fix it, only to think about it.

Where it is used — two prefixes, two unique columns, that's all:

| Prefix | Model      | Call site                                                                          |
| ------ | ---------- | ---------------------------------------------------------------------------------- |
| `CT`   | `Project`  | [`app/api/routes/projects.py:315`](../../apps/crm-api/app/api/routes/projects.py)  |
| `HD`   | `Contract` | [`app/api/routes/contracts.py:84`](../../apps/crm-api/app/api/routes/contracts.py) |

(The docstring also promises `BG-…` and `QT-…`. It is lying — a báo giá uses
`version` and a quyết toán has no code at all. Fix the docstring while you are
in there.)

## What you're building

`{PREFIX}-{business year}-{NNN}`, where the sequence comes from **the codes
already issued for that prefix in that year**, and restarts at 001 each January.

Three stubs are waiting for you at the bottom of `rules.py`, and they are the
whole design:

```python
def format_code(prefix: str, year: int, sequence: int) -> str: ...
def parse_sequence(code: str, prefix: str, year: int) -> int | None: ...
def next_sequence(existing_codes: Iterable[str], prefix: str, year: int) -> int: ...
```

Notice that **none of them touch the database** and **none of them ask what
today is**. The year is a parameter. That is deliberate: it means you can test
the January rollover in one line, today, without mocking a clock or waiting
fourteen weeks. Only `next_code` — the thin wrapper — calls `business_today()`
and runs a query.

There is a precedent for this exact shape three functions above you:
`business_day_range(day)` takes the date instead of asking for it, which is why
[`tests/test_common.py`](../../apps/crm-api/tests/test_common.py) can test a
timezone rule with no fixture at all. Copy that instinct.

## The tests are the spec

[`tests/test_codes.py`](../../apps/crm-api/tests/test_codes.py) already exists
and already fails. That's the job: make it green.

```sh
cd apps/crm-api
uv run pytest -m exercise     # your 12 tests
uv run pytest -q              # everything else — should stay green the whole time
```

They're deselected from the normal run so `main` stays green while you work.
Twelve tests, ten of them pure functions with no database in sight.

## Decide and defend

Two of these have no right answer. They have **defended** answers, and the
defence is part of what you hand in.

**1. Gaps.** Somebody creates `CT-2026-002`, then deletes it. It was a draft, it
was a mistake, it's gone. The next công trình: is it `002` again, or `003`?

Reusing the number keeps the series tidy with no gaps. Not reusing it means the
code on a piece of paper is never handed to a second job — which matters more if
that paper was a signed hợp đồng than if it was a draft nobody printed.
`test_next_sequence_after_a_deleted_tail_matches_your_documented_policy` ships
asserting "don't reuse". **It is the one test you are allowed to edit.** If you
disagree, change it and say why.

**2. The race.** Two creates land in the same millisecond, both read the same
highest code, both format `-004`. What actually happens? (Hint: look at
`Project.code` in [`app/models/project.py`](../../apps/crm-api/app/models/project.py)
before you answer — the failure mode is not "two jobs with the same code".)
Then: what would you do about it, and why is it not worth doing today?

You are **not** implementing a fix for this. Three to five sentences in the
Decisions block, and a refreshed `ponytail:` comment naming what's still true.

## Decisions (fill this in — this is part of the deliverable)

> Replace this block. One short paragraph each, with the reason, not just the
> choice.

- **Gap policy after a delete:** …
- **What happens on a race, and why we're leaving it:** …
- **What happens past 999** (`CT-2026-1000`?): …

## Task

1. **Read first, code second.** Open `next_code` and both call sites. Write one
   sentence in the PR describing what a code means to the person holding the
   printed document. Everything else follows from that.
2. **Implement the three pure functions** in
   [`app/core/rules.py`](../../apps/crm-api/app/core/rules.py), replacing the
   `NotImplementedError` stubs. Keep the docstrings — they are the contract.
3. **Make the pure tests pass**: `uv run pytest -m exercise`. Ten of the twelve
   should go green before you touch the database at all.
4. **Rewrite `next_code`'s body.** Resolve the year from `business_today()`,
   fetch only the codes for that prefix and year, and hand them to
   `next_sequence`. **Do not change its signature** — if you got this right, the
   two route files are not in your diff at all.
5. **Fix the docstring** (drop the imaginary `BG-…`/`QT-…`) and rewrite the
   `ponytail:` comment so it names what is still true, not what you just fixed.
6. **Make the last two tests pass**, then delete the `pytestmark` line from
   `tests/test_codes.py` and the `addopts` + `markers` lines from
   [`pyproject.toml`](../../apps/crm-api/pyproject.toml). The tests now run with
   everything else, forever.
7. **De-rot the two old assertions.** `tests/test_projects.py:14` and
   `tests/test_contracts.py:16` hardcode `CT-2026-001` and `HD-2026-001`. They
   pass today and would have started failing on their own next January. Both
   files already import `business_today` — use it.
8. **Fill in the Decisions block** above and answer the two questions.

## Acceptance criteria

- [ ] `uv run pytest -q` runs all 68 tests and is green — no "deselected" line,
      no `exercise` marker left anywhere. (`git diff | grep exercise` should
      come back empty.)
- [ ] `uv run ruff check .` is clean. (Something in the imports will go unused
      once `max(id)` is gone. Ruff will tell you.)
- [ ] `next_sequence([...], "CT", 2027)` returns `1` when only 2026 codes exist
      — the January restart, provable without a clock.
- [ ] A hợp đồng number never advances the công trình series, and vice versa.
- [ ] `next_code`'s signature is unchanged and neither route file is in the diff.
- [ ] `git diff --stat` touches **no** `alembic/versions/`, no `app/models/`,
      no `app/api/routes/`, no `app/seed.py`, no `apps/crm-web/`.
- [ ] The Decisions block is filled in, each with a reason.
- [ ] Against a seeded database, `POST /projects` returns `CT-2026-004` —
      continuing the seed's 001–003 rather than restarting or skipping.

## Hints & references

- **Copy the instinct from:** `business_day_range` in the same file, and its
  test in [`tests/test_common.py`](../../apps/crm-api/tests/test_common.py) —
  a calendar rule tested by passing the date in.
- `f"{n:03d}"` pads to three digits. It does **not** truncate at 999, it grows
  to four — decide whether you're happy with that and say so.
- `str.startswith` for the pure side; SQLModel gives you
  `col.startswith("CT-2026-")` for the query side. Fetch only the codes you
  need, not every row in the table.
- The walrus operator (`if (n := parse(...)) is not None`) makes
  `next_sequence` a one-line comprehension, if you like that sort of thing.
- `max(seqs, default=0)` saves you an `if not seqs` branch.
- **The NestJS twin** is
  [`crm-api-nest/src/common/code.ts`](../../apps/crm-api-nest/src/common/code.ts).
  You are not touching TypeScript — the maintainer mirrors your design there
  once this merges (see [AGENTS.md](../../AGENTS.md), "change one, change the
  other"). But read it: it has the same two bugs, in six lines.
- **No migration.** If `alembic` appears in your diff, the answer is wrong.
  Every column you need already exists.

## Definition of done

`uv run pytest -q` is green with the exercise tests included, a công trình
created next January is called `CT-2027-001`, the two judgement calls are
written down and argued, and nothing outside `app/core/rules.py`, the two test
files and `pyproject.toml` changed.
