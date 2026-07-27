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


def test_costs_require_authentication(client_without_auth: TestClient):
    res = client_without_auth.get("/costs")
    assert res.status_code == 401


def test_cost_routes_are_registered():
    route_paths = {route.path for route in app.routes if hasattr(route, "path")}
    assert "/costs" in route_paths


def test_cost_crud_roundtrip(client: TestClient):
    res = client.post(
        "/costs",
        json={
            "project_code": "PRJ-001",
            "date": "2026-07-17",
            "category": "su_co",
            "description": "Broken equipment",
            "amount": 5000000,
            "is_incident": True,
        },
    )
    assert res.status_code == 201
    created = res.json()
    assert created["id"] is not None
    assert created["category"] == "su_co"

    res = client.get("/costs")
    assert res.status_code == 200
    assert len(res.json()) == 1

    res = client.get("/costs?project_code=PRJ-001")
    assert res.status_code == 200
    assert len(res.json()) == 1

    res = client.get("/costs?project_code=PRJ-999")
    assert res.status_code == 200
    assert len(res.json()) == 0
