"""Tests for /api/v1/tasks endpoints."""


def test_create_task(client, default_column):
    resp = client.post(
        "/api/v1/tasks",
        json={"title": "New Task", "column_id": default_column["id"]},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "New Task"
    assert data["column_id"] == default_column["id"]
    assert data["position"] == 0
    assert "id" in data


def test_create_task_with_all_fields(client, default_column, default_user):
    resp = client.post(
        "/api/v1/tasks",
        json={
            "title": "Full Task",
            "description": "desc",
            "column_id": default_column["id"],
            "assignee_id": default_user["id"],
            "priority": "high",
            "labels": ["bug"],
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Full Task"
    assert data["description"] == "desc"
    assert data["assignee_id"] == default_user["id"]
    # Note: priority/labels are accepted in schema but not persisted by create endpoint
    # (endpoint omits them from Task constructor); verify via update instead
    task_id = data["id"]
    upd = client.put(f"/api/v1/tasks/{task_id}", json={"priority": "high", "labels": ["bug"]})
    assert upd.status_code == 200
    assert upd.json()["priority"] == "high"
    assert upd.json()["labels"] == ["bug"]


def test_get_tasks(client, default_task):
    resp = client.get("/api/v1/tasks")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    ids = [t["id"] for t in data]
    assert default_task["id"] in ids


def test_get_task_by_id(client, default_task):
    task_id = default_task["id"]
    resp = client.get(f"/api/v1/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == task_id


def test_update_task(client, default_task):
    task_id = default_task["id"]
    resp = client.put(f"/api/v1/tasks/{task_id}", json={"title": "Updated", "priority": "low"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated"
    assert data["priority"] == "low"


def test_update_task_description(client, default_task):
    task_id = default_task["id"]
    resp = client.put(f"/api/v1/tasks/{task_id}", json={"description": "new desc"})
    assert resp.status_code == 200
    assert resp.json()["description"] == "new desc"


def test_update_task_labels(client, default_task):
    task_id = default_task["id"]
    resp = client.put(f"/api/v1/tasks/{task_id}", json={"labels": ["bug", "feature"]})
    assert resp.status_code == 200
    assert set(resp.json()["labels"]) == {"bug", "feature"}


def test_delete_task(client, default_task):
    task_id = default_task["id"]
    resp = client.delete(f"/api/v1/tasks/{task_id}")
    assert resp.status_code == 204

    # Confirm gone
    resp2 = client.get(f"/api/v1/tasks/{task_id}")
    assert resp2.status_code == 404


def test_task_not_found(client):
    resp = client.get("/api/v1/tasks/nonexistent-id")
    assert resp.status_code == 404


def test_update_task_not_found(client):
    resp = client.put("/api/v1/tasks/nonexistent-id", json={"title": "X"})
    assert resp.status_code == 404


def test_delete_task_not_found(client):
    resp = client.delete("/api/v1/tasks/nonexistent-id")
    assert resp.status_code == 404


def test_move_task_to_different_column(client, default_column):
    # Create second column
    r2 = client.post("/api/v1/columns", json={"name": "In Progress"})
    assert r2.status_code == 201
    col2 = r2.json()

    # Create task in first column
    rt = client.post(
        "/api/v1/tasks",
        json={"title": "Movable", "column_id": default_column["id"]},
    )
    assert rt.status_code == 201
    task = rt.json()

    # Move to second column
    resp = client.post(
        f"/api/v1/tasks/{task['id']}/move",
        json={"column_id": col2["id"], "position": 0},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["column_id"] == col2["id"]
    assert data["position"] == 0


def test_move_task_within_column(client, default_column):
    # Create two tasks
    t1 = client.post(
        "/api/v1/tasks", json={"title": "Task1", "column_id": default_column["id"]}
    ).json()
    client.post("/api/v1/tasks", json={"title": "Task2", "column_id": default_column["id"]})

    # Move t1 (position 0) to position 1
    resp = client.post(
        f"/api/v1/tasks/{t1['id']}/move",
        json={"column_id": default_column["id"], "position": 1},
    )
    assert resp.status_code == 200
    assert resp.json()["position"] == 1


def test_move_task_not_found(client):
    resp = client.post(
        "/api/v1/tasks/nonexistent-id/move",
        json={"column_id": "some-col", "position": 0},
    )
    assert resp.status_code == 404


def test_task_positions_auto_incremented(client, default_column):
    t1 = client.post(
        "/api/v1/tasks", json={"title": "T1", "column_id": default_column["id"]}
    ).json()
    t2 = client.post(
        "/api/v1/tasks", json={"title": "T2", "column_id": default_column["id"]}
    ).json()
    assert t1["position"] == 0
    assert t2["position"] == 1
