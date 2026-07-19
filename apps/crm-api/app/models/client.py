"""Client model + schemas — the fully-worked reference resource.

SQLModel pattern (per the official docs): one shared `*Base` of common fields,
a `table=True` model that adds db-only columns (id, created_at), and separate
Create / Public / Update schemas. Read top-to-bottom to see the whole pattern,
then replicate it for contacts / leads / deals (see app/models/contact.py etc).
"""

from datetime import date

from sqlmodel import Field, SQLModel


# Fields shared by the table and the input/output schemas. Field names match the
# crm-web `Client` TypeScript type so responses map 1:1 onto the UI.
class ClientBase(SQLModel):
    name: str = Field(index=True)
    email: str
    phone: str
    company: str
    status: str = "lead"  # "active" | "lead" | "churned"


# The actual database table.
class Client(ClientBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: date = Field(default_factory=date.today)


# Request body for POST (no id/created_at — the server assigns those).
class ClientCreate(ClientBase):
    pass


# Response model returned to clients.
class ClientPublic(ClientBase):
    id: int
    created_at: date


# Request body for PATCH — every field optional for partial updates.
class ClientUpdate(SQLModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    status: str | None = None
