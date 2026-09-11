"""Document codes: {PREFIX}-{year}-{NNN}, restarting each January.

STUDENT EXERCISE — docs/tasks/01-document-code-sequencing.md. These tests are
the spec: they ship red, and the task is to make them green.

    uv run pytest -m exercise        # just these
    uv run pytest -q                 # everything else (these are deselected)

The last step of the task deletes the `pytestmark` line below, so from then on
they run with the rest of the suite.
"""

from fastapi.testclient import TestClient

from app.core.rules import (
    business_today,
    format_code,
    next_sequence,
    parse_sequence,
)


# ── The pure part: no database, no clock ────────────────────────────────────
def test_format_code_pads_the_sequence_to_three_digits():
    assert format_code("CT", 2026, 1) == "CT-2026-001"
    assert format_code("HD", 2027, 12) == "HD-2027-012"


def test_parse_sequence_reads_back_what_format_code_wrote():
    assert parse_sequence(format_code("CT", 2026, 7), "CT", 2026) == 7


def test_parse_sequence_rejects_another_prefix_or_another_year():
    # A hợp đồng number must never raise the công trình counter, and last
    # year's codes must never raise this year's. This is the whole ticket.
    assert parse_sequence("HD-2026-007", "CT", 2026) is None
    assert parse_sequence("CT-2025-007", "CT", 2026) is None
    assert parse_sequence("CT-2026-007", "CT", 2027) is None


def test_parse_sequence_survives_junk_instead_of_raising():
    # Codes get hand-edited and predate this function. One bad row must not
    # stop anyone from creating a công trình.
    for junk in ("", "CT", "CT-2026", "CT-2026-abc", "CT-20xx-001"):
        assert parse_sequence(junk, "CT", 2026) is None


def test_next_sequence_starts_at_one_when_nothing_was_issued():
    assert next_sequence([], "CT", 2026) == 1


def test_next_sequence_continues_from_the_highest_code_issued():
    # Unordered on purpose: it is the MAXIMUM, not the last one seen.
    codes = ["CT-2026-001", "CT-2026-003", "CT-2026-002"]
    assert next_sequence(codes, "CT", 2026) == 4


def test_next_sequence_ignores_other_prefixes_other_years_and_junk():
    codes = ["CT-2026-001", "HD-2026-009", "CT-2025-042", "CT-2027-005", "rác"]
    assert next_sequence(codes, "CT", 2026) == 2


def test_next_sequence_restarts_at_one_in_the_new_year():
    # The rollover test, and it needs no clock: the year is an argument.
    codes = ["CT-2026-001", "CT-2026-002", "CT-2026-003"]
    assert next_sequence(codes, "CT", 2027) == 1


def test_next_sequence_is_not_a_row_count():
    # One row, numbered 5 → the next is 6. Counting rows would answer 2, and
    # counting ids is what the old implementation did.
    assert next_sequence(["CT-2026-005"], "CT", 2026) == 6


def test_next_sequence_after_a_deleted_tail_matches_your_documented_policy():
    # THE ONE TEST YOU MAY EDIT. CT-2026-002 was created and then deleted.
    # Shipped asserting that its number is NOT handed out again. If you decide
    # gaps are reusable, change this to 3 — and say why in the ticket's
    # Decisions block. There is no right answer here, only a defended one.
    assert next_sequence(["CT-2026-001", "CT-2026-003"], "CT", 2026) == 4


# ── The wired-up part: two tests, just enough to prove the seam ─────────────
def test_creating_a_cong_trinh_stamps_the_current_business_year(project: dict):
    # Year-agnostic by construction, so it cannot rot the way the hardcoded
    # assertions in test_projects.py and test_contracts.py would have.
    assert project["code"] == format_code("CT", business_today().year, 1)


def test_cong_trinh_and_hop_dong_number_independently(
    client: TestClient, fixtures: dict, project: dict
):
    year = business_today().year
    second = client.post(
        "/projects",
        json={
            "name": "Vệ sinh kho",
            "client_id": fixtures["client_id"],
            "location_id": fixtures["location_id"],
            "type_ids": [fixtures["type_id"]],
        },
    )
    assert second.json()["code"] == format_code("CT", year, 2)

    contract = client.post("/contracts", json={"project_id": project["id"]})
    # A separate series: the hợp đồng starts at 001 even though two công trình
    # already exist.
    assert contract.json()["code"] == format_code("HD", year, 1)
