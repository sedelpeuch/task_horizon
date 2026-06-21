"""Tests for /api/v1/users endpoints."""


def test_create_user(client):
    resp = client.post("/api/v1/users", json={"name": "Bob", "email": "bob@example.com"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Bob"
    assert data["email"] == "bob@example.com"
    assert "id" in data
    assert "created_at" in data


def test_create_user_duplicate_email_rejected(client, default_user):
    resp = client.post("/api/v1/users", json={"name": "Alice2", "email": default_user["email"]})
    assert resp.status_code == 400


def test_get_users(client, default_user):
    resp = client.get("/api/v1/users")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    ids = [u["id"] for u in data]
    assert default_user["id"] in ids


def test_get_users_empty(client):
    resp = client.get("/api/v1/users")
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_user_by_id(client, default_user):
    user_id = default_user["id"]
    resp = client.get(f"/api/v1/users/{user_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == user_id
    assert data["email"] == default_user["email"]


def test_update_user(client, default_user):
    user_id = default_user["id"]
    resp = client.put(f"/api/v1/users/{user_id}", json={"name": "Alice Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Alice Updated"


def test_update_user_email(client, default_user):
    user_id = default_user["id"]
    resp = client.put(f"/api/v1/users/{user_id}", json={"email": "newalice@example.com"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "newalice@example.com"


def test_delete_user(client, default_user):
    user_id = default_user["id"]
    resp = client.delete(f"/api/v1/users/{user_id}")
    assert resp.status_code == 204

    # Confirm gone
    resp2 = client.get(f"/api/v1/users/{user_id}")
    assert resp2.status_code == 404


def test_user_not_found(client):
    resp = client.get("/api/v1/users/nonexistent-id")
    assert resp.status_code == 404


def test_update_user_not_found(client):
    resp = client.put("/api/v1/users/nonexistent-id", json={"name": "X"})
    assert resp.status_code == 404


def test_delete_user_not_found(client):
    resp = client.delete("/api/v1/users/nonexistent-id")
    assert resp.status_code == 404


def test_delete_user_nullifies_task_assignee(client, default_user, default_column):
    # Assign task to user
    rt = client.post(
        "/api/v1/tasks",
        json={
            "title": "Assigned Task",
            "column_id": default_column["id"],
            "assignee_id": default_user["id"],
        },
    )
    assert rt.status_code == 201
    task_id = rt.json()["id"]

    # Delete user
    client.delete(f"/api/v1/users/{default_user['id']}")

    # Task should still exist but assignee_id nullified
    task_resp = client.get(f"/api/v1/tasks/{task_id}")
    assert task_resp.status_code == 200
    assert task_resp.json()["assignee_id"] is None
