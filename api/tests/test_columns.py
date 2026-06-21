"""Tests for /api/v1/columns endpoints."""


def test_create_column(client):
    resp = client.post("/api/v1/columns", json={"name": "Todo", "color": "#ff0000"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Todo"
    assert data["color"] == "#ff0000"
    assert "id" in data
    assert data["position"] == 0


def test_get_columns(client, default_column):
    resp = client.get("/api/v1/columns")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    names = [c["name"] for c in data]
    assert "Backlog" in names


def test_get_column_by_id_not_in_spec_but_useful(client, default_column):
    # No GET /columns/{id} endpoint exists — verify columns list contains seeded one
    resp = client.get("/api/v1/columns")
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert default_column["id"] in ids


def test_update_column(client, default_column):
    col_id = default_column["id"]
    resp = client.put(f"/api/v1/columns/{col_id}", json={"name": "Sprint", "color": "#00ff00"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Sprint"
    assert data["color"] == "#00ff00"


def test_update_column_position(client, default_column):
    col_id = default_column["id"]
    resp = client.put(f"/api/v1/columns/{col_id}", json={"position": 5})
    assert resp.status_code == 200
    assert resp.json()["position"] == 5


def test_delete_column(client, default_column):
    col_id = default_column["id"]
    resp = client.delete(f"/api/v1/columns/{col_id}")
    assert resp.status_code == 204

    # Confirm gone
    resp2 = client.get("/api/v1/columns")
    ids = [c["id"] for c in resp2.json()]
    assert col_id not in ids


def test_get_column_not_found(client):
    resp = client.put("/api/v1/columns/nonexistent-id", json={"name": "X"})
    assert resp.status_code == 404


def test_delete_column_not_found(client):
    resp = client.delete("/api/v1/columns/nonexistent-id")
    assert resp.status_code == 404


def test_column_positions_auto_incremented(client):
    r1 = client.post("/api/v1/columns", json={"name": "Col1"})
    r2 = client.post("/api/v1/columns", json={"name": "Col2"})
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r2.json()["position"] == r1.json()["position"] + 1
