"""Công trình: creation defaults, the PATCH rules, the closed lock, the guards."""

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.rules import business_today
from app.models.paperwork import DEFAULT_PAPERWORK
from tests.conftest import close_project


def test_create_fills_code_contacts_and_paperwork(
    client: TestClient, fixtures: dict, project: dict
):
    assert project["code"] == "CT-2026-001"
    assert project["stage"] == "request"
    # Both contacts default from the location manager.
    assert (
        project["working_contact_id"]
        == project["decision_maker_contact_id"]
        == fixtures["contact_id"]
    )
    items = client.get(f"/paperwork-items?project_id={project['id']}").json()
    assert [i["name"] for i in items] == list(DEFAULT_PAPERWORK)


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
