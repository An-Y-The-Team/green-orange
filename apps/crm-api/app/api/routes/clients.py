"""Clients — the fully-worked CRUD reference.

Every endpoint is protected (depends on CurrentUser). Copy this file's shape to
implement contacts / leads / deals / tasks. The five operations below — list,
read, create, update, delete — are the pattern to replicate.
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.client import (
    Client,
    ClientCreate,
    ClientPublic,
    ClientUpdate,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientPublic])
def list_clients(
    session: SessionDep,
    _user: CurrentUser,
    offset: int = 0,
    limit: int = Query(default=100, le=100),
) -> list[Client]:
    return list(session.exec(select(Client).offset(offset).limit(limit)).all())


@router.get("/{client_id}", response_model=ClientPublic)
def get_client(client_id: int, session: SessionDep, _user: CurrentUser) -> Client:
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("", response_model=ClientPublic, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate, session: SessionDep, _user: CurrentUser
) -> Client:
    client = Client.model_validate(payload)
    session.add(client)
    session.commit()
    session.refresh(client)
    return client


@router.patch("/{client_id}", response_model=ClientPublic)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    session: SessionDep,
    _user: CurrentUser,
) -> Client:
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(client)
    session.commit()
    session.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, session: SessionDep, _user: CurrentUser) -> None:
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    session.delete(client)
    session.commit()
