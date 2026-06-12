"""Worked test for the customers resource.

Uses an in-memory SQLite DB and overrides the session + auth dependencies, so it
runs without Postgres and without a real login (per the SQLModel testing docs).
Run with:  uv run pytest -q
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.api.deps import get_current_user, get_session
from app.main import app
from app.models.user import User


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    # Not used as a context manager, so the app's lifespan (init_db/seed against
    # Postgres) does NOT run — the overrides below fully isolate the test.
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1, username="tester", hashed_password="x"
    )
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_customer_crud_roundtrip(client: TestClient):
    # create
    res = client.post(
        "/customers",
        json={
            "name": "Test Co",
            "email": "test@co.vn",
            "phone": "+84 90 000 0000",
            "company": "Test Co",
            "status": "lead",
        },
    )
    assert res.status_code == 201
    created = res.json()
    assert created["id"] is not None
    customer_id = created["id"]

    # list
    res = client.get("/customers")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # update
    res = client.patch(f"/customers/{customer_id}", json={"status": "active"})
    assert res.status_code == 200
    assert res.json()["status"] == "active"

    # delete
    res = client.delete(f"/customers/{customer_id}")
    assert res.status_code == 204

    # gone
    res = client.get(f"/customers/{customer_id}")
    assert res.status_code == 404
