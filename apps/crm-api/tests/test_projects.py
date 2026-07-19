"""CRUD tests for the projects resource.

Uses an in-memory SQLite DB and overrides the session + auth dependencies, so it
runs without Postgres and without a real login.
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


# The exact body the crm-web form POSTs (add-project.ts) — no code/stage/progress.
NEW_PROJECT = {
    "name": "Test Project",
    "client": "Test Co",
    "type": "ve_sinh",
    "address": "123 Test Street",
    "manager": "Jane Doe",
    "contract_value": 100000,
    "estimated_cost": 90000,
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
}


def test_create_generates_code_and_defaults(client: TestClient):
    """crm-web sends none of code/stage/progress; the server fills them in."""
    res = client.post("/projects", json=NEW_PROJECT)
    assert res.status_code == 201
    body = res.json()
    assert body["code"] == "CT-2026-001"  # server-assigned business key
    assert body["stage"] == "yeu_cau"  # new project enters at first stage
    assert body["progress"] == 0
    # Money is a JSON number and dates are plain dates — matches the TS Project type.
    assert body["contract_value"] == 100000
    assert body["start_date"] == "2026-01-01"


def test_project_crud_roundtrip(client: TestClient):
    res = client.post("/projects", json=NEW_PROJECT)
    assert res.status_code == 201
    project_id = res.json()["id"]

    res = client.get("/projects")
    assert res.status_code == 200
    assert len(res.json()) == 1

    res = client.patch(f"/projects/{project_id}", json={"stage": "thi_cong"})
    assert res.status_code == 200
    assert res.json()["stage"] == "thi_cong"

    res = client.delete(f"/projects/{project_id}")
    assert res.status_code == 204

    res = client.get(f"/projects/{project_id}")
    assert res.status_code == 404
