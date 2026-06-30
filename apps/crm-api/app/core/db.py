"""Database engine + session dependency (SQLModel over Postgres)."""

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

# SQLite (handy for quick local experiments / tests) needs check_same_thread off
# because FastAPI runs sync routes in a threadpool. Ignored for Postgres.
_connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, echo=False, connect_args=_connect_args)


def init_db() -> None:
    """Create tables for any model registered on SQLModel.metadata.

    Importing app.models here ensures every table model is registered before
    create_all runs. This is convenient for teaching/local dev; in production
    prefer Alembic migrations (see the alembic/ directory) and remove this call.
    """
    import app.models  # noqa: F401  (registers models on the metadata)

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
