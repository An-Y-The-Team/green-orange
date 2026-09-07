"""Báo giá — versioned quotes, their send log and the deal decision.

Port of `crm-api-nest/src/quotes/quotes.module.ts`. The bargaining loop: a draft
is editable, sending it freezes it (`waiting`), and a revision is a NEW version
row — so the whole negotiation stays on the record.
"""

import math
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlmodel import Session, or_, select

from app.api.common import (
    PageDep,
    csv_filter,
    ilike,
    order_by,
    paged,
    unaccented,
)
from app.api.deps import SessionDep, get_current_user
from app.core.rules import advance_stage, assert_project_open, business_today
from app.models.client import Client
from app.models.project import Project
from app.models.quote import (
    QUOTE_STATUSES,
    Quote,
    QuoteCreate,
    QuoteDecide,
    QuoteDetail,
    QuoteItem,
    QuoteItemIn,
    QuoteListItem,
    QuotePublic,
    QuoteSend,
    QuoteSendLog,
    QuoteUpdate,
)

router = APIRouter(
    prefix="/quotes", tags=["quotes"], dependencies=[Depends(get_current_user)]
)


def get_quote_or_404(session: Session, quote_id: int) -> Quote:
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")
    return quote


def compute_items(items: list[QuoteItemIn]) -> tuple[list[QuoteItem], int]:
    """amount = round(quantity × unit_price) per item; total = Σ amounts.

    `floor(x + 0.5)`, not `round()`: Python rounds halves to even, so a
    12,345.5 VND line would land a đồng below what the NestJS backend bills.
    """
    rows = [
        QuoteItem(
            category=(item.category or "").strip() or None,
            description=item.description,
            unit=item.unit,
            quantity=item.quantity,
            unit_price=int(item.unit_price),
            amount=math.floor(item.quantity * item.unit_price + 0.5),
            sort_order=index,
        )
        for index, item in enumerate(items)
    ]
    return rows, sum(row.amount for row in rows)


def next_version(session: Session, project_id: int | None) -> int:
    """Standalone quotes (no project) all start at version 1 — Postgres treats
    NULLs as distinct in the (project_id, version) unique constraint."""
    if project_id is None:
        return 1
    highest = session.exec(
        select(func.max(Quote.version)).where(Quote.project_id == project_id)
    ).one()
    return (highest or 0) + 1


def with_is_latest(session: Session, rows: list[Quote]) -> list[QuoteListItem]:
    """Adds `is_latest`: false = a newer version exists for the same project,
    which the UI paints as "Đã thay thế". Derived, never stored.

    ONE extra grouped query per request (never per row), and it asks the DB for
    the max version rather than the fetched page — a map built from the page only
    works while the page is a prefix of `version desc`.
    """
    project_ids = {row.project_id for row in rows if row.project_id is not None}
    max_version = (
        dict(
            session.exec(
                select(Quote.project_id, func.max(Quote.version))
                .where(Quote.project_id.in_(project_ids))
                .group_by(Quote.project_id)
            ).all()
        )
        if project_ids
        else {}
    )
    return [
        QuoteListItem(
            **QuotePublic.model_validate(row).model_dump(),
            send_logs=[{"channel": log.channel} for log in row.send_logs],
            # A standalone quote has no sibling set, so nothing can supersede it.
            is_latest=row.project_id is None
            or row.version >= max_version.get(row.project_id, row.version),
        )
        for row in rows
    ]


# `response_model=None`: a `?project_id=` read answers with the project's full
# version history (line items included — the contract printable and the
# settlement prefill read them off it), while the cross-project list answers with
# header rows plus `is_latest`. Two shapes, so the models are applied by hand.
@router.get("", response_model=None)
def list_quotes(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    status_: Annotated[str | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query(max_length=300)] = None,
    sort_by: Annotated[
        Literal["id", "version", "total_amount", "decided_date"] | None, Query()
    ] = None,
    sort_order: Annotated[Literal["asc", "desc"] | None, Query()] = None,
) -> list[Any]:
    statement = select(Quote)
    if project_id is not None:
        statement = statement.where(Quote.project_id == project_id)
    statuses = csv_filter(status_, QUOTE_STATUSES, "status")
    if statuses:
        statement = statement.where(Quote.status.in_(statuses))
    if search:
        # Quotes have no name of their own — search reaches through the
        # (nullable) project relation, so standalone quotes never match.
        statement = statement.where(
            or_(
                Quote.project.has(unaccented(Project.name_norm, search)),
                Quote.project.has(ilike(Project.code, search)),
                Quote.project.has(
                    Project.client.has(unaccented(Client.name_norm, search))
                ),
            )
        )
    rows = paged(
        session,
        response,
        statement.order_by(
            *order_by(
                {
                    "id": Quote.id,
                    "version": Quote.version,
                    "total_amount": Quote.total_amount,
                    "decided_date": Quote.decided_date,
                },
                sort_by,
                sort_order,
                # Every project restarts at version 1, so version alone is not a
                # total order across projects — id breaks the tie.
                fallback=[Quote.version.desc(), Quote.id.desc()],
                tiebreak=Quote.id,
            )
        ),
        page,
    )
    if project_id is not None:
        return [QuoteDetail.model_validate(row) for row in rows]
    return with_is_latest(session, rows)


@router.get("/{quote_id}", response_model=QuoteDetail)
def get_quote(session: SessionDep, quote_id: int) -> Quote:
    return get_quote_or_404(session, quote_id)


@router.post("", response_model=QuoteDetail, status_code=status.HTTP_201_CREATED)
def create_quote(session: SessionDep, payload: QuoteCreate) -> Quote:
    assert_project_open(session, payload.project_id)
    rows, total = compute_items(payload.items)
    quote = Quote(
        project_id=payload.project_id,
        version=next_version(session, payload.project_id),
        total_amount=total,
        note=payload.note,
        # Blank normalizes to null — the printable falls back to the company
        # representative only when the signer was never set.
        rep_name=(payload.rep_name or "").strip() or None,
        rep_title=(payload.rep_title or "").strip() or None,
        items=rows,
        # status defaults to "draft"
    )
    if payload.vat_rate is not None:
        quote.vat_rate = payload.vat_rate
    session.add(quote)
    session.commit()
    session.refresh(quote)
    advance_stage(session, payload.project_id, "quote")
    return quote


@router.patch("/{quote_id}", response_model=QuoteDetail)
def update_quote(session: SessionDep, quote_id: int, payload: QuoteUpdate) -> Quote:
    quote = get_quote_or_404(session, quote_id)
    assert_project_open(session, quote.project_id)
    if quote.status != "draft":
        raise HTTPException(status.HTTP_409_CONFLICT, "sent versions are never edited")
    fields = payload.model_dump(exclude_unset=True)
    if "vat_rate" in fields and fields["vat_rate"] is not None:
        quote.vat_rate = fields["vat_rate"]
    if "note" in fields:
        quote.note = fields["note"]
    if "rep_name" in fields:
        quote.rep_name = (fields["rep_name"] or "").strip() or None
    if "rep_title" in fields:
        quote.rep_title = (fields["rep_title"] or "").strip() or None
    if payload.items is not None:
        # Replace, don't merge: line items are addressed by position, not id.
        # The delete-orphan cascade removes the rows this drops.
        rows, total = compute_items(payload.items)
        quote.total_amount = total
        quote.items = rows
    session.add(quote)
    session.commit()
    session.refresh(quote)
    return quote


@router.post(
    "/{quote_id}/send", response_model=QuoteDetail, status_code=status.HTTP_201_CREATED
)
def send_quote(session: SessionDep, quote_id: int, payload: QuoteSend) -> Quote:
    quote = get_quote_or_404(session, quote_id)
    assert_project_open(session, quote.project_id)
    if quote.status not in ("draft", "waiting"):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "only draft or waiting quotes can be sent"
        )
    session.add(
        QuoteSendLog(
            quote_id=quote_id,
            channel=payload.channel,
            sent_by=payload.sent_by,
            follow_up_ref=payload.follow_up_ref,
        )
    )
    if quote.status == "draft":
        quote.status = "waiting"
        session.add(quote)
    session.commit()
    session.refresh(quote)
    return quote


@router.post("/{quote_id}/decide", response_model=QuoteDetail)
def decide_quote(session: SessionDep, quote_id: int, payload: QuoteDecide) -> Quote:
    quote = get_quote_or_404(session, quote_id)
    assert_project_open(session, quote.project_id)
    if quote.status != "waiting":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "only waiting quotes can be decided"
        )
    quote.status = payload.status
    quote.decided_date = business_today()
    session.add(quote)
    session.commit()
    session.refresh(quote)
    return quote


@router.post(
    "/{quote_id}/revise",
    response_model=QuoteDetail,
    status_code=status.HTTP_201_CREATED,
)
def revise_quote(session: SessionDep, quote_id: int) -> Quote:
    """Sent versions are frozen; a revision is a new draft row."""
    quote = get_quote_or_404(session, quote_id)
    assert_project_open(session, quote.project_id)
    revised = Quote(
        project_id=quote.project_id,
        version=next_version(session, quote.project_id),
        total_amount=quote.total_amount,
        vat_rate=quote.vat_rate,
        note=quote.note,
        rep_name=quote.rep_name,
        rep_title=quote.rep_title,
        items=[
            QuoteItem(
                category=item.category,
                description=item.description,
                unit=item.unit,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=item.amount,
                sort_order=item.sort_order,
            )
            for item in quote.items
        ],
    )
    session.add(revised)
    session.commit()
    session.refresh(revised)
    advance_stage(session, revised.project_id, "quote")
    return revised


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(session: SessionDep, quote_id: int) -> None:
    quote = get_quote_or_404(session, quote_id)
    assert_project_open(session, quote.project_id)
    if quote.status != "draft":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "only draft quotes can be deleted"
        )
    session.delete(quote)  # items and send logs cascade
    session.commit()
