"""POST /projects/import — "Công trình mới từ Bảng Báo Giá".

Port of `crm-api-nest/src/projects/project-import.ts`. crm-web parses the
operator's Excel workbook and matches its Bên A / site / contact to existing
rows; this endpoint only writes. EVERYTHING — client, contact, site, project
(+ CT code, paperwork checklist), quote v1, and for a settled job the quyết
toán + its draft bill — commits in ONE transaction, so a half-imported file is
never left behind.

The stage is asserted, like a direct create at a later stage: no gates run,
nothing auto-advances.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import SessionDep, get_current_user
from app.api.routes.projects import insert_project
from app.api.routes.quotes import compute_items
from app.api.routes.receivables import (
    DiscountDoc,
    assert_discount_within,
    insert_settlement,
)
from app.models.client import Client, Contact, Location
from app.models.project import Project, ProjectWithRelations
from app.models.project_import import (
    ImportClient,
    ImportContact,
    ImportLocation,
    ImportStage,
    ProjectImport,
)
from app.models.quote import Quote, QuoteStatus
from app.models.receivable import SettlementCreate

router = APIRouter(
    prefix="/projects", tags=["projects"], dependencies=[Depends(get_current_user)]
)


def _client(session: Session, ref: ImportClient) -> int:
    if ref.id is None:
        client = Client(
            name=ref.name, type=ref.type, tax_code=ref.tax_code, address=ref.address
        )
        session.add(client)
        session.flush()
        return client.id
    if not session.get(Client, ref.id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "client.id does not exist")
    return ref.id


def _contact(session: Session, client_id: int, ref: ImportContact) -> int:
    if ref.id is None:
        contact = Contact(
            client_id=client_id, name=ref.name, title=ref.title, phone=ref.phone
        )
        session.add(contact)
        session.flush()
        return contact.id
    row = session.get(Contact, ref.id)
    if not row or row.client_id != client_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "contact.id does not belong to the client"
        )
    return row.id


def _location(
    session: Session, client_id: int, contact_id: int | None, ref: ImportLocation
) -> Location:
    if ref.id is None:
        location = Location(
            client_id=client_id,
            name=ref.name,
            address=ref.address,
            manager_contact_id=contact_id,
        )
        session.add(location)
        session.flush()
        return location
    row = session.get(Location, ref.id)
    if not row or row.client_id != client_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "location.id does not belong to the client"
        )
    return row


@router.post(
    "/import",
    response_model=ProjectWithRelations,
    status_code=status.HTTP_201_CREATED,
)
def import_project(session: SessionDep, payload: ProjectImport) -> Project:
    if payload.settlement and payload.stage != ImportStage.SETTLEMENT:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "a settlement is only imported at stage settlement",
        )
    # Fail before writing anything when the money cannot be stored.
    rows, total = compute_items(payload.quote.items)
    discount = int(payload.quote.discount_amount or 0)
    assert_discount_within(total, discount, DiscountDoc.QUOTE)

    # Every helper below only flushes; the single commit is the transaction.
    # Rolled back explicitly on any failure so a half-imported file can never
    # reach a later commit on the same session.
    try:
        client_id = _client(session, payload.client)
        # A new cá nhân IS their own contact, managing their site — the same
        # invariant POST /clients keeps (crm-business-flow.md, Client model).
        contact = payload.contact or (
            ImportContact(name=payload.client.name)
            if payload.client.id is None and payload.client.type == "individual"
            else None
        )
        contact_id = _contact(session, client_id, contact) if contact else None
        location = _location(session, client_id, contact_id, payload.location)
        # Same defaults as POST /projects: the working contact falls back to the
        # site manager, the decision maker to the working contact.
        working = contact_id or location.manager_contact_id
        project = insert_project(
            session,
            type_ids=payload.type_ids,
            name=payload.name,
            client_id=client_id,
            location_id=location.id,
            working_contact_id=working,
            decision_maker_contact_id=working,
            stage=payload.stage.value,
            request_note=payload.request_note,
        )
        session.add(
            Quote(
                project_id=project.id,
                version=1,
                # At "quote" the client has the paper and has not answered; any
                # later stage means it was chốt. The decision date is unknown.
                status=(
                    QuoteStatus.WAITING
                    if payload.stage == ImportStage.QUOTE
                    else QuoteStatus.DEAL
                ),
                total_amount=total,
                discount_amount=discount,
                vat_rate=payload.quote.vat_rate,
                items=rows,
            )
        )
        if payload.settlement:
            insert_settlement(
                session,
                SettlementCreate(
                    project_id=project.id, **payload.settlement.model_dump()
                ),
            )
        session.commit()
    except Exception:
        session.rollback()
        raise
    session.refresh(project)
    return project
