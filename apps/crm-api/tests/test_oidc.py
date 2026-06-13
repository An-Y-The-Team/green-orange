"""OIDC mode: get_current_user provisions a local user on first valid token.

Monkeypatches verify_oidc_token (so no live Authentik / network is needed) and
asserts the provision-on-first-login wiring in app/api/deps.py.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.api import deps
from app.api.deps import get_session
from app.core.config import settings
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


def test_oidc_provisions_user_on_first_login(session: Session, monkeypatch):
    monkeypatch.setattr(settings, "auth_mode", "oidc")
    monkeypatch.setattr(deps, "verify_oidc_token", lambda _token: "alice@authentik")
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app)
    try:
        stmt = select(User).where(User.username == "alice@authentik")
        assert session.exec(stmt).first() is None  # not provisioned yet

        res = client.get("/customers", headers={"Authorization": "Bearer dummy"})
        assert res.status_code == 200  # token accepted

        assert session.exec(stmt).first() is not None  # provisioned on first login
    finally:
        app.dependency_overrides.clear()


def test_oidc_rejects_invalid_token(session: Session, monkeypatch):
    monkeypatch.setattr(settings, "auth_mode", "oidc")
    monkeypatch.setattr(deps, "verify_oidc_token", lambda _token: None)  # invalid
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app)
    try:
        res = client.get("/customers", headers={"Authorization": "Bearer bad"})
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()
