from fastapi import APIRouter, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.acceptance import Acceptance, AcceptanceCreate, AcceptancePublic

router = APIRouter(prefix="/acceptances", tags=["acceptances"])


@router.get("", response_model=list[AcceptancePublic])
def list_acceptances(
    session: SessionDep,
    _user: CurrentUser,
    project_code: str | None = None,
    offset: int = 0,
    limit: int = Query(default=100, le=100),
) -> list[Acceptance]:
    query = select(Acceptance)
    if project_code is not None:
        query = query.where(Acceptance.project_code == project_code)
    return list(session.exec(query.offset(offset).limit(limit)).all())


@router.post("", response_model=AcceptancePublic, status_code=status.HTTP_201_CREATED)
def create_acceptance(
    payload: AcceptanceCreate, session: SessionDep, _user: CurrentUser
) -> Acceptance:
    acceptance = Acceptance.model_validate(payload)
    session.add(acceptance)
    session.commit()
    session.refresh(acceptance)
    return acceptance
