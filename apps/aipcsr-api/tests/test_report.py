import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.user import User
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.report import Report, SeverityLevel
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
    db.query(Vulnerability).delete()
    db.query(Report).delete()
    db.query(Scan).delete()
    db.query(Repository).delete()
    db.query(User).delete()
    
    # insert
    user = User(id="test-user-id", email="test@test.com", hashed_password="pw")
    repo = Repository(id="repo-id", name="test-repo", url="https://github.com/test/repo", owner_id="test-user-id")
    scan = Scan(id="test-scan-123", repository_id="repo-id", status=ScanStatus.COMPLETED)
    report = Report(id="report1", scan_id="test-scan-123", vulnerabilities_count=0, severity=SeverityLevel.LOW)
    
    db.add(user)
    db.add(repo)
    db.add(scan)
    db.add(report)
    db.commit()
    db.close()
    yield

def test_get_report():
    scan_id = "test-scan-123"
    response = client.get(f"/api/report/{scan_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "report1"
    assert data["scan_id"] == scan_id
    assert "vulnerabilities_count" in data
    assert data["severity"] == "low"
    assert "created_at" in data
    assert "vulnerabilities" in data

def test_download_report():
    scan_id = "test-scan-123"
    response = client.post(f"/api/report/{scan_id}/download")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Report download started"
