"""Company profile — the single row (id=1) printed on every A4 document.

Port of `crm-api-nest/src/company/company.module.ts`. Every field is optional:
null clears one and the web app falls back to its built-in default.
"""

from fastapi import APIRouter, Depends

from app.api.deps import SessionDep, get_current_user
from app.models.contract import CompanyProfile, CompanyProfileUpdate

router = APIRouter(
    prefix="/company-profile",
    tags=["company-profile"],
    dependencies=[Depends(get_current_user)],
)

PROFILE_ID = 1


@router.get("", response_model=None)
def get_company_profile(session: SessionDep) -> CompanyProfile | dict:
    """The stored profile, or `{}` before the first save."""
    return session.get(CompanyProfile, PROFILE_ID) or {}


@router.patch("", response_model=CompanyProfile)
def update_company_profile(
    session: SessionDep, payload: CompanyProfileUpdate
) -> CompanyProfile:
    profile = session.get(CompanyProfile, PROFILE_ID)
    if profile is None:
        profile = CompanyProfile(id=PROFILE_ID)
    profile.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
