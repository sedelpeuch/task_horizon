"""Tests for /api/v1/labels endpoints."""


def test_create_label(client):
    resp = client.post("/api/v1/labels", json={"name": "bug", "color": "#ef4444"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "bug"
    assert data["color"] == "#ef4444"
    assert "id" in data


def test_create_label_strips_and_lowercases_name(client):
    resp = client.post("/api/v1/labels", json={"name": "  Feature  "})
    assert resp.status_code == 201
    assert resp.json()["name"] == "feature"


def test_create_label_duplicate_rejected(client, default_label):
    resp = client.post("/api/v1/labels", json={"name": default_label["name"]})
    assert resp.status_code == 400


def test_get_labels(client, default_label):
    resp = client.get("/api/v1/labels")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    ids = [label["id"] for label in data]
    assert default_label["id"] in ids


def test_get_labels_empty(client):
    resp = client.get("/api/v1/labels")
    assert resp.status_code == 200
    assert resp.json() == []


def test_update_label(client, default_label):
    label_id = default_label["id"]
    resp = client.put(
        f"/api/v1/labels/{label_id}", json={"name": "enhancement", "color": "#00ff00"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "enhancement"
    assert data["color"] == "#00ff00"


def test_update_label_name_only(client, default_label):
    label_id = default_label["id"]
    resp = client.put(f"/api/v1/labels/{label_id}", json={"name": "wontfix"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "wontfix"


def test_update_label_not_found(client):
    resp = client.put("/api/v1/labels/nonexistent-id", json={"name": "x"})
    assert resp.status_code == 404


def test_delete_label(client, default_label):
    label_id = default_label["id"]
    resp = client.delete(f"/api/v1/labels/{label_id}")
    assert resp.status_code == 204

    # Confirm gone
    resp2 = client.get("/api/v1/labels")
    ids = [label["id"] for label in resp2.json()]
    assert label_id not in ids


def test_delete_label_not_found(client):
    resp = client.delete("/api/v1/labels/nonexistent-id")
    assert resp.status_code == 404
