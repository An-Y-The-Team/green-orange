from datetime import date

from sqlmodel import Field, SQLModel

from app.models.project import CostCategory


class CostBase(SQLModel):
    project_code: str = Field(index=True)
    date: date
    category: CostCategory
    description: str
    amount: int
    is_incident: bool = False


class Cost(CostBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class CostCreate(CostBase):
    pass


class CostPublic(CostBase):
    id: int


class CostUpdate(SQLModel):
    project_code: str | None = None
    date: date | None = None
    category: CostCategory | None = None
    description: str | None = None
    amount: int | None = None
    is_incident: bool | None = None
