"""Relation counts on a list read: how many địa điểm, how many công trình.

STUDENT EXERCISE — docs/tasks/03-client-list-counts.md. These tests are the
spec: they ship red, and the task is to make them green.

    uv run pytest -m exercise        # just these
    uv run pytest -q                 # everything else (these are deselected)

The last step of the task deletes the `pytestmark` line below, so from then on
they run with the rest of the suite.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.common import counts_by_id
from app.models.client import Client, Location
from app.models.project import Project

pytestmark = pytest.mark.exercise


# ── counts_by_id: no database, no query ─────────────────────────────────────
def test_nothing_in_still_gives_every_id_a_zero():
    # The case the whole function exists for: a khách hàng with no rows is
    # absent from a grouped count, and the column still has to print a number.
    assert counts_by_id([], [4, 5]) == {4: 0, 5: 0}


def test_no_ids_asked_for_is_an_empty_answer():
    # An empty page. Not an error, not every row in the table — nothing.
    assert counts_by_id([(1, 5)], []) == {}


def test_each_row_lands_on_its_own_id():
    assert counts_by_id([(3, 2), (7, 1)], [3, 7]) == {3: 2, 7: 1}


def test_an_id_with_no_row_is_zero_not_missing():
    # Present as a key with a zero — never a missing key. A caller that has to
    # write `.get(id, 0)` is a caller that will one day forget.
    result = counts_by_id([(3, 2)], [3, 9])
    assert result == {3: 2, 9: 0}
    assert 9 in result


def test_rows_for_ids_nobody_asked_about_are_ignored():
    # One grouped query can serve a page without being re-filtered first.
    assert counts_by_id([(3, 2), (99, 40)], [3]) == {3: 2}


def test_a_repeated_id_is_not_counted_twice():
    assert counts_by_id([(3, 2)], [3, 3]) == {3: 2}


def test_a_real_zero_and_an_absent_row_agree():
    # Postgres can hand back a 0 or hand back nothing at all depending on how
    # the count was written. Both mean the same thing here.
    assert counts_by_id([(3, 0)], [3]) == counts_by_id([], [3])


def test_the_answer_covers_exactly_the_ids_asked_for():
    result = counts_by_id([(1, 1), (2, 2), (99, 9)], [1, 2, 3])
    assert set(result) == {1, 2, 3}


# ── Wired up: the khách hàng list column ────────────────────────────────────
_code_seq = 0


def make_client(session: Session, name: str) -> Client:
    row = Client(name=name, type="company")
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def add_locations(session: Session, client_id: int, count: int) -> Location:
    rows = [
        Location(client_id=client_id, name=f"Kho {i}", address=f"Số {i}")
        for i in range(count)
    ]
    session.add_all(rows)
    session.commit()
    session.refresh(rows[0])
    return rows[0]


def add_projects(session: Session, client_id: int, location_id: int, count: int):
    global _code_seq
    rows = []
    for _ in range(count):
        _code_seq += 1
        rows.append(
            Project(
                code=f"CT-2026-{_code_seq:03d}",
                client_id=client_id,
                location_id=location_id,
                name=f"Vệ sinh {_code_seq}",
            )
        )
    session.add_all(rows)
    session.commit()


def counts_of(client: TestClient) -> dict[int, dict]:
    res = client.get("/clients")
    assert res.status_code == 200, res.text
    return {row["id"]: row["_count"] for row in res.json()}


def test_a_client_with_both_kinds_of_rows_counts_them_separately(
    client: TestClient, session: Session
):
    # THE fan-out test. Three địa điểm and two công trình is not five rows and
    # it is certainly not six — joining both relations in one GROUP BY pairs
    # every location with every project and reports 6 for BOTH numbers. It does
    # not raise. The column just prints a number that is not true.
    customer = make_client(session, "Acme")
    first = add_locations(session, customer.id, 3)
    add_projects(session, customer.id, first.id, 2)

    assert counts_of(client)[customer.id] == {"locations": 3, "projects": 2}


def test_a_client_with_nothing_reports_zero_on_both(
    client: TestClient, session: Session
):
    customer = make_client(session, "Khách mới")
    assert counts_of(client)[customer.id] == {"locations": 0, "projects": 0}


def test_one_clients_rows_never_count_toward_another(
    client: TestClient, session: Session
):
    busy = make_client(session, "Bận")
    quiet = make_client(session, "Vắng")
    location = add_locations(session, busy.id, 2)
    add_projects(session, busy.id, location.id, 3)

    counts = counts_of(client)
    assert counts[busy.id] == {"locations": 2, "projects": 3}
    assert counts[quiet.id] == {"locations": 0, "projects": 0}


def test_a_page_of_clients_costs_a_constant_number_of_queries(
    client: TestClient, session: Session, query_counter
):
    # The N+1, stated as an assertion. Today this endpoint runs two COUNTs per
    # row, so twenty khách hàng cost thirty-six more queries than two do.
    for i in range(2):
        make_client(session, f"Khách {i}")
    query_counter.reset()
    counts_of(client)
    small_page = query_counter.count

    for i in range(2, 20):
        make_client(session, f"Khách {i}")
    query_counter.reset()
    counts_of(client)
    full_page = query_counter.count

    assert full_page == small_page, (
        f"2 clients cost {small_page} queries, 20 cost {full_page} — "
        "the counts are still being fetched per row."
    )
