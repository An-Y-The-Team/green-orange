"""Công trình: creation defaults, the PATCH rules, the closed lock, the guards."""

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.rules import STAGE_ORDER, business_today
from app.models.paperwork import DEFAULT_PAPERWORK
from tests.conftest import close_project


def test_create_fills_code_contacts_and_paperwork(
    client: TestClient, fixtures: dict, project: dict
):
    assert project["code"] == f"CT-{business_today().year}-001"
    assert project["stage"] == "request"
    # Both contacts default from the location manager.
    assert (
        project["working_contact_id"]
        == project["decision_maker_contact_id"]
        == fixtures["contact_id"]
    )
    items = client.get(f"/paperwork-items?project_id={project['id']}").json()
    assert [i["name"] for i in items] == list(DEFAULT_PAPERWORK)


def test_create_allows_a_project_with_no_contact(client: TestClient, fixtures: dict):
    """A walk-in company is filed before anyone there is named: no contact given,
    and the new site has no manager to inherit one from."""
    site = client.post(
        "/locations",
        json={
            "client_id": fixtures["client_id"],
            "name": "Toà nhà B",
            "address": "9 Lê Lợi",
        },
    ).json()
    res = client.post(
        "/projects",
        json={
            "name": "Chưa có người liên hệ",
            "client_id": fixtures["client_id"],
            "location_id": site["id"],
            "type_ids": [fixtures["type_id"]],
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["working_contact_id"] is None
    assert body["decision_maker_contact_id"] is None
    # …and it reads back the same way, relations included.
    detail = client.get(f"/projects/{body['id']}").json()
    assert detail["working_contact"] is None
    assert detail["decision_maker"] is None


def test_create_rejects_a_location_from_another_client(
    client: TestClient, fixtures: dict
):
    other = client.post("/clients", json={"name": "Other", "type": "company"}).json()
    res = client.post(
        "/projects",
        json={
            "name": "Sai chủ",
            "client_id": other["id"],
            "location_id": fixtures["location_id"],
            "type_ids": [fixtures["type_id"]],
        },
    )
    assert res.status_code == 400


def test_patch_rules(client: TestClient, project: dict):
    pid = project["id"]
    # A foreign contact is refused.
    assert (
        client.patch(f"/projects/{pid}", json={"working_contact_id": 999}).status_code
        == 400
    )
    # Cancelling needs a reason.
    assert (
        client.patch(f"/projects/{pid}", json={"status": "cancelled"}).status_code
        == 400
    )
    assert (
        client.patch(
            f"/projects/{pid}",
            json={"status": "cancelled", "cancel_reason": "Khách huỷ"},
        ).status_code
        == 200
    )
    # execution_sub_status is forward-only, but may skip a step.
    client.patch(f"/projects/{pid}", json={"execution_sub_status": "works"})
    assert (
        client.patch(
            f"/projects/{pid}", json={"execution_sub_status": "kickoff"}
        ).status_code
        == 400
    )
    # Acceptance "passed" stamps its date server-side.
    passed = client.patch(f"/projects/{pid}", json={"acceptance_sub_status": "passed"})
    assert passed.json()["acceptance_passed_date"] == business_today().isoformat()


def test_closed_project_is_locked_except_for_the_reopen(
    client: TestClient, session: Session, project: dict
):
    pid = project["id"]
    close_project(session, pid)
    assert client.patch(f"/projects/{pid}", json={"name": "Đổi tên"}).status_code == 409
    # Notes stay writable on a closed công trình; nothing else does.
    assert (
        client.post(
            "/project-notes", json={"project_id": pid, "body": "ghi chú"}
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/attachments",
            json={"project_id": pid, "kind": "other", "s3_key": "k"},
        ).status_code
        == 409
    )
    assert (
        client.patch(f"/projects/{pid}", json={"stage": "settlement"}).status_code
        == 200
    )


def test_delete_refuses_when_real_records_exist(client: TestClient, project: dict):
    pid = project["id"]
    # Auto-seeded paperwork and notes are incidental — they don't block.
    client.post("/project-notes", json={"project_id": pid, "body": "x"})
    client.post(
        "/quotes",
        json={
            "project_id": pid,
            "items": [{"description": "Vệ sinh", "quantity": 1, "unit_price": 1000}],
        },
    )
    refused = client.delete(f"/projects/{pid}")
    assert refused.status_code == 409
    assert "quotes (1)" in refused.json()["detail"]

    quote_id = client.get(f"/quotes?project_id={pid}").json()[0]["id"]
    assert client.delete(f"/quotes/{quote_id}").status_code == 204
    assert client.delete(f"/projects/{pid}").status_code == 204


def test_project_type_in_use_cannot_be_deleted(
    client: TestClient, fixtures: dict, project: dict
):
    assert client.delete(f"/project-types/{fixtures['type_id']}").status_code == 409
    assert project["types"][0]["id"] == fixtures["type_id"]


def test_attachment_must_belong_to_its_paperwork_item(
    client: TestClient, fixtures: dict, project: dict
):
    other = client.post(
        "/projects",
        json={
            "name": "Khác",
            "client_id": fixtures["client_id"],
            "location_id": fixtures["location_id"],
            "type_ids": [fixtures["type_id"]],
        },
    ).json()
    foreign_item = client.get(f"/paperwork-items?project_id={other['id']}").json()[0]
    res = client.post(
        "/attachments",
        json={
            "project_id": project["id"],
            "kind": "paperwork",
            "paperwork_item_id": foreign_item["id"],
            "s3_key": "k",
        },
    )
    assert res.status_code == 400


def test_summary_is_every_stage_with_its_chot_total(
    client: TestClient, fixtures: dict, project: dict
):
    rows = client.get("/projects/summary").json()
    # All 8 stages, in pipeline order, so the dashboard never invents the empty
    # ones itself — an absent stage is a real zero, not unknown.
    assert [r["stage"] for r in rows] == list(STAGE_ORDER)
    assert next(r for r in rows if r["stage"] == "request") == {
        "stage": "request",
        "count": 1,
        "deal_total": 0,
    }

    quote = client.post(
        "/quotes",
        json={
            "project_id": project["id"],
            "items": [
                {"description": "Vệ sinh", "quantity": 10, "unit_price": 100_000}
            ],
        },
    ).json()
    client.post(
        f"/quotes/{quote['id']}/send", json={"channel": "zalo", "sent_by": "An"}
    )
    client.post(f"/quotes/{quote['id']}/decide", json={"status": "deal"})

    rows = client.get("/projects/summary").json()
    # Σ of the CHỐT quote — the committed value, and the project moved to quote.
    assert next(r for r in rows if r["stage"] == "quote") == {
        "stage": "quote",
        "count": 1,
        "deal_total": 1_000_000,
    }

    # Cancelled công trình leave the pipeline entirely.
    client.patch(
        f"/projects/{project['id']}",
        json={"status": "cancelled", "cancel_reason": "khách đổi ý"},
    )
    assert all(
        r["count"] == 0 and r["deal_total"] == 0
        for r in client.get("/projects/summary").json()
    )


def test_today_filters_are_applied_by_the_server_not_the_page(
    client: TestClient, project: dict
):
    today = business_today()
    # 06:30 ICT — stored 23:30Z the day BEFORE, which is exactly the row a UTC
    # date comparison drops from "today".
    client.patch(
        f"/projects/{project['id']}",
        json={"appointment_at": f"{today.isoformat()}T06:30:00+07:00"},
    )

    def codes(query: str) -> list[str]:
        return [p["code"] for p in client.get(f"/projects?{query}").json()]

    assert codes(f"appointment_date={today.isoformat()}") == [project["code"]]
    assert codes("appointment_date=2020-01-01") == []
    # Not yet visited…
    assert codes("visited=false") == [project["code"]]
    assert codes("visited=true") == []
    client.patch(f"/projects/{project['id']}", json={"visit_date": today.isoformat()})
    assert codes("visited=true") == [project["code"]]
    assert codes("visited=false") == []
    # A parked job only resurfaces once its follow-up date has arrived.
    assert codes("follow_up_due=true") == []
    client.patch(
        f"/projects/{project['id']}",
        json={"status": "on_hold", "follow_up_date": today.isoformat()},
    )
    assert codes("follow_up_due=true") == [project["code"]]
