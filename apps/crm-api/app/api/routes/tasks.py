"""Tasks — STUDENT EXERCISE (skeleton).

Implement CRUD mirroring app/api/routes/customers.py.
Model fields (match the crm-web `Task` type): title, due_date, status
("todo"|"in_progress"|"done"), priority ("low"|"medium"|"high"), assignee.
See app/api/routes/contacts.py for the step-by-step checklist.
"""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser  # noqa: F401

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
def list_tasks() -> list[dict]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Tasks endpoint not implemented yet — student exercise.",
    )
