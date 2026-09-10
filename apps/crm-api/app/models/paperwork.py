"""Hồ sơ — the stage-5 paperwork checklist (permits, PCCC, crew lists).

`overdue` is DERIVED (`due_date` < today and status != approved) and never
stored, so every consumer gets the same answer from `GET /paperwork-items
?overdue=true` instead of rebuilding the rule over whatever page it fetched.
"""

from datetime import date
from typing import TYPE_CHECKING, Literal

from sqlmodel import Field, Relationship, SQLModel

from app.models.refs import ProjectCodeRef

if TYPE_CHECKING:  # avoids a circular import; SQLAlchemy resolves it by name
    from app.models.project import Project

PAPERWORK_STATUSES = ("preparing", "submitted", "approved")
PaperworkStatus = Literal["preparing", "submitted", "approved"]

# Stage-5 checklist defaults. These names are DATA, not an enum, so they stay
# Vietnamese; POST /projects seeds them on every new công trình.
DEFAULT_PAPERWORK = (
    "Giấy phép thi công",
    "PCCC",
    "Danh sách nhân sự",
    "Danh sách thiết bị",
    "Hợp đồng",
    "Đề nghị thanh toán",
    "Biên bản nghiệm thu khối lượng",
    "Biên bản quyết toán",
)


class PaperworkItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    name: str
    status: str = "preparing"  # preparing | submitted | approved
    due_date: date | None = None  # permits have lead times
    note: str | None = None

    project: "Project" = Relationship(back_populates="paperwork_items")


class PaperworkItemCreate(SQLModel):
    project_id: int
    name: str = Field(min_length=1)
    status: PaperworkStatus | None = None
    due_date: date | None = None
    note: str | None = None


class PaperworkItemUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1)
    status: PaperworkStatus | None = None
    due_date: date | None = None
    note: str | None = None


class PaperworkSeedDefaults(SQLModel):
    project_id: int


class PaperworkItemPublic(SQLModel):
    id: int
    project_id: int
    name: str
    status: str
    due_date: date | None
    note: str | None


class PaperworkItemListItem(PaperworkItemPublic):
    # The dashboard's "Hồ sơ quá hạn" panel prints a công trình code.
    project: ProjectCodeRef
