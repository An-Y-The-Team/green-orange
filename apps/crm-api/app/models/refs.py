"""Nested reference shapes embedded in other resources' responses.

These mirror the `select` blocks the NestJS backend puts in its Prisma includes
(`crm-api-nest/src/*/PROJECT_INCLUDE`), so both backends answer with the same
nested keys and crm-web needs no per-backend mapping.
"""

from sqlmodel import SQLModel


class ClientRef(SQLModel):
    id: int
    name: str


class ContactRef(SQLModel):
    """`working_contact` / `decision_maker` on the projects list."""

    id: int
    name: str
    phone: str | None = None


class ProjectCodeRef(SQLModel):
    """Just enough to print a công trình code (paperwork, bills, đợt)."""

    id: int
    code: str


class ProjectNameRef(ProjectCodeRef):
    """Crew assignments and the overlap warning."""

    name: str


class ProjectRef(ProjectNameRef):
    """Quotes and contracts, which print the client too."""

    client: ClientRef
