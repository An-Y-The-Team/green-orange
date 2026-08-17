"""Clients, contacts and locations — CRUD plus the referential guards.

Port of `crm-api-nest/src/clients/clients.module.ts`. Deletes refuse rather than
cascade wherever a row carries business meaning: a client with công trình, a
contact a location or project points at, a location with công trình.
"""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.api.common import PageDep, csv_filter, ilike, order_by, paged
from app.api.deps import SessionDep, get_current_user
from app.models.client import (
    CLIENT_TYPES,
    Client,
    ClientCounts,
    ClientCreate,
    ClientDetail,
    ClientListItem,
    ClientPublic,
    ClientUpdate,
    Contact,
    ContactCreate,
    ContactPublic,
    ContactUpdate,
    Location,
    LocationCreate,
    LocationUpdate,
    LocationWithManager,
)
from app.models.project import Project

router = APIRouter(
    prefix="/clients", tags=["clients"], dependencies=[Depends(get_current_user)]
)
contacts_router = APIRouter(
    prefix="/contacts", tags=["contacts"], dependencies=[Depends(get_current_user)]
)
locations_router = APIRouter(
    prefix="/locations", tags=["locations"], dependencies=[Depends(get_current_user)]
)


def get_client_or_404(session: Session, client_id: int) -> Client:
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    return client


def get_contact_or_404(session: Session, contact_id: int) -> Contact:
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    return contact


def get_location_or_404(session: Session, location_id: int) -> Location:
    location = session.get(Location, location_id)
    if not location:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Location not found")
    return location


def assert_manager_belongs_to(
    session: Session, client_id: int, contact_id: int
) -> None:
    contact = session.get(Contact, contact_id)
    if not contact or contact.client_id != client_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "manager_contact_id must be a contact of the same client",
        )


# ── Clients ─────────────────────────────────────────────────────────────────
@router.get("", response_model=list[ClientListItem])
def list_clients(
    session: SessionDep,
    response: Response,
    page: PageDep,
    type: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=300)] = None,
    sort_by: Annotated[Literal["name", "created_at"] | None, Query()] = None,
    sort_order: Annotated[Literal["asc", "desc"] | None, Query()] = None,
) -> list[ClientListItem]:
    statement = select(Client)
    types = csv_filter(type, CLIENT_TYPES, "type")
    if types:
        statement = statement.where(Client.type.in_(types))
    if search:
        statement = statement.where(
            or_(ilike(Client.name, search), ilike(Client.tax_code, search))
        )
    rows = paged(
        session,
        response,
        statement.order_by(
            *order_by(
                {"name": Client.name, "created_at": Client.created_at},
                sort_by,
                sort_order,
                # Was unordered: paging an unordered query overlaps and drops rows.
                fallback=[Client.id.asc()],
                tiebreak=Client.id,
            )
        ),
        page,
    )
    return [
        ClientListItem(
            **row.model_dump(),
            counts=ClientCounts(
                locations=_count_by_client(session, Location, row.id),
                projects=_count_by_client(session, Project, row.id),
            ),
        )
        for row in rows
    ]


def _count_by_client(session: Session, model: type, client_id: int) -> int:
    # ponytail: one COUNT per row per relation — a page of 100 clients is 200
    # cheap indexed counts. Swap in two grouped counts over the page's ids if a
    # list read ever shows up in a profile.
    return session.exec(
        select(func.count()).select_from(model).where(model.client_id == client_id)
    ).one()


@router.get("/{client_id}", response_model=ClientDetail)
def get_client(session: SessionDep, client_id: int) -> Client:
    return get_client_or_404(session, client_id)


@router.post("", response_model=ClientDetail, status_code=status.HTTP_201_CREATED)
def create_client(session: SessionDep, payload: ClientCreate) -> Client:
    # Checked before the first write: an individual's default location needs it,
    # and a half-created client is worse than a 400.
    if payload.type == "individual" and not payload.address:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "address is required for an individual client",
        )
    client = Client(
        name=payload.name,
        type=payload.type,
        tax_code=payload.tax_code,
        email=payload.email,
        note=payload.note,
    )
    session.add(client)
    session.commit()
    session.refresh(client)
    if payload.type != "individual":
        return client
    # Individual = the client is their own contact, with one default location.
    contact = Contact(
        client_id=client.id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    session.add(
        Location(
            client_id=client.id,
            name="Mặc định",
            address=payload.address,
            manager_contact_id=contact.id,
        )
    )
    session.commit()
    session.refresh(client)
    return client


@router.patch("/{client_id}", response_model=ClientPublic)
def update_client(session: SessionDep, client_id: int, payload: ClientUpdate) -> Client:
    client = get_client_or_404(session, client_id)
    client.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(client)
    session.commit()
    session.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(session: SessionDep, client_id: int) -> None:
    get_client_or_404(session, client_id)
    # A project can reference this client through one of its contacts too; that
    # FK would block the contact delete below, so count it here and answer with
    # this 409 instead of a raw integrity error.
    projects = session.exec(
        select(func.count())
        .select_from(Project)
        .where(
            or_(
                Project.client_id == client_id,
                Project.working_contact.has(Contact.client_id == client_id),
                Project.decision_maker.has(Contact.client_id == client_id),
            )
        )
    ).one()
    if projects:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Client has projects and cannot be deleted"
        )
    # Locations reference contacts (manager), so delete in FK order.
    for location in session.exec(
        select(Location).where(Location.client_id == client_id)
    ).all():
        session.delete(location)
    for contact in session.exec(
        select(Contact).where(Contact.client_id == client_id)
    ).all():
        session.delete(contact)
    session.delete(session.get(Client, client_id))
    session.commit()


# ── Contacts ────────────────────────────────────────────────────────────────
@contacts_router.get("", response_model=list[ContactPublic])
def list_contacts(
    session: SessionDep,
    response: Response,
    page: PageDep,
    client_id: Annotated[int | None, Query()] = None,
) -> list[Contact]:
    statement = select(Contact)
    if client_id is not None:
        statement = statement.where(Contact.client_id == client_id)
    return paged(session, response, statement.order_by(Contact.id.asc()), page)


@contacts_router.get("/{contact_id}", response_model=ContactPublic)
def get_contact(session: SessionDep, contact_id: int) -> Contact:
    return get_contact_or_404(session, contact_id)


@contacts_router.post(
    "", response_model=ContactPublic, status_code=status.HTTP_201_CREATED
)
def create_contact(session: SessionDep, payload: ContactCreate) -> Contact:
    contact = Contact.model_validate(payload)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@contacts_router.patch("/{contact_id}", response_model=ContactPublic)
def update_contact(
    session: SessionDep, contact_id: int, payload: ContactUpdate
) -> Contact:
    contact = get_contact_or_404(session, contact_id)
    contact.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@contacts_router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(session: SessionDep, contact_id: int) -> None:
    contact = get_contact_or_404(session, contact_id)
    locations = session.exec(
        select(func.count())
        .select_from(Location)
        .where(Location.manager_contact_id == contact_id)
    ).one()
    projects = session.exec(
        select(func.count())
        .select_from(Project)
        .where(
            or_(
                Project.working_contact_id == contact_id,
                Project.decision_maker_contact_id == contact_id,
            )
        )
    ).one()
    if locations or projects:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Contact is referenced by locations or projects and cannot be deleted",
        )
    session.delete(contact)
    session.commit()


# ── Locations ───────────────────────────────────────────────────────────────
@locations_router.get("", response_model=list[LocationWithManager])
def list_locations(
    session: SessionDep,
    response: Response,
    page: PageDep,
    client_id: Annotated[int | None, Query()] = None,
) -> list[Location]:
    statement = select(Location)
    if client_id is not None:
        statement = statement.where(Location.client_id == client_id)
    return paged(session, response, statement.order_by(Location.id.asc()), page)


@locations_router.get("/{location_id}", response_model=LocationWithManager)
def get_location(session: SessionDep, location_id: int) -> Location:
    return get_location_or_404(session, location_id)


@locations_router.post(
    "", response_model=LocationWithManager, status_code=status.HTTP_201_CREATED
)
def create_location(session: SessionDep, payload: LocationCreate) -> Location:
    if payload.manager_contact_id is not None:
        assert_manager_belongs_to(
            session, payload.client_id, payload.manager_contact_id
        )
    location = Location.model_validate(payload)
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@locations_router.patch("/{location_id}", response_model=LocationWithManager)
def update_location(
    session: SessionDep, location_id: int, payload: LocationUpdate
) -> Location:
    location = get_location_or_404(session, location_id)
    if payload.manager_contact_id is not None:
        assert_manager_belongs_to(
            session, location.client_id, payload.manager_contact_id
        )
    location.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@locations_router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(session: SessionDep, location_id: int) -> None:
    location = get_location_or_404(session, location_id)
    projects = session.exec(
        select(func.count())
        .select_from(Project)
        .where(Project.location_id == location_id)
    ).one()
    if projects:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Location has projects and cannot be deleted"
        )
    session.delete(location)
    session.commit()
