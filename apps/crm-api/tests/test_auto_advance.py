"""Doing the work moves the công trình forward (forward-only, never a gate).

Twin of the rule tests in crm-api-nest/src/contract.test.ts. Each test walks
one transition the business doc promises: chốt → Hợp đồng, hồ sơ cleared + cọc
→ Thi công, nghiệm thu đạt → Quyết toán, last đợt paid → Đã đóng.
"""

from fastapi.testclient import TestClient

from tests.test_quotes import make_quote
from tests.test_receivables import settle


def stage(client: TestClient, project_id: int) -> str:
    return client.get(f"/projects/{project_id}").json()["stage"]


def pay_deposit(client: TestClient, project_id: int) -> None:
    res = client.post(
        "/payment-milestones",
        json={
            "project_id": project_id,
            "type": "deposit",
            "amount": 1_000_000,
            "status": "paid",
        },
    )
    assert res.status_code == 201, res.text


def test_chot_moves_the_job_to_contract(client: TestClient, project: dict):
    quote = make_quote(client, project["id"])
    client.post(
        f"/quotes/{quote['id']}/send", json={"channel": "zalo", "sent_by": "An"}
    )
    client.post(f"/quotes/{quote['id']}/decide", json={"status": "deal"})
    assert stage(client, project["id"]) == "contract"


def test_hoan_does_not_move_the_stage(client: TestClient, project: dict):
    quote = make_quote(client, project["id"])
    client.post(
        f"/quotes/{quote['id']}/send", json={"channel": "zalo", "sent_by": "An"}
    )
    client.post(f"/quotes/{quote['id']}/decide", json={"status": "on_hold"})
    assert stage(client, project["id"]) == "quote"


def test_defaults_are_tagged_for_the_stage_that_needs_them(
    client: TestClient, project: dict
):
    items = client.get(f"/paperwork-items?project_id={project['id']}").json()
    tags = {i["name"]: i["needed_for"] for i in items}
    assert tags["Giấy phép thi công"] == "execution"
    assert tags["Biên bản nghiệm thu khối lượng"] == "acceptance"
    assert tags["Đề nghị thanh toán"] == tags["Biên bản quyết toán"] == "settlement"


def test_clearing_the_execution_paperwork_after_the_coc_moves_to_execution(
    client: TestClient, project: dict
):
    pay_deposit(client, project["id"])
    assert stage(client, project["id"]) == "paperwork"
    items = client.get(f"/paperwork-items?project_id={project['id']}").json()
    needed = [i for i in items if i["needed_for"] == "execution"]
    for item in needed[:-1]:
        client.patch(f"/paperwork-items/{item['id']}", json={"status": "approved"})
    # One left, and the later-stage documents are untouched: still waiting.
    assert stage(client, project["id"]) == "paperwork"
    client.patch(f"/paperwork-items/{needed[-1]['id']}", json={"status": "approved"})
    assert stage(client, project["id"]) == "execution"


def test_paperwork_cleared_before_the_coc_waits_for_it(
    client: TestClient, project: dict
):
    items = client.get(f"/paperwork-items?project_id={project['id']}").json()
    for item in items:
        if item["needed_for"] == "execution":
            client.patch(f"/paperwork-items/{item['id']}", json={"status": "approved"})
    assert stage(client, project["id"]) == "request"
    # The cọc arrives last: it closes stage 3 and the cleared hồ sơ carry the
    # job straight on to Thi công.
    pay_deposit(client, project["id"])
    assert stage(client, project["id"]) == "execution"


def test_acceptance_passed_moves_to_settlement(client: TestClient, project: dict):
    client.patch(f"/projects/{project['id']}", json={"stage": "acceptance"})
    res = client.patch(
        f"/projects/{project['id']}", json={"acceptance_sub_status": "passed"}
    )
    assert res.json()["stage"] == "settlement"
    assert res.json()["acceptance_passed_date"] is not None


def test_last_payment_closes_the_job_and_pays_the_bill(
    client: TestClient, project: dict
):
    settlement = settle(client, project["id"])
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    signed = client.patch(
        f"/settlements/{settlement['id']}", json={"status": "signed"}
    ).json()
    assert stage(client, project["id"]) == "settlement"
    (balance,) = client.get(f"/payment-milestones?project_id={project['id']}").json()
    client.patch(
        f"/payment-milestones/{balance['id']}", json={"status": "awaiting_payment"}
    )
    client.patch(f"/payment-milestones/{balance['id']}", json={"status": "paid"})
    assert stage(client, project["id"]) == "closed"
    assert client.get(f"/bills/{signed['bill']['id']}").json()["status"] == "paid"


def sign(client: TestClient, project_id: int) -> dict:
    settlement = settle(client, project_id)
    client.patch(f"/settlements/{settlement['id']}", json={"status": "sent"})
    return client.patch(
        f"/settlements/{settlement['id']}", json={"status": "signed"}
    ).json()


def test_bill_paid_close_also_pays_the_open_dot(client: TestClient, project: dict):
    signed = sign(client, project["id"])
    bill_id = signed["bill"]["id"]
    client.patch(f"/bills/{bill_id}", json={"status": "sent"})
    client.patch(f"/bills/{bill_id}", json={"status": "paid"})
    assert stage(client, project["id"]) == "closed"
    # The đợt no longer sits open (and overdue) on a locked job.
    rows = client.get(f"/payment-milestones?project_id={project['id']}").json()
    assert rows and all(m["status"] == "paid" for m in rows)


def test_re_sending_paid_on_a_reopened_job_does_not_close_it(
    client: TestClient, project: dict
):
    signed = sign(client, project["id"])
    bill_id = signed["bill"]["id"]
    client.patch(f"/bills/{bill_id}", json={"status": "paid"})
    assert stage(client, project["id"]) == "closed"
    client.patch(f"/projects/{project['id']}", json={"stage": "settlement"})
    # Not a transition (already paid) → no close, same as Nest.
    client.patch(f"/bills/{bill_id}", json={"status": "paid"})
    assert stage(client, project["id"]) == "settlement"


def test_a_note_edit_does_not_undo_a_manual_backward_move(
    client: TestClient, project: dict
):
    pay_deposit(client, project["id"])
    items = client.get(f"/paperwork-items?project_id={project['id']}").json()
    for item in items:
        if item["needed_for"] == "execution":
            client.patch(f"/paperwork-items/{item['id']}", json={"status": "approved"})
    assert stage(client, project["id"]) == "execution"
    # "Sửa nhầm": moved back by hand, then a hồ sơ note is edited.
    client.patch(f"/projects/{project['id']}", json={"stage": "paperwork"})
    client.patch(f"/paperwork-items/{items[0]['id']}", json={"note": "bản gốc"})
    assert stage(client, project["id"]) == "paperwork"
