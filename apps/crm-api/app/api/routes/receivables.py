"""Receivables — Quyết toán → Hóa đơn → Đợt thanh toán.

Port of `crm-api-nest/src/receivables/receivables.module.ts`. The rules:
  • One settlement per project (1:1) — a second POST is a 409.
  • A settlement is born with its draft bill.
  • Signing a settlement officializes its bill, attaches every unallocated cọc
    and schedules the balance; un-signing is its exact inverse.
  • Bills have no POST/DELETE — they live and die with their settlement.
  • "overdue" is DERIVED (due_date < today && status != paid), never stored.
  • A quyết toán carries the same money shape as the báo giá it settles: what
    the client owes is (Σ items − giảm giá) + VAT, and only that figure may
    reach a bill or an đợt (`payable_total`).
"""

import math
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.api.common import PageDep, csv_filter, ilike, order_by, paged
from app.api.deps import SessionDep, get_current_user
from app.core.rules import (
    advance_stage,
    assert_project_open,
    assert_step,
    business_today,
)
from app.models.project import Project
from app.models.receivable import (
    BILL_STATUSES,
    MILESTONE_STATUSES,
    SETTLEMENT_STATUSES,
    Bill,
    BillListItem,
    BillPublic,
    BillsSummary,
    BillUpdate,
    MilestoneCreate,
    MilestoneListItem,
    MilestonePublic,
    MilestonesSummary,
    MilestoneUpdate,
    PaymentMilestone,
    ReceivablesSummary,
    Settlement,
    SettlementCreate,
    SettlementItem,
    SettlementItemIn,
    SettlementPublic,
    SettlementUpdate,
    SummaryBucket,
)

router = APIRouter(
    prefix="/settlements",
    tags=["settlements"],
    dependencies=[Depends(get_current_user)],
)
bills_router = APIRouter(
    prefix="/bills", tags=["bills"], dependencies=[Depends(get_current_user)]
)
milestones_router = APIRouter(
    prefix="/payment-milestones",
    tags=["payment-milestones"],
    dependencies=[Depends(get_current_user)],
)
summary_router = APIRouter(
    prefix="/receivables",
    tags=["receivables"],
    dependencies=[Depends(get_current_user)],
)


def compute_items(
    items: list[SettlementItemIn],
) -> tuple[list[SettlementItem], int]:
    """amount = round(quantity × unit_price) per item; total = Σ amounts.
    `floor(x + 0.5)` for the same reason as the quotes route: Python rounds
    halves to even and would bill a đồng less than the NestJS backend."""
    rows = [
        SettlementItem(
            description=item.description,
            unit=item.unit,
            quantity=item.quantity,
            unit_price=int(item.unit_price),
            amount=math.floor(item.quantity * item.unit_price + 0.5),
            sort_order=item.sort_order if item.sort_order is not None else index,
        )
        for index, item in enumerate(items)
    ]
    return rows, sum(row.amount for row in rows)


def assert_discount_within(total: int, discount: int) -> None:
    """Giảm giá can never exceed what there is to discount. Checked at WRITE
    time so an unsignable row is never stored, and again in `payable_total`,
    which reads the row back on the sign path."""
    if discount > total:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"giảm giá ({discount}) exceeds the quyết toán subtotal ({total})",
        )


def payable_total(settlement: Settlement) -> int:
    """What the client actually owes: (Σ items − giảm giá) + VAT.

    `total_amount` stays the pre-tax Σ (the quyết toán sheet prints it as
    "Cộng"), so this is the ONLY figure that may reach a bill or an đợt thanh
    toán — billing the subtotal under-asks by the tax the hợp đồng charged.
    `floor(x + 0.5)` for the same reason as `compute_items`.
    """
    assert_discount_within(settlement.total_amount, settlement.discount_amount)
    net = settlement.total_amount - settlement.discount_amount
    return net + math.floor(net * settlement.vat_rate + 0.5)


def settlement_remainder(total: int, deposits: list[PaymentMilestone]) -> int:
    """Balance đợt on sign = settlement payable − EVERY unallocated cọc.

    Deliberately status-blind: đợt thanh toán are a payment SCHEDULE, so sum(a
    bill's đợt) must equal bill.total_amount. An unpaid `not_due` cọc is still a
    scheduled obligation — subtracting only the paid ones would bill the full
    balance next to it and double-bill the client. Do not "fix" this by
    filtering on status.
    """
    allocated = sum(deposit.amount for deposit in deposits)
    remainder = total - allocated
    if remainder < 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"cọc already scheduled ({allocated}) exceeds the quyết toán "
            f"payable ({total}) — correct the đợt thanh toán before signing",
        )
    return remainder


def overdue_clauses() -> tuple:
    """The DERIVED overdue rule, in one place. Two copies of it drift, and this
    one decides a number the owner reads as fact."""
    return (
        PaymentMilestone.due_date < business_today(),
        PaymentMilestone.status != "paid",
    )


def get_settlement_or_404(session: Session, settlement_id: int) -> Settlement:
    row = session.get(Settlement, settlement_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Settlement not found")
    return row


def get_bill_or_404(session: Session, bill_id: int) -> Bill:
    row = session.get(Bill, bill_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bill not found")
    return row


def get_milestone_or_404(session: Session, milestone_id: int) -> PaymentMilestone:
    row = session.get(PaymentMilestone, milestone_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment milestone not found")
    return row


def assert_bill_belongs_to_project(
    session: Session, bill_id: int, project_id: int
) -> None:
    """The printed "Đề nghị thanh toán" joins on bill_id alone, so a foreign bill
    would render one client's payment schedule on another's request (and corrupt
    un-sign's "already collected" check)."""
    bill = session.get(Bill, bill_id)
    if not bill or bill.project_id != project_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "bill_id does not belong to project_id"
        )


# ── Settlements (Quyết toán) ────────────────────────────────────────────────
@router.get("", response_model=list[SettlementPublic])
def list_settlements(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
) -> list[Settlement]:
    statement = select(Settlement)
    if project_id is not None:
        statement = statement.where(Settlement.project_id == project_id)
    return paged(session, response, statement.order_by(Settlement.id.asc()), page)


@router.get("/{settlement_id}", response_model=SettlementPublic)
def get_settlement(session: SessionDep, settlement_id: int) -> Settlement:
    return get_settlement_or_404(session, settlement_id)


@router.post("", response_model=SettlementPublic, status_code=status.HTTP_201_CREATED)
def create_settlement(session: SessionDep, payload: SettlementCreate) -> Settlement:
    assert_project_open(session, payload.project_id)
    # 1:1 rule: correct the existing settlement instead of adding another.
    existing = session.exec(
        select(Settlement).where(Settlement.project_id == payload.project_id)
    ).first()
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"project already has a settlement (QT #{existing.id}) "
            "— a project settles once",
        )
    rows, total = compute_items(payload.items or [])
    discount = int(payload.discount_amount or 0)
    assert_discount_within(total, discount)
    settlement = Settlement(
        project_id=payload.project_id,
        note=payload.note,
        total_amount=total,
        discount_amount=discount,
        items=rows,
    )
    if payload.vat_rate is not None:
        settlement.vat_rate = payload.vat_rate
    session.add(settlement)
    # Doc rule: the draft bill is prepared alongside the settlement — one
    # transaction, so a settlement can never exist without its bill.
    session.flush()
    session.add(
        Bill(
            project_id=payload.project_id,
            settlement_id=settlement.id,
            total_amount=0,  # the bill gets the real total on sign
        )
    )
    session.commit()
    session.refresh(settlement)
    # Starting a settlement means the project has reached stage 8.
    advance_stage(session, payload.project_id, "settlement")
    return settlement


def unsign(session: Session, settlement: Settlement) -> Settlement:
    """signed → draft: give the money back to its pre-sign state so the numbers
    can be corrected. Refuses once money has actually come in — un-signing a paid
    bill would silently orphan collected payments."""
    bill = settlement.bill
    if bill:
        collected = bill.status == "paid" or (
            session.exec(
                select(PaymentMilestone).where(
                    PaymentMilestone.bill_id == bill.id,
                    PaymentMilestone.type != "deposit",
                    PaymentMilestone.status == "paid",
                )
            ).first()
            is not None
        )
        if collected:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "cannot un-sign: payments have already been collected on this bill",
            )
    settlement.status = "draft"
    settlement.signed_date = None
    session.add(settlement)
    if bill:
        for milestone in session.exec(
            select(PaymentMilestone).where(PaymentMilestone.bill_id == bill.id)
        ).all():
            # Detach the cọc so it survives the cleanup and a re-sign
            # re-attaches it (keeps sign/unsign idempotent).
            if milestone.type == "deposit":
                milestone.bill_id = None
                session.add(milestone)
            elif milestone.status != "paid":
                session.delete(milestone)
        bill.status = "draft"
        bill.total_amount = 0
        bill.sent_date = None
        bill.paid_date = None
        session.add(bill)
    session.commit()
    session.refresh(settlement)
    return settlement


def sign(session: Session, settlement: Settlement) -> Settlement:
    """Officialize the bill with the settlement total, attach every unallocated
    cọc and schedule one đợt for the remaining balance (stage 8)."""
    bill = settlement.bill
    if bill:
        # The bill and its đợt carry what the client owes — subtotal + VAT, less
        # giảm giá — not the pre-tax Σ the sheet prints as "Cộng".
        payable = payable_total(settlement)
        bill.status = "official"
        bill.total_amount = payable
        session.add(bill)
        # All of them: a leftover cọc would stay unallocated and unsubtracted.
        deposits = list(
            session.exec(
                select(PaymentMilestone).where(
                    PaymentMilestone.project_id == settlement.project_id,
                    PaymentMilestone.type == "deposit",
                    PaymentMilestone.bill_id.is_(None),
                )
            ).all()
        )
        remainder = settlement_remainder(payable, deposits)
        for deposit in deposits:
            deposit.bill_id = bill.id
            session.add(deposit)
        if remainder > 0:
            session.add(
                PaymentMilestone(
                    project_id=settlement.project_id,
                    bill_id=bill.id,
                    type="progress",
                    amount=remainder,
                )
            )
    session.commit()
    session.refresh(settlement)
    return settlement


@router.patch("/{settlement_id}", response_model=SettlementPublic)
def update_settlement(
    session: SessionDep, settlement_id: int, payload: SettlementUpdate
) -> Settlement:
    settlement = get_settlement_or_404(session, settlement_id)
    assert_project_open(session, settlement.project_id)
    fields = payload.model_dump(exclude_unset=True)

    # Everything the money fields touch is computed and checked BEFORE any of it
    # is assigned: a half-applied PATCH that then 400s would leave the row
    # holding numbers the server itself refuses.
    rows, total = None, settlement.total_amount
    if payload.items is not None:
        # Doc rule: editable while nháp/đã gửi. Signing derives the bill total +
        # milestones, so a signed settlement is corrected by un-signing first.
        if settlement.status == "signed":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "items are frozen once signed — un-sign to correct",
            )
        rows, total = compute_items(payload.items)

    # Frozen on sign for the same reason as items: both feed payable_total, and
    # the bill + its đợt were derived from that figure.
    if ("discount_amount" in fields or "vat_rate" in fields) and (
        settlement.status == "signed"
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "giảm giá / VAT are frozen once signed — un-sign to correct",
        )
    discount = (
        int(payload.discount_amount)
        if payload.discount_amount is not None
        else settlement.discount_amount
    )
    # Validate the pair as it will STAND after this PATCH, not just what the
    # body carries: shrinking the items below an existing giảm giá is the same
    # invalid row as sending too big a giảm giá.
    assert_discount_within(total, discount)

    if rows is not None:
        settlement.total_amount = total
        settlement.items = rows  # delete-orphan removes the replaced rows
    settlement.discount_amount = discount
    if payload.vat_rate is not None:
        settlement.vat_rate = payload.vat_rate

    if "note" in fields:
        settlement.note = fields["note"]
    if "signed_date" in fields:
        settlement.signed_date = fields["signed_date"]

    target = fields.get("status")
    if target is not None and target != settlement.status:
        # Correction path (1:1 rule): un-sign back to draft instead of creating
        # a second settlement.
        if settlement.status == "signed" and target == "draft":
            return unsign(session, settlement)
        assert_step(SETTLEMENT_STATUSES, settlement.status, target)
        settlement.status = target
        if target == "signed":
            settlement.signed_date = fields.get("signed_date") or business_today()
            session.add(settlement)
            return sign(session, settlement)

    session.add(settlement)
    session.commit()
    session.refresh(settlement)
    return settlement


@router.delete("/{settlement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_settlement(session: SessionDep, settlement_id: int) -> None:
    settlement = get_settlement_or_404(session, settlement_id)
    assert_project_open(session, settlement.project_id)
    if settlement.status != "draft":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Only draft settlements can be deleted"
        )
    for bill in session.exec(
        select(Bill).where(Bill.settlement_id == settlement_id)
    ).all():
        session.delete(bill)
    session.flush()
    session.delete(settlement)  # items cascade via the FK
    session.commit()


# ── Bills (Hóa đơn) ─────────────────────────────────────────────────────────
# No POST (bills are born with their settlement) and no DELETE (they die with
# their draft settlement).
@bills_router.get("", response_model=list[BillListItem])
def list_bills(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    status_: Annotated[str | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query(max_length=300)] = None,
    sort_by: Annotated[
        Literal["sent_date", "paid_date", "total_amount", "id"] | None, Query()
    ] = None,
    sort_order: Annotated[Literal["asc", "desc"] | None, Query()] = None,
) -> list[Bill]:
    statement = select(Bill)
    if project_id is not None:
        statement = statement.where(Bill.project_id == project_id)
    statuses = csv_filter(status_, BILL_STATUSES, "status")
    if statuses:
        statement = statement.where(Bill.status.in_(statuses))
    if search:
        # A hóa đơn has no name of its own; the code is what is on the paper.
        statement = statement.where(Bill.project.has(ilike(Project.code, search)))
    return paged(
        session,
        response,
        statement.order_by(
            *order_by(
                {
                    "sent_date": Bill.sent_date,
                    "paid_date": Bill.paid_date,
                    "total_amount": Bill.total_amount,
                    "id": Bill.id,
                },
                sort_by,
                sort_order,
                # Was unordered: paging an unordered query overlaps and drops rows.
                fallback=[Bill.id.asc()],
                tiebreak=Bill.id,
                nulls_last=True,
            )
        ),
        page,
    )


@bills_router.get("/{bill_id}", response_model=BillPublic)
def get_bill(session: SessionDep, bill_id: int) -> Bill:
    return get_bill_or_404(session, bill_id)


@bills_router.patch("/{bill_id}", response_model=BillPublic)
def update_bill(session: SessionDep, bill_id: int, payload: BillUpdate) -> Bill:
    bill = get_bill_or_404(session, bill_id)
    assert_project_open(session, bill.project_id)
    fields = payload.model_dump(exclude_unset=True)
    if payload.total_amount is not None:
        if bill.status not in ("draft", "official"):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "total_amount is editable only while draft or official",
            )
        bill.total_amount = int(payload.total_amount)
    if "sent_date" in fields:
        bill.sent_date = fields["sent_date"]
    if "paid_date" in fields:
        bill.paid_date = fields["paid_date"]
    target = fields.get("status")
    if target is not None and target != bill.status:
        # Forward-only; manual flips are the source of truth (a future bank feed
        # is out of scope).
        if BILL_STATUSES.index(target) <= BILL_STATUSES.index(bill.status):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Invalid status transition: {bill.status} → {target}",
            )
        bill.status = target
        if target == "sent" and bill.sent_date is None:
            bill.sent_date = business_today()
        if target == "paid" and bill.paid_date is None:
            bill.paid_date = business_today()
    session.add(bill)
    session.commit()
    session.refresh(bill)
    return bill


# ── Payment milestones (Đợt thanh toán) ─────────────────────────────────────
@milestones_router.get("", response_model=list[MilestoneListItem])
def list_milestones(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    bill_id: Annotated[int | None, Query()] = None,
    status_: Annotated[str | None, Query(alias="status")] = None,
    overdue: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=300)] = None,
    sort_by: Annotated[
        Literal["due_date", "paid_date", "amount", "id"] | None, Query()
    ] = None,
    sort_order: Annotated[Literal["asc", "desc"] | None, Query()] = None,
) -> list[PaymentMilestone]:
    statement = select(PaymentMilestone)
    if project_id is not None:
        statement = statement.where(PaymentMilestone.project_id == project_id)
    if bill_id is not None:
        statement = statement.where(PaymentMilestone.bill_id == bill_id)
    # Same shape as the paperwork list: `overdue` implies a status, so it
    # REPLACES `status=` rather than fighting it for the same column.
    if overdue == "true":
        statement = statement.where(*overdue_clauses())
    else:
        statuses = csv_filter(status_, MILESTONE_STATUSES, "status")
        if statuses:
            statement = statement.where(PaymentMilestone.status.in_(statuses))
    if search:
        statement = statement.where(
            PaymentMilestone.project.has(ilike(Project.code, search))
        )
    return paged(
        session,
        response,
        statement.order_by(
            *order_by(
                {
                    "due_date": PaymentMilestone.due_date,
                    "paid_date": PaymentMilestone.paid_date,
                    "amount": PaymentMilestone.amount,
                    "id": PaymentMilestone.id,
                },
                sort_by,
                sort_order,
                # Soonest due first, undated last. With `paid` filtered out —
                # what /receivables defaults to — the oldest due dates ARE the
                # overdue ones, so "quá hạn on top" falls out of this ordering
                # and survives pagination. It used to be `id asc`, so an overdue
                # đợt on page 2 never surfaced on the screen whose whole job is
                # surfacing overdue đợt.
                fallback=[
                    PaymentMilestone.due_date.asc().nulls_last(),
                    PaymentMilestone.id.asc(),
                ],
                tiebreak=PaymentMilestone.id,
                nulls_last=True,
            )
        ),
        page,
    )


@milestones_router.get("/{milestone_id}", response_model=MilestonePublic)
def get_milestone(session: SessionDep, milestone_id: int) -> PaymentMilestone:
    return get_milestone_or_404(session, milestone_id)


@milestones_router.post(
    "", response_model=MilestonePublic, status_code=status.HTTP_201_CREATED
)
def create_milestone(session: SessionDep, payload: MilestoneCreate) -> PaymentMilestone:
    assert_project_open(session, payload.project_id)
    if payload.bill_id is not None:
        assert_bill_belongs_to_project(session, payload.bill_id, payload.project_id)
    # A date of payment on money that isn't paid is incoherent — reject rather
    # than store it, so a caller sending the wrong status hears about it instead
    # of leaving a not_due đợt that looks settled.
    if payload.paid_date is not None and payload.status != "paid":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, 'paid_date requires status: "paid"'
        )
    # An explicit initial status is NOT a transition, so no assert_step —
    # recording an already-received cọc has to be one write, or a failed
    # follow-up PATCH leaves an orphan the operator's retry duplicates.
    milestone = PaymentMilestone(
        project_id=payload.project_id,
        bill_id=payload.bill_id,
        type=payload.type,
        amount=int(payload.amount),
        due_date=payload.due_date,
        # The operator can backdate a cọc that arrived last week; the server
        # stamp is only the fallback.
        paid_date=payload.paid_date
        or (business_today() if payload.status == "paid" else None),
    )
    if payload.status is not None:
        milestone.status = payload.status
    session.add(milestone)
    session.commit()
    session.refresh(milestone)
    # Cọc received closes stage 4 → paperwork.
    if payload.status == "paid" and payload.type == "deposit":
        advance_stage(session, payload.project_id, "paperwork")
    return milestone


@milestones_router.patch("/{milestone_id}", response_model=MilestonePublic)
def update_milestone(
    session: SessionDep, milestone_id: int, payload: MilestoneUpdate
) -> PaymentMilestone:
    milestone = get_milestone_or_404(session, milestone_id)
    assert_project_open(session, milestone.project_id)
    fields = payload.model_dump(exclude_unset=True)
    was_status, was_type = milestone.status, milestone.type
    if payload.bill_id is not None:
        assert_bill_belongs_to_project(session, payload.bill_id, milestone.project_id)
    if "bill_id" in fields:
        milestone.bill_id = fields["bill_id"]
    if payload.amount is not None:
        milestone.amount = int(payload.amount)
    if "due_date" in fields:
        milestone.due_date = fields["due_date"]
    if "paid_date" in fields:
        milestone.paid_date = fields["paid_date"]
    target = fields.get("status")
    if target is not None and target != was_status:
        assert_step(MILESTONE_STATUSES, was_status, target)
        milestone.status = target
        if target == "paid" and milestone.paid_date is None:
            milestone.paid_date = business_today()
    session.add(milestone)
    session.commit()
    session.refresh(milestone)
    # Cọc received (deposit milestone paid) closes stage 4 → paperwork.
    if target == "paid" and was_status != "paid" and was_type == "deposit":
        advance_stage(session, milestone.project_id, "paperwork")
    return milestone


@milestones_router.delete("/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(session: SessionDep, milestone_id: int) -> None:
    milestone = get_milestone_or_404(session, milestone_id)
    assert_project_open(session, milestone.project_id)
    if milestone.status != "not_due":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only not_due payment milestones can be deleted",
        )
    session.delete(milestone)
    session.commit()


# ── Receivables summary ─────────────────────────────────────────────────────
def _bucket(count: int | None, total: int | None) -> SummaryBucket:
    """A status with no rows sums to NULL, not 0 — coerce here, once, or the UI
    prints "null ₫" for an empty bucket."""
    return SummaryBucket(count=count or 0, total=total or 0)


def _by_status(
    session: Session, model: type, amount_column, statuses: tuple[str, ...], scope
) -> dict[str, SummaryBucket]:
    rows = dict(
        (row[0], _bucket(row[1], row[2]))
        for row in session.exec(
            select(model.status, func.count(), func.sum(amount_column))
            .where(*scope)
            .group_by(model.status)
        ).all()
    )
    # Every status present, so a consumer never has to handle a missing key —
    # an absent bucket is a real zero, not unknown.
    return {status_: rows.get(status_, _bucket(0, 0)) for status_ in statuses}


@summary_router.get("/summary", response_model=ReceivablesSummary)
def get_receivables_summary(
    session: SessionDep, project_id: Annotated[int | None, Query()] = None
) -> ReceivablesSummary:
    """Money totals across the WHOLE filtered collection, not one page.

    A sum over one 100-row page understates the debt and looks authoritative
    doing it, which is why the dashboard printed no "Tổng công nợ" at all. One
    endpoint rather than one per table: the money screen and the dashboard each
    want both halves, so this is one round trip instead of two.
    """
    scope = (PaymentMilestone.project_id == project_id,) if project_id else ()
    bill_scope = (Bill.project_id == project_id,) if project_id else ()
    overdue = session.exec(
        select(func.count(), func.sum(PaymentMilestone.amount)).where(
            *scope, *overdue_clauses()
        )
    ).one()
    return ReceivablesSummary(
        milestones=MilestonesSummary(
            by_status=_by_status(
                session,
                PaymentMilestone,
                PaymentMilestone.amount,
                MILESTONE_STATUSES,
                scope,
            ),
            overdue=_bucket(overdue[0], overdue[1]),
        ),
        bills=BillsSummary(
            by_status=_by_status(
                session, Bill, Bill.total_amount, BILL_STATUSES, bill_scope
            )
        ),
    )
