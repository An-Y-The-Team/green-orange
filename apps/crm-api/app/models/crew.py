"""Nhân sự — the crew roster, their phân công (assignments) and chấm công.

The roster keeps day-hire history for re-hire, so a member who has worked is
never deleted (set `status: left` instead). Double-booking is allowed and
common: overlaps come back on the response as a non-blocking warning.
"""

from datetime import date, datetime
from typing import Literal

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.client import utcnow
from app.models.project import Project
from app.models.refs import ProjectNameRef

EMPLOYMENT_TYPES = ("permanent", "day_hire")
# Only a working member can take a NEW assignment.
CREW_STATUS_WORKING = "working"
CREW_STATUSES = (CREW_STATUS_WORKING, "on_leave", "left")
# Manual is the source of truth for a member+day — see timekeeping_summary().
TIMEKEEPING_SOURCE_MANUAL = "manual"
TIMEKEEPING_SOURCES = (TIMEKEEPING_SOURCE_MANUAL, "zalo_app")

EmploymentType = Literal["permanent", "day_hire"]
CrewStatus = Literal["working", "on_leave", "left"]
TimekeepingSource = Literal["manual", "zalo_app"]


# ── Tables ──────────────────────────────────────────────────────────────────
class CrewRole(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    # User-managed; seeded: Thợ chính, Thợ phụ, Nhân viên vệ sinh, Giám sát,
    # Lái xe.
    name: str = Field(unique=True)


class CrewMember(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    phone: str | None = None  # Zalo — the mini-app identity, captured day one
    employment_type: str = Field(index=True)  # permanent | day_hire
    default_role_id: int | None = Field(
        default=None, foreign_key="crewrole.id", index=True
    )
    status: str = Field(default="working", index=True)  # working | on_leave | left
    note: str | None = None
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )

    default_role: CrewRole | None = Relationship()
    assignments: list["Assignment"] = Relationship(
        back_populates="crew_member",
        sa_relationship_kwargs={"order_by": "Assignment.id"},
    )


class Assignment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    crew_member_id: int = Field(foreign_key="crewmember.id", index=True)
    role_id: int | None = Field(default=None, foreign_key="crewrole.id", index=True)
    from_date: date
    to_date: date | None = None  # null = open-ended
    # Overlaps are allowed — a non-blocking warning in the app, no constraint.

    project: Project = Relationship()
    crew_member: CrewMember = Relationship(back_populates="assignments")
    role: CrewRole | None = Relationship()


class TimekeepingRecord(SQLModel, table=True):
    # manual + zalo_app rows may coexist per day; conflicts resolved in the UI.
    __table_args__ = (
        UniqueConstraint("crew_member_id", "project_id", "work_date", "source"),
    )

    id: int | None = Field(default=None, primary_key=True)
    crew_member_id: int = Field(foreign_key="crewmember.id", index=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    work_date: date = Field(index=True)
    hours: float  # raw hours worked that day
    source: str  # manual | zalo_app — manual is the source of truth
    note: str | None = None


# ── Request schemas ─────────────────────────────────────────────────────────
class CrewRoleCreate(SQLModel):
    name: str = Field(min_length=1)


class CrewRoleUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1)


class CrewCreate(SQLModel):
    name: str = Field(min_length=1)
    phone: str | None = None
    employment_type: EmploymentType
    default_role_id: int | None = None
    status: CrewStatus | None = None
    note: str | None = None


class CrewUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1)
    phone: str | None = None
    employment_type: EmploymentType | None = None
    default_role_id: int | None = None
    status: CrewStatus | None = None
    note: str | None = None


class AssignmentCreate(SQLModel):
    project_id: int
    crew_member_id: int
    role_id: int | None = None
    from_date: date
    to_date: date | None = None


class AssignmentUpdate(SQLModel):
    """No `project_id`: moving an assignment between projects is
    delete-and-recreate, not an edit — a PATCH would write into the destination
    project while the closed-project lock only covers the source."""

    crew_member_id: int | None = None
    role_id: int | None = None
    from_date: date | None = None
    to_date: date | None = None


class TimekeepingCreate(SQLModel):
    crew_member_id: int
    project_id: int
    work_date: date
    hours: float = Field(ge=0)
    source: TimekeepingSource
    note: str | None = None


# ── Response schemas ────────────────────────────────────────────────────────
class CrewRolePublic(SQLModel):
    id: int
    name: str


class CrewMemberBasic(SQLModel):
    id: int
    name: str
    phone: str | None
    employment_type: str
    default_role_id: int | None
    status: str
    note: str | None
    created_at: datetime


class CrewMemberPublic(CrewMemberBasic):
    default_role: CrewRolePublic | None


class AssignmentBasic(SQLModel):
    id: int
    project_id: int
    crew_member_id: int
    role_id: int | None
    from_date: date
    to_date: date | None


class AssignmentWithProject(AssignmentBasic):
    project: ProjectNameRef


class CrewMemberDetail(CrewMemberPublic):
    assignments: list[AssignmentWithProject]


class AssignmentListItem(AssignmentBasic):
    crew_member: CrewMemberBasic
    role: CrewRolePublic | None


class AssignmentPublic(AssignmentListItem):
    # Double-booking warning on write responses, never a rejection.
    overlaps: list[AssignmentWithProject]


class TimekeepingPublic(SQLModel):
    id: int
    crew_member_id: int
    project_id: int
    work_date: date
    hours: float
    source: str
    note: str | None


class TimekeepingSummary(SQLModel):
    project_id: int
    total_hours: float
    recorded_days: int
