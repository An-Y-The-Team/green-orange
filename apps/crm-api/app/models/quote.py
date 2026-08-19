"""Báo giá — quotes, their line items and their send log.

Bargaining is versioned: a sent version is frozen and a revision is a new row
(`version` = 1, 2, …), so the whole negotiation stays auditable. See
`crm-api-nest/src/quotes/quotes.module.ts` for the same rules in TypeScript.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Literal, Optional

from sqlalchemy import BigInteger, DateTime, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.client import utcnow
from app.models.refs import ProjectRef

if TYPE_CHECKING:  # avoids a circular import; SQLAlchemy resolves it by name
    from app.models.project import Project

QUOTE_SEND_CHANNELS = ("zalo", "email", "print")
# The closing subset POST /quotes/{id}/decide accepts…
QUOTE_DECISIONS = ("deal", "on_hold", "rejected")
# …and the full lifecycle, which is what `?status=` filters on.
QUOTE_STATUSES = ("draft", "waiting", *QUOTE_DECISIONS)

QuoteChannel = Literal["zalo", "email", "print"]
QuoteDecision = Literal["deal", "on_hold", "rejected"]


# ── Tables ──────────────────────────────────────────────────────────────────
class Quote(SQLModel, table=True):
    # `project_id` is nullable: a standalone quote (walk-in / speculative) can be
    # attached to a công trình later. Postgres treats NULLs as distinct in the
    # unique constraint, so every standalone quote may be version 1.
    __table_args__ = (UniqueConstraint("project_id", "version"),)

    id: int | None = Field(default=None, primary_key=True)
    project_id: int | None = Field(default=None, foreign_key="project.id")
    version: int
    # draft | waiting | deal | on_hold | rejected — the latest version carries
    # the live status.
    status: str = Field(default="draft", index=True)
    total_amount: int = Field(sa_type=BigInteger)  # VND
    vat_rate: float = 0.08
    decided_date: date | None = None
    note: str | None = None
    # Per-quote signer; unset falls back to the company representative.
    rep_name: str | None = None
    rep_title: str | None = None

    project: Optional["Project"] = Relationship(back_populates="quotes")
    # delete-orphan: line items and send logs belong to the quote — replacing the
    # items list deletes the old rows, and deleting the quote takes both with it.
    items: list["QuoteItem"] = Relationship(
        sa_relationship_kwargs={
            "order_by": "QuoteItem.sort_order",
            "cascade": "all, delete-orphan",
        }
    )
    send_logs: list["QuoteSendLog"] = Relationship(
        sa_relationship_kwargs={
            "order_by": "QuoteSendLog.id",
            "cascade": "all, delete-orphan",
        }
    )


class QuoteItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    quote_id: int = Field(foreign_key="quote.id", index=True)
    # "A. PHẦN VẬT TƯ" — free-text section header; null = ungrouped.
    category: str | None = None
    description: str
    unit: str | None = None  # m², buổi, … (free text)
    quantity: float
    unit_price: int = Field(sa_type=BigInteger)  # VND
    amount: int = Field(sa_type=BigInteger)  # VND, server-computed
    sort_order: int = 0


class QuoteSendLog(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    quote_id: int = Field(foreign_key="quote.id", index=True)
    channel: str  # zalo | email | print
    sent_by: str  # operator name; FK → User once ownership matters
    sent_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
    # Where to chase: Zalo chat, email address, print recipient.
    follow_up_ref: str | None = None


# ── Request schemas ─────────────────────────────────────────────────────────
class QuoteItemIn(SQLModel):
    category: str | None = None
    description: str = Field(min_length=1)
    unit: str | None = None
    quantity: float = Field(ge=0)
    unit_price: float = Field(ge=0)


class QuoteCreate(SQLModel):
    project_id: int | None = None
    items: list[QuoteItemIn] = Field(min_length=1)
    vat_rate: float | None = Field(default=None, ge=0, le=1)
    note: str | None = None
    rep_name: str | None = None
    rep_title: str | None = None


class QuoteUpdate(SQLModel):
    items: list[QuoteItemIn] | None = Field(default=None, min_length=1)
    vat_rate: float | None = Field(default=None, ge=0, le=1)
    note: str | None = None
    rep_name: str | None = None
    rep_title: str | None = None


class QuoteSend(SQLModel):
    channel: QuoteChannel
    sent_by: str = Field(min_length=1)
    follow_up_ref: str | None = None


class QuoteDecide(SQLModel):
    status: QuoteDecision


# ── Response schemas ────────────────────────────────────────────────────────
class QuoteItemPublic(SQLModel):
    id: int
    quote_id: int
    category: str | None
    description: str
    unit: str | None
    quantity: float
    unit_price: int
    amount: int
    sort_order: int


class QuoteSendLogPublic(SQLModel):
    id: int
    quote_id: int
    channel: str
    sent_by: str
    sent_at: datetime
    follow_up_ref: str | None


class QuoteSendLogChannel(SQLModel):
    """The list view only paints the sent-channel chips."""

    channel: str


class QuoteBasic(SQLModel):
    """Columns only — how a quote appears nested in its project's detail."""

    id: int
    project_id: int | None
    version: int
    status: str
    total_amount: int
    vat_rate: float
    decided_date: date | None
    note: str | None
    rep_name: str | None
    rep_title: str | None


class QuotePublic(QuoteBasic):
    project: ProjectRef | None


class QuoteDetail(QuotePublic):
    items: list[QuoteItemPublic]
    send_logs: list[QuoteSendLogPublic]


class QuoteListItem(QuotePublic):
    send_logs: list[QuoteSendLogChannel]
    # Derived, never stored: false = a newer version exists for this project,
    # which the UI paints as "Đã thay thế".
    is_latest: bool
