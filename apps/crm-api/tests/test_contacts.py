"""CRUD tests for the contacts resource.

Uses an in-memory SQLite DB and overrides the session + auth dependencies, so it
runs without Postgres and without a real login (per the SQLModel testing docs).
Run with: uv run pytest -q
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
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1, username="tester", hashed_password="x"
    )
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="client_without_auth")
def client_without_auth_fixture(session: Session):
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_contacts_require_authentication(client_without_auth: TestClient):
    res = client_without_auth.get("/contacts")
    assert res.status_code == 401


def test_contact_crud_roundtrip(client: TestClient):
    res = client.post(
        "/contacts",
        json={
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "phone": "+84 90 000 0001",
            "title": "Engineer",
            "company": "Example Co",
        },
    )
    assert res.status_code == 201
    created = res.json()
    assert created["id"] is not None
    contact_id = created["id"]

    res = client.get("/contacts")
    assert res.status_code == 200
    assert len(res.json()) == 1

    res = client.get(f"/contacts/{contact_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "Ada Lovelace"

    res = client.patch(f"/contacts/{contact_id}", json={"title": "CTO"})
    assert res.status_code == 200
    assert res.json()["title"] == "CTO"

    res = client.delete(f"/contacts/{contact_id}")
    assert res.status_code == 204

    res = client.get(f"/contacts/{contact_id}")
    assert res.status_code == 404
