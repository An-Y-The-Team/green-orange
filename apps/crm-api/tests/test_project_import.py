"""POST /projects/import: one transaction per workbook, ids checked against the
client, money rejected before anything is written. Mirrors crm-api-nest
`projects/project-import.test.ts`."""

from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.models.client import Client, Contact, Location
from app.models.project import Project
from app.models.quote import Quote
from app.models.receivable import Bill, Settlement

QUOTE = {
    "items": [
        {
            "category": "I. CHUẨN BỊ",
            "description": "Bảo hiểm",
            "unit": "gói",
            "quantity": 1,
            "unit_price": 2_000_000,
        },
        {
            "description": "Tháo trần",
            "unit": "m2",
            "quantity": 120,
            "unit_price": 85_000,
        },
    ],
    "vat_rate": 0.08,
    "discount_amount": 200_000,
}


def body(fixtures: dict, **extra) -> dict:
    return {
        "client": {
            "name": "CÔNG TY BÌNH MINH",
            "type": "company",
            "tax_code": "0309554620",
        },
        "contact": {"name": "Trần Khánh Vân", "title": "PTGĐ", "phone": "0912345678"},
        "location": {"name": "Bread Talk", "address": "72 Lê Thánh Tôn"},
        "name": "Bread Talk",
        "type_ids": [fixtures["type_id"]],
        "stage": "quote",
        "request_note": "Nhập từ báo giá",
        "quote": QUOTE,
        **extra,
    }


def count(session: Session, model) -> int:
    return session.exec(select(func.count()).select_from(model)).one()


def test_new_client_contact_and_site_with_a_waiting_quote(
    client: TestClient, session: Session, fixtures: dict
):
    res = client.post("/projects/import", json=body(fixtures))
    assert res.status_code == 201, res.text
    project = res.json()
    assert project["stage"] == "quote"
    assert project["client"]["tax_code"] == "0309554620"
    assert project["location"]["address"] == "72 Lê Thánh Tôn"

    contact = session.get(Contact, project["working_contact_id"])
    assert contact.name == "Trần Khánh Vân"
    assert project["decision_maker_contact_id"] == contact.id
    assert (
        session.get(Location, project["location_id"]).manager_contact_id == contact.id
    )

    [quote] = client.get(f"/quotes?project_id={project['id']}").json()
    assert quote["version"] == 1 and quote["status"] == "waiting"
    assert quote["total_amount"] == 12_200_000
    assert quote["discount_amount"] == 200_000
    assert quote["grand_total"] == 12_960_000  # (12.2M − 200k) × 1.08
    assert [i["category"] for i in quote["items"]] == ["I. CHUẨN BỊ", None]


def test_existing_client_and_site_are_reused(client: TestClient, fixtures: dict):
    res = client.post(
        "/projects/import",
        json=body(
            fixtures,
            client={"id": fixtures["client_id"]},
            contact=None,
            location={"id": fixtures["location_id"]},
        ),
    )
    assert res.status_code == 201, res.text
    project = res.json()
    assert project["client_id"] == fixtures["client_id"]
    # No contact in the file → the site manager runs the job, as on POST /projects.
    assert project["working_contact_id"] == fixtures["contact_id"]


def test_a_site_of_another_client_is_refused(client: TestClient, fixtures: dict):
    res = client.post(
        "/projects/import",
        json=body(fixtures, location={"id": fixtures["location_id"]}),
    )
    assert res.status_code == 400
    assert "does not belong to the client" in res.json()["detail"]


def test_settled_job_lands_with_its_settlement_and_bill(
    client: TestClient, session: Session, fixtures: dict
):
    res = client.post(
        "/projects/import",
        json=body(
            fixtures,
            stage="settlement",
            settlement={
                "items": [
                    {
                        "description": "Tháo trần",
                        "unit": "m2",
                        "quantity": 110,
                        "unit_price": 85_000,
                    }
                ],
                "vat_rate": 0.08,
            },
        ),
    )
    assert res.status_code == 201, res.text
    project_id = res.json()["id"]
    assert (
        session.exec(select(Quote.status).where(Quote.project_id == project_id)).one()
        == "deal"
    )
    settlement = session.exec(
        select(Settlement).where(Settlement.project_id == project_id)
    ).one()
    assert settlement.total_amount == 9_350_000
    assert session.exec(select(Bill).where(Bill.settlement_id == settlement.id)).one()


def test_a_failure_midway_leaves_nothing_behind(
    client: TestClient, session: Session, fixtures: dict
):
    before = {m: count(session, m) for m in (Client, Contact, Location, Project, Quote)}
    # The quyết toán's giảm giá is only checked after client … quote are flushed.
    res = client.post(
        "/projects/import",
        json=body(
            fixtures,
            stage="settlement",
            settlement={
                "items": [{"description": "x", "quantity": 1, "unit_price": 100}],
                "vat_rate": 0.08,
                "discount_amount": 101,
            },
        ),
    )
    assert res.status_code == 400
    assert {m: count(session, m) for m in before} == before


def test_bad_bodies_are_422(client: TestClient, fixtures: dict):
    # A new site needs its address; "closed" is not an import stage.
    assert (
        client.post(
            "/projects/import", json=body(fixtures, location={"name": "x"})
        ).status_code
        == 422
    )
    assert (
        client.post("/projects/import", json=body(fixtures, stage="closed")).status_code
        == 422
    )
    over = {**QUOTE, "discount_amount": 12_200_001}
    res = client.post("/projects/import", json=body(fixtures, quote=over))
    assert res.status_code == 400
    assert "exceeds the báo giá subtotal" in res.json()["detail"]
    res = client.post(
        "/projects/import",
        json=body(fixtures, settlement={"items": QUOTE["items"], "vat_rate": 0.08}),
    )
    assert res.status_code == 400
