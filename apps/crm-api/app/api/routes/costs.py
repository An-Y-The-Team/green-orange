from fastapi import APIRouter, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.cost import Cost, CostCreate, CostPublic

router = APIRouter(prefix="/costs", tags=["costs"])


@router.get("", response_model=list[CostPublic])
def list_costs(
    session: SessionDep,
    _user: CurrentUser,
    project_code: str | None = None,
    offset: int = 0,
    limit: int = Query(default=100, le=100),
) -> list[Cost]:
    query = select(Cost)
    if project_code is not None:
        query = query.where(Cost.project_code == project_code)
    return list(session.exec(query.offset(offset).limit(limit)).all())


@router.post("", response_model=CostPublic, status_code=status.HTTP_201_CREATED)
def create_cost(payload: CostCreate, session: SessionDep, _user: CurrentUser) -> Cost:
    cost = Cost.model_validate(payload)
    session.add(cost)
    session.commit()
    session.refresh(cost)
    return cost
