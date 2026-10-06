"""Attachments: a file is recorded only against the owner its kind demands,
linked to exactly the record its kind names (on the same project), under a key
minted for that owner + kind — DELETE removes the object the key names.

Mirror of `apps/crm-api-nest/src/attachments/attachments.test.ts`.
"""

from fastapi.testclient import TestClient

from app.api.deps import is_crm_admin
from app.core.storage import build_key
from app.main import app


def _key(project_id: int | None, kind: str, crew_member_id: int | None = None) -> str:
    return build_key(
        project_id=project_id,
        crew_member_id=crew_member_id,
        kind=kind,
        filename="Bien ban.pdf",
    )


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
    own_item = client.get(f"/paperwork-items?project_id={project['id']}").json()[0]
    body = {
        "project_id": project["id"],
        "kind": "paperwork",
        "s3_key": _key(project["id"], "paperwork"),
    }
    res = client.post(
        "/attachments", json={**body, "paperwork_item_id": foreign_item["id"]}
    )
    assert res.status_code == 400
    assert "paperwork_item_id does not belong to project_id" in res.json()["detail"]

    row = client.post(
        "/attachments", json={**body, "paperwork_item_id": own_item["id"]}
    ).json()
    assert row["paperwork_item_id"] == own_item["id"]
    # "Easy to fetch": the row's files by the record they document.
    listed = client.get(f"/attachments?paperwork_item_id={own_item['id']}").json()
    assert [a["id"] for a in listed] == [row["id"]]


def test_attachment_kind_decides_its_link(client: TestClient, project: dict):
    """'Correctly ID'd': a payment proof with no milestone is unfindable later,
    and a survey photo carrying a contract_id would show up on the contract."""
    pid = project["id"]
    res = client.post(
        "/attachments",
        json={
            "project_id": pid,
            "kind": "payment_proof",
            "s3_key": _key(pid, "payment_proof"),
        },
    )
    assert res.status_code == 400
    assert "needs payment_milestone_id" in res.json()["detail"]
    res = client.post(
        "/attachments",
        json={
            "project_id": pid,
            "kind": "survey",
            "contract_id": 1,
            "s3_key": _key(pid, "survey"),
        },
    )
    assert res.status_code == 400
    assert "takes no contract_id" in res.json()["detail"]
    # A key minted for another category is refused like a foreign one.
    res = client.post(
        "/attachments",
        json={"project_id": pid, "kind": "survey", "s3_key": _key(pid, "other")},
    )
    assert res.status_code == 400
    assert "s3_key was not issued for this owner and kind" in res.json()["detail"]
    assert client.get("/attachments?kind=nope").status_code == 422


def test_crew_files_have_their_own_owner_and_block_delete(
    client: TestClient, fixtures: dict, project: dict
):
    mid = fixtures["crew_member_id"]
    res = client.post(
        "/attachments",
        json={"project_id": project["id"], "kind": "id_card", "s3_key": "k"},
    )
    assert res.status_code == 400
    assert "needs crew_member_id" in res.json()["detail"]
    res = client.post(
        "/attachments",
        json={
            "project_id": project["id"],
            "crew_member_id": mid,
            "kind": "survey",
            "s3_key": "k",
        },
    )
    assert "exactly one owner" in res.json()["detail"]

    row = client.post(
        "/attachments",
        json={
            "crew_member_id": mid,
            "kind": "id_card",
            "s3_key": _key(None, "id_card", mid),
        },
    ).json()
    assert row["crew_member_id"] == mid
    assert row["project_id"] is None
    assert [
        a["id"] for a in client.get(f"/attachments?crew_member_id={mid}").json()
    ] == [row["id"]]

    refused = client.delete(f"/crew/{mid}")
    assert refused.status_code == 409
    assert "attached files" in refused.json()["detail"]
    assert client.delete(f"/attachments/{row['id']}").status_code == 204
    assert client.delete(f"/crew/{mid}").status_code == 204


def test_crew_files_are_crm_admins_only(
    client: TestClient, fixtures: dict, project: dict
):
    """Workers' ID scans: listing, opening, uploading and deleting them all need
    crm-admins; a project list never carries them for anyone else."""
    mid = fixtures["crew_member_id"]
    row = client.post(
        "/attachments",
        json={
            "crew_member_id": mid,
            "kind": "id_card",
            "s3_key": _key(None, "id_card", mid),
        },
    ).json()

    app.dependency_overrides[is_crm_admin] = lambda: False
    try:
        assert client.get(f"/attachments?crew_member_id={mid}").status_code == 403
        assert row["id"] not in [a["id"] for a in client.get("/attachments").json()]
        for res in (
            client.get(f"/attachments/{row['id']}/url"),
            client.delete(f"/attachments/{row['id']}"),
            client.post(
                "/attachments",
                json={
                    "crew_member_id": mid,
                    "kind": "id_card",
                    "s3_key": _key(None, "id_card", mid),
                },
            ),
        ):
            assert res.status_code == 403
            assert "restricted to crm-admins" in res.json()["detail"]
    finally:
        app.dependency_overrides[is_crm_admin] = lambda: True
    assert client.delete(f"/attachments/{row['id']}").status_code == 204
