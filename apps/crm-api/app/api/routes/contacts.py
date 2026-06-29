"""Contacts — STUDENT EXERCISE (skeleton).

Goal: implement full CRUD for contacts, mirroring app/api/routes/customers.py.

Steps:
  1. Define the Contact model + schemas in app/models/contact.py (use
     app/models/customer.py as the template). Fields to match the crm-web
     `Contact` type: name, email, phone, title, company.
  2. Register it in app/models/__init__.py so the table is created.
  3. Replace the 501 stub below with list/get/create/update/delete handlers,
     each protected with CurrentUser (see customers.py).
  4. Generate a migration:  uv run alembic revision --autogenerate -m "contacts"
     then  uv run alembic upgrade head.

Once done, crm-web's /contacts page will render live data when
NEXT_PUBLIC_API_URL is set.
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.contact import (
    Contact,
    ContactCreate,
    ContactPublic,
    ContactUpdate,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactPublic])
def list_contacts(
    session: SessionDep,
    _user: CurrentUser,
    offset: int = 0,
    limit: int = Query(default=100, le=100),
) -> list[Contact]:
    return list(session.exec(select(Contact).offset(offset).limit(limit)).all())


@router.get("/{contact_id}", response_model=ContactPublic)
def get_contact(contact_id: int, session: SessionDep, _user: CurrentUser) -> Contact:
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.post("", response_model=ContactPublic, status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactCreate, session: SessionDep, _user: CurrentUser) -> Contact:
    contact = Contact.model_validate(payload)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.patch("/{contact_id}", response_model=ContactPublic)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    session: SessionDep,
    _user: CurrentUser,
) -> Contact:
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, session: SessionDep, _user: CurrentUser) -> None:
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    session.delete(contact)
    session.commit()
