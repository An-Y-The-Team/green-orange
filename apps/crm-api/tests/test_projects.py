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


def test_project_accepts_valid_enum_string_values():
    from app.models.project import (
        Project,
        ProjectStage,
        ProjectType,
        ScheduleOutcome,
    )

    project = Project.model_validate(
        {
            "code": "PRJ-001",
            "name": "Legacy Project",
            "description": "Legacy description",
            "customer": "Legacy Co",
            "type": "ve_sinh",
            "address": "123 Legacy St",
            "stage": "yeu_cau",
            "schedule_outcome": "on_time",
            "start_date": "2026-01-01T00:00:00",
            "end_date": "2026-12-31T00:00:00",
            "manager": "Jane Doe",
            "contract_value": 100000.0,
            "estimated_cost": 90000.0,
            "progress": 25,
        }
    )

    assert project.description == "Legacy description"
    assert project.type == ProjectType.VE_SINH
    assert project.stage == ProjectStage.YEU_CAU
    assert project.schedule_outcome == ScheduleOutcome.ON_TIME


def test_project_crud_roundtrip(client: TestClient):
    res = client.post(
        "/projects",
        json={
            "code": "PRJ-001",
            "name": "Test Project",
            "description": "A test project",
            "customer": "Test Co",
            "type": "ve_sinh",
            "address": "123 Test Street",
            "stage": "yeu_cau",
            "schedule_outcome": "on_time",
            "start_date": "2026-01-01T00:00:00",
            "end_date": "2026-12-31T00:00:00",
            "manager": "Jane Doe",
            "contract_value": 100000.0,
            "estimated_cost": 90000.0,
            "progress": 25,
        },
    )
    assert res.status_code == 201
    created = res.json()
    assert created["id"] is not None
    project_id = created["id"]

    res = client.get("/projects")
    assert res.status_code == 200
    assert len(res.json()) == 1

    res = client.patch(
        f"/projects/{project_id}",
        json={"stage": "thi_cong"},
    )
    assert res.status_code == 200
    assert res.json()["stage"] == "thi_cong"

    res = client.delete(f"/projects/{project_id}")
    assert res.status_code == 204

    res = client.get(f"/projects/{project_id}")
    assert res.status_code == 404
