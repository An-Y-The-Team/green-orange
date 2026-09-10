"""Công trình — the project a job lives on, plus its notes and attachments.

The lifecycle is the 8 stages in `STAGE_ORDER` (app/core/rules.py). Transitions
are SOFT: doing the work auto-advances the stage (a quote created → `quote`, a
cọc paid → `paperwork`, …) and a manual jump just applies. A `closed` project is
locked — reopen it (stage: settlement) before editing.
"""

from datetime import date, datetime
from typing import Literal

from sqlalchemy import DateTime
from sqlmodel import JSON, Field, Relationship, SQLModel

from app.models.client import (
    Client,
    ClientPublic,
    Contact,
    ContactPublic,
    Location,
    LocationPublic,
    utcnow,
)
from app.models.paperwork import PaperworkItem, PaperworkItemPublic
from app.models.quote import Quote, QuoteInProject
from app.models.refs import ContactRef

PROJECT_STATUSES = ("active", "on_hold", "cancelled")
EXECUTION_SUB_STATUSES = ("kickoff", "hoarding", "works")
ACCEPTANCE_SUB_STATUSES = ("request_sent", "inspecting", "rework", "passed")
ATTACHMENT_KINDS = (
    "survey",
    "site_log",
    "finish_image",
    "signed_contract",
    "acceptance_report",
    "settlement",
    "paperwork",
    "other",
)

# The 8 lifecycle stages, in order. app/core/rules.py reads STAGE_ORDER off this
# Literal, so the list lives in exactly one place.
ProjectStage = Literal[
    "request",
    "quote",
    "contract",
    "paperwork",
    "execution",
    "acceptance",
    "settlement",
    "closed",
]
ProjectStatus = Literal["active", "on_hold", "cancelled"]
ExecutionSubStatus = Literal["kickoff", "hoarding", "works"]
AcceptanceSubStatus = Literal["request_sent", "inspecting", "rework", "passed"]
AttachmentKind = Literal[
    "survey",
    "site_log",
    "finish_image",
    "signed_contract",
    "acceptance_report",
    "settlement",
    "paperwork",
    "other",
]


# ── Tables ──────────────────────────────────────────────────────────────────
class ProjectTypeLink(SQLModel, table=True):
    """Join table for the 1..n type tags a công trình carries."""

    project_id: int | None = Field(
        default=None, foreign_key="project.id", primary_key=True
    )
    project_type_id: int | None = Field(
        default=None, foreign_key="projecttype.id", primary_key=True
    )


class ProjectType(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    # User-managed; seeded: Vệ sinh, Thi công, Tháo dỡ.
    name: str = Field(unique=True)


class Project(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(unique=True)  # CT-2026-001, server-assigned
    client_id: int = Field(foreign_key="client.id", index=True)
    location_id: int = Field(foreign_key="location.id", index=True)
    # Both nullable: a công trình can be opened for a company whose contact
    # person is not known yet (the intake form's quick-create allows it). When
    # one IS given, working defaults to the location manager and decision maker
    # to the working contact — app logic, see routes/projects.py create_project.
    working_contact_id: int | None = Field(
        default=None, foreign_key="contact.id", index=True
    )
    decision_maker_contact_id: int | None = Field(
        default=None, foreign_key="contact.id", index=True
    )
    name: str
    # Search key: lower(unaccent(name)) — see app/core/search.py. Written by the
    # mapper event in app/models/__init__.py, never returned (the response
    # models below list their fields explicitly), GIN-indexed in the migration.
    name_norm: str | None = None
    # Stage 1: what they want done, from the first call.
    request_note: str | None = None
    # Stage 1: free text (giới thiệu, gọi lại, …) — not a managed list.
    referral_source: str | None = None
    stage: str = Field(default="request", index=True)
    status: str = Field(default="active", index=True)
    cancel_reason: str | None = None  # required when status = cancelled
    follow_up_date: date | None = None  # on_hold jobs resurface
    # Stage 1; a reschedule is an update in place.
    appointment_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)
    )
    # "Đã gặp khách" tap — in-stage marker (null = awaiting appointment).
    visit_date: date | None = None
    survey_note: str | None = None
    # Stage 1 scratch rows that prefill quote items: {name, quantity, unit,
    # note}[]. Never queried across projects, so JSON is enough.
    survey_items: list[dict] | None = Field(default=None, sa_type=JSON)
    client_signed_date: date | None = None  # stage-3 gate
    execution_sub_status: str | None = None  # kickoff | hoarding | works
    start_date: date | None = None
    est_duration_days: int | None = None
    # Manual is the source of truth; the timekeeping-derived figure is computed
    # at read time (GET /timekeeping/summary).
    actual_duration_days: int | None = None
    approaches: str | None = None  # free text until a structure emerges
    # Stage-7 letters, plain text; None/blank = crm-web's built-in wording.
    acceptance_letter_body: str | None = None
    building_letter_body: str | None = None
    works_done_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)
    )
    # request_sent | inspecting | rework | passed
    acceptance_sub_status: str | None = None
    # Stamped server-side when acceptance_sub_status → passed.
    acceptance_passed_date: date | None = None
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"onupdate": utcnow},
    )

    client: Client = Relationship()
    location: Location = Relationship()
    working_contact: Contact | None = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Project.working_contact_id]"}
    )
    decision_maker: Contact | None = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Project.decision_maker_contact_id]"}
    )
    types: list[ProjectType] = Relationship(link_model=ProjectTypeLink)
    quotes: list[Quote] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"order_by": "desc(Quote.version)"},
    )
    paperwork_items: list[PaperworkItem] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"order_by": "PaperworkItem.id"},
    )
    notes: list["ProjectNote"] = Relationship(
        sa_relationship_kwargs={
            "order_by": "(desc(ProjectNote.created_at), desc(ProjectNote.id))"
        }
    )


class ProjectNote(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    tag: str | None = None  # e.g. kickoff, hoarding, rework
    body: str
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )


class Attachment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    kind: str
    paperwork_item_id: int | None = Field(
        default=None, foreign_key="paperworkitem.id", index=True
    )
    s3_key: str  # S3 architecture TBD — the shape is stable regardless
    note: str | None = None
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )


# ── Request schemas ─────────────────────────────────────────────────────────
class ProjectTypeIn(SQLModel):
    name: str = Field(min_length=1)


class SurveyItemIn(SQLModel):
    name: str = Field(min_length=1)
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = None
    note: str | None = None


class ProjectCreate(SQLModel):
    name: str = Field(min_length=1)
    client_id: int
    location_id: int
    working_contact_id: int | None = None
    decision_maker_contact_id: int | None = None
    type_ids: list[int] = Field(min_length=1)
    # Creating at a later stage asserts historical state (backfill); no gates
    # run on create.
    stage: ProjectStage | None = None
    request_note: str | None = None
    referral_source: str | None = None
    # Accepted on create so the intake form is ONE write — a failed follow-up
    # PATCH used to report failure on an already-committed project.
    appointment_at: datetime | None = None
    survey_items: list[SurveyItemIn] | None = None


class ProjectUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1)
    working_contact_id: int | None = None
    decision_maker_contact_id: int | None = None
    type_ids: list[int] | None = Field(default=None, min_length=1)
    request_note: str | None = None
    referral_source: str | None = None
    survey_items: list[SurveyItemIn] | None = None
    stage: ProjectStage | None = None
    status: ProjectStatus | None = None
    cancel_reason: str | None = None
    follow_up_date: date | None = None
    appointment_at: datetime | None = None
    visit_date: date | None = None
    survey_note: str | None = None
    client_signed_date: date | None = None
    execution_sub_status: ExecutionSubStatus | None = None
    start_date: date | None = None
    est_duration_days: int | None = Field(default=None, ge=0)
    actual_duration_days: int | None = Field(default=None, ge=0)
    approaches: str | None = None
    acceptance_letter_body: str | None = None
    building_letter_body: str | None = None
    works_done_at: datetime | None = None
    acceptance_sub_status: AcceptanceSubStatus | None = None


class ProjectNoteCreate(SQLModel):
    project_id: int
    tag: str | None = None
    body: str = Field(min_length=1)


class AttachmentCreate(SQLModel):
    project_id: int
    kind: AttachmentKind
    paperwork_item_id: int | None = None
    s3_key: str = Field(min_length=1)
    note: str | None = None


# ── Response schemas ────────────────────────────────────────────────────────
class ProjectTypePublic(SQLModel):
    id: int
    name: str


class ProjectPublic(SQLModel):
    id: int
    code: str
    client_id: int
    location_id: int
    working_contact_id: int | None
    decision_maker_contact_id: int | None
    name: str
    request_note: str | None
    referral_source: str | None
    stage: str
    status: str
    cancel_reason: str | None
    follow_up_date: date | None
    appointment_at: datetime | None
    visit_date: date | None
    survey_note: str | None
    survey_items: list[dict] | None
    client_signed_date: date | None
    execution_sub_status: str | None
    start_date: date | None
    est_duration_days: int | None
    actual_duration_days: int | None
    approaches: str | None
    acceptance_letter_body: str | None
    building_letter_body: str | None
    works_done_at: datetime | None
    acceptance_sub_status: str | None
    acceptance_passed_date: date | None
    created_at: datetime
    updated_at: datetime


class ProjectWithRelations(ProjectPublic):
    client: ClientPublic
    location: LocationPublic
    types: list[ProjectTypePublic]


class ProjectListItem(ProjectWithRelations):
    # The field page needs the site contact per appointment; decision_maker is
    # the [Gọi] fallback when the working contact has no phone.
    working_contact: ContactRef | None
    decision_maker: ContactRef | None


class ProjectNotePublic(SQLModel):
    id: int
    project_id: int
    tag: str | None
    body: str
    created_at: datetime


class ProjectDetail(ProjectWithRelations):
    working_contact: ContactPublic | None
    decision_maker: ContactPublic | None
    paperwork_items: list[PaperworkItemPublic]
    quotes: list[QuoteInProject]
    notes: list[ProjectNotePublic]


class AttachmentPublic(SQLModel):
    id: int
    project_id: int
    kind: str
    paperwork_item_id: int | None
    s3_key: str
    note: str | None
    created_at: datetime


class ProjectStageSummary(SQLModel):
    """One pipeline cell: how many active công trình sit in a stage, and the Σ
    of their chốt quotes (GET /projects/summary)."""

    stage: str
    count: int
    deal_total: int
