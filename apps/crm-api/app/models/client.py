"""Clients, contacts and locations — the "who and where" of a công trình.

Ported 1:1 from the NestJS backend (`crm-api-nest/prisma/schema.prisma` +
`src/clients/clients.module.ts`). Conventions shared by every model here:

  • snake_case field names, emitted verbatim → responses need no mapping.
  • Money is `int` on a BIGINT column (integer VND overflows int32).
  • `*_date` columns are `date` (JSON 'YYYY-MM-DD'), `*_at` columns are
    timezone-aware `datetime` (full ISO). That naming convention is the whole
    date contract — Python's native types do here what the Nest
    SerializeInterceptor has to do by hand.
  • Enum-like columns are plain `str`, constrained in the request schemas.
    Values are ENGLISH; Vietnamese lives only in crm-web's labels.
"""

from datetime import UTC, datetime
from typing import Literal

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

CLIENT_TYPES = ("company", "individual")
ClientType = Literal["company", "individual"]


def utcnow() -> datetime:
    """Timezone-aware UTC stamp for `created_at` / `updated_at` columns."""
    return datetime.now(UTC)


# ── Tables ──────────────────────────────────────────────────────────────────
class Client(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str  # company | individual
    tax_code: str | None = None
    # The client's own billing/contact email, distinct from Contact emails.
    email: str | None = None
    note: str | None = None
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"onupdate": utcnow},
    )

    contacts: list["Contact"] = Relationship(
        sa_relationship_kwargs={"order_by": "Contact.id"}
    )
    locations: list["Location"] = Relationship(
        sa_relationship_kwargs={"order_by": "Location.id"}
    )


class Contact(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.id", index=True)
    name: str
    phone: str | None = None  # also the Zalo identity
    email: str | None = None
    title: str | None = None
    note: str | None = None


class Location(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.id", index=True)
    name: str
    address: str
    manager_contact_id: int | None = Field(
        default=None, foreign_key="contact.id", index=True
    )

    manager: Contact | None = Relationship()


# ── Request schemas ─────────────────────────────────────────────────────────
class ClientCreate(SQLModel):
    name: str = Field(min_length=1)
    type: ClientType
    tax_code: str | None = None
    email: EmailStr | None = None
    note: str | None = None
    # Individual clients only: the client IS their own contact, so `phone`
    # seeds that auto-created contact and `address` its default location.
    phone: str | None = None
    address: str | None = None


class ClientUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1)
    type: ClientType | None = None
    tax_code: str | None = None
    email: EmailStr | None = None
    note: str | None = None


class ContactCreate(SQLModel):
    client_id: int
    name: str = Field(min_length=1)
    phone: str | None = None
    email: EmailStr | None = None
    title: str | None = None
    note: str | None = None


class ContactUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1)
    phone: str | None = None
    email: EmailStr | None = None
    title: str | None = None
    note: str | None = None


class LocationCreate(SQLModel):
    client_id: int
    name: str = Field(min_length=1)
    address: str = Field(min_length=1)
    manager_contact_id: int | None = None


class LocationUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1)
    address: str | None = Field(default=None, min_length=1)
    manager_contact_id: int | None = None


# ── Response schemas ────────────────────────────────────────────────────────
class ContactPublic(SQLModel):
    id: int
    client_id: int
    name: str
    phone: str | None
    email: str | None
    title: str | None
    note: str | None


class LocationPublic(SQLModel):
    id: int
    client_id: int
    name: str
    address: str
    manager_contact_id: int | None


class LocationWithManager(LocationPublic):
    """The /locations endpoints resolve the manager; nested reads don't."""

    manager: ContactPublic | None


class ClientPublic(SQLModel):
    id: int
    name: str
    type: str
    tax_code: str | None
    email: str | None
    note: str | None
    created_at: datetime
    updated_at: datetime


class ClientCounts(SQLModel):
    locations: int
    projects: int


class ClientListItem(ClientPublic):
    # Prisma's `_count` block. Leading underscores are reserved by Pydantic, so
    # the field is named `counts` and serialized under the wire name.
    counts: ClientCounts = Field(serialization_alias="_count")


class ClientDetail(ClientPublic):
    contacts: list[ContactPublic]
    locations: list[LocationPublic]
