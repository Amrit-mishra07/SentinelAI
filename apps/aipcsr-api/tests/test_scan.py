import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.user import User
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings

client = TestClient(app)

engine = create_engine(settings.DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_current_user():
    return "test-user-id"

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    db = TestingSessionLocal()
    # clear all tables in reverse foreign key order to prevent IntegrityError
    from app.models.vulnerability import Vulnerability
    from app.models.report import Report
    db.query(Vulnerability).delete()
    db.query(Report).delete()
    db.query(Scan).delete()
    db.query(Repository).delete()
    db.query(User).delete()
    
    # insert
    user = User(id="test-user-id", email="test@test.com", hashed_password="pw")
    repo = Repository(id="repo-id", name="test-repo", url="https://github.com/test/repo", owner_id="test-user-id", default_branch="main")
    
    db.add(user)
    db.add(repo)
    db.commit()
    db.close()
    yield

from unittest.mock import patch

@patch("app.routers.scan.celery_client.send_task")
def test_create_scan(mock_send_task):
    response = client.post("/api/scan/create", json={"repository": "repo-id"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["repository"] == "repo-id"
    assert data["status"] == "pending"
    mock_send_task.assert_called_once()

@patch("app.routers.scan.celery_client.send_task")
def test_list_scans(mock_send_task):
    # First create a scan
    client.post("/api/scan/create", json={"repository": "repo-id"})
    
    # Then list them
    response = client.get("/api/scan/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["repository"] == "repo-id"

def test_get_scan_not_found():
    response = client.get("/api/scan/non-existent-id")
    assert response.status_code == 404
    assert response.json() == {"detail": "Scan not found"}

