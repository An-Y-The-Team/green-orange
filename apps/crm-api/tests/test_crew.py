"""Nhân sự: assignment guards, the overlap warning, chấm công totals."""

from fastapi.testclient import TestClient


def test_only_a_working_member_takes_a_new_assignment(
    client: TestClient, fixtures: dict, project: dict
):
    assert (
        client.post(
            "/assignments",
            json={
                "project_id": project["id"],
                "crew_member_id": 999,
                "from_date": "2026-08-10",
            },
        ).status_code
        == 400
    )
    client.patch(f"/crew/{fixtures['crew_member_id']}", json={"status": "left"})
    res = client.post(
        "/assignments",
        json={
            "project_id": project["id"],
            "crew_member_id": fixtures["crew_member_id"],
            "from_date": "2026-08-10",
        },
    )
    assert res.status_code == 400


def test_overlaps_are_reported_never_refused(
    client: TestClient, fixtures: dict, project: dict
):
    first = client.post(
        "/assignments",
        json={
            "project_id": project["id"],
            "crew_member_id": fixtures["crew_member_id"],
            "from_date": "2026-08-10",
            "to_date": "2026-08-20",
        },
    )
    assert first.status_code == 201 and first.json()["overlaps"] == []
    second = client.post(
        "/assignments",
        json={
            "project_id": project["id"],
            "crew_member_id": fixtures["crew_member_id"],
            "from_date": "2026-08-15",
        },
    )
    assert second.status_code == 201
    assert [o["id"] for o in second.json()["overlaps"]] == [first.json()["id"]]
    # A window that ends before the others start doesn't warn.
    third = client.post(
        "/assignments",
        json={
            "project_id": project["id"],
            "crew_member_id": fixtures["crew_member_id"],
            "from_date": "2026-07-01",
            "to_date": "2026-07-05",
        },
    )
    assert third.json()["overlaps"] == []


def test_worked_member_is_kept_for_rehire(
    client: TestClient, fixtures: dict, project: dict
):
    client.post(
        "/assignments",
        json={
            "project_id": project["id"],
            "crew_member_id": fixtures["crew_member_id"],
            "from_date": "2026-08-10",
        },
    )
    assert client.delete(f"/crew/{fixtures['crew_member_id']}").status_code == 409


def test_crew_list_filters(client: TestClient, fixtures: dict):
    client.post("/crew", json={"name": "Hải", "employment_type": "day_hire"})
    assert len(client.get("/crew?employment_type=permanent").json()) == 1
    assert len(client.get("/crew?employment_type=permanent,day_hire").json()) == 2
    assert len(client.get(f"/crew?role_id={fixtures['role_id']}").json()) == 1
    assert client.get("/crew?status=nonsense").status_code == 400
    assert len(client.get("/crew?search=hả").json()) == 1


def test_timekeeping_upserts_per_source_and_manual_wins_in_the_summary(
    client: TestClient, fixtures: dict, project: dict
):
    def punch(source: str, hours: float, day: str = "2026-08-15"):
        return client.post(
            "/timekeeping",
            json={
                "crew_member_id": fixtures["crew_member_id"],
                "project_id": project["id"],
                "work_date": day,
                "hours": hours,
                "source": source,
            },
        )

    assert punch("zalo_app", 8).status_code == 201
    # Same member+day+source is an update in place, not a second row.
    assert punch("zalo_app", 9).json()["hours"] == 9
    punch("manual", 7.5)
    punch("manual", 4, day="2026-08-16")
    assert len(client.get("/timekeeping?from=2026-08-01&to=2026-08-31").json()) == 3

    summary = client.get(f"/timekeeping/summary?project_id={project['id']}").json()
    # The corrected day counts 7.5 (manual), not 16.5 (both rows summed).
    assert summary == {
        "project_id": project["id"],
        "total_hours": 11.5,
        "recorded_days": 2,
    }


def test_manual_times_become_server_computed_hours(
    client: TestClient, fixtures: dict, project: dict
):
    def enter(**fields):
        return client.post(
            "/timekeeping",
            json={
                "crew_member_id": fixtures["crew_member_id"],
                "project_id": project["id"],
                "work_date": "2026-08-15",
                "source": "manual",
                **fields,
            },
        )

    # The pair wins over a sent `hours` — the number is derived, never trusted.
    row = enter(start_time="07:30", end_time="17:00", hours=99).json()
    assert (row["hours"], row["start_time"], row["end_time"]) == (9.5, "07:30", "17:00")
    # An hours-only re-entry clears a pair that no longer adds up.
    row = enter(hours=8).json()
    assert (row["hours"], row["start_time"], row["end_time"]) == (8, None, None)

    assert enter(start_time="07:30").status_code == 422
    assert enter(start_time="06:00", end_time="23:30").status_code == 422
    assert enter().status_code == 422


def test_crew_role_in_use_cannot_be_deleted(client: TestClient, fixtures: dict):
    assert client.delete(f"/crew-roles/{fixtures['role_id']}").status_code == 409
