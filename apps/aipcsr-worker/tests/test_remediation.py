"""Regression coverage for snapshot-bound remediation and real PR semantics."""

import base64
from datetime import datetime
import difflib
import json
import os
from pathlib import Path
from types import SimpleNamespace
import sys
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[3]
for path in ("apps/aipcsr-worker", "apps/aipcsr-api", "core/db-core", "core/ai-core"):
    sys.path.insert(0, str(ROOT / path))

from app.models.base import Base
from app.models.user import User
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.report import Report
from app.models.vulnerability import Vulnerability, PatchStatus
from patch_generator import apply_unified_diff, source_hash, validate_source
from tasks import patch_task, ai_analysis_task

SOURCE = "import subprocess\nsubprocess.run('echo hi', shell=True)\n"
UPDATED = "import subprocess\nsubprocess.run(['echo', 'hi'], check=True)\n"
DIFF = "".join(difflib.unified_diff(SOURCE.splitlines(True), UPDATED.splitlines(True), "a/test.py", "b/test.py"))


@pytest.fixture
def database(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    db = factory()
    db.add_all([
        User(id="user", email="a@example.com", hashed_password="hashed", github_token="ghp_testcredential"),
        Repository(id="repo", name="owner/repo", url="https://github.com/owner/repo", owner_id="user", default_branch="main"),
        Scan(id="scan", repository_id="repo", branch="main", commit_hash="a" * 40,
             status=ScanStatus.COMPLETED, stage="completed", created_at=datetime(2026, 1, 1)),
        Report(id="report", scan_id="scan", status="ready"),
        Vulnerability(id="vuln", report_id="report", file_path="test.py", line_number=2,
                      rule_id="B602", source_content=SOURCE, source_context=SOURCE,
                      ai_patch_code=json.dumps({
                          "analysis": "Avoid shell interpolation", "fix": DIFF, "status": "available",
                          "source_sha": "a" * 40, "source_hash": source_hash(SOURCE),
                      })),
    ])
    db.commit()
    db.close()
    import session
    monkeypatch.setattr(session, "SessionLocal", factory)
    monkeypatch.setattr(patch_task.apply_patch, "update_state", MagicMock())
    monkeypatch.setattr(ai_analysis_task.analyze_with_ai, "update_state", MagicMock())
    yield factory
    engine.dispose()


@pytest.mark.parametrize("malformed", [
    "- old\n+ new\n",
    DIFF.replace("a/test.py", "a/other.py"),
    DIFF.replace("@@ -1,2 +1,2 @@", "@@ -1,9 +1,2 @@"),
    DIFF.replace("import subprocess", "import wrong", 1),
    DIFF + "--- a/extra.py\n+++ b/extra.py\n@@ -0,0 +1 @@\n+x\n",
])
def test_malformed_or_wrong_context_diff_rejected(malformed):
    with pytest.raises(ValueError):
        apply_unified_diff(SOURCE, malformed, "test.py")


@pytest.mark.parametrize("path", ["../test.py", "/test.py", "dir/../test.py", ".git/config", "x\\test.py"])
def test_traversal_or_git_metadata_paths_rejected(path):
    with pytest.raises(ValueError):
        apply_unified_diff(SOURCE, DIFF, path)


def test_complete_multiline_diff_and_missing_newline_are_supported():
    original = "x = 1"
    replacement = "x = 2\n"
    patch = "--- a/test.py\n+++ b/test.py\n@@ -1 +1 @@\n-x = 1\n\\ No newline at end of file\n+x = 2\n"
    assert apply_unified_diff(original, patch, "test.py") == replacement
    assert apply_unified_diff(SOURCE, DIFF, "test.py") == UPDATED


def test_invalid_python_or_unsupported_language_not_published():
    with pytest.raises(ValueError, match="syntax"):
        validate_source("def broken(", "test.py")
    with pytest.raises(ValueError, match="Python"):
        validate_source("const x = 1", "test.ts")


def test_missing_token_fails_without_fabricated_pr(database, monkeypatch):
    with database() as db:
        db.get(User, "user").github_token = None
        db.commit()
    create_pr = MagicMock()
    monkeypatch.setattr(patch_task, "_draft_pr", create_pr)
    with pytest.raises(ValueError, match="GitHub integration token"):
        patch_task.apply_patch.run("vuln")
    with database() as db:
        vuln = db.get(Vulnerability, "vuln")
        assert vuln.patch_status == PatchStatus.FAILED
        assert "pr_url" not in json.loads(vuln.ai_patch_code)
    create_pr.assert_not_called()


def test_invalid_diff_never_reaches_github(database, monkeypatch):
    with database() as db:
        vuln = db.get(Vulnerability, "vuln")
        data = json.loads(vuln.ai_patch_code)
        data["fix"] = "some code"
        vuln.ai_patch_code = json.dumps(data)
        db.commit()
    create_pr = MagicMock()
    monkeypatch.setattr(patch_task, "_draft_pr", create_pr)
    with pytest.raises(ValueError, match="Unified diff"):
        patch_task.apply_patch.run("vuln")
    create_pr.assert_not_called()


def test_success_records_reviewable_pr_not_resolved(database, monkeypatch):
    rescan = MagicMock(return_value={"status": "passed", "checks": ["python_ast", "security_rescan"]})
    create_pr = MagicMock(return_value="https://github.com/owner/repo/pull/123")
    monkeypatch.setattr(patch_task, "_rescan_patch", rescan)
    monkeypatch.setattr(patch_task, "_draft_pr", create_pr)
    result = patch_task.apply_patch.run("vuln")
    assert result["status"] == "pr_opened"
    assert rescan.call_args.args[0] == UPDATED
    with database() as db:
        vuln = db.get(Vulnerability, "vuln")
        assert vuln.patch_status == PatchStatus.PR_OPENED
        assert json.loads(vuln.ai_patch_code)["pr_url"].endswith("/123")
    # A duplicate queue delivery is idempotent.
    assert patch_task.apply_patch.run("vuln")["pr_url"].endswith("/123")
    assert create_pr.call_count == 1


def test_failed_security_rescan_prevents_pr(database, monkeypatch):
    monkeypatch.setattr(patch_task, "_rescan_patch", MagicMock(side_effect=ValueError("Original security rule remains")))
    create_pr = MagicMock()
    monkeypatch.setattr(patch_task, "_draft_pr", create_pr)
    with pytest.raises(ValueError, match="security rule"):
        patch_task.apply_patch.run("vuln")
    create_pr.assert_not_called()


@pytest.mark.parametrize("scan_result, reason", [
    ({"status": "failed", "engines_results": {"bandit": {"status": "failed"}}}, "complete"),
    ({"status": "success", "engines_results": {"bandit": {"status": "skipped"}}}, "complete"),
    ({"status": "success", "engines_results": {"bandit": {"status": "success"}},
      "vulnerabilities": [{"rule_id": "B602", "line": 99}]}, "original security rule"),
])
def test_rescan_requires_coverage_and_removal_of_rule_even_when_line_moves(monkeypatch, scan_result, reason):
    import orchestrator
    scanner = MagicMock()
    scanner.scan.return_value = scan_result
    monkeypatch.setattr(orchestrator, "ScannerOrchestrator", lambda: scanner)
    with pytest.raises(ValueError, match=reason):
        patch_task._rescan_patch(UPDATED, "test.py", "B602")


def test_rescan_uses_only_patched_file_and_accepts_other_engines_skipped(monkeypatch):
    import orchestrator
    scanner = MagicMock()
    def inspect(directory):
        assert Path(directory, "src", "test.py").read_text() == UPDATED
        assert list(Path(directory).rglob("*")) == [Path(directory, "src"), Path(directory, "src", "test.py")]
        return {"status": "success", "engines_results": {
            "bandit": {"status": "success"}, "eslint": {"status": "skipped"}}, "vulnerabilities": []}
    scanner.scan.side_effect = inspect
    monkeypatch.setattr(orchestrator, "ScannerOrchestrator", lambda: scanner)
    result = patch_task._rescan_patch(UPDATED, "src/test.py", "B602")
    assert result["status"] == "passed"
    assert "security_rescan" in result["checks"]


def test_stale_branch_rejected_before_any_github_mutation():
    client = MagicMock()
    response = MagicMock(status_code=200)
    response.json.return_value = {"object": {"sha": "b" * 40}}
    client.request.return_value = response
    scan = SimpleNamespace(branch="main", commit_hash="a" * 40)
    vuln = SimpleNamespace(file_path="test.py")
    with pytest.raises(ValueError, match="changed since"):
        patch_task._draft_pr(client, "https://api.github.com/repos/owner/repo", "owner/repo", scan, vuln, UPDATED)
    assert [call.args[0] for call in client.request.call_args_list] == ["GET"]


def test_git_workflow_uses_scanned_parent_and_real_draft_response():
    scan = SimpleNamespace(branch="main", commit_hash="a" * 40, created_at=datetime(2026, 1, 1))
    vuln = SimpleNamespace(id="vuln", file_path="test.py", source_content=SOURCE, rule_id="B602")
    responses = [
        {"object": {"sha": "a" * 40}},
        {"type": "file", "encoding": "base64", "content": base64.b64encode(SOURCE.encode()).decode()},
        {"tree": {"sha": "tree"}},
        {"tree": [{"path": "test.py", "type": "blob", "mode": "100644", "sha": "oldblob"}]},
        {"sha": "blob"}, {"sha": "newtree"}, {"sha": "commit"},
        {}, {"object": {"sha": "a" * 40}}, [],
        {"html_url": "https://github.com/owner/repo/pull/123"},
    ]
    client = MagicMock()
    client.request.side_effect = [
        SimpleNamespace(status_code=201 if index in {4, 5, 6, 7, 10} else 200, json=lambda value=value: value)
        for index, value in enumerate(responses)
    ]
    assert patch_task._draft_pr(client, "https://api.github.com/repos/owner/repo", "owner/repo", scan, vuln, UPDATED).endswith("/123")
    commits = [call for call in client.request.call_args_list if call.args[1].endswith("/git/commits") and call.args[0] == "POST"]
    assert commits[0].kwargs["json"]["parents"] == ["a" * 40]
    pr_request = client.request.call_args_list[-1]
    assert pr_request.kwargs["json"]["draft"] is True
    assert all(call.kwargs["timeout"] == (5, 30) for call in client.request.call_args_list)


def test_no_key_analysis_is_explicit_and_completion_waits_for_report(database, monkeypatch):
    from app.config.settings import settings
    from tasks.report_task import generate_report
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    dispatch = MagicMock()
    monkeypatch.setattr(generate_report, "delay", dispatch)
    with database() as db:
        db.get(Report, "report").status = "pending"
        scan = db.get(Scan, "scan")
        scan.status = ScanStatus.SCANNING
        scan.stage = "scanning"
        db.commit()
    result = ai_analysis_task.analyze_with_ai.run("report", "scan")
    assert result["status"] == "awaiting_report"
    with database() as db:
        assert db.get(Scan, "scan").status == ScanStatus.SCANNING
        assert db.get(Scan, "scan").stage == "reporting"
        data = json.loads(db.get(Vulnerability, "vuln").ai_patch_code)
        assert data["status"] == "unavailable"
        assert data["fix"] == ""
    dispatch.assert_called_once_with("report")


def test_zero_ai_budget_preserves_findings_without_provider_calls(database, monkeypatch):
    from app.config.settings import settings
    from tasks.report_task import generate_report
    import providers.openai_provider as provider_module
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "fixture-key-never-sent")
    monkeypatch.setattr(settings, "MAX_AI_FINDINGS_PER_SCAN", 0)
    request = MagicMock()
    monkeypatch.setattr(provider_module.requests, "post", request)
    monkeypatch.setattr(generate_report, "delay", MagicMock())
    with database() as db:
        db.get(Report, "report").status = "pending"
        db.commit()
    ai_analysis_task.analyze_with_ai.run("report", "scan")
    request.assert_not_called()
    with database() as db:
        data = json.loads(db.get(Vulnerability, "vuln").ai_patch_code)
        assert data["status"] == "unavailable"
        assert data["fix"] == ""
        assert "budget" in data["error"]
