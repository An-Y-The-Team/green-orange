"""Leads — STUDENT EXERCISE (skeleton).

Implement CRUD mirroring app/api/routes/customers.py.
Model fields (match the crm-web `Lead` type): name, company, source, status
("new"|"contacted"|"qualified"|"lost"), value (int), owner.
See app/api/routes/contacts.py for the step-by-step checklist.
"""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser  # noqa: F401

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("")
def list_leads() -> list[dict]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Leads endpoint not implemented yet — student exercise.",
    )
