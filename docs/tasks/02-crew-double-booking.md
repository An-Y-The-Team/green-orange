# [Intermediate] Light up the double-booking warning / Cảnh báo trùng lịch

> **Issue:** [#71](https://github.com/An-Y-The-Team/green-orange/issues/71)
> **Labels:** `area:backend` · `logic` · `domain:greenorange` · `difficulty:medium`
> **Depends on:** #70 (finish that one first — same file conventions, and it's
> the gentler of the two)
> **Good for:** 1 student — pure interval logic plus three judgement calls. No
> new table, no new column, no migration. There is already a UI waiting for
> this; right now it renders nothing.

## Background

A **nhân sự** can be on two công trình at once. That is normal here — day-hires
get moved around, a giám sát covers three sites in a week, and nobody wants the
server refusing to save a phân công because the dates touch. So the rule is:
**double-booking is allowed, and the app just warns about it.** Never a refusal.
That's written down in two places
([crm-business-flow.md](../features/crm-business-flow.md), "Crew (Nhân sự)" and
[crm-database-schema.md](../features/crm-database-schema.md), the `assignment`
table) and it is not up for debate in this ticket.

The warning exists. Someone built it end to end:

- The API computes it when you create or edit a phân công —
  `with_overlaps` in
  [`app/api/routes/crew.py`](../../apps/crm-api/app/api/routes/crew.py).
- The response schema carries it — `AssignmentPublic.overlaps` in
  [`app/models/crew.py`](../../apps/crm-api/app/models/crew.py).
- The công trình page renders it as a yellow **"⚠ Trùng lịch"** badge.
- And the **roster page** — `/crew/{id}`, the one you open to see where a person
  has been — has a whole table column for it that reads
  **"Trùng lịch với CT-2026-007"**.

That last one has never worked. Not once.

Open [`app/api/routes/crew.py`](../../apps/crm-api/app/api/routes/crew.py) and
find `get_crew_member`:

```python
@router.get("/{member_id}", response_model=CrewMemberDetail)
def get_crew_member(session: SessionDep, member_id: int) -> CrewMember:
    return get_member_or_404(session, member_id)
```

Then look at what `CrewMemberDetail` actually promises:

```python
class CrewMemberDetail(CrewMemberPublic):
    assignments: list[AssignmentWithProject]   # ← no overlaps. anywhere.
```

`with_overlaps` only ever runs on `POST /assignments` and
`PATCH /assignments/{id}`. Read the member back a second later and the warning
is gone, because nothing recomputes it. The frontend asks for `a.overlaps`,
gets `undefined`, and renders an empty cell — no error, no crash, no clue.
The column has been quietly blank this whole time.

It is worth knowing how deliberate the setup was: the NestJS seed script
double-books member 1 on two different công trình **specifically so this badge
has something to show** (`crm-api-nest/src/seed.ts`, the `ASSIGNMENTS`
comment). Somebody built the demo data for a feature that doesn't run.

## What you're building

Two pure functions, then four lines of wiring.

Two stubs are waiting in a new file,
[`app/core/schedule.py`](../../apps/crm-api/app/core/schedule.py):

```python
def ranges_overlap(
    a_from: date, a_to: date | None, b_from: date, b_to: date | None
) -> bool: ...

def overlapping_ids(
    windows: Iterable[tuple[int, date, date | None]],
) -> dict[int, list[int]]: ...
```

Look at what they take. `overlapping_ids` wants **tuples**, not `Assignment`
rows — no session, no ORM, no `import` from `app.models`. That's on purpose,
and it is the same instinct as `business_day_range` and the `format_code` trio
you met in #70: push the thinking into something you can call from a one-line
test, and leave the database at the door.

`to_date` of `None` means **open-ended** — the person is still on that job, no
end pencilled in. Treat it as "runs forever". Most of the bugs you can write
here live in that one word.

Then `GET /crew/{id}` needs to actually use them, and `CrewMemberDetail` needs
somewhere to put the answer.

## The tests are the spec

[`tests/test_schedule.py`](../../apps/crm-api/tests/test_schedule.py) already
exists and already fails. Make it green.

```sh
cd apps/crm-api
uv run pytest -m exercise     # your 17 tests (and #70's, if that's still open)
uv run pytest -q              # everything else — keep it green the whole time
```

Seventeen tests: thirteen pure ones with no database anywhere, then four that
drive the real endpoint. They're deselected from the normal run so `main` stays
green while you work.

Two of them are worth reading before you write anything:

- `test_windows_that_touch_on_one_day_clash` — A finishes 03-10, B starts
  03-10. That counts.
- `test_windows_that_merely_abut_do_not_clash` — A finishes 03-09, B starts
  03-10. That doesn't.

One day apart, opposite answers. Get that boundary right and most of the rest
falls out.

## Decide and defend

Three questions with no correct answer, only a defended one.

**1. Why does touching count?** The tests say a phân công ending 03-10 clashes
with one starting 03-10. That is not obvious — a hand-off could be perfectly
fine. Find out what `with_overlaps` already answers for that case (read the
`>=` and `<=` in its `where` clause) and explain why your read path must give
the **same** answer as the write path. What would a user see if the two
disagreed?

**2. One rule, or two spellings of it?** After this ticket the overlap rule
exists twice: as SQL inside `with_overlaps`, and as Python in
`ranges_overlap`. You could unify them — load the member's assignments and use
the pure function on both paths — or leave them side by side, since the SQL
version is indexed and doesn't pull rows into memory.

Before you answer, read `overdue_clauses()` in
[`app/api/routes/receivables.py`](../../apps/crm-api/app/api/routes/receivables.py).
Its docstring is two sentences long and argues one side of this exact question
out loud. Agree or disagree, but engage with it.

**3. Closed công trình.** A job finished in March. The member's assignment on
it still has dates that overlap their current job. Should the badge still warn?
The person is not on that site any more. Nothing in the codebase decides this
today — you do. (`Project.stage == "closed"`, and `assert_project_open` in
[`app/core/rules.py`](../../apps/crm-api/app/core/rules.py) shows how the rest
of the app asks that question.)

Whatever you pick for #3, the shipped tests must still pass — if your answer
changes what they should assert, say so in the PR.

## Decisions (fill this in — this is part of the deliverable)

> Replace this block. One short paragraph each, with the reason, not just the
> choice.

- **Why a touching day counts as a clash:** …
- **One definition of the rule or two, and why:** …
- **Whether a closed công trình still warns:** …

## Task

1. **Look at the broken thing first.** Start the API, create two overlapping
   phân công for one member, and watch `POST /assignments` return them in
   `overlaps` while `GET /crew/{id}` returns nothing. One sentence in the PR on
   why a silently-empty field is worse than a 500.
2. **Implement `ranges_overlap`** in
   [`app/core/schedule.py`](../../apps/crm-api/app/core/schedule.py). Both
   `None` cases, and the same answer whichever way round you pass the two
   windows.
3. **Implement `overlapping_ids`.** Every id gets a key, even when it clashes
   with nothing. An id never lists itself. Watch out for the chain case: A
   clashes with B and B with C does **not** mean A clashes with C.
4. **Thirteen tests should now pass** with no database involved:
   `uv run pytest -m exercise`.
5. **Add the response shape.** A new `AssignmentWithOverlaps` in
   [`app/models/crew.py`](../../apps/crm-api/app/models/crew.py) — an
   `AssignmentWithProject` plus `overlaps: list[AssignmentWithProject]` — and
   point `CrewMemberDetail.assignments` at it. Keep the nested ones plain, or
   you'll be nesting overlaps inside overlaps forever.
6. **Wire `get_crew_member`.** It currently returns the row and lets FastAPI
   serialize it; now it has to build the response. **One pass** over the
   assignments already loaded with the member — if you call `with_overlaps` in
   a loop you've written an N+1 query into a page that is only ever a table.
7. **The last four tests pass**, then delete the `pytestmark` line from
   `tests/test_schedule.py`. Leave `pyproject.toml` alone — the `exercise`
   marker stays for whoever gets the next ticket.
8. **Fill in the Decisions block** above.

## Acceptance criteria

- [ ] `uv run pytest -q` runs your seventeen tests alongside everything else
      and is green. (`git grep pytestmark apps/crm-api/tests/test_schedule.py`
      comes back empty.)
- [ ] `uv run ruff check .` is clean.
- [ ] `GET /crew/{id}` and `POST /assignments` never disagree about whether two
      given phân công clash.
- [ ] The warning **crosses công trình** — two jobs, one person, overlapping
      dates, and the badge names the other job's code.
- [ ] Two different people on the same site on the same days produce **no**
      warning. That's a crew, not a double-booking.
- [ ] Reading one member's page costs the same number of queries whether they
      have 2 assignments or 40.
- [ ] `git diff --stat` touches **no** `alembic/versions/`, no
      `apps/crm-web/`, and no table definition — only response schemas.
- [ ] Creating a phân công that overlaps another still returns **201**, not an
      error. This is a warning. It was always a warning.
- [ ] The Decisions block is filled in, each with a reason.

## Hints & references

- **Copy the instinct from:** `business_day_range` in
  [`app/core/rules.py`](../../apps/crm-api/app/core/rules.py) — a calendar rule
  you can test by passing the date in, with no clock and no fixture.
- Two closed ranges overlap when `a.from <= b.to and b.from <= a.to`. Write
  that down, then work out what each half becomes when a `to` is `None`. It
  gets shorter, not longer.
- `date` objects compare with `<`, `<=` and `==` directly. No `timedelta`, no
  `.days`, no string parsing.
- For `overlapping_ids`, comparing each pair once and recording it on **both**
  sides beats comparing every ordered pair and skipping the diagonal.
- `dict.setdefault` or a `{id: [] for …}` seed keeps "present but empty"
  different from "missing".
- The existing `with_overlaps` is the behaviour you must match, not a thing to
  delete on sight. Read it before you decide question 2.
- `tests/test_crew.py` has a passing overlap test already
  (`test_overlaps_are_reported_never_refused`). If your change breaks it, your
  read path and write path have drifted — which is exactly the bug this ticket
  is about.
- **The NestJS twin** is
  [`crm-api-nest/src/crew/crew.module.ts`](../../apps/crm-api-nest/src/crew/crew.module.ts)
  (`withOverlaps`). You are not touching TypeScript — the maintainer mirrors
  your design there once this merges (see [AGENTS.md](../../AGENTS.md), "change
  one, change the other"). Read it anyway: it has the same hole.
- **No migration.** If `alembic` appears in your diff, the answer is wrong.

## Definition of done

The roster page shows "Trùng lịch với CT-…" on a member who is genuinely booked
twice, and shows nothing on a member who isn't; the write path and the read
path agree; the three judgement calls are written down and argued; and nothing
outside `app/core/schedule.py`, `app/models/crew.py`, `app/api/routes/crew.py`
and `tests/test_schedule.py` changed.
