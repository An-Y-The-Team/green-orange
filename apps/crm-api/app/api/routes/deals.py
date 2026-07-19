"""Deals — STUDENT EXERCISE (skeleton).

Implement CRUD mirroring app/api/routes/clients.py.
Model fields (match the crm-web `Deal` type): title, company, stage
("prospect"|"proposal"|"negotiation"|"won"|"lost"), amount (int), close_date.
See app/api/routes/contacts.py for the step-by-step checklist.
"""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser  # noqa: F401

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("")
def list_deals() -> list[dict]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Deals endpoint not implemented yet — student exercise.",
    )
