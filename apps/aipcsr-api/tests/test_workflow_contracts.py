"""Regression tests for truthful scans, ownership, credentials and draft PRs."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.settings import settings
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.main import app
from app.models.base import Base
from app.models.report import Report, SeverityLevel
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.user import User
from app.models.vulnerability import Vulnerability, PatchStatus
from app.security.secrets import get_secret


@pytest.fixture()
def workflow(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    db = factory()
    db.add_all([
        User(id="owner", email="owner@example.com", hashed_password="unused", github_token="legacy-token"),
        User(id="other", email="other@example.com", hashed_password="unused"),
        Repository(id="repo", name="fixture", url="https://github.com/example/fixture", owner_id="owner", default_branch="develop"),
        Repository(id="private", name="other", url="https://github.com/example/other", owner_id="other"),
    ])
    db.commit()
    overrides = app.dependency_overrides.copy()

    def session_override():
        yield db

    app.dependency_overrides[get_db] = session_override
    app.dependency_overrides[get_current_user] = lambda: "owner"
    monkeypatch.setattr(settings, "REPORTS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "SECRETS_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setattr(app.state.limiter, "enabled", False)
    yield TestClient(app), db
    app.dependency_overrides.clear()
    app.dependency_overrides.update(overrides)
    db.close()
    engine.dispose()


def finding(db, **updates):
    scan = Scan(id="scan", repository_id="repo", branch="develop", status=ScanStatus.COMPLETED,
                commit_hash="a" * 40, stage="completed")
    report = Report(id="report", scan_id="scan", status="pending", vulnerabilities_count=1)
    vuln = Vulnerability(id="finding", report_id="report", rule_id="B101", message="Finding",
                         file_path="fixture.py", line_number=1, severity=SeverityLevel.HIGH,
                         source_content="assert True\n", ai_patch_code=json.dumps({
                             "fix": "pass\n", "status": "available", "provider": "openai",
                             "source_sha": "a" * 40,
                             "validation": {"status": "not_run", "checks": []},
                         }), patch_status=PatchStatus.PENDING)
    for key, value in updates.items():
        setattr(vuln, key, value)
    db.add_all([scan, report, vuln])
    db.commit()
    return scan, report, vuln


@pytest.mark.parametrize("url", [
    "file:///tmp/repo", "http://github.com/owner/repo", "https://github.com.evil/owner/repo",
    "https://user:secret@github.com/owner/repo", "https://github.com/owner/repo/tree/main",
    "https://github.com/owner/repo?x=1", "https://github.com/owner/%2e%2e",
])
def test_rejects_unsafe_clone_urls(workflow, url):
    client, _ = workflow
    assert client.post("/api/repository/connect", json={"url": url}).status_code == 422


@pytest.mark.parametrize("branch", ["-option", "a..b", "a b", "a.lock", "a@{b", "a//b", "x\\y"])
def test_rejects_invalid_git_refs(workflow, branch):
    client, _ = workflow
    assert client.post("/api/scan/create", json={"repository": "repo", "branch": branch}).status_code == 422


def test_connect_normalizes_and_deduplicates(workflow):
    client, _ = workflow
    first = client.post("/api/repository/connect", json={"url": "https://github.com/example/new.git/", "branch": "release/v1"})
    second = client.post("/api/repository/connect", json={"url": "https://github.com/example/new"})
    assert first.status_code == 200
    assert first.json()["url"] == "https://github.com/example/new"
    assert first.json()["default_branch"] == "release/v1"
    assert second.json()["id"] == first.json()["id"]


def test_scan_tracks_branch_and_returns_contract(workflow):
    client, _ = workflow
    with patch("app.routers.scan.celery_client.send_task") as dispatch:
        response = client.post("/api/scan/create", json={"repository": "repo", "branch": "release/v1"})
    data = response.json()
    assert response.status_code == 200
    assert data["branch"] == "release/v1"
    assert data["repository_id"] == data["repository"] == "repo"
    assert data["stage"] == "pending"
    assert data["commit_hash"] is None
    dispatch.assert_called_once()
    assert client.get(f"/api/scan/{data['id']}").json()["branch"] == "release/v1"


def test_scan_queue_failure_is_persisted(workflow):
    client, db = workflow
    with patch("app.routers.scan.celery_client.send_task", side_effect=RuntimeError("credentials must not leak")):
        response = client.post("/api/scan/create", json={"repository": "repo"})
    assert response.status_code == 503
    scan = db.query(Scan).one()
    assert scan.status == ScanStatus.FAILED
    assert scan.stage == "failed"
    assert scan.completed_at is not None
    assert "credentials" not in response.text


def test_scan_cannot_access_another_owners_repository(workflow):
    client, _ = workflow
    assert client.post("/api/scan/create", json={"repository": "private"}).status_code == 404


def test_pdf_readiness_matches_artifact_state(workflow):
    client, db = workflow
    _, report, _ = finding(db)
    data = client.get("/api/report/scan").json()
    assert data["status"] == "pending" and data["pdf_ready"] is False
    assert client.get("/api/report/scan/download").status_code == 409
    report.status = "ready"
    Path(settings.REPORTS_DIR, "report_report.pdf").write_bytes(b"%PDF-1.4\nfixture")
    db.commit()
    assert client.get("/api/report/scan").json()["pdf_ready"] is True
    assert client.get("/api/report/scan/download").status_code == 200


def test_report_counts_and_provenance_are_consistent(workflow):
    client, db = workflow
    finding(db)
    data = client.get("/api/report/scan?limit=1").json()
    assert data["severity_counts"]["high"] == 1
    assert data["pagination"] == {"total": 1, "skip": 0, "limit": 1}
    assert data["vulnerabilities"][0]["ai_provider"] == "openai"
    assert client.get("/api/scan/scan").json()["severity"] == "high"
    assert client.get("/api/dashboard/metrics").json()["severity_distribution"]["high"] == 1


def test_patch_requires_credentials_and_never_simulates_pr(workflow):
    client, db = workflow
    finding(db)
    db.get(User, "owner").github_token = None
    db.commit()
    with patch("app.routers.report.celery_client.send_task") as dispatch:
        response = client.post("/api/report/vulnerability/finding/patch")
    assert response.status_code == 400
    dispatch.assert_not_called()
    assert db.get(Vulnerability, "finding").patch_status == PatchStatus.PENDING


def test_patch_claim_prevents_duplicate_queueing(workflow):
    client, db = workflow
    finding(db)
    with patch("app.routers.report.celery_client.send_task") as dispatch:
        assert client.post("/api/report/vulnerability/finding/patch").status_code == 200
        assert client.post("/api/report/vulnerability/finding/patch").status_code == 409
    dispatch.assert_called_once()
    db.expire_all()
    assert db.get(Vulnerability, "finding").patch_status == PatchStatus.VALIDATING


def test_patch_rejects_stale_source(workflow):
    client, db = workflow
    scan, _, _ = finding(db)
    scan.commit_hash = "b" * 40
    db.commit()
    assert client.post("/api/report/vulnerability/finding/patch").status_code == 409


def test_credentials_encrypted_and_revocable(workflow):
    client, db = workflow
    secret = "github_pat_test_token"
    response = client.put("/api/auth/integrations", json={"github_token": secret})
    assert response.status_code == 200 and secret not in response.text
    user = db.get(User, "owner")
    assert user.github_token.startswith("enc:v1:")
    assert secret not in user.github_token
    assert get_secret(user.github_token) == secret
    assert client.put("/api/auth/integrations", json={"github_token": ""}).json()["has_github_token"] is False


def test_credential_save_fails_without_encryption_key(workflow, monkeypatch):
    client, _ = workflow
    monkeypatch.setattr(settings, "SECRETS_ENCRYPTION_KEY", "")
    response = client.put("/api/auth/integrations", json={"openai_api_key": "secret"})
    assert response.status_code == 503
    assert "encryption" in response.json()["detail"]


def test_other_owner_cannot_read_findings_or_download(workflow):
    client, db = workflow
    finding(db)
    app.dependency_overrides[get_current_user] = lambda: "other"
    assert client.get("/api/report/scan").status_code == 404
    assert client.get("/api/report/scan/download").status_code == 404
    assert client.post("/api/report/vulnerability/finding/patch").status_code == 404
