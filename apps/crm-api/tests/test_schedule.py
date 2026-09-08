"""Double-booking: whose phân công windows share a day.

STUDENT EXERCISE — docs/tasks/02-crew-double-booking.md. These tests are the
spec: they ship red, and the task is to make them green.

    uv run pytest -m exercise        # just these
    uv run pytest -q                 # everything else (these are deselected)

The last step of the task deletes the `pytestmark` line below, so from then on
they run with the rest of the suite.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.core.schedule import overlapping_ids, ranges_overlap

pytestmark = pytest.mark.exercise


def d(iso: str) -> date:
    return date.fromisoformat(iso)


# ── ranges_overlap: no database, no clock ───────────────────────────────────
def test_windows_that_plainly_share_days_clash():
    # Aug 10-20 and Aug 15-25 share Aug 15-20.
    assert ranges_overlap(
        d("2026-08-10"), d("2026-08-20"), d("2026-08-15"), d("2026-08-25")
    )
    # Fully contained counts too — Aug 12-14 is inside Aug 10-20.
    assert ranges_overlap(
        d("2026-08-10"), d("2026-08-20"), d("2026-08-12"), d("2026-08-14")
    )


def test_windows_in_different_months_do_not_clash():
    assert not ranges_overlap(
        d("2026-07-01"), d("2026-07-05"), d("2026-08-10"), d("2026-08-20")
    )


def test_windows_that_touch_on_one_day_clash():
    # A finishes the same day B starts. Nobody is on two sites in one day, and
    # the write path already answers "clash" — GET must not disagree with POST.
    assert ranges_overlap(
        d("2026-03-01"), d("2026-03-10"), d("2026-03-10"), d("2026-03-20")
    )


def test_windows_that_merely_abut_do_not_clash():
    # A ends the day BEFORE B starts: no shared day, no warning.
    assert not ranges_overlap(
        d("2026-03-01"), d("2026-03-09"), d("2026-03-10"), d("2026-03-20")
    )


def test_a_single_day_window_clashes_with_itself():
    assert ranges_overlap(
        d("2026-05-05"), d("2026-05-05"), d("2026-05-05"), d("2026-05-05")
    )


def test_an_open_ended_window_runs_forever_forward():
    # No to_date = still on the job. It swallows everything that starts after.
    assert ranges_overlap(d("2026-01-01"), None, d("2030-06-01"), d("2030-06-30"))
    # …but not something that finished before it began.
    assert not ranges_overlap(d("2026-01-01"), None, d("2025-01-01"), d("2025-12-31"))


def test_two_open_ended_windows_always_clash():
    assert ranges_overlap(d("2026-01-01"), None, d("2030-01-01"), None)


def test_the_answer_does_not_depend_on_argument_order():
    # Overlap is symmetric. If this fails, one of the None branches is lopsided.
    pairs = [
        ((d("2026-08-10"), d("2026-08-20")), (d("2026-08-15"), None)),
        ((d("2026-01-01"), None), (d("2025-01-01"), d("2025-12-31"))),
        ((d("2026-03-01"), d("2026-03-09")), (d("2026-03-10"), d("2026-03-20"))),
    ]
    for (a_from, a_to), (b_from, b_to) in pairs:
        assert ranges_overlap(a_from, a_to, b_from, b_to) == ranges_overlap(
            b_from, b_to, a_from, a_to
        )


# ── overlapping_ids: one member's whole roster in one pass ──────────────────
def test_nothing_in_nothing_out():
    assert overlapping_ids([]) == {}


def test_a_lone_assignment_clashes_with_nobody():
    # Present as a key with an empty list — never a missing key.
    assert overlapping_ids([(7, d("2026-08-10"), d("2026-08-20"))]) == {7: []}


def test_every_pair_is_reported_from_both_sides():
    windows = [
        (1, d("2026-08-10"), d("2026-08-20")),
        (2, d("2026-08-15"), None),
    ]
    assert overlapping_ids(windows) == {1: [2], 2: [1]}


def test_a_chain_does_not_make_the_ends_clash():
    # A-B overlap and B-C overlap, but A and C never share a day. Reporting
    # A against C would be a transitive-closure bug.
    windows = [
        (1, d("2026-08-01"), d("2026-08-10")),
        (2, d("2026-08-08"), d("2026-08-18")),
        (3, d("2026-08-15"), d("2026-08-25")),
    ]
    assert overlapping_ids(windows) == {1: [2], 2: [1, 3], 3: [2]}


def test_an_assignment_never_clashes_with_itself():
    windows = [
        (1, d("2026-08-01"), d("2026-08-10")),
        (2, d("2026-08-05"), d("2026-08-15")),
    ]
    for own_id, clashes in overlapping_ids(windows).items():
        assert own_id not in clashes


# ── Wired up: the roster page's dead badge ──────────────────────────────────
def assign(client: TestClient, project_id: int, member_id: int, **dates) -> dict:
    res = client.post(
        "/assignments",
        json={"project_id": project_id, "crew_member_id": member_id, **dates},
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_the_crew_page_reports_the_same_clash_the_write_did(
    client: TestClient, fixtures: dict, project: dict
):
    member_id = fixtures["crew_member_id"]
    first = assign(
        client, project["id"], member_id, from_date="2026-08-10", to_date="2026-08-20"
    )
    second = assign(client, project["id"], member_id, from_date="2026-08-15")
    # POST already said these two clash. GET /crew/{id} must say it too — that
    # is the whole bug: the roster's "Trùng lịch" column is fed by this.
    assert [o["id"] for o in second["overlaps"]] == [first["id"]]

    detail = client.get(f"/crew/{member_id}")
    assert detail.status_code == 200
    clashes = {
        a["id"]: sorted(o["id"] for o in a["overlaps"])
        for a in detail.json()["assignments"]
    }
    assert clashes == {first["id"]: [second["id"]], second["id"]: [first["id"]]}


def test_assignments_that_do_not_clash_come_back_with_an_empty_warning(
    client: TestClient, fixtures: dict, project: dict
):
    member_id = fixtures["crew_member_id"]
    assign(
        client, project["id"], member_id, from_date="2026-07-01", to_date="2026-07-05"
    )
    assign(
        client, project["id"], member_id, from_date="2026-09-01", to_date="2026-09-05"
    )
    detail = client.get(f"/crew/{member_id}").json()
    assert [a["overlaps"] for a in detail["assignments"]] == [[], []]


def test_the_warning_crosses_cong_trinh_and_names_the_other_one(
    client: TestClient, fixtures: dict, project: dict
):
    # The point of the badge: the clash is with a DIFFERENT job, which is why
    # the roster prints the other project's code.
    other = client.post(
        "/projects",
        json={
            "name": "Vệ sinh kho",
            "client_id": fixtures["client_id"],
            "location_id": fixtures["location_id"],
            "type_ids": [fixtures["type_id"]],
        },
    ).json()
    member_id = fixtures["crew_member_id"]
    here = assign(
        client, project["id"], member_id, from_date="2026-08-10", to_date="2026-08-20"
    )
    there = assign(
        client, other["id"], member_id, from_date="2026-08-18", to_date="2026-08-30"
    )

    detail = client.get(f"/crew/{member_id}").json()
    warned = {a["id"]: a["overlaps"] for a in detail["assignments"]}
    assert [o["id"] for o in warned[here["id"]]] == [there["id"]]
    assert warned[here["id"]][0]["project"]["code"] == other["code"]


def test_one_members_assignments_never_warn_about_another_members(
    client: TestClient, fixtures: dict, project: dict
):
    mate = client.post(
        "/crew", json={"name": "Hải", "employment_type": "day_hire"}
    ).json()
    dates = {"from_date": "2026-08-10", "to_date": "2026-08-20"}
    assign(client, project["id"], fixtures["crew_member_id"], **dates)
    assign(client, project["id"], mate["id"], **dates)
    # Same days, same công trình, two different people — that is a crew, not a
    # double-booking.
    for member_id in (fixtures["crew_member_id"], mate["id"]):
        detail = client.get(f"/crew/{member_id}").json()
        assert [a["overlaps"] for a in detail["assignments"]] == [[]]
