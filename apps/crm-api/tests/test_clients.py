"""Clients, contacts and locations: CRUD, the individual shortcut, the guards."""

from fastapi.testclient import TestClient

from app.api.common import TOTAL_COUNT_HEADER


def test_clients_require_authentication(client_without_auth: TestClient):
    assert client_without_auth.get("/clients").status_code == 401


def test_client_crud_roundtrip(client: TestClient):
    res = client.post(
        "/clients",
        json={
            "name": "Acme Corp",
            "type": "company",
            "tax_code": "0312345678",
            "email": "ketoan@acme.vn",
        },
    )
    assert res.status_code == 201
    created = res.json()
    assert created["contacts"] == [] and created["locations"] == []

    listed = client.get("/clients")
    assert listed.status_code == 200
    # The whole filtered collection's size, not the page's length.
    assert listed.headers[TOTAL_COUNT_HEADER] == "1"
    assert listed.json()[0]["_count"] == {"locations": 0, "projects": 0}

    patched = client.patch(f"/clients/{created['id']}", json={"note": "VIP"})
    assert patched.status_code == 200 and patched.json()["note"] == "VIP"

    assert client.delete(f"/clients/{created['id']}").status_code == 204
    assert client.get(f"/clients/{created['id']}").status_code == 404


def test_individual_client_gets_its_own_contact_and_default_location(
    client: TestClient,
):
    res = client.post(
        "/clients",
        json={
            "name": "Trần Thị Bình",
            "type": "individual",
            "phone": "+84 91 234 5678",
            "address": "45 Nguyễn Trãi",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert [c["name"] for c in body["contacts"]] == ["Trần Thị Bình"]
    assert body["locations"][0]["name"] == "Mặc định"
    assert body["locations"][0]["manager_contact_id"] == body["contacts"][0]["id"]


def test_individual_client_without_address_is_rejected(client: TestClient):
    res = client.post("/clients", json={"name": "Ai đó", "type": "individual"})
    assert res.status_code == 400
    # Nothing was written: the check runs before the first insert.
    assert client.get("/clients").json() == []


def test_client_list_filters_and_search(client: TestClient):
    client.post("/clients", json={"name": "Acme", "type": "company"})
    client.post("/clients", json={"name": "Bình", "type": "individual", "address": "x"})

    assert len(client.get("/clients?type=company").json()) == 1
    assert len(client.get("/clients?type=company,individual").json()) == 2
    assert client.get("/clients?type=nonsense").status_code == 400
    assert len(client.get("/clients?search=ac").json()) == 1
    # LIKE wildcards are escaped, so "%" is a literal — not "match everything".
    assert client.get("/clients?search=%").json() == []
    names = [c["name"] for c in client.get("/clients?sort_by=name").json()]
    assert names == sorted(names)


def test_contact_crud_and_delete_guard(client: TestClient, fixtures: dict):
    res = client.post(
        "/contacts",
        json={
            "client_id": fixtures["client_id"],
            "name": "Ada",
            "email": "ada@example.com",
            "title": "Engineer",
        },
    )
    assert res.status_code == 201
    contact_id = res.json()["id"]

    assert len(client.get(f"/contacts?client_id={fixtures['client_id']}").json()) == 2
    patched = client.patch(f"/contacts/{contact_id}", json={"title": "CTO"})
    assert patched.json()["title"] == "CTO"
    assert client.delete(f"/contacts/{contact_id}").status_code == 204
    # The seeded contact manages a location, so it refuses instead.
    assert client.delete(f"/contacts/{fixtures['contact_id']}").status_code == 409


def test_location_manager_must_belong_to_the_same_client(
    client: TestClient, fixtures: dict
):
    other = client.post("/clients", json={"name": "Other", "type": "company"}).json()
    res = client.post(
        "/locations",
        json={
            "client_id": other["id"],
            "name": "Kho",
            "address": "1 Đường 1",
            "manager_contact_id": fixtures["contact_id"],
        },
    )
    assert res.status_code == 400


def test_client_with_projects_cannot_be_deleted(
    client: TestClient, fixtures: dict, project: dict
):
    assert client.delete(f"/clients/{fixtures['client_id']}").status_code == 409
    assert client.delete(f"/locations/{fixtures['location_id']}").status_code == 409
    assert project["client"]["id"] == fixtures["client_id"]


def test_registered_address_is_stored_and_editable(client: TestClient):
    # Bên A's address on a contract — a company may supply one, an individual
    # must (it also seeds their default location).
    created = client.post(
        "/clients",
        json={
            "name": "Công ty TNHH An Phát",
            "type": "company",
            "address": "45 Lê Duẩn, Quận 1, TP.HCM",
        },
    ).json()
    assert created["address"] == "45 Lê Duẩn, Quận 1, TP.HCM"
    patched = client.patch(
        f"/clients/{created['id']}", json={"address": "12 Trần Não, TP. Thủ Đức"}
    )
    assert patched.json()["address"] == "12 Trần Não, TP. Thủ Đức"

    individual = client.post(
        "/clients",
        json={"name": "Chị Hoa", "type": "individual", "address": "12 Trần Não"},
    ).json()
    # Stored on the client AND used for the default location, not one or other.
    assert individual["address"] == "12 Trần Não"
    assert individual["locations"][0]["address"] == "12 Trần Não"


def test_search_ignores_diacritics_in_both_directions(client: TestClient):
    client.post("/clients", json={"name": "Công ty TNHH An Phát", "type": "company"})
    client.post("/clients", json={"name": "Xưởng Đường Đá", "type": "company"})

    def names(query: str) -> list[str]:
        return [c["name"] for c in client.get(f"/clients?search={query}").json()]

    # Typed without tone marks — the case this exists for. Used to find nothing.
    assert names("an phat") == ["Công ty TNHH An Phát"]
    assert names("duong da") == ["Xưởng Đường Đá"]
    # …and typed with them, which still has to work.
    assert names("An Phát") == ["Công ty TNHH An Phát"]
    # A rename keeps the search key in step (the mapper event, not the route).
    created = client.get("/clients?search=an phat").json()[0]
    client.patch(f"/clients/{created['id']}", json={"name": "Công ty Bình Minh"})
    assert names("an phat") == []
    assert names("binh minh") == ["Công ty Bình Minh"]
