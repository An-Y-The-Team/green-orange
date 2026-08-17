"""Shared fixtures: an in-memory SQLite database and a logged-in TestClient.

The session + auth dependencies are overridden, so the suite runs without
Postgres and without a real login (per the SQLModel testing docs).
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.api.deps import get_current_user, get_session
from app.main import app
from app.models.client import Client, Contact, Location
from app.models.crew import CrewMember, CrewRole
from app.models.project import Project, ProjectType
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
    # Not used as a context manager, so the app's lifespan does NOT run — the
    # overrides below fully isolate the test.
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1, username="tester", hashed_password="x"
    )
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="client_without_auth")
def client_without_auth_fixture(session: Session):
    app.dependency_overrides[get_session] = lambda: session
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="fixtures")
def fixtures_fixture(session: Session) -> dict:
    """One client with a contact, a site, a project type and a crew role — the
    minimum a công trình needs to exist."""
    customer = Client(name="Acme", type="company")
    project_type = ProjectType(name="Vệ sinh")
    role = CrewRole(name="Thợ chính")
    session.add_all([customer, project_type, role])
    session.commit()
    contact = Contact(client_id=customer.id, name="An", phone="+84 90 000 0000")
    session.add(contact)
    session.commit()
    location = Location(
        client_id=customer.id,
        name="Nhà máy",
        address="KCN 1",
        manager_contact_id=contact.id,
    )
    member = CrewMember(
        name="Dũng", employment_type="permanent", default_role_id=role.id
    )
    session.add_all([location, member])
    session.commit()
    return {
        "client_id": customer.id,
        "contact_id": contact.id,
        "location_id": location.id,
        "type_id": project_type.id,
        "role_id": role.id,
        "crew_member_id": member.id,
    }


@pytest.fixture(name="project")
def project_fixture(client: TestClient, fixtures: dict) -> dict:
    res = client.post(
        "/projects",
        json={
            "name": "Vệ sinh xưởng",
            "client_id": fixtures["client_id"],
            "location_id": fixtures["location_id"],
            "type_ids": [fixtures["type_id"]],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def stage_of(client: TestClient, project_id: int) -> str:
    return client.get(f"/projects/{project_id}").json()["stage"]


def close_project(session: Session, project_id: int) -> None:
    project = session.get(Project, project_id)
    project.stage = "closed"
    session.add(project)
    session.commit()
