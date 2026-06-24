import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Helper to mock auth
def override_get_current_user():
    return "test-user-id"

from app.dependencies.auth import get_current_user
app.dependency_overrides[get_current_user] = override_get_current_user

def test_get_report():
    scan_id = "test-scan-123"
    response = client.get(f"/api/report/{scan_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "report1"
    assert data["scan_id"] == scan_id
    assert "vulnerabilities_count" in data
    assert "severity" in data
    assert "created_at" in data
    assert "vulnerabilities" in data

def test_download_report():
    scan_id = "test-scan-123"
    response = client.post(f"/api/report/{scan_id}/download")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Report download started"
