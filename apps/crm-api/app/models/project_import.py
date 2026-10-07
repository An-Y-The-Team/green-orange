"""Request schema of POST /projects/import — "Công trình mới từ Bảng Báo Giá".

Each reference is an existing id OR the fields to create it from. Mirrors the
DTOs in crm-api-nest `projects/project-import.ts`.
"""

from enum import StrEnum
from typing import Self

from pydantic import model_validator
from sqlmodel import Field, SQLModel

from app.models.client import ClientType
from app.models.quote import QuoteItemIn
from app.models.receivable import SettlementItemIn


class ImportStage(StrEnum):
    """A workbook always carries a priced quote, so never "request"; never
    "closed" either — that locks the project before anyone has looked at it."""

    QUOTE = "quote"
    CONTRACT = "contract"
    PAPERWORK = "paperwork"
    EXECUTION = "execution"
    ACCEPTANCE = "acceptance"
    SETTLEMENT = "settlement"


def _require_unless_id(model: SQLModel, id_: int | None, *fields: str) -> None:
    if id_ is None:
        missing = [f for f in fields if not getattr(model, f)]
        if missing:
            raise ValueError(f"{', '.join(missing)} required when id is not given")


class ImportClient(SQLModel):
    id: int | None = None
    name: str | None = None
    type: ClientType | None = None
    tax_code: str | None = None
    address: str | None = None

    @model_validator(mode="after")
    def _new_needs_fields(self) -> Self:
        _require_unless_id(self, self.id, "name", "type")
        return self


class ImportContact(SQLModel):
    id: int | None = None
    name: str | None = None
    title: str | None = None
    phone: str | None = None

    @model_validator(mode="after")
    def _new_needs_fields(self) -> Self:
        _require_unless_id(self, self.id, "name")
        return self


class ImportLocation(SQLModel):
    id: int | None = None
    name: str | None = None
    address: str | None = None

    @model_validator(mode="after")
    def _new_needs_fields(self) -> Self:
        _require_unless_id(self, self.id, "name", "address")
        return self


class ImportQuote(SQLModel):
    items: list[QuoteItemIn] = Field(min_length=1)
    vat_rate: float = Field(ge=0, le=1)
    discount_amount: float | None = Field(default=None, ge=0)


class ImportSettlement(SQLModel):
    items: list[SettlementItemIn] = Field(min_length=1)
    vat_rate: float = Field(ge=0, le=1)
    discount_amount: float | None = Field(default=None, ge=0)


class ProjectImport(SQLModel):
    client: ImportClient
    # Optional: a Bên A without a named representative is still a job.
    contact: ImportContact | None = None
    location: ImportLocation
    name: str = Field(min_length=1)
    type_ids: list[int] = Field(min_length=1)
    stage: ImportStage
    request_note: str | None = None
    quote: ImportQuote
    # Only for a job whose quyết toán is already in the workbook.
    settlement: ImportSettlement | None = None
