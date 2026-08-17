"""Hợp đồng — contracts, their templates, and the company profile they print.

A signed contract is a legal document: its printable content is frozen (see the
PATCH guard in app/api/routes/contracts.py) and `print_snapshot` keeps the
company details as they were on the paper, so a later profile edit can never
change what an already-signed contract reprints.
"""

from datetime import date
from typing import Literal

from sqlmodel import Field, Relationship, SQLModel

from app.models.project import Project
from app.models.refs import ProjectRef

CONTRACT_STATUSES = ("draft", "signed")
ContractStatus = Literal["draft", "signed"]

# ~1.5 MB of base64 — generous for a letterhead mark, bounded for the row.
LOGO_MAX_CHARS = 2_000_000


# ── Tables ──────────────────────────────────────────────────────────────────
class Contract(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    # null = standalone contract, attachable to a công trình later.
    project_id: int | None = Field(default=None, foreign_key="project.id", index=True)
    code: str = Field(unique=True)  # HD-2026-001, server-assigned
    status: str = "draft"  # draft | signed
    signed_date: date | None = None
    note: str | None = None
    template_id: int | None = Field(default=None, foreign_key="contracttemplate.id")
    body: str | None = None  # Lexical editorState JSON, opaque
    # Signature footer; the B side falls back to the company representative and
    # the labels to ĐẠI DIỆN BÊN A/B.
    rep_a_label: str | None = None
    rep_a_name: str | None = None
    rep_a_title: str | None = None
    rep_b_label: str | None = None
    rep_b_name: str | None = None
    rep_b_title: str | None = None
    # Frozen at signing: company details, header template, title and header
    # style as they were on the signed paper (JSON string).
    print_snapshot: str | None = None

    project: Project | None = Relationship()


class ContractTemplate(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    doc_title: str
    body: str  # Lexical editorState JSON, opaque
    # Header blocks are INDEPENDENT, not alternatives: official Vietnamese
    # paperwork carries the Quốc hiệu and the letterhead sits above it, so both
    # default on.
    show_letterhead: bool = True
    show_national: bool = True
    is_active: bool = True


class CompanyProfile(SQLModel, table=True):
    """Single-row (id=1) letterhead + Bên B details for every A4 document."""

    id: int | None = Field(default=1, primary_key=True)
    name: str | None = None
    tagline: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    tax_id: str | None = None
    website: str | None = None
    representative: str | None = None
    representative_title: str | None = None
    bank_account: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    # Two rich-text header templates (Lexical editorState JSON), null = the web
    # app's built-in default. Split on purpose: the letterhead prints on EVERY
    # document, while the Quốc hiệu block is statutory and belongs only on legal
    # ones — one combined template leaked the Quốc hiệu onto quotes and bills.
    letterhead_body: str | None = None
    national_body: str | None = None
    logo: str | None = None  # single logo, inline data URL


# ── Request schemas ─────────────────────────────────────────────────────────
class ContractCreate(SQLModel):
    project_id: int | None = None
    template_id: int | None = None
    body: str | None = None
    note: str | None = None
    rep_a_label: str | None = None
    rep_a_name: str | None = None
    rep_a_title: str | None = None
    rep_b_label: str | None = None
    rep_b_name: str | None = None
    rep_b_title: str | None = None
    print_snapshot: str | None = None


class ContractUpdate(SQLModel):
    body: str | None = None
    note: str | None = None
    template_id: int | None = None
    status: ContractStatus | None = None
    signed_date: date | None = None
    rep_a_label: str | None = None
    rep_a_name: str | None = None
    rep_a_title: str | None = None
    rep_b_label: str | None = None
    rep_b_name: str | None = None
    rep_b_title: str | None = None
    print_snapshot: str | None = None


class ContractTemplateCreate(SQLModel):
    name: str = Field(min_length=3)
    doc_title: str = Field(min_length=3)
    body: str = Field(min_length=1)
    show_letterhead: bool = True
    show_national: bool = True
    is_active: bool


class ContractTemplateUpdate(SQLModel):
    name: str | None = None
    doc_title: str | None = None
    body: str | None = None
    show_letterhead: bool | None = None
    show_national: bool | None = None
    is_active: bool | None = None


class CompanyProfileUpdate(SQLModel):
    name: str | None = None
    tagline: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    tax_id: str | None = None
    website: str | None = None
    representative: str | None = None
    representative_title: str | None = None
    bank_account: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    letterhead_body: str | None = None
    national_body: str | None = None
    # Capped so one row cannot grow unbounded — the upload UI downscales before
    # sending, this is the backstop.
    logo: str | None = Field(default=None, max_length=LOGO_MAX_CHARS)


# ── Response schemas ────────────────────────────────────────────────────────
class ContractPublic(SQLModel):
    id: int
    project_id: int | None
    code: str
    status: str
    signed_date: date | None
    note: str | None
    template_id: int | None
    body: str | None
    rep_a_label: str | None
    rep_a_name: str | None
    rep_a_title: str | None
    rep_b_label: str | None
    rep_b_name: str | None
    rep_b_title: str | None
    print_snapshot: str | None
    project: ProjectRef | None


class ContractTemplatePublic(SQLModel):
    id: int
    name: str
    doc_title: str
    body: str
    show_letterhead: bool
    show_national: bool
    is_active: bool
