"""Quyết toán → Hóa đơn → Đợt thanh toán: signing, un-signing, transitions."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.routes.receivables import payable_total, settlement_remainder
from app.models.receivable import BILL_STATUSES, PaymentMilestone, Settlement


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
    # The bill takes the PAYABLE (6.000.000 + 8% VAT), never the pre-tax Σ.
    assert body["bill"]["total_amount"] == 6_480_000

    milestones = client.get(f"/payment-milestones?project_id={project['id']}").json()
    # Every đợt now hangs off the bill, and they add up to its total.
    assert all(m["bill_id"] == body["bill"]["id"] for m in milestones)
    assert sum(m["amount"] for m in milestones) == 6_480_000
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


def _settlement(total: int, discount: int = 0, vat: float = 0.08) -> Settlement:
    return Settlement(
        project_id=1, total_amount=total, discount_amount=discount, vat_rate=vat
    )


def test_payable_is_what_the_hoa_don_asks_for():
    # The quyết toán settles a VAT-priced hợp đồng, so what reaches the hóa đơn
    # is the payable, never the pre-tax Σ the sheet prints as "Cộng".
    assert payable_total(_settlement(36_000_000)) == 38_880_000
    # Giảm giá comes off BEFORE the tax — taxing first would give 32.880.000.
    assert payable_total(_settlement(36_000_000, discount=6_000_000)) == 32_400_000
    # Rounds to the đồng, matching the printed sheet.
    assert payable_total(_settlement(34_050_000)) == 36_774_000
    assert payable_total(_settlement(1)) == 1  # round(0,08) = 0
    assert payable_total(_settlement(36_000_000, vat=0)) == 36_000_000
    with pytest.raises(HTTPException) as excinfo:
        payable_total(_settlement(10_000_000, discount=11_000_000))
    assert excinfo.value.status_code == 400


def test_giam_gia_is_rejected_at_write_time_not_at_sign_time(
    client: TestClient, project: dict
):
    # An over-discount that only 400s at sign time leaves an unsignable quyết
    # toán whose printed sheet shows a total the server refuses.
    over = client.post(
        "/settlements",
        json={
            "project_id": project["id"],
            "items": [
                {"description": "Đục sàn", "quantity": 1, "unit_price": 5_000_000}
            ],
            "discount_amount": 6_000_000,
        },
    )
    assert over.status_code == 400 and "giảm giá" in over.json()["detail"]
    assert client.get(f"/settlements?project_id={project['id']}").json() == []

    settlement = settle(client, project["id"])  # 6.000.000
    assert settlement["discount_amount"] == 0 and settlement["vat_rate"] == 0.08
    assert (
        client.patch(
            f"/settlements/{settlement['id']}", json={"discount_amount": 7_000_000}
        ).status_code
        == 400
    )
    ok = client.patch(
        f"/settlements/{settlement['id']}",
        json={"discount_amount": 1_000_000, "vat_rate": 0.1},
    ).json()
    assert ok["discount_amount"] == 1_000_000 and ok["vat_rate"] == 0.1
    # Shrinking the items below the standing giảm giá is the same invalid row.
    assert (
        client.patch(
            f"/settlements/{settlement['id']}",
            json={
                "items": [{"description": "x", "quantity": 1, "unit_price": 500_000}]
            },
        ).status_code
        == 400
    )

    # (6.000.000 − 1.000.000) × 1,10 reaches the bill.
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    signed = client.patch(
        f"/settlements/{settlement['id']}", json={"status": "signed"}
    ).json()
    assert signed["total_amount"] == 6_000_000  # the sheet still prints the Σ
    assert signed["bill"]["total_amount"] == 5_500_000
    # Frozen once signed, for the same reason as items.
    assert (
        client.patch(
            f"/settlements/{settlement['id']}", json={"discount_amount": 0}
        ).status_code
        == 400
    )


def test_summary_totals_the_whole_collection_not_one_page(
    client: TestClient, project: dict
):
    empty = client.get("/receivables/summary").json()
    # An empty bucket is a real zero, not a null the UI renders as "null ₫".
    assert empty["milestones"]["by_status"]["paid"] == {"count": 0, "total": 0}
    assert set(empty["bills"]["by_status"]) == set(BILL_STATUSES)

    for amount, status_ in ((2_000_000, "paid"), (3_000_000, None)):
        client.post(
            "/payment-milestones",
            json={
                "project_id": project["id"],
                "type": "deposit" if status_ else "progress",
                "amount": amount,
                **({"status": status_} if status_ else {}),
                **({} if status_ else {"due_date": "2020-01-01"}),
            },
        )
    body = client.get("/receivables/summary").json()
    assert body["milestones"]["by_status"]["paid"] == {"count": 1, "total": 2_000_000}
    assert body["milestones"]["by_status"]["not_due"] == {
        "count": 1,
        "total": 3_000_000,
    }
    # Overdue is DERIVED with the list endpoint's predicate, not a second
    # spelling of it: due before today and not yet paid.
    assert body["milestones"]["overdue"] == {"count": 1, "total": 3_000_000}
    # …and it can be scoped to one công trình.
    scoped = client.get(f"/receivables/summary?project_id={project['id']}").json()
    assert scoped == body
    assert client.get("/receivables/summary?project_id=999").json()["milestones"][
        "overdue"
    ] == {"count": 0, "total": 0}


def test_milestone_list_sorts_overdue_first_and_filters_on_csv_status(
    client: TestClient, project: dict
):
    for amount, due, status_ in (
        (1_000_000, "2030-01-01", "not_due"),
        (2_000_000, None, "not_due"),
        (3_000_000, "2020-01-01", "awaiting_payment"),
    ):
        client.post(
            "/payment-milestones",
            json={
                "project_id": project["id"],
                "type": "progress",
                "amount": amount,
                "status": status_,
                **({"due_date": due} if due else {}),
            },
        )

    def amounts(query: str = "") -> list[int]:
        return [m["amount"] for m in client.get(f"/payment-milestones?{query}").json()]

    # Default: soonest due first, undated last — so the overdue đợt is row 0 and
    # stays there across pages, instead of being buried by `id asc`.
    assert amounts() == [3_000_000, 1_000_000, 2_000_000]
    assert amounts("sort_by=amount&sort_order=desc") == [
        3_000_000,
        2_000_000,
        1_000_000,
    ]
    # A multi-select sends csv; an unknown value is a 400, not an empty list.
    assert amounts("status=not_due,awaiting_payment") == [
        3_000_000,
        1_000_000,
        2_000_000,
    ]
    assert amounts("status=awaiting_payment") == [3_000_000]
    assert client.get("/payment-milestones?status=bogus").status_code == 400
    # `overdue=true` REPLACES status — the two fight for the same column.
    assert amounts("overdue=true&status=not_due") == [3_000_000]
    assert amounts(f"search={project['code']}") == [3_000_000, 1_000_000, 2_000_000]
    assert amounts("search=CT-9999") == []


def test_bill_list_sorts_and_filters_on_csv_status(client: TestClient, project: dict):
    settlement = settle(client, project["id"])
    assert [b["status"] for b in client.get("/bills?status=draft").json()] == ["draft"]
    assert client.get("/bills?status=sent,paid").json() == []
    assert client.get("/bills?status=bogus").status_code == 400
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    client.patch(f"/settlements/{settlement['id']}", json={"status": "signed"})
    assert [
        b["total_amount"] for b in client.get("/bills?sort_by=total_amount").json()
    ] == [6_480_000]
    assert [
        b["id"] for b in client.get(f"/bills?search={project['code']}").json()
    ] != []
    assert client.get("/bills?search=CT-9999").json() == []


def test_sign_bills_the_total_from_the_same_patch_not_the_stored_one(
    client: TestClient, project: dict
):
    # A PATCH carrying both `items` and status:"signed" recomputes the Σ first,
    # so the bill must take the NEW payable, not the one on the row before it.
    settlement = settle(client, project["id"])  # 6.000.000
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    signed = client.patch(
        f"/settlements/{settlement['id']}",
        json={
            "items": [
                {"description": "Khối lượng sửa", "quantity": 100, "unit_price": 80_000}
            ],
            "status": "signed",
        },
    ).json()
    assert signed["total_amount"] == 8_000_000
    assert signed["bill"]["total_amount"] == 8_640_000  # + 8% VAT
