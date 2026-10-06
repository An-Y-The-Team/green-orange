"""Attachments — one table for every file in the bucket.

Owned by a project or a crew member (CCCD / chứng chỉ) and optionally linked to
the one record it documents. Bytes live in the bucket (app/core/storage.py);
the rules are in app/services/attachments.py.
NestJS mirror: `crm-api-nest/src/attachments/attachments.module.ts`.
"""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime
from sqlmodel import Field, SQLModel

from app.models.client import utcnow


class AttachmentKind(StrEnum):
    """The file's category. NestJS mirror: `ATTACHMENT_KINDS` keys in
    src/attachments/attachments.module.ts; web: components/attachments/enums.ts."""

    SURVEY = "survey"
    SIGNED_QUOTE = "signed_quote"
    SIGNED_CONTRACT = "signed_contract"
    PAYMENT_PROOF = "payment_proof"
    PAPERWORK = "paperwork"
    SITE_LOG = "site_log"
    FINISH_IMAGE = "finish_image"
    DEFECT_IMAGE = "defect_image"
    ACCEPTANCE_REPORT = "acceptance_report"
    SETTLEMENT = "settlement"
    VAT_INVOICE = "vat_invoice"
    OTHER = "other"
    ID_CARD = "id_card"
    CERTIFICATE = "certificate"


class AttachmentOwnerType(StrEnum):
    PROJECT = "project"
    CREW = "crew"


class AttachmentLink(StrEnum):
    """The link columns — each names the one record a file documents."""

    QUOTE = "quote_id"
    CONTRACT = "contract_id"
    PAYMENT_MILESTONE = "payment_milestone_id"
    BILL = "bill_id"
    PAPERWORK_ITEM = "paperwork_item_id"


# Every file category → (owner, the ONE record it must link to, if any). Owner +
# link is what lets a panel find "the payment proof for THIS milestone" with a
# filter instead of guessing from a filename.
_P, _C = AttachmentOwnerType.PROJECT, AttachmentOwnerType.CREW
ATTACHMENT_KINDS: dict[
    AttachmentKind, tuple[AttachmentOwnerType, AttachmentLink | None]
] = {
    AttachmentKind.SURVEY: (_P, None),
    AttachmentKind.SIGNED_QUOTE: (_P, AttachmentLink.QUOTE),
    AttachmentKind.SIGNED_CONTRACT: (_P, AttachmentLink.CONTRACT),
    AttachmentKind.PAYMENT_PROOF: (_P, AttachmentLink.PAYMENT_MILESTONE),
    AttachmentKind.PAPERWORK: (_P, AttachmentLink.PAPERWORK_ITEM),
    AttachmentKind.SITE_LOG: (_P, None),
    AttachmentKind.FINISH_IMAGE: (_P, None),
    AttachmentKind.DEFECT_IMAGE: (_P, None),
    AttachmentKind.ACCEPTANCE_REPORT: (_P, None),
    AttachmentKind.SETTLEMENT: (_P, None),
    AttachmentKind.VAT_INVOICE: (_P, AttachmentLink.BILL),
    AttachmentKind.OTHER: (_P, None),
    AttachmentKind.ID_CARD: (_C, None),
    AttachmentKind.CERTIFICATE: (_C, None),
}


# ── Table ───────────────────────────────────────────────────────────────────
class Attachment(SQLModel, table=True):
    """One table for every file in the bucket. `kind` is the category; the owner
    (project XOR crew member — CHECK attachment_one_owner) and at most one link
    column say exactly which record the file belongs to. Owners RESTRICT
    (deleting either is refused while files exist); links SET NULL (the file
    outlives the row it documented and stays listed under its owner)."""

    __table_args__ = (
        CheckConstraint(
            "(project_id IS NULL) <> (crew_member_id IS NULL)",
            name="attachment_one_owner",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    project_id: int | None = Field(default=None, foreign_key="project.id", index=True)
    crew_member_id: int | None = Field(
        default=None, foreign_key="crewmember.id", index=True
    )
    kind: str
    quote_id: int | None = Field(
        default=None, foreign_key="quote.id", index=True, ondelete="SET NULL"
    )
    contract_id: int | None = Field(
        default=None, foreign_key="contract.id", index=True, ondelete="SET NULL"
    )
    payment_milestone_id: int | None = Field(
        default=None,
        foreign_key="paymentmilestone.id",
        index=True,
        ondelete="SET NULL",
    )
    bill_id: int | None = Field(
        default=None, foreign_key="bill.id", index=True, ondelete="SET NULL"
    )
    paperwork_item_id: int | None = Field(
        default=None, foreign_key="paperworkitem.id", index=True, ondelete="SET NULL"
    )
    s3_key: str  # object key in the attachments bucket; see app/core/storage.py
    note: str | None = None
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )


# ── Request schemas ─────────────────────────────────────────────────────────
class AttachmentOwner(SQLModel):
    """Exactly one of the two, and the kind decides which (ATTACHMENT_KINDS)."""

    project_id: int | None = None
    crew_member_id: int | None = None
    kind: AttachmentKind


class AttachmentCreate(AttachmentOwner):
    quote_id: int | None = None
    contract_id: int | None = None
    payment_milestone_id: int | None = None
    bill_id: int | None = None
    paperwork_item_id: int | None = None
    s3_key: str = Field(min_length=1)
    note: str | None = None


class AttachmentPresign(AttachmentOwner):
    """Request for a signed upload URL — the browser PUTs to the bucket itself,
    then POSTs the returned s3_key to /attachments."""

    filename: str = Field(min_length=1)
    content_type: str = Field(min_length=1)
    content_length: int = Field(gt=0)


# ── Response schemas ────────────────────────────────────────────────────────
class AttachmentPublic(SQLModel):
    id: int
    project_id: int | None
    crew_member_id: int | None
    kind: str
    quote_id: int | None
    contract_id: int | None
    payment_milestone_id: int | None
    bill_id: int | None
    paperwork_item_id: int | None
    s3_key: str
    note: str | None
    created_at: datetime


class AttachmentPresignPublic(SQLModel):
    upload_url: str
    s3_key: str
    expires_in: int


class AttachmentDownloadPublic(SQLModel):
    download_url: str
    expires_in: int
