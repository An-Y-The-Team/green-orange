"""Quyết toán → Hóa đơn → Đợt thanh toán: signing, un-signing, transitions."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.routes.receivables import settlement_remainder
from app.models.receivable import PaymentMilestone


def settle(client: TestClient, project_id: int, unit_price: int = 60_000) -> dict:
    res = client.post(
        "/settlements",
        json={
            "project_id": project_id,
            "items": [
                {
                    "description": "Khối lượng thực tế",
                    "unit": "m²",
                    "quantity": 100,
                    "unit_price": unit_price,
                }
            ],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_remainder_is_status_blind():
    # An unpaid cọc is still a scheduled obligation: subtract it, or the balance
    # đợt bills it a second time.
    assert (
        settlement_remainder(
            10, [PaymentMilestone(project_id=1, type="deposit", amount=3)]
        )
        == 7
    )
    with pytest.raises(HTTPException) as excinfo:
        settlement_remainder(
            2, [PaymentMilestone(project_id=1, type="deposit", amount=3)]
        )
    assert excinfo.value.status_code == 409


def test_settlement_is_born_with_a_draft_bill_and_is_one_per_project(
    client: TestClient, project: dict
):
    settlement = settle(client, project["id"])
    assert settlement["total_amount"] == 6_000_000
    assert settlement["bill"]["status"] == "draft"
    assert settlement["bill"]["total_amount"] == 0
    assert client.get(f"/projects/{project['id']}").json()["stage"] == "settlement"
    # A second one is a 409 — corrections revise the existing row.
    assert (
        client.post("/settlements", json={"project_id": project["id"]}).status_code
        == 409
    )


def test_signing_officializes_the_bill_and_schedules_the_balance(
    client: TestClient, project: dict
):
    client.post(
        "/payment-milestones",
        json={
            "project_id": project["id"],
            "type": "deposit",
            "amount": 2_000_000,
            "status": "paid",
        },
    )
    settlement = settle(client, project["id"])
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    signed = client.patch(f"/settlements/{settlement['id']}", json={"status": "signed"})
    assert signed.status_code == 200
    body = signed.json()
    assert body["signed_date"] is not None
    assert body["bill"]["status"] == "official"
    assert body["bill"]["total_amount"] == 6_000_000

    milestones = client.get(f"/payment-milestones?project_id={project['id']}").json()
    # Every đợt now hangs off the bill, and they add up to its total.
    assert all(m["bill_id"] == body["bill"]["id"] for m in milestones)
    assert sum(m["amount"] for m in milestones) == 6_000_000
    assert sorted(m["type"] for m in milestones) == ["deposit", "progress"]
    # Items are frozen while signed.
    assert (
        client.patch(
            f"/settlements/{settlement['id']}",
            json={"items": [{"description": "x", "quantity": 1, "unit_price": 1}]},
        ).status_code
        == 400
    )


def test_items_are_replaced_and_retotalled_while_draft(
    client: TestClient, project: dict
):
    settlement = settle(client, project["id"])
    res = client.patch(
        f"/settlements/{settlement['id']}",
        json={
            "items": [
                {
                    "description": "Khối lượng đã sửa",
                    "quantity": 50,
                    "unit_price": 70_000,
                }
            ]
        },
    )
    assert res.status_code == 200
    assert [i["description"] for i in res.json()["items"]] == ["Khối lượng đã sửa"]
    assert res.json()["total_amount"] == 3_500_000


def test_status_moves_one_step_at_a_time(client: TestClient, project: dict):
    settlement = settle(client, project["id"])
    assert (
        client.patch(
            f"/settlements/{settlement['id']}", json={"status": "signed"}
        ).status_code
        == 400
    )


def test_unsign_is_the_exact_inverse_and_refuses_collected_money(
    client: TestClient, project: dict
):
    settlement = settle(client, project["id"])
    client.post(
        "/payment-milestones",
        json={
            "project_id": project["id"],
            "type": "deposit",
            "amount": 1_000_000,
            "status": "paid",
        },
    )
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    signed = client.patch(
        f"/settlements/{settlement['id']}", json={"status": "signed"}
    ).json()
    bill_id = signed["bill"]["id"]
    balance = next(
        m
        for m in client.get(f"/payment-milestones?project_id={project['id']}").json()
        if m["type"] == "progress"
    )

    reverted = client.patch(
        f"/settlements/{settlement['id']}", json={"status": "draft"}
    )
    assert reverted.status_code == 200
    body = reverted.json()
    assert body["status"] == "draft" and body["signed_date"] is None
    assert body["bill"]["status"] == "draft" and body["bill"]["total_amount"] == 0
    remaining = client.get(f"/payment-milestones?project_id={project['id']}").json()
    # The cọc survives, detached; the generated balance đợt is gone.
    assert [(m["type"], m["bill_id"]) for m in remaining] == [("deposit", None)]
    assert client.get(f"/payment-milestones/{balance['id']}").status_code == 404

    # Re-sign, collect the balance, and un-signing is refused.
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    client.patch(f"/settlements/{settlement['id']}", json={"status": "signed"})
    new_balance = next(
        m
        for m in client.get(f"/payment-milestones?project_id={project['id']}").json()
        if m["type"] == "progress"
    )
    client.patch(
        f"/payment-milestones/{new_balance['id']}", json={"status": "awaiting_payment"}
    )
    client.patch(f"/payment-milestones/{new_balance['id']}", json={"status": "paid"})
    assert (
        client.patch(
            f"/settlements/{settlement['id']}", json={"status": "draft"}
        ).status_code
        == 400
    )
    assert client.get(f"/bills/{bill_id}").json()["status"] == "official"


def test_bill_status_is_forward_only_and_stamps_its_dates(
    client: TestClient, project: dict
):
    settlement = settle(client, project["id"])
    bill_id = settlement["bill"]["id"]
    sent = client.patch(f"/bills/{bill_id}", json={"status": "sent"})
    assert sent.status_code == 200 and sent.json()["sent_date"] is not None
    assert (
        client.patch(f"/bills/{bill_id}", json={"status": "draft"}).status_code == 400
    )
    paid = client.patch(f"/bills/{bill_id}", json={"status": "paid"})
    assert paid.json()["paid_date"] is not None
    # total_amount is only editable while draft or official.
    assert (
        client.patch(f"/bills/{bill_id}", json={"total_amount": 1}).status_code == 400
    )


def test_deposit_paid_advances_the_project_and_paid_date_needs_paid_status(
    client: TestClient, project: dict
):
    assert (
        client.post(
            "/payment-milestones",
            json={
                "project_id": project["id"],
                "type": "deposit",
                "amount": 1,
                "paid_date": "2026-08-01",
            },
        ).status_code
        == 400
    )
    created = client.post(
        "/payment-milestones",
        json={"project_id": project["id"], "type": "deposit", "amount": 1_000_000},
    ).json()
    assert created["status"] == "not_due"
    client.patch(
        f"/payment-milestones/{created['id']}", json={"status": "awaiting_payment"}
    )
    paid = client.patch(f"/payment-milestones/{created['id']}", json={"status": "paid"})
    assert paid.json()["paid_date"] is not None
    # Cọc received closes stage 4.
    assert client.get(f"/projects/{project['id']}").json()["stage"] == "paperwork"
    # Only a not_due đợt can be deleted.
    assert client.delete(f"/payment-milestones/{created['id']}").status_code == 400
