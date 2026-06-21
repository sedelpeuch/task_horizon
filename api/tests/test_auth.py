"""Tests for JWT authentication."""

import pytest
from fastapi.testclient import TestClient

from taskhorizon.auth import get_current_user, hash_password, require_admin
from taskhorizon.main import app
from taskhorizon.models import User

from .conftest import TestingSessionLocal


@pytest.fixture
def raw_client(db):
    """TestClient without auth overrides — uses real JWT flow."""
    saved = {
        get_current_user: app.dependency_overrides.pop(get_current_user, None),
        require_admin: app.dependency_overrides.pop(require_admin, None),
    }
    with TestClient(app) as c:
        yield c
    for dep, override in saved.items():
        if override is not None:
            app.dependency_overrides[dep] = override
        else:
            app.dependency_overrides.pop(dep, None)


@pytest.fixture
def admin_in_db(db):
    """Insert a real admin user with password into the test DB."""
    session = TestingSessionLocal()
    try:
        user = User(
            id="admin-real-id",
            name="Admin",
            email="admin@example.com",
            password_hash=hash_password("secret"),
            is_admin=True,
        )
        session.add(user)
        session.commit()
    finally:
        session.close()


@pytest.fixture
def nonadmin_in_db(db):
    """Insert a non-admin user with password into the test DB."""
    session = TestingSessionLocal()
    try:
        user = User(
            id="user-real-id",
            name="Alice",
            email="alice@example.com",
            password_hash=hash_password("pass"),
            is_admin=False,
        )
        session.add(user)
        session.commit()
    finally:
        session.close()


def test_get_columns_public_no_token(raw_client):
    """GET is always public — no token needed."""
    resp = raw_client.get("/api/v1/columns")
    assert resp.status_code == 200


def test_login_valid_credentials(raw_client, admin_in_db):
    """Valid login → 200 with token and user info."""
    resp = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "secret"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["user"]["email"] == "admin@example.com"
    assert data["user"]["is_admin"] is True


def test_login_wrong_password(raw_client, admin_in_db):
    """Wrong password → 401."""
    resp = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "wrong"},
    )
    assert resp.status_code == 401


def test_login_unknown_email(raw_client):
    """Unknown email → 401."""
    resp = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "x"},
    )
    assert resp.status_code == 401


def test_post_column_no_token_returns_401(raw_client):
    """POST without Authorization header → 401."""
    resp = raw_client.post("/api/v1/columns", json={"name": "X", "color": "#fff"})
    assert resp.status_code == 401


def test_post_column_invalid_token_returns_401(raw_client):
    """POST with invalid JWT → 401."""
    resp = raw_client.post(
        "/api/v1/columns",
        json={"name": "X", "color": "#fff"},
        headers={"Authorization": "Bearer not-a-jwt"},
    )
    assert resp.status_code == 401


def test_admin_can_create_column(raw_client, admin_in_db):
    """Admin JWT → can create column."""
    login = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "secret"},
    )
    token = login.json()["token"]
    resp = raw_client.post(
        "/api/v1/columns",
        json={"name": "MyCol", "color": "#fff"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201


def test_nonadmin_cannot_create_column(raw_client, nonadmin_in_db):
    """Non-admin JWT → 403 on admin-only endpoint."""
    login = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "pass"},
    )
    token = login.json()["token"]
    resp = raw_client.post(
        "/api/v1/columns",
        json={"name": "Nope", "color": "#fff"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_get_me(raw_client, admin_in_db):
    """GET /auth/me returns current user info."""
    login = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "secret"},
    )
    token = login.json()["token"]
    resp = raw_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@example.com"


def test_nonadmin_can_update_own_task(raw_client, nonadmin_in_db):
    """Non-admin can update a task assigned to them."""
    # Need a column first — use admin override temporarily
    session = TestingSessionLocal()
    try:
        from taskhorizon.models import Column, Task

        col = Column(name="Todo", position=0)
        session.add(col)
        session.flush()
        task = Task(title="Mine", column_id=col.id, assignee_id="user-real-id", position=0)
        session.add(task)
        session.commit()
        task_id = task.id
    finally:
        session.close()

    login = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "pass"},
    )
    token = login.json()["token"]
    resp = raw_client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "Updated"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


def test_nonadmin_cannot_update_others_task(raw_client, nonadmin_in_db):
    """Non-admin cannot update a task assigned to someone else."""
    session = TestingSessionLocal()
    try:
        from taskhorizon.models import Column, Task

        col = Column(name="Todo2", position=0)
        session.add(col)
        session.flush()
        task = Task(title="Theirs", column_id=col.id, assignee_id="other-user-id", position=0)
        session.add(task)
        session.commit()
        task_id = task.id
    finally:
        session.close()

    login = raw_client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "pass"},
    )
    token = login.json()["token"]
    resp = raw_client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "Nope"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
