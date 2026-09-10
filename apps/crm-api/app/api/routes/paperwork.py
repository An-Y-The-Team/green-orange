"""Hồ sơ — the stage-5 paperwork checklist.

Port of `crm-api-nest/src/paperwork/paperwork.module.ts`. The due-date filter is
`?overdue=true` rather than a raw date bound: overdue is DERIVED (due_date <
today && status != approved) and belongs on the server, or every consumer
rebuilds the rule over whichever page it happened to fetch.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session, select

from app.api.common import PageDep, paged
from app.api.deps import SessionDep, get_current_user
from app.core.rules import assert_project_open, business_today
from app.models.paperwork import (
    DEFAULT_PAPERWORK,
    PaperworkItem,
    PaperworkItemCreate,
    PaperworkItemListItem,
    PaperworkItemPublic,
    PaperworkItemUpdate,
    PaperworkSeedDefaults,
)

router = APIRouter(
    prefix="/paperwork-items",
    tags=["paperwork-items"],
    dependencies=[Depends(get_current_user)],
)


def get_item_or_404(session: Session, item_id: int) -> PaperworkItem:
    item = session.get(PaperworkItem, item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paperwork item not found")
    return item


@router.get("", response_model=list[PaperworkItemListItem])
def list_paperwork_items(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    status_: Annotated[str | None, Query(alias="status")] = None,
    overdue: Annotated[str | None, Query()] = None,
) -> list[PaperworkItem]:
    statement = select(PaperworkItem)
    if project_id is not None:
        statement = statement.where(PaperworkItem.project_id == project_id)
    # `overdue` already implies a status, so it REPLACES `status=` instead of
    # contradicting it.
    if overdue == "true":
        statement = statement.where(
            PaperworkItem.due_date < business_today(),
            PaperworkItem.status != "approved",
        )
    elif status_:
        statement = statement.where(PaperworkItem.status == status_)
    return paged(session, response, statement.order_by(PaperworkItem.id.asc()), page)


@router.get("/{item_id}", response_model=PaperworkItemPublic)
def get_paperwork_item(session: SessionDep, item_id: int) -> PaperworkItem:
    return get_item_or_404(session, item_id)


@router.post(
    "", response_model=PaperworkItemPublic, status_code=status.HTTP_201_CREATED
)
def create_paperwork_item(
    session: SessionDep, payload: PaperworkItemCreate
) -> PaperworkItem:
    assert_project_open(session, payload.project_id)
    item = PaperworkItem(
        project_id=payload.project_id,
        name=payload.name,
        status=payload.status or "preparing",
        due_date=payload.due_date,
        note=payload.note,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.post(
    "/defaults",
    response_model=list[PaperworkItemPublic],
    status_code=status.HTTP_201_CREATED,
)
def seed_defaults(
    session: SessionDep, payload: PaperworkSeedDefaults
) -> list[PaperworkItem]:
    """Seed the default checklist items, skipping names the project already
    has, and answer with the project's full list."""
    assert_project_open(session, payload.project_id)
    existing = {
        item.name
        for item in session.exec(
            select(PaperworkItem).where(
                PaperworkItem.project_id == payload.project_id,
                PaperworkItem.name.in_(DEFAULT_PAPERWORK),
            )
        ).all()
    }
    for name in DEFAULT_PAPERWORK:
        if name not in existing:
            session.add(PaperworkItem(project_id=payload.project_id, name=name))
    session.commit()
    return list(
        session.exec(
            select(PaperworkItem)
            .where(PaperworkItem.project_id == payload.project_id)
            .order_by(PaperworkItem.id.asc())
        ).all()
    )


@router.patch("/{item_id}", response_model=PaperworkItemPublic)
def update_paperwork_item(
    session: SessionDep, item_id: int, payload: PaperworkItemUpdate
) -> PaperworkItem:
    item = get_item_or_404(session, item_id)
    assert_project_open(session, item.project_id)
    item.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paperwork_item(session: SessionDep, item_id: int) -> None:
    item = get_item_or_404(session, item_id)
    assert_project_open(session, item.project_id)
    session.delete(item)
    session.commit()
