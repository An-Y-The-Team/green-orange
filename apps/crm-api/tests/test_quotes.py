"""Báo giá: the money math, the version chain and the send/decide gates."""

from fastapi.testclient import TestClient

from app.api.routes.quotes import compute_items
from app.models.quote import QuoteItemIn


def make_quote(client: TestClient, project_id: int | None = None, **extra) -> dict:
    payload = {
        "items": [
            {
                "category": "A. VẬT TƯ",
                "description": "Hóa chất",
                "unit": "lít",
                "quantity": 12.5,
                "unit_price": 120_000,
            },
            {"description": "Nhân công", "quantity": 3, "unit_price": 1_500_000},
        ],
        **extra,
    }
    if project_id is not None:
        payload["project_id"] = project_id
    res = client.post("/quotes", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def test_amounts_round_half_up_not_to_even():
    # Python's round() would answer 2 here (banker's rounding) and undercharge
    # by a đồng against the NestJS backend.
    rows, total = compute_items(
        [QuoteItemIn(description="x", quantity=0.5, unit_price=5)]
    )
    assert rows[0].amount == 3 and total == 3


def test_create_computes_totals_and_advances_the_stage(
    client: TestClient, project: dict
):
    quote = make_quote(client, project["id"], vat_rate=0.1)
    assert quote["total_amount"] == 12.5 * 120_000 + 3 * 1_500_000
    assert [i["amount"] for i in quote["items"]] == [1_500_000, 4_500_000]
    assert quote["items"][1]["category"] is None
    assert quote["vat_rate"] == 0.1
    assert quote["version"] == 1
    # Drafting a quote is what moves a công trình into stage 2.
    assert client.get(f"/projects/{project['id']}").json()["stage"] == "quote"


def test_standalone_quote_needs_no_project(client: TestClient):
    quote = make_quote(client)
    assert quote["project_id"] is None and quote["project"] is None
    assert quote["version"] == 1
    # Nothing can supersede a standalone quote.
    assert client.get("/quotes").json()[0]["is_latest"] is True


def test_send_freezes_the_version_and_decide_stamps_the_date(
    client: TestClient, project: dict
):
    quote = make_quote(client, project["id"])
    qid = quote["id"]
    # A draft cannot be decided, only sent.
    assert (
        client.post(f"/quotes/{qid}/decide", json={"status": "deal"}).status_code == 409
    )
    sent = client.post(
        f"/quotes/{qid}/send", json={"channel": "zalo", "sent_by": "admin"}
    )
    assert sent.status_code == 201 and sent.json()["status"] == "waiting"
    assert [log["channel"] for log in sent.json()["send_logs"]] == ["zalo"]
    # Sent versions are never edited, and never deleted.
    assert client.patch(f"/quotes/{qid}", json={"note": "x"}).status_code == 409
    assert client.delete(f"/quotes/{qid}").status_code == 409

    decided = client.post(f"/quotes/{qid}/decide", json={"status": "deal"})
    assert decided.json()["status"] == "deal"
    assert decided.json()["decided_date"] is not None


def test_project_detail_carries_the_send_logs(client: TestClient, project: dict):
    """The stage-2 panel prints "Gửi: Zalo …" from the nested quote.

    ProjectDetail.quotes used to be a columns-only shape, so `send_logs` was
    absent from the payload (not empty) and the panel rendered a bare "Gửi:"
    label. Mirrored by projects.test.ts in crm-api-nest.
    """
    quote = make_quote(client, project["id"])
    client.post(
        f"/quotes/{quote['id']}/send", json={"channel": "zalo", "sent_by": "admin"}
    )

    nested = client.get(f"/projects/{project['id']}").json()["quotes"][0]
    assert [log["channel"] for log in nested["send_logs"]] == ["zalo"]
    assert nested["send_logs"][0]["sent_at"]


def test_revise_opens_a_new_version_and_supersedes_the_old_one(
    client: TestClient, project: dict
):
    first = make_quote(client, project["id"])
    client.post(
        f"/quotes/{first['id']}/send", json={"channel": "print", "sent_by": "a"}
    )
    revised = client.post(f"/quotes/{first['id']}/revise")
    assert revised.status_code == 201
    assert revised.json()["version"] == 2
    assert revised.json()["status"] == "draft"
    # The line items come along, so the operator edits instead of retyping.
    assert len(revised.json()["items"]) == 2

    latest = {q["version"]: q["is_latest"] for q in client.get("/quotes").json()}
    assert latest == {1: False, 2: True}


def test_update_replaces_the_line_items(client: TestClient, project: dict):
    quote = make_quote(client, project["id"])
    res = client.patch(
        f"/quotes/{quote['id']}",
        json={"items": [{"description": "Gộp lại", "quantity": 2, "unit_price": 1000}]},
    )
    assert res.status_code == 200
    assert [i["description"] for i in res.json()["items"]] == ["Gộp lại"]
    assert res.json()["total_amount"] == 2000
