"""Công trình — the project CRUD, its type tags, notes and attachments.

Port of `crm-api-nest/src/projects/projects.module.ts`. No stage gates: a
forward move auto-advances from the work itself (see app/core/rules.py
advance_stage, called from the quote / contract / settlement / milestone routes)
and a manual jump just applies. A closed project is locked.
"""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.api.common import (
    PageDep,
    csv_filter,
    ilike,
    order_by,
    paged,
    unaccented,
)
from app.api.deps import SessionDep, get_current_user
from app.core.rules import (
    CLOSED_PROJECT_MESSAGE,
    STAGE_ORDER,
    assert_project_open,
    business_day_range,
    business_today,
    next_code,
)
from app.models.client import Client, Contact, Location
from app.models.contract import Contract
from app.models.crew import Assignment, TimekeepingRecord
from app.models.paperwork import DEFAULT_PAPERWORK, PaperworkItem
from app.models.project import (
    EXECUTION_SUB_STATUSES,
    PROJECT_STATUSES,
    Attachment,
    AttachmentCreate,
    AttachmentPublic,
    Project,
    ProjectCreate,
    ProjectDetail,
    ProjectListItem,
    ProjectNote,
    ProjectNoteCreate,
    ProjectNotePublic,
    ProjectPublic,
    ProjectStageSummary,
    ProjectType,
    ProjectTypeIn,
    ProjectTypePublic,
    ProjectUpdate,
    ProjectWithRelations,
)
from app.models.quote import Quote
from app.models.receivable import Bill, PaymentMilestone, Settlement

router = APIRouter(
    prefix="/projects", tags=["projects"], dependencies=[Depends(get_current_user)]
)
types_router = APIRouter(
    prefix="/project-types",
    tags=["project-types"],
    dependencies=[Depends(get_current_user)],
)
notes_router = APIRouter(
    prefix="/project-notes",
    tags=["project-notes"],
    dependencies=[Depends(get_current_user)],
)
attachments_router = APIRouter(
    prefix="/attachments",
    tags=["attachments"],
    dependencies=[Depends(get_current_user)],
)


def get_project_or_404(session: Session, project_id: int) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def assert_contact_belongs_to(
    session: Session, client_id: int, contact_id: int, field: str
) -> None:
    """A foreign contact would show on the project header and its printed
    documents, and block the client delete with a raw FK error."""
    contact = session.get(Contact, contact_id)
    if not contact or contact.client_id != client_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{field} must be a contact of the same client",
        )


def resolve_types(session: Session, type_ids: list[int]) -> list[ProjectType]:
    rows = session.exec(select(ProjectType).where(ProjectType.id.in_(type_ids))).all()
    if len(rows) != len(set(type_ids)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "type_ids contains an unknown id"
        )
    return list(rows)


# ── Project types (user-managed tags) ───────────────────────────────────────
@types_router.get("", response_model=list[ProjectTypePublic])
def list_project_types(session: SessionDep) -> list[ProjectType]:
    # Unpaginated on purpose: a handful of user-managed tags the UI needs whole.
    return list(session.exec(select(ProjectType).order_by(ProjectType.name)).all())


@types_router.get("/{type_id}", response_model=ProjectTypePublic)
def get_project_type(session: SessionDep, type_id: int) -> ProjectType:
    row = session.get(ProjectType, type_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project type not found")
    return row


@types_router.post(
    "", response_model=ProjectTypePublic, status_code=status.HTTP_201_CREATED
)
def create_project_type(session: SessionDep, payload: ProjectTypeIn) -> ProjectType:
    row = ProjectType(name=payload.name)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@types_router.patch("/{type_id}", response_model=ProjectTypePublic)
def update_project_type(
    session: SessionDep, type_id: int, payload: ProjectTypeIn
) -> ProjectType:
    row = get_project_type(session, type_id)
    row.name = payload.name
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@types_router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_type(session: SessionDep, type_id: int) -> None:
    row = get_project_type(session, type_id)
    used = session.exec(
        select(func.count())
        .select_from(Project)
        .where(Project.types.any(ProjectType.id == type_id))
    ).one()
    if used:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Project type is used by {used} project(s)"
        )
    session.delete(row)
    session.commit()


# ── Projects ────────────────────────────────────────────────────────────────
@router.get("", response_model=list[ProjectListItem])
def list_projects(
    session: SessionDep,
    response: Response,
    page: PageDep,
    client_id: Annotated[int | None, Query()] = None,
    stage: Annotated[str | None, Query()] = None,
    status_: Annotated[str | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query(max_length=300)] = None,
    # Derived filters for the dashboard / field "today" panels — the same idea
    # as `overdue=true` on the đợt list: the rule belongs where the rows are, or
    # every consumer rebuilds it over whichever page it happened to fetch.
    appointment_date: Annotated[date | None, Query()] = None,
    visited: Annotated[Literal["true", "false"] | None, Query()] = None,
    follow_up_due: Annotated[Literal["true", "false"] | None, Query()] = None,
    sort_by: Annotated[
        Literal["code", "name", "appointment_at", "created_at"] | None, Query()
    ] = None,
    sort_order: Annotated[Literal["asc", "desc"] | None, Query()] = None,
) -> list[Project]:
    statement = select(Project)
    if client_id is not None:
        statement = statement.where(Project.client_id == client_id)
    if appointment_date is not None:
        # Half-open local day, not a UTC date prefix — see business_day_range.
        start, end = business_day_range(appointment_date)
        statement = statement.where(
            Project.appointment_at >= start, Project.appointment_at < end
        )
    if visited == "false":
        statement = statement.where(Project.visit_date.is_(None))
    elif visited == "true":
        statement = statement.where(Project.visit_date.is_not(None))
    if follow_up_due == "true":
        # Parked jobs whose follow-up date has arrived.
        statement = statement.where(
            Project.follow_up_date.is_not(None),
            Project.follow_up_date <= business_today(),
        )
    stages = csv_filter(stage, STAGE_ORDER, "stage")
    if stages:
        statement = statement.where(Project.stage.in_(stages))
    statuses = csv_filter(status_, PROJECT_STATUSES, "status")
    if statuses:
        statement = statement.where(Project.status.in_(statuses))
    if search:
        statement = statement.where(
            or_(
                unaccented(Project.name_norm, search),
                # Codes are ASCII (CT-2026-001), so they need no normalization.
                ilike(Project.code, search),
                Project.client.has(unaccented(Client.name_norm, search)),
            )
        )
    return paged(
        session,
        response,
        statement.order_by(
            *order_by(
                {
                    "code": Project.code,
                    "name": Project.name,
                    "appointment_at": Project.appointment_at,
                    "created_at": Project.created_at,
                },
                sort_by,
                sort_order,
                fallback=[Project.id.desc()],
                tiebreak=Project.id,
            )
        ),
        page,
    )


# Declared above any "/{id}" route so the literal segment wins the match.
@router.get("/summary", response_model=list[ProjectStageSummary])
def get_projects_summary(session: SessionDep) -> list[ProjectStageSummary]:
    """Pipeline rollup for the dashboard: one row per stage, active only.

    `deal_total` is the Σ of each project's CHỐT quote — the committed value,
    not "whatever was last quoted" — so the number on the dashboard means one
    specific thing. Twin of GET /projects/summary in
    crm-api-nest/src/projects/projects.module.ts, which reduces in JS because
    Prisma cannot group by a relation field; here it is one grouped join.
    """
    counts = dict(
        session.exec(
            select(Project.stage, func.count())
            .where(Project.status == "active")
            .group_by(Project.stage)
        ).all()
    )
    deal_totals = dict(
        session.exec(
            select(Project.stage, func.sum(Quote.total_amount))
            .join(Quote, Quote.project_id == Project.id)
            .where(Project.status == "active", Quote.status == "deal")
            .group_by(Project.stage)
        ).all()
    )
    # Every stage present and in pipeline order, so the dashboard renders its
    # columns without inventing the empty ones itself.
    return [
        ProjectStageSummary(
            stage=stage,
            count=counts.get(stage, 0),
            deal_total=deal_totals.get(stage) or 0,
        )
        for stage in STAGE_ORDER
    ]


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(session: SessionDep, project_id: int) -> Project:
    return get_project_or_404(session, project_id)


@router.post(
    "", response_model=ProjectWithRelations, status_code=status.HTTP_201_CREATED
)
def create_project(session: SessionDep, payload: ProjectCreate) -> Project:
    location = session.get(Location, payload.location_id)
    if not location or location.client_id != payload.client_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "location_id does not belong to client_id"
        )
    # location.manager_contact_id is known-good; only client-supplied ids need it.
    if payload.working_contact_id is not None:
        assert_contact_belongs_to(
            session,
            payload.client_id,
            payload.working_contact_id,
            "working_contact_id",
        )
    if payload.decision_maker_contact_id is not None:
        assert_contact_belongs_to(
            session,
            payload.client_id,
            payload.decision_maker_contact_id,
            "decision_maker_contact_id",
        )
    # May stay None: a walk-in company often has no named contact on the first
    # call, and the intake form's quick-create block lets it through. The
    # workspace header is where one gets attached later.
    working = payload.working_contact_id or location.manager_contact_id
    types = resolve_types(session, payload.type_ids)
    project = Project(
        code=next_code(session, Project, "CT"),
        name=payload.name,
        client_id=payload.client_id,
        location_id=payload.location_id,
        working_contact_id=working,
        decision_maker_contact_id=payload.decision_maker_contact_id or working,
        stage=payload.stage or "request",
        appointment_at=payload.appointment_at,
        request_note=payload.request_note,
        referral_source=payload.referral_source,
        survey_items=(
            [item.model_dump() for item in payload.survey_items]
            if payload.survey_items is not None
            else None
        ),
        types=types,
    )
    session.add(project)
    # flush(), not commit(): the auto-seeded stage-5 checklist goes in the SAME
    # transaction as the project, so no công trình can exist without it.
    session.flush()
    for name in DEFAULT_PAPERWORK:
        session.add(PaperworkItem(project_id=project.id, name=name))
    session.commit()
    session.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectPublic)
def update_project(
    session: SessionDep, project_id: int, payload: ProjectUpdate
) -> Project:
    project = get_project_or_404(session, project_id)
    fields = payload.model_dump(exclude_unset=True)

    # Closed projects are locked; the only allowed PATCH is the reopen
    # transition (stage: closed → settlement), a backward move — no gates.
    if project.stage == "closed" and fields.get("stage") != "settlement":
        raise HTTPException(status.HTTP_409_CONFLICT, CLOSED_PROJECT_MESSAGE)

    # Forward-only in [kickoff, hoarding, works]; skipping is allowed (kickoff →
    # works directly — dựng rào is optional for indoor jobs).
    if (
        "execution_sub_status" in fields
        and project.execution_sub_status is not None
        and EXECUTION_SUB_STATUSES.index(fields["execution_sub_status"])
        < EXECUTION_SUB_STATUSES.index(project.execution_sub_status)
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "execution_sub_status can only move forward (kickoff → hoarding → works)",
        )

    if fields.get("status") == "cancelled" and not (
        fields.get("cancel_reason") or project.cancel_reason
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "cancel_reason is required when cancelling a project",
        )

    # The client comes from the row — a PATCH cannot move a project.
    for field in ("working_contact_id", "decision_maker_contact_id"):
        if fields.get(field) is not None:
            assert_contact_belongs_to(session, project.client_id, fields[field], field)

    if "type_ids" in fields:
        project.types = resolve_types(session, fields.pop("type_ids"))
    # Server-stamped, never client-supplied.
    if (
        fields.get("acceptance_sub_status") == "passed"
        and not project.acceptance_passed_date
    ):
        fields["acceptance_passed_date"] = business_today()
    project.sqlmodel_update(fields)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


# Every child relation is required, so a bare delete would raise a foreign-key
# error and surface as a 500 for EVERY project (all of them get 4 paperwork items
# on create). Refuse with a reason when real records exist; cancelling the
# project (status: cancelled) is the intended path.
_BLOCKING = (
    ("quotes", Quote, Quote.project_id),
    ("contracts", Contract, Contract.project_id),
    ("bills", Bill, Bill.project_id),
    ("payment_milestones", PaymentMilestone, PaymentMilestone.project_id),
    ("assignments", Assignment, Assignment.project_id),
    ("timekeeping", TimekeepingRecord, TimekeepingRecord.project_id),
    ("attachments", Attachment, Attachment.project_id),
    ("settlement", Settlement, Settlement.project_id),
)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(session: SessionDep, project_id: int) -> None:
    project = get_project_or_404(session, project_id)
    assert_project_open(session, project_id)

    blocking = []
    for label, model, column in _BLOCKING:
        count = session.exec(
            select(func.count()).select_from(model).where(column == project_id)
        ).one()
        if count:
            blocking.append(f"{label} ({count})")
    if blocking:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"cannot delete project: it still has {', '.join(blocking)} "
            "— cancel it instead",
        )

    # Only the incidental children go: paperwork items are auto-seeded on create
    # and notes are annotations. Anything with business meaning blocks above.
    for item in session.exec(
        select(PaperworkItem).where(PaperworkItem.project_id == project_id)
    ).all():
        session.delete(item)
    for note in session.exec(
        select(ProjectNote).where(ProjectNote.project_id == project_id)
    ).all():
        session.delete(note)
    session.delete(project)
    session.commit()


# ── Project notes ───────────────────────────────────────────────────────────
@notes_router.get("", response_model=list[ProjectNotePublic])
def list_project_notes(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
) -> list[ProjectNote]:
    statement = select(ProjectNote)
    if project_id is not None:
        statement = statement.where(ProjectNote.project_id == project_id)
    return paged(
        session,
        response,
        # created_at repeats within a bulk insert — id breaks the tie so pages
        # don't overlap or drop rows.
        statement.order_by(ProjectNote.created_at.desc(), ProjectNote.id.desc()),
        page,
    )


@notes_router.post(
    "", response_model=ProjectNotePublic, status_code=status.HTTP_201_CREATED
)
def create_project_note(session: SessionDep, payload: ProjectNoteCreate) -> ProjectNote:
    # No closed-project lock: notes are the one thing a closed công trình accepts.
    note = ProjectNote.model_validate(payload)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@notes_router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_note(session: SessionDep, note_id: int) -> None:
    note = session.get(ProjectNote, note_id)
    if not note:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    session.delete(note)
    session.commit()


# ── Attachments (S3 metadata rows only; storage TBD) ────────────────────────
@attachments_router.get("", response_model=list[AttachmentPublic])
def list_attachments(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    kind: Annotated[str | None, Query()] = None,
) -> list[Attachment]:
    statement = select(Attachment)
    if project_id is not None:
        statement = statement.where(Attachment.project_id == project_id)
    if kind:
        statement = statement.where(Attachment.kind == kind)
    return paged(
        session,
        response,
        statement.order_by(Attachment.created_at.desc(), Attachment.id.desc()),
        page,
    )


@attachments_router.post(
    "", response_model=AttachmentPublic, status_code=status.HTTP_201_CREATED
)
def create_attachment(session: SessionDep, payload: AttachmentCreate) -> Attachment:
    assert_project_open(session, payload.project_id)
    # Another project's checklist row would collect this file silently.
    if payload.paperwork_item_id is not None:
        item = session.get(PaperworkItem, payload.paperwork_item_id)
        if not item or item.project_id != payload.project_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "paperwork_item_id does not belong to project_id",
            )
    attachment = Attachment.model_validate(payload)
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    return attachment


@attachments_router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(session: SessionDep, attachment_id: int) -> None:
    attachment = session.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")
    assert_project_open(session, attachment.project_id)
    session.delete(attachment)
    session.commit()
