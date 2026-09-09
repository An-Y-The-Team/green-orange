"""Hợp đồng: the code, the stage bump, and what signing freezes."""

from fastapi.testclient import TestClient

from app.core.rules import business_today


def test_create_assigns_a_code_and_advances_the_stage(
    client: TestClient, project: dict
):
    res = client.post(
        "/contracts",
        json={"project_id": project["id"], "body": "{}", "rep_a_name": "An"},
    )
    assert res.status_code == 201
    assert res.json()["code"] == f"HD-{business_today().year}-001"
    assert res.json()["status"] == "draft"
    assert res.json()["project"]["code"] == project["code"]
    assert client.get(f"/projects/{project['id']}").json()["stage"] == "contract"


def test_signing_stamps_today_and_freezes_the_printable(
    client: TestClient, project: dict
):
    contract = client.post("/contracts", json={"project_id": project["id"]}).json()
    signed = client.patch(f"/contracts/{contract['id']}", json={"status": "signed"})
    assert signed.json()["signed_date"] == business_today().isoformat()

    frozen = client.patch(f"/contracts/{contract['id']}", json={"body": "{}"})
    assert frozen.status_code == 409
    assert "body" in frozen.json()["detail"]
    # The date stays correctable, so a mis-signed contract can be fixed.
    assert (
        client.patch(
            f"/contracts/{contract['id']}", json={"signed_date": "2026-08-01"}
        ).status_code
        == 200
    )
    assert client.delete(f"/contracts/{contract['id']}").status_code == 409


def test_standalone_contract_needs_no_project(client: TestClient):
    res = client.post("/contracts", json={"body": "{}"})
    assert res.status_code == 201
    assert res.json()["project_id"] is None and res.json()["project"] is None


def test_template_header_blocks_default_on(client: TestClient):
    res = client.post(
        "/contract-templates",
        json={
            "name": "Mẫu thi công",
            "doc_title": "HỢP ĐỒNG THI CÔNG",
            "body": "{}",
            "is_active": True,
        },
    )
    assert res.status_code == 201
    # Official Vietnamese paperwork carries the Quốc hiệu with the letterhead
    # above it, so both blocks are on unless a template says otherwise.
    assert res.json()["show_letterhead"] is True
    assert res.json()["show_national"] is True


def test_company_profile_is_a_single_upserted_row(client: TestClient):
    assert client.get("/company-profile").json() == {}
    saved = client.patch("/company-profile", json={"name": "GreenOrange"})
    assert saved.status_code == 200 and saved.json()["id"] == 1
    client.patch("/company-profile", json={"tax_id": "0312345678"})
    body = client.get("/company-profile").json()
    assert body["name"] == "GreenOrange" and body["tax_id"] == "0312345678"
