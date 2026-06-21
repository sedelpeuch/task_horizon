"""Test health endpoint."""

import pytest
from fastapi.testclient import TestClient

from taskhorizon.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_health(client):
    """Test health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "taskhorizon-api"}


def test_root(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Welcome to TaskHorizon API"
    assert "version" in data
