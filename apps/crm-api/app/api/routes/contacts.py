"""Contacts — STUDENT EXERCISE (skeleton).

Goal: implement full CRUD for contacts, mirroring app/api/routes/customers.py.

Steps:
  1. Define the Contact model + schemas in app/models/contact.py (use
     app/models/customer.py as the template). Fields to match the crm-web
     `Contact` type: name, email, phone, title, company.
  2. Register it in app/models/__init__.py so the table is created.
  3. Replace the 501 stub below with list/get/create/update/delete handlers,
     each protected with CurrentUser (see customers.py).
  4. Generate a migration:  uv run alembic revision --autogenerate -m "contacts"
     then  uv run alembic upgrade head.

Once done, crm-web's /contacts page will render live data when
NEXT_PUBLIC_API_URL is set.
"""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser  # noqa: F401  (use this to protect routes)

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
def list_contacts() -> list[dict]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Contacts endpoint not implemented yet — student exercise.",
    )
