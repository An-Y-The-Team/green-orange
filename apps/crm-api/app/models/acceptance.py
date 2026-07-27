from datetime import date

from sqlmodel import Field, SQLModel

from app.models.project import AcceptanceStatus


class AcceptanceBase(SQLModel):
    project_code: str = Field(index=True)
    date: date
    status: AcceptanceStatus
    inspector: str
    client_rep: str
    notes: str


class Acceptance(AcceptanceBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class AcceptanceCreate(AcceptanceBase):
    pass


class AcceptancePublic(AcceptanceBase):
    id: int


class AcceptanceUpdate(SQLModel):
    project_code: str | None = None
    date: date | None = None
    status: AcceptanceStatus | None = None
    inspector: str | None = None
    client_rep: str | None = None
    notes: str | None = None
