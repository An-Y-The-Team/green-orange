"""Losing the race for a document code: what the server does about it.

STUDENT EXERCISE — docs/tasks/04-code-allocation-race.md. These tests are the
spec: they ship red, and the task is to make them green.

    uv run pytest -m exercise        # just these
    uv run pytest -q                 # everything else (these are deselected)

The last step of the task deletes the `pytestmark` line below, so from then on
they run with the rest of the suite.

**None of these tests are concurrent, and that is deliberate.** The suite runs
one in-memory SQLite connection (conftest.py), so a genuine two-writer race is
not available — and it is not what needs testing anyway. The database already
guarantees the collision; what is untested is what YOUR code does when it is
handed the loss. So the loss is staged: `watch()` below makes the allocator hand
back a code that is already in the table, exactly as if somebody else had taken
it a millisecond earlier.

The one assumption these tests make about your design: **`next_code` stays the
allocation entry point**, so re-allocating after a loss goes through it again.
The ticket keeps its signature for that reason. Everything else — where the
retry lives, how it is bounded, how you tell your conflict from somebody
else's — is yours.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.routes import contracts as contracts_routes
from app.api.routes import projects as projects_routes
from app.core.rules import business_today, format_code
from app.models.paperwork import DEFAULT_PAPERWORK, PaperworkItem
from app.models.project import Project

pytestmark = pytest.mark.exercise


def watch(monkeypatch, module, steal: str | None = None, times: int = 0) -> list[str]:
    """Record every code `next_code` hands out, and optionally poison it.

    With `steal`, the first `times` calls return that code instead of a fresh
    one — it is already in the table, so the write that follows must lose. After
    that the real allocator takes over. The returned list grows by one per
    allocation, so `len(handed)` is "how many times did it try".
    """
    real = module.next_code
    handed: list[str] = []
    remaining = {"n": times}

    def fake(session, model, prefix):
        if steal is not None and remaining["n"] > 0:
            remaining["n"] -= 1
            code = steal
        else:
            code = real(session, model, prefix)
        handed.append(code)
        return code

    monkeypatch.setattr(module, "next_code", fake)
    return handed


def new_project(client: TestClient, fixtures: dict):
    return client.post(
        "/projects",
        json={
            "name": "Vệ sinh kho lạnh",
            "client_id": fixtures["client_id"],
            "location_id": fixtures["location_id"],
            "type_ids": [fixtures["type_id"]],
        },
    )


def count(session: Session, model) -> int:
    # A losing flush leaves this Session unusable until it is rolled back, and
    # conftest hands the same one to both the app and the test. Clearing it here
    # is test hygiene, not a hint about where YOUR rollback belongs.
    session.rollback()
    return session.exec(select(func.count()).select_from(model)).one()


# ── The collision is the server's problem, not the secretary's ──────────────
def test_a_collision_is_retried_and_the_caller_never_sees_it(
    client: TestClient, fixtures: dict, project: dict, monkeypatch
):
    # `project` already holds CT-<year>-001. The allocator hands it out again,
    # once — the same thing a second request would have done a millisecond ago.
    handed = watch(monkeypatch, projects_routes, steal=project["code"], times=1)

    res = new_project(client, fixtures)

    assert res.status_code == 201, res.text
    assert res.json()["code"] != project["code"]
    # It allocated, lost, and allocated again. One attempt means no retry.
    assert len(handed) >= 2


def test_the_retried_code_is_the_next_one_not_a_gap(
    client: TestClient, fixtures: dict, project: dict, monkeypatch
):
    # Losing a race must not burn a number: the series is 001, 002 — not 003.
    watch(monkeypatch, projects_routes, steal=project["code"], times=1)

    res = new_project(client, fixtures)

    assert res.status_code == 201, res.text
    assert res.json()["code"] == format_code("CT", business_today().year, 2)


def test_the_checklist_is_seeded_exactly_once_after_a_retry(
    client: TestClient, fixtures: dict, project: dict, session: Session, monkeypatch
):
    # THE test. Retry by re-running the handler instead of rolling back to a
    # savepoint and the stage-5 checklist is written twice — a công trình with
    # two of every giấy tờ, and nothing anywhere says so.
    watch(monkeypatch, projects_routes, steal=project["code"], times=1)

    res = new_project(client, fixtures)
    assert res.status_code == 201, res.text
    created = res.json()

    items = session.exec(
        select(PaperworkItem).where(PaperworkItem.project_id == created["id"])
    ).all()
    assert len(items) == len(DEFAULT_PAPERWORK)


def test_a_retry_leaves_exactly_one_cong_trinh(
    client: TestClient, fixtures: dict, project: dict, session: Session, monkeypatch
):
    watch(monkeypatch, projects_routes, steal=project["code"], times=1)

    new_project(client, fixtures)

    # The fixture's, plus this one. A losing attempt must leave nothing behind.
    assert count(session, Project) == 2


def test_a_hop_dong_collision_is_retried_too(
    client: TestClient, project: dict, monkeypatch
):
    # The contract path loses at commit() rather than flush(), because it has no
    # flush. A helper that only survives one of the two moments is not the seam.
    first = client.post("/contracts", json={"project_id": project["id"]}).json()
    handed = watch(monkeypatch, contracts_routes, steal=first["code"], times=1)

    res = client.post("/contracts", json={"project_id": project["id"]})

    assert res.status_code == 201, res.text
    assert res.json()["code"] != first["code"]
    assert len(handed) >= 2


# ── Bounded: giving up is a feature ─────────────────────────────────────────
def test_a_permanently_taken_code_gives_up_instead_of_spinning(
    client: TestClient, fixtures: dict, project: dict, monkeypatch
):
    # Every attempt loses. A loop with no budget never returns, and the only
    # thing worse than a 409 is a request that hangs until the worker dies.
    handed = watch(monkeypatch, projects_routes, steal=project["code"], times=100)

    res = new_project(client, fixtures)

    assert res.status_code == 409, res.text
    # Bounded, and bounded sanely. If this trips at 100 the retry is unbounded
    # and only the fixture's cap stopped it.
    assert len(handed) < 20, f"gave up after {len(handed)} attempts"


def test_giving_up_does_not_leave_a_half_written_cong_trinh(
    client: TestClient, fixtures: dict, project: dict, session: Session, monkeypatch
):
    watch(monkeypatch, projects_routes, steal=project["code"], times=100)
    paperwork_before = count(session, PaperworkItem)

    new_project(client, fixtures)

    # Only the fixture's công trình survives, with only its own checklist.
    assert count(session, Project) == 1
    assert count(session, PaperworkItem) == paperwork_before


# ── Somebody else's conflict is not yours to retry ──────────────────────────
def test_a_non_code_conflict_is_not_retried(
    client: TestClient, fixtures: dict, monkeypatch
):
    # A unique violation that has nothing to do with the code must surface on
    # the first attempt. Retrying it burns the whole budget and then reports the
    # same failure, slower and less clearly.
    handed = watch(monkeypatch, projects_routes)
    real_flush = Session.flush
    flushes = {"n": 0}

    def flaky_flush(self, *args, **kwargs):
        # Only once the allocator has run, so this is the project INSERT and not
        # one of the lookups create_project flushes on the way there.
        if handed and flushes["n"] == 0:
            flushes["n"] += 1
            raise IntegrityError(
                "INSERT INTO project …",
                {},
                Exception('duplicate key value violates unique constraint "other"'),
            )
        return real_flush(self, *args, **kwargs)

    monkeypatch.setattr(Session, "flush", flaky_flush)

    res = new_project(client, fixtures)

    assert res.status_code == 409, res.text
    assert len(handed) == 1, "a conflict on another constraint was retried"


def test_a_clean_create_allocates_exactly_once(
    client: TestClient, fixtures: dict, monkeypatch
):
    # Nothing collides. Retry machinery must be invisible when it is not needed.
    handed = watch(monkeypatch, projects_routes)

    res = new_project(client, fixtures)

    assert res.status_code == 201, res.text
    assert len(handed) == 1
