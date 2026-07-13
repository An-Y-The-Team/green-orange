"""FastAPI entrypoint for the teaching CRM backend.

Run locally:  uv run uvicorn app.main:app --reload --port 8000
Interactive docs:  http://localhost:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, contacts, customers, deals, leads, projects, tasks
from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # No startup work is performed here; run Alembic migrations separately in 
    #production.
    yield


app = FastAPI(
    title="Yan CRM API",
    version="0.0.0",
    lifespan=lifespan,
    # Keep the /docs "Authorize" token in the browser across reloads so you
    # don't have to re-enter admin/admin every time you refresh the page.
    # Swagger UI defaults persistAuthorization to false (token is in-memory
    # only and lost on refresh). Pure docs/dev convenience — no API change.
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Worked reference resources.
app.include_router(auth.router)
app.include_router(customers.router)
# Student-exercise resources (currently return 501 until implemented).
app.include_router(contacts.router)
app.include_router(leads.router)
app.include_router(deals.router)
app.include_router(tasks.router)
app.include_router(projects.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "auth_mode": settings.auth_mode}
