"""FastAPI entrypoint for the CRM backend.

Run locally:  uv run uvicorn app.main:app --reload --port 8000
Interactive docs:  http://localhost:8000/docs

This app implements the same v2 contract as `apps/crm-api-nest` (NestJS +
Prisma, port 8001) — same paths, same payloads, same rules — so crm-web can be
pointed at either one. When you change behaviour here, change it there too.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.routes import (
    auth,
    clients,
    company,
    contracts,
    crew,
    paperwork,
    projects,
    quotes,
    receivables,
)
from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # No startup work is performed here; run Alembic migrations separately in
    # production.
    yield


app = FastAPI(
    title="Yan CRM API",
    version="0.0.0",
    lifespan=lifespan,
    # Keep the /docs "Authorize" token in the browser across reloads so you
    # don't have to re-enter admin/admin every time you refresh the page.
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Safety net for constraint violations that reach the client. Routes refuse
# explicitly wherever a delete or a duplicate is expected (see the guards in
# routes/clients.py and routes/projects.py); this only stops the next one that
# doesn't from being a bare 500. Mirrors crm-api-nest's PrismaExceptionFilter.
_INTEGRITY_MESSAGES = {
    "23503": "record is still referenced by related records",
    "23505": "a record with these unique values already exists",
}


@app.exception_handler(IntegrityError)
def integrity_error_handler(_request: Request, exc: IntegrityError) -> JSONResponse:
    sqlstate = getattr(exc.orig, "sqlstate", None)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "detail": _INTEGRITY_MESSAGES.get(
                sqlstate, "request conflicts with existing data"
            )
        },
    )


app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(clients.contacts_router)
app.include_router(clients.locations_router)
app.include_router(projects.types_router)
app.include_router(projects.router)
app.include_router(projects.notes_router)
app.include_router(projects.attachments_router)
app.include_router(quotes.router)
app.include_router(contracts.router)
app.include_router(contracts.templates_router)
app.include_router(company.router)
app.include_router(paperwork.router)
app.include_router(receivables.router)
app.include_router(receivables.bills_router)
app.include_router(receivables.milestones_router)
app.include_router(receivables.summary_router)
app.include_router(crew.roles_router)
app.include_router(crew.router)
app.include_router(crew.assignments_router)
app.include_router(crew.timekeeping_router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "auth_mode": settings.auth_mode}
