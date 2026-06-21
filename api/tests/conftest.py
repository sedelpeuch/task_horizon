"""Shared test fixtures for TaskHorizon API tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import taskhorizon.db as db_module
import taskhorizon.main as main_module
from taskhorizon.db import get_db
from taskhorizon.main import app
from taskhorizon.models import Base

# SQLite in-memory engine for tests
TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Patch db module globals so init_db() uses test engine instead of postgres
db_module.engine = engine
db_module.SessionLocal = TestingSessionLocal


def _test_init_db():
    """Lightweight init_db for SQLite: just create tables, skip ALTER TABLE migrations."""
    Base.metadata.create_all(bind=engine)


# Replace init_db with SQLite-safe version before lifespan runs
# Patch both the db module and main module's bound reference
db_module.init_db = _test_init_db
main_module.init_db = _test_init_db


def override_get_db():
    """Override DB dependency with SQLite in-memory session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Set override at import time so lifespan startup uses the test engine
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    """TestClient with overridden DB dependency."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def default_column(client):
    """Seed a single column, return response JSON."""
    resp = client.post("/api/v1/columns", json={"name": "Backlog", "color": "#3b82f6"})
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def default_task(client, default_column):
    """Seed a task in default_column, return response JSON."""
    resp = client.post(
        "/api/v1/tasks",
        json={"title": "Test Task", "column_id": default_column["id"]},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def default_label(client):
    """Seed a label, return response JSON."""
    resp = client.post("/api/v1/labels", json={"name": "bug", "color": "#ef4444"})
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def default_user(client):
    """Seed a user, return response JSON."""
    resp = client.post(
        "/api/v1/users",
        json={"name": "Alice", "email": "alice@example.com"},
    )
    assert resp.status_code == 201
    return resp.json()
