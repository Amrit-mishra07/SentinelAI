import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Helper to mock auth
def override_get_current_user():
    return "test-user-id"

from app.dependencies.auth import get_current_user
app.dependency_overrides[get_current_user] = override_get_current_user

def test_create_scan():
    response = client.post("/api/scan/create", json={"repository": "https://github.com/test/repo"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["repository"] == "https://github.com/test/repo"
    assert data["status"] == "pending"

def test_list_scans():
    # First create a scan
    client.post("/api/scan/create", json={"repository": "https://github.com/test/repo2"})
    
    # Then list them
    response = client.get("/api/scan/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["repository"] in ["https://github.com/test/repo", "https://github.com/test/repo2"]

def test_get_scan_not_found():
    response = client.get("/api/scan/non-existent-id")
    assert response.status_code == 200
    assert response.json() == {"error": "Scan not found"}
