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
    # Teaching convenience: create tables + seed demo data on startup. In
    # production, run Alembic migrations instead (see alembic/) and drop these.
    yield


app = FastAPI(title="Yan CRM API", version="0.0.0", lifespan=lifespan)

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
