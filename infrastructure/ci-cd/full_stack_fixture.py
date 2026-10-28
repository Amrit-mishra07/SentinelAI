"""Disposable full-stack fixture: real Git, PostgreSQL, private scanners, Redis and PDF.

Run only in the dedicated test stack, with no configured AI or SMTP credentials.
This fixture override is confined to this test process; production clone behavior is unchanged.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import uuid
import requests

assert os.getenv("SENTINEL_FIXTURE_TEST") == "1", "Explicit test opt-in is required"
assert not os.getenv("OPENAI_API_KEY") and not os.getenv("SMTP_HOST")
from celery_app import celery_app
from session import SessionLocal
from app.models.user import User
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from repo_cloner import RepoCloner
from tasks.scan_task import scan_repository

api = requests.Session()
base = "http://api:8000/api"
credentials = {"email": "review-fixture@example.com", "password": "Sentinel-Review-Fixture-Only!2026"}
registered = api.post(base + "/auth/register", json=credentials, timeout=15)
assert registered.status_code in {200, 400}
logged_in = api.post(base + "/auth/login", json=credentials, timeout=15)
logged_in.raise_for_status()
api.headers["Authorization"] = "Bearer " + logged_in.json()["access_token"]
owner = logged_in.json()["user"]["id"]

with tempfile.TemporaryDirectory(prefix="controlled_git_fixture_") as original:
    Path(original, "probe.py").write_text("password = 'fixture_password'\neval(input())\n")
    Path(original, "probe.js").write_text("eval(userInput);\n")
    subprocess.run(["git", "init", "-b", "fixture", original], check=True, capture_output=True)
    subprocess.run(["git", "-C", original, "add", "."], check=True)
    subprocess.run(["git", "-C", original, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com",
                    "commit", "-m", "Controlled scanner fixture"], check=True, capture_output=True)
    scan_id = str(uuid.uuid4())
    with SessionLocal() as db:
        assert not db.get(User, owner).openai_api_key
        repository = Repository(id=str(uuid.uuid4()), owner_id=owner, name="Controlled local Git fixture",
            url="https://github.com/example/controlled-fixture", default_branch="fixture")
        db.add(repository)
        db.add(Scan(id=scan_id, repository_id=repository.id, branch="fixture", status=ScanStatus.PENDING, stage="pending"))
        db.commit()
    def clone_fixture(self, url, branch="fixture", token=None):
        assert url == "https://github.com/example/controlled-fixture"
        checkout = tempfile.mkdtemp(prefix="fixture_checkout_")
        self.temp_dirs.append(checkout)
        subprocess.run(["git", "clone", "--branch", branch, original, checkout], check=True, capture_output=True)
        return checkout
    RepoCloner.clone = clone_fixture
    # Direct fixture execution has no Celery request ID; all following jobs use real Redis.
    scan_repository.update_state = lambda **kwargs: None
    result = scan_repository.run(scan_id, "https://github.com/example/controlled-fixture")
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        response = api.get(base + "/scan/" + scan_id, timeout=10)
        response.raise_for_status()
        scan = response.json()
        if scan["status"] in {"completed", "failed"}:
            break
        time.sleep(1)
    assert scan["status"] == "completed", scan.get("error_message")
    report = api.get(base + "/report/" + scan_id, timeout=10).json()
    assert report["status"] == "ready" and report["pdf_ready"]
    document = api.get(base + "/report/" + scan_id + "/download", timeout=10)
    document.raise_for_status()
    assert document.content.startswith(b"%PDF")
    assert all(outcome["status"] == "success" for outcome in scan["engine_results"].values())
    print(json.dumps({"scan_id": scan_id, "status": scan["status"], "commit_hash": scan["commit_hash"],
                      "engines": {name: outcome["status"] for name, outcome in scan["engine_results"].items()},
                      "findings": report["vulnerabilities_count"], "pdf_bytes": len(document.content),
                      "ai_status": list({v.get("ai_status") for v in report["vulnerabilities"]})}), flush=True)
