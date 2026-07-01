"""Contact model — STUDENT EXERCISE (skeleton).

Fill this in using app/models/customer.py as the template, then uncomment the
Contact import in app/models/__init__.py. Match the crm-web `Contact` type:
name, email, phone, title, company.
"""

from sqlmodel import Field, SQLModel


#
#
class ContactBase(SQLModel):
    name: str = Field(index=True)
    email: str
    phone: str
    title: str
    company: str


#
#
class Contact(ContactBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


#
#
class ContactCreate(ContactBase):
    pass


#
#
class ContactPublic(ContactBase):
    id: int


#
#
class ContactUpdate(SQLModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    title: str | None = None
    company: str | None = None
