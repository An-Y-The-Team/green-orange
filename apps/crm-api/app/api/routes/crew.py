"""Nhân sự — crew roles, the roster, phân công and chấm công.

Port of `crm-api-nest/src/crew/crew.module.ts`. A member who has worked is never
deleted (set `status: left`), only a `working` member can take a NEW assignment,
and double-booking is answered with an `overlaps` warning rather than a refusal.
"""

from datetime import date, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlmodel import Session, or_, select

from app.api.common import (
    PageDep,
    csv_filter,
    ilike,
    order_by,
    paged,
    unaccented,
)
from app.api.deps import SessionDep, get_current_user
from app.core.rules import assert_project_open, business_today
from app.models.crew import (
    CREW_STATUS_WORKING,
    CREW_STATUSES,
    EMPLOYMENT_TYPES,
    TIMEKEEPING_SOURCE_MANUAL,
    Assignment,
    AssignmentCreate,
    AssignmentListItem,
    AssignmentPublic,
    AssignmentUpdate,
    AssignmentWithProject,
    CrewCreate,
    CrewMember,
    CrewMemberDetail,
    CrewMemberPublic,
    CrewRole,
    CrewRoleCreate,
    CrewRolePublic,
    CrewRoleUpdate,
    CrewUpdate,
    TimekeepingCreate,
    TimekeepingPublic,
    TimekeepingRecord,
    TimekeepingSummary,
)

roles_router = APIRouter(
    prefix="/crew-roles", tags=["crew-roles"], dependencies=[Depends(get_current_user)]
)
router = APIRouter(
    prefix="/crew", tags=["crew"], dependencies=[Depends(get_current_user)]
)
assignments_router = APIRouter(
    prefix="/assignments",
    tags=["assignments"],
    dependencies=[Depends(get_current_user)],
)
timekeeping_router = APIRouter(
    prefix="/timekeeping",
    tags=["timekeeping"],
    dependencies=[Depends(get_current_user)],
)

# GET /timekeeping has all-optional filters over the fastest-growing table (one
# row per member per work day per source), so a dateless call would sort the
# whole table. Callers that want older records must send `from`/`to`.
DEFAULT_TIMEKEEPING_WINDOW_DAYS = 31


def csv_ints(value: str | None) -> list[int] | None:
    parts = [p.strip() for p in (value or "").split(",") if p.strip()]
    if not parts:
        return None
    try:
        return [int(p) for p in parts]
    except ValueError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "role_id must be a comma-separated id list"
        ) from None


def get_role_or_404(session: Session, role_id: int) -> CrewRole:
    row = session.get(CrewRole, role_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Crew role not found")
    return row


def get_member_or_404(session: Session, member_id: int) -> CrewMember:
    row = session.get(CrewMember, member_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Crew member not found")
    return row


def get_assignment_or_404(session: Session, assignment_id: int) -> Assignment:
    row = session.get(Assignment, assignment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    return row


def assert_assignment_refs(
    session: Session, crew_member_id: int | None, role_id: int | None
) -> None:
    """Both FKs in one place, so create and update can never drift. The status
    rule is the server half of the picker filter: a member who has left must not
    land on a new phân công (and from there on the printed worker list)."""
    if crew_member_id is not None:
        member = session.get(CrewMember, crew_member_id)
        if not member:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "crew_member_id does not exist"
            )
        if member.status != CREW_STATUS_WORKING:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "crew_member_id must be a crew member with status "
                f'"{CREW_STATUS_WORKING}"',
            )
    # null clears the role override — only a given id needs to exist.
    if role_id is not None:
        if not session.get(CrewRole, role_id):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "role_id does not exist")


# ── Crew roles (vai trò) — user-managed name list ───────────────────────────
@roles_router.get("", response_model=list[CrewRolePublic])
def list_crew_roles(session: SessionDep) -> list[CrewRole]:
    # Unpaginated on purpose: a handful of user-managed names.
    return list(session.exec(select(CrewRole).order_by(CrewRole.name)).all())


@roles_router.get("/{role_id}", response_model=CrewRolePublic)
def get_crew_role(session: SessionDep, role_id: int) -> CrewRole:
    return get_role_or_404(session, role_id)


@roles_router.post(
    "", response_model=CrewRolePublic, status_code=status.HTTP_201_CREATED
)
def create_crew_role(session: SessionDep, payload: CrewRoleCreate) -> CrewRole:
    row = CrewRole(name=payload.name)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@roles_router.patch("/{role_id}", response_model=CrewRolePublic)
def update_crew_role(
    session: SessionDep, role_id: int, payload: CrewRoleUpdate
) -> CrewRole:
    row = get_role_or_404(session, role_id)
    row.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@roles_router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crew_role(session: SessionDep, role_id: int) -> None:
    row = get_role_or_404(session, role_id)
    members = session.exec(
        select(func.count())
        .select_from(CrewMember)
        .where(CrewMember.default_role_id == role_id)
    ).one()
    assignments = session.exec(
        select(func.count())
        .select_from(Assignment)
        .where(Assignment.role_id == role_id)
    ).one()
    if members or assignments:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Crew role is in use by members or assignments",
        )
    session.delete(row)
    session.commit()


# ── Crew members (nhân sự) ──────────────────────────────────────────────────
@router.get("", response_model=list[CrewMemberPublic])
def list_crew(
    session: SessionDep,
    response: Response,
    page: PageDep,
    status_: Annotated[str | None, Query(alias="status")] = None,
    employment_type: Annotated[str | None, Query()] = None,
    role_id: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=300)] = None,
    sort_by: Annotated[Literal["name", "created_at"] | None, Query()] = None,
    sort_order: Annotated[Literal["asc", "desc"] | None, Query()] = None,
) -> list[CrewMember]:
    statement = select(CrewMember)
    statuses = csv_filter(status_, CREW_STATUSES, "status")
    if statuses:
        statement = statement.where(CrewMember.status.in_(statuses))
    types = csv_filter(employment_type, EMPLOYMENT_TYPES, "employment_type")
    if types:
        statement = statement.where(CrewMember.employment_type.in_(types))
    role_ids = csv_ints(role_id)
    if role_ids:
        statement = statement.where(CrewMember.default_role_id.in_(role_ids))
    if search:
        statement = statement.where(
            or_(
                unaccented(CrewMember.name_norm, search),
                ilike(CrewMember.phone, search),  # phone numbers are digits
            )
        )
    return paged(
        session,
        response,
        statement.order_by(
            *order_by(
                {"name": CrewMember.name, "created_at": CrewMember.created_at},
                sort_by,
                sort_order,
                # Namesakes are common on a roster — id breaks the tie so pages
                # are stable.
                fallback=[CrewMember.name.asc(), CrewMember.id.asc()],
                tiebreak=CrewMember.id,
            )
        ),
        page,
    )


@router.get("/{member_id}", response_model=CrewMemberDetail)
def get_crew_member(session: SessionDep, member_id: int) -> CrewMember:
    return get_member_or_404(session, member_id)


@router.post("", response_model=CrewMemberPublic, status_code=status.HTTP_201_CREATED)
def create_crew_member(session: SessionDep, payload: CrewCreate) -> CrewMember:
    member = CrewMember(
        name=payload.name,
        phone=payload.phone,
        employment_type=payload.employment_type,
        default_role_id=payload.default_role_id,
        note=payload.note,
    )
    if payload.status is not None:
        member.status = payload.status
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


@router.patch("/{member_id}", response_model=CrewMemberPublic)
def update_crew_member(
    session: SessionDep, member_id: int, payload: CrewUpdate
) -> CrewMember:
    member = get_member_or_404(session, member_id)
    member.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crew_member(session: SessionDep, member_id: int) -> None:
    """The roster keeps day-hire history for re-hire, so deleting someone who has
    worked is wrong — refuse when the member has any work trail."""
    member = get_member_or_404(session, member_id)
    assignments = session.exec(
        select(func.count())
        .select_from(Assignment)
        .where(Assignment.crew_member_id == member_id)
    ).one()
    timekeeping = session.exec(
        select(func.count())
        .select_from(TimekeepingRecord)
        .where(TimekeepingRecord.crew_member_id == member_id)
    ).one()
    if assignments or timekeeping:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Crew member has assignments or timekeeping records; "
            "set status to 'left' instead",
        )
    session.delete(member)
    session.commit()


# ── Assignments (phân công) ─────────────────────────────────────────────────
def with_overlaps(session: Session, row: Assignment) -> AssignmentPublic:
    """Double-booking is allowed and common — `overlaps` only feeds the UI's
    non-blocking warning, never a rejection."""
    conditions = [
        Assignment.crew_member_id == row.crew_member_id,
        Assignment.id != row.id,
        # other.to_date ≥ this.from_date (or open-ended) …
        or_(Assignment.to_date.is_(None), Assignment.to_date >= row.from_date),
    ]
    # … and other.from_date ≤ this.to_date (unless this one is open-ended)
    if row.to_date:
        conditions.append(Assignment.from_date <= row.to_date)
    overlaps = session.exec(select(Assignment).where(*conditions)).all()
    return AssignmentPublic(
        **AssignmentListItem.model_validate(row).model_dump(),
        overlaps=[AssignmentWithProject.model_validate(o) for o in overlaps],
    )


@assignments_router.get("", response_model=list[AssignmentListItem])
def list_assignments(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    crew_member_id: Annotated[int | None, Query()] = None,
) -> list[Assignment]:
    statement = select(Assignment)
    if project_id is not None:
        statement = statement.where(Assignment.project_id == project_id)
    if crew_member_id is not None:
        statement = statement.where(Assignment.crew_member_id == crew_member_id)
    return paged(
        session,
        response,
        # A crew intake shares one from_date across rows — id breaks the tie.
        statement.order_by(Assignment.from_date.desc(), Assignment.id.desc()),
        page,
    )


@assignments_router.post(
    "", response_model=AssignmentPublic, status_code=status.HTTP_201_CREATED
)
def create_assignment(
    session: SessionDep, payload: AssignmentCreate
) -> AssignmentPublic:
    assert_project_open(session, payload.project_id)
    assert_assignment_refs(session, payload.crew_member_id, payload.role_id)
    row = Assignment.model_validate(payload)
    session.add(row)
    session.commit()
    session.refresh(row)
    return with_overlaps(session, row)


@assignments_router.patch("/{assignment_id}", response_model=AssignmentPublic)
def update_assignment(
    session: SessionDep, assignment_id: int, payload: AssignmentUpdate
) -> AssignmentPublic:
    row = get_assignment_or_404(session, assignment_id)
    assert_project_open(session, row.project_id)
    # Same assertions as create, but only over the fields actually sent — fixing
    # the dates of an old assignment whose member has since left still works.
    fields = payload.model_dump(exclude_unset=True)
    assert_assignment_refs(session, fields.get("crew_member_id"), fields.get("role_id"))
    row.sqlmodel_update(fields)
    session.add(row)
    session.commit()
    session.refresh(row)
    return with_overlaps(session, row)


@assignments_router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(session: SessionDep, assignment_id: int) -> None:
    row = get_assignment_or_404(session, assignment_id)
    assert_project_open(session, row.project_id)
    session.delete(row)
    session.commit()


# ── Timekeeping (chấm công) ─────────────────────────────────────────────────
def timekeeping_summary(session: Session, project_id: int) -> TimekeepingSummary:
    """One project's chấm công totals: hours summed and distinct work days
    counted, over EVERY row the project has (never one page of them).

    Manual WINS over zalo_app per member+day — it does not sum. The weekly grid
    renders `manual?.hours ?? zalo?.hours`, so a day whose zalo hours were
    corrected by hand holds two rows but displays one number; summing both would
    count it twice. `recorded_days` counts a day that has any row, matching the
    grid showing that cell filled.
    """
    # Grouped in SQL: no page limit to get wrong, and only the three columns the
    # rule needs leave Postgres.
    groups = session.exec(
        select(
            TimekeepingRecord.crew_member_id,
            TimekeepingRecord.work_date,
            TimekeepingRecord.source,
            func.sum(TimekeepingRecord.hours),
        )
        .where(TimekeepingRecord.project_id == project_id)
        .group_by(
            TimekeepingRecord.crew_member_id,
            TimekeepingRecord.work_date,
            TimekeepingRecord.source,
        )
    ).all()

    # One entry per member+day. A manual group overwrites whatever a zalo_app one
    # put there and blocks the reverse, so row order out of Postgres cannot
    # change the answer.
    hours_per_member_day: dict[tuple[int, date], float] = {}
    days: set[date] = set()
    for member_id, work_date, source, hours in groups:
        days.add(work_date)
        key = (member_id, work_date)
        if source != TIMEKEEPING_SOURCE_MANUAL and key in hours_per_member_day:
            continue
        hours_per_member_day[key] = float(hours or 0)

    return TimekeepingSummary(
        project_id=project_id,
        # Hours are halves in practice, but float addition still produces
        # 15.299999999999999 — round it before it reaches the panel.
        total_hours=round(sum(hours_per_member_day.values()), 2),
        recorded_days=len(days),
    )


@timekeeping_router.get("", response_model=list[TimekeepingPublic])
def list_timekeeping(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    crew_member_id: Annotated[int | None, Query()] = None,
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: Annotated[date | None, Query()] = None,
) -> list[TimekeepingRecord]:
    statement = select(TimekeepingRecord)
    if project_id is not None:
        statement = statement.where(TimekeepingRecord.project_id == project_id)
    if crew_member_id is not None:
        statement = statement.where(TimekeepingRecord.crew_member_id == crew_member_id)
    if from_ or to:
        if from_:
            statement = statement.where(TimekeepingRecord.work_date >= from_)
        if to:
            statement = statement.where(TimekeepingRecord.work_date <= to)
    else:
        # A dateless call gets the last DEFAULT_TIMEKEEPING_WINDOW_DAYS, not all
        # time: the weekly grid renders 7 days and refetches after every save.
        statement = statement.where(
            TimekeepingRecord.work_date
            >= business_today() - timedelta(days=DEFAULT_TIMEKEEPING_WINDOW_DAYS)
        )
    return paged(
        session,
        response,
        # Several members share a work_date — id breaks the tie.
        statement.order_by(
            TimekeepingRecord.work_date.desc(), TimekeepingRecord.id.desc()
        ),
        page,
    )


# Declared above any "/{id}" route so the literal segment wins the match.
@timekeeping_router.get("/summary", response_model=TimekeepingSummary)
def get_timekeeping_summary(
    session: SessionDep, project_id: Annotated[int, Query(ge=1)]
) -> TimekeepingSummary:
    return timekeeping_summary(session, project_id)


@timekeeping_router.post(
    "", response_model=TimekeepingPublic, status_code=status.HTTP_201_CREATED
)
def create_timekeeping(
    session: SessionDep, payload: TimekeepingCreate
) -> TimekeepingRecord:
    """Upsert: re-entering a day overwrites that source's row. Manual is the
    source of truth; a zalo_app row may coexist for the same day."""
    assert_project_open(session, payload.project_id)
    row = session.exec(
        select(TimekeepingRecord).where(
            TimekeepingRecord.crew_member_id == payload.crew_member_id,
            TimekeepingRecord.project_id == payload.project_id,
            TimekeepingRecord.work_date == payload.work_date,
            TimekeepingRecord.source == payload.source,
        )
    ).first()
    if row is None:
        row = TimekeepingRecord.model_validate(payload)
    else:
        row.hours = payload.hours
        row.note = payload.note
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@timekeeping_router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timekeeping(session: SessionDep, record_id: int) -> None:
    row = session.get(TimekeepingRecord, record_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Timekeeping record not found")
    assert_project_open(session, row.project_id)
    session.delete(row)
    session.commit()
