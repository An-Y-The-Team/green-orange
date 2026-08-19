"""Hợp đồng — contracts and the templates they are printed from.

Port of `crm-api-nest/src/contracts/contracts.module.ts`. A signed contract is a
legal document: everything that prints on the paper is frozen, so only the
status/date fields stay writable (signing still works, and a mis-signed contract
can be corrected).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session, select

from app.api.common import PageDep, paged
from app.api.deps import SessionDep, get_current_user
from app.core.rules import advance_stage, assert_project_open, business_today, next_code
from app.models.contract import (
    Contract,
    ContractCreate,
    ContractPublic,
    ContractTemplate,
    ContractTemplateCreate,
    ContractTemplatePublic,
    ContractTemplateUpdate,
    ContractUpdate,
)

router = APIRouter(
    prefix="/contracts", tags=["contracts"], dependencies=[Depends(get_current_user)]
)
templates_router = APIRouter(
    prefix="/contract-templates",
    tags=["contract-templates"],
    dependencies=[Depends(get_current_user)],
)

# Printable content — frozen once a contract is signed.
CONTRACT_CONTENT_FIELDS = (
    "body",
    "note",
    "template_id",
    "rep_a_label",
    "rep_a_name",
    "rep_a_title",
    "rep_b_label",
    "rep_b_name",
    "rep_b_title",
    "print_snapshot",
)


def get_contract_or_404(session: Session, contract_id: int) -> Contract:
    contract = session.get(Contract, contract_id)
    if not contract:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contract not found")
    return contract


@router.get("", response_model=list[ContractPublic])
def list_contracts(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    status_: Annotated[str | None, Query(alias="status")] = None,
) -> list[Contract]:
    statement = select(Contract)
    if project_id is not None:
        statement = statement.where(Contract.project_id == project_id)
    if status_:
        statement = statement.where(Contract.status == status_)
    # Was unordered: paging an unordered query overlaps and drops rows.
    return paged(session, response, statement.order_by(Contract.id.asc()), page)


@router.get("/{contract_id}", response_model=ContractPublic)
def get_contract(session: SessionDep, contract_id: int) -> Contract:
    return get_contract_or_404(session, contract_id)


@router.post("", response_model=ContractPublic, status_code=status.HTTP_201_CREATED)
def create_contract(session: SessionDep, payload: ContractCreate) -> Contract:
    assert_project_open(session, payload.project_id)
    contract = Contract(code=next_code(session, Contract, "HD"), **payload.model_dump())
    session.add(contract)
    session.commit()
    session.refresh(contract)
    advance_stage(session, payload.project_id, "contract")
    return contract


@router.patch("/{contract_id}", response_model=ContractPublic)
def update_contract(
    session: SessionDep, contract_id: int, payload: ContractUpdate
) -> Contract:
    contract = get_contract_or_404(session, contract_id)
    assert_project_open(session, contract.project_id)
    fields = payload.model_dump(exclude_unset=True)
    if contract.status != "draft":
        frozen = [f for f in CONTRACT_CONTENT_FIELDS if f in fields]
        if frozen:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Only draft contracts can be edited "
                f"(attempted to change: {', '.join(frozen)})",
            )
    # Signing without an explicit date stamps today.
    if (
        fields.get("status") == "signed"
        and "signed_date" not in fields
        and not contract.signed_date
    ):
        fields["signed_date"] = business_today()
    contract.sqlmodel_update(fields)
    session.add(contract)
    session.commit()
    session.refresh(contract)
    return contract


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(session: SessionDep, contract_id: int) -> None:
    contract = get_contract_or_404(session, contract_id)
    assert_project_open(session, contract.project_id)
    if contract.status != "draft":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only draft contracts can be deleted"
        )
    session.delete(contract)
    session.commit()


# ── Contract templates (mẫu hợp đồng) ───────────────────────────────────────
@templates_router.get("", response_model=list[ContractTemplatePublic])
def list_templates(session: SessionDep) -> list[ContractTemplate]:
    # Unpaginated on purpose: a short user-managed list the editor needs whole.
    return list(session.exec(select(ContractTemplate)).all())


@templates_router.get("/{template_id}", response_model=ContractTemplatePublic)
def get_template(session: SessionDep, template_id: int) -> ContractTemplate:
    row = session.get(ContractTemplate, template_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contract template not found")
    return row


@templates_router.post(
    "", response_model=ContractTemplatePublic, status_code=status.HTTP_201_CREATED
)
def create_template(
    session: SessionDep, payload: ContractTemplateCreate
) -> ContractTemplate:
    row = ContractTemplate.model_validate(payload)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@templates_router.patch("/{template_id}", response_model=ContractTemplatePublic)
def update_template(
    session: SessionDep, template_id: int, payload: ContractTemplateUpdate
) -> ContractTemplate:
    row = get_template(session, template_id)
    row.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(row)
    session.commit()
    session.refresh(row)
    return row
