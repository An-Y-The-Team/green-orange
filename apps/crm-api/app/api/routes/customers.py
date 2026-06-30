"""Customers — the fully-worked CRUD reference.

Every endpoint is protected (depends on CurrentUser). Copy this file's shape to
implement contacts / leads / deals / tasks. The five operations below — list,
read, create, update, delete — are the pattern to replicate.
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.customer import (
    Customer,
    CustomerCreate,
    CustomerPublic,
    CustomerUpdate,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerPublic])
def list_customers(
    session: SessionDep,
    _user: CurrentUser,
    offset: int = 0,
    limit: int = Query(default=100, le=100),
) -> list[Customer]:
    return list(session.exec(select(Customer).offset(offset).limit(limit)).all())


@router.get("/{customer_id}", response_model=CustomerPublic)
def get_customer(customer_id: int, session: SessionDep, _user: CurrentUser) -> Customer:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("", response_model=CustomerPublic, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate, session: SessionDep, _user: CurrentUser
) -> Customer:
    customer = Customer.model_validate(payload)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.patch("/{customer_id}", response_model=CustomerPublic)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    session: SessionDep,
    _user: CurrentUser,
) -> Customer:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, session: SessionDep, _user: CurrentUser) -> None:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    session.delete(customer)
    session.commit()
