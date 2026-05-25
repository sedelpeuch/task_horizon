"""Tests for TaskHorizon API main module."""

import pytest
from fastapi.testclient import TestClient

from taskhorizon.main import app


@pytest.fixture
def client():
    """Provide a test client."""
    return TestClient(app)


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert response.json()["version"] == "0.1.0"
