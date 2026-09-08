"""Cross-resource business rules: the stage machine, the closed-project lock,
server-assigned document codes and the business calendar date.

The NestJS twin of this file is `crm-api-nest/src/common/{stage,project-lock,
code,business-date}.ts`. Keep the two in step — these rules decide what a công
trình's stage means and when it may still be edited.
"""

from collections.abc import Iterable
from datetime import UTC, date, datetime, timedelta
from typing import get_args
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.models.project import Project, ProjectStage

# All business dates are Vietnam calendar dates. A `date` column takes a `date`
# straight through, so unlike the Nest backend there is no UTC-midnight dance
# here — just don't reach for the container's local `date.today()`.
BUSINESS_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

# The 8 lifecycle stages, in order — read straight off the type crm-web's
# payloads are validated against (app/models/project.py). "survey" was merged
# into "request": the appointment IS the survey visit, and `visit_date` marks
# where inside the stage we are.
STAGE_ORDER: tuple[str, ...] = get_args(ProjectStage)

CLOSED_PROJECT_MESSAGE = (
    "project is closed — reopen it (stage: settlement) before editing"
)


def business_today() -> date:
    """Today's date on the Vietnam business calendar."""
    return datetime.now(BUSINESS_TZ).date()


def business_day_range(day: date) -> tuple[datetime, datetime]:
    """Half-open [start, next) in UTC covering one Vietnam calendar day.

    For filtering a TIMESTAMP column (`appointment_at`) by a local date. Vietnam
    has no DST, so the day is exactly [+07:00 midnight, +1 day). Comparing UTC
    date prefixes instead is the bug this exists to prevent: an appointment at
    06:30 ICT is stored 23:30Z on the PREVIOUS UTC day. Twin of
    `businessDayRange` in crm-api-nest/src/common/business-date.ts.
    """
    start = datetime.combine(day, datetime.min.time(), tzinfo=BUSINESS_TZ)
    return start.astimezone(UTC), (start + timedelta(days=1)).astimezone(UTC)


def should_advance(current: str, target: str) -> bool:
    """Forward-only, and never out of a closed project."""
    if current == "closed":
        return False
    return STAGE_ORDER.index(target) > STAGE_ORDER.index(current)


def advance_stage(session: Session, project_id: int | None, target: str) -> None:
    """Auto-advance: doing the work bumps the stage (`stage = max(stage, target)`).

    Safe to call opportunistically after creating an artifact — a no-op when
    `project_id` is None (standalone quote/contract) or the project is already
    at or past `target`. Commits, so call it after the artifact is committed.
    """
    if project_id is None:
        return
    project = session.get(Project, project_id)
    if project is None or not should_advance(project.stage, target):
        return
    project.stage = target
    session.add(project)
    session.commit()


def assert_project_open(session: Session, project_id: int | None) -> None:
    """Reject mutations on a closed project (its entities included).

    Exempt: ProjectNote, and the reopen transition (closed → settlement), which
    the projects route handles itself.
    """
    if project_id is None:
        return  # standalone quote/contract — nothing to lock
    project = session.get(Project, project_id)
    if project is not None and project.stage == "closed":
        raise HTTPException(status.HTTP_409_CONFLICT, CLOSED_PROJECT_MESSAGE)


# ── Document codes ──────────────────────────────────────────────────────────
# STUDENT EXERCISE — docs/tasks/01-document-code-sequencing.md.
#
# The three functions below are stubs. They are the shape `next_code` is meant
# to be rebuilt on: two pure functions that know nothing about a database, plus
# one thin wrapper that does the query. `tests/test_codes.py` is the spec —
# run it with `uv run pytest -m exercise`.
#
# They exist as stubs rather than as an empty file so the test module imports
# cleanly: a missing name is a collection error, which fails CI on every
# unrelated pull request too.


def format_code(prefix: str, year: int, sequence: int) -> str:
    """`("CT", 2026, 1)` → `"CT-2026-001"`. The only place the wire format
    lives — a code that is read back by `parse_sequence` must be written here.
    """
    raise NotImplementedError("student exercise: docs/tasks/01-…")


def parse_sequence(code: str, prefix: str, year: int) -> int | None:
    """The sequence number out of `code`, but only when it belongs to this
    prefix AND this year — otherwise `None`.

    `None` is also the answer for anything unparsable. Rows are edited by hand
    and codes predate this function, so junk must not raise: a bad row somewhere
    in the table cannot be allowed to block creating a new công trình.
    """
    raise NotImplementedError("student exercise: docs/tasks/01-…")


def next_sequence(existing_codes: Iterable[str], prefix: str, year: int) -> int:
    """The next number for this prefix in this year, given every code already
    issued. `1` when the year has none yet — that is how January restarts.
    """
    raise NotImplementedError("student exercise: docs/tasks/01-…")


def next_code(session: Session, model: type, prefix: str) -> str:
    """Server-assigned document code: CT-2026-001, BG-…, HD-…, QT-….

    ponytail: sequence number is max(id) + 1 and the year is hardcoded — not
    race-safe under concurrent inserts, fine for this app. The NestJS backend
    carries the identical caveat on purpose so both emit the same codes.
    """
    highest = session.exec(select(func.max(model.id))).one()
    return f"{prefix}-2026-{(highest or 0) + 1:03d}"


def assert_step(order: tuple[str, ...], current: str, target: str) -> None:
    """One step forward along a status chain, nothing else."""
    if order.index(target) != order.index(current) + 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid status transition: {current} → {target}",
        )
