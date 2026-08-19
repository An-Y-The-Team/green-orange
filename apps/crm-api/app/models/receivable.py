"""Receivables: Settlement (Quyết toán) → Bill (Hóa đơn) → PaymentMilestone
(Đợt thanh toán).

Rules enforced in app/api/routes/receivables.py:
  • One settlement per project (1:1) — a second POST is a 409.
  • A settlement is born with its draft bill (same transaction).
  • Signing a settlement officializes its bill; un-signing is its exact inverse
    (the correction path).
  • Bills have no POST/DELETE — they live and die with their settlement.
  • "overdue" is DERIVED (due_date < today && status != paid), never stored.
"""

from datetime import date
from typing import Literal, Optional

from sqlalchemy import BigInteger
from sqlmodel import Field, Relationship, SQLModel

from app.models.project import Project
from app.models.refs import ProjectCodeRef

SETTLEMENT_STATUSES = ("draft", "sent", "signed")
BILL_STATUSES = ("draft", "official", "sent", "paid")
MILESTONE_TYPES = ("deposit", "progress", "acceptance")
MILESTONE_STATUSES = ("not_due", "awaiting_payment", "paid")

SettlementStatus = Literal["draft", "sent", "signed"]
BillStatus = Literal["draft", "official", "sent", "paid"]
MilestoneType = Literal["deposit", "progress", "acceptance"]
MilestoneStatus = Literal["not_due", "awaiting_payment", "paid"]


# ── Tables ──────────────────────────────────────────────────────────────────
class Settlement(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    # 1:1 — a project settles once; corrections revise this row.
    project_id: int = Field(foreign_key="project.id", unique=True)
    status: str = "draft"  # draft | sent | signed
    # VND, server-computed from items; copied to the bill on sign.
    total_amount: int = Field(default=0, sa_type=BigInteger)
    signed_date: date | None = None
    note: str | None = None

    bill: Optional["Bill"] = Relationship(sa_relationship_kwargs={"uselist": False})
    items: list["SettlementItem"] = Relationship(
        sa_relationship_kwargs={
            "order_by": "SettlementItem.sort_order",
            "cascade": "all, delete-orphan",
        }
    )


class SettlementItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    settlement_id: int = Field(
        foreign_key="settlement.id", index=True, ondelete="CASCADE"
    )
    description: str
    unit: str | None = None  # m², buổi, … (free text)
    # Adjusted to khối lượng thực tế (prefilled from the quote items).
    quantity: float
    unit_price: int = Field(sa_type=BigInteger)  # VND
    amount: int = Field(sa_type=BigInteger)  # VND, server-computed
    sort_order: int = 0


class Bill(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    # Signing the settlement flips its bill to official.
    settlement_id: int | None = Field(
        default=None, foreign_key="settlement.id", unique=True
    )
    # draft | official | sent | paid — manual flips are the source of truth.
    status: str = "draft"
    total_amount: int = Field(sa_type=BigInteger)  # VND
    sent_date: date | None = None
    paid_date: date | None = None

    project: Project = Relationship()
    milestones: list["PaymentMilestone"] = Relationship(
        sa_relationship_kwargs={"order_by": "PaymentMilestone.id"}
    )


class PaymentMilestone(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    # null for the cọc, which exists before any bill.
    bill_id: int | None = Field(default=None, foreign_key="bill.id", index=True)
    type: str  # deposit (= Cọc, stage 4) | progress | acceptance
    amount: int = Field(sa_type=BigInteger)  # VND
    due_date: date | None = None
    status: str = "not_due"  # not_due | awaiting_payment | paid
    paid_date: date | None = None

    project: Project = Relationship()


# ── Request schemas ─────────────────────────────────────────────────────────
class SettlementItemIn(SQLModel):
    description: str = Field(min_length=1)
    unit: str | None = None
    quantity: float = Field(ge=0)
    unit_price: float = Field(ge=0)
    sort_order: int | None = Field(default=None, ge=0)


class SettlementCreate(SQLModel):
    project_id: int
    items: list[SettlementItemIn] | None = None
    note: str | None = None


class SettlementUpdate(SQLModel):
    items: list[SettlementItemIn] | None = None
    status: SettlementStatus | None = None
    signed_date: date | None = None
    note: str | None = None


class BillUpdate(SQLModel):
    status: BillStatus | None = None
    total_amount: float | None = Field(default=None, ge=0)
    sent_date: date | None = None
    paid_date: date | None = None


class MilestoneCreate(SQLModel):
    project_id: int
    bill_id: int | None = None  # null for the stage-4 cọc
    type: MilestoneType
    amount: float = Field(ge=0)
    status: MilestoneStatus | None = None
    due_date: date | None = None
    paid_date: date | None = None  # a cọc can be backdated


class MilestoneUpdate(SQLModel):
    bill_id: int | None = None
    status: MilestoneStatus | None = None
    amount: float | None = Field(default=None, ge=0)
    due_date: date | None = None
    paid_date: date | None = None


# ── Response schemas ────────────────────────────────────────────────────────
class SettlementItemPublic(SQLModel):
    id: int
    settlement_id: int
    description: str
    unit: str | None
    quantity: float
    unit_price: int
    amount: int
    sort_order: int


class BillBasic(SQLModel):
    id: int
    project_id: int
    settlement_id: int | None
    status: str
    total_amount: int
    sent_date: date | None
    paid_date: date | None


class MilestonePublic(SQLModel):
    id: int
    project_id: int
    bill_id: int | None
    type: str
    amount: int
    due_date: date | None
    status: str
    paid_date: date | None


class MilestoneListItem(MilestonePublic):
    project: ProjectCodeRef


class SettlementPublic(SQLModel):
    id: int
    project_id: int
    status: str
    total_amount: int
    signed_date: date | None
    note: str | None
    bill: BillBasic | None
    items: list[SettlementItemPublic]


class BillPublic(BillBasic):
    milestones: list[MilestonePublic]


class BillListItem(BillPublic):
    project: ProjectCodeRef
