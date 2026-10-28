"""Pipeline integration using real fixture Git, scanners, database and PDF output."""
from datetime import datetime
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[3]
for path in ("apps/aipcsr-worker", "apps/aipcsr-api", "core/db-core", "core/scanner-core"):
    sys.path.insert(0, str(ROOT / path))
from app.models.base import Base
from app.models.user import User
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.report import Report
from app.models.vulnerability import Vulnerability
from tasks import scan_task, ai_analysis_task, report_task


@pytest.fixture
def pipeline(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        db.add_all([User(id="owner", email="owner@example.com", hashed_password="hash"),
                    Repository(id="repo", name="owner/repo", url="https://github.com/owner/repo",
                               owner_id="owner", default_branch="release"),
                    Scan(id="scan", repository_id="repo", branch="release", status=ScanStatus.PENDING, stage="pending")])
        db.commit()
    import session
    import repo_cloner
    import orchestrator
    from engines.bandit_engine import BanditEngine
    from app.config.settings import settings
    monkeypatch.setattr(session, "SessionLocal", factory)
    monkeypatch.setattr(settings, "REPORTS_DIR", str(tmp_path / "reports"))
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setenv("SCANNER_SANDBOX", "process")
    for task in (scan_task.scan_repository, ai_analysis_task.analyze_with_ai, report_task.generate_report):
        monkeypatch.setattr(task, "update_state", MagicMock())
    original = tmp_path / "fixture"
    original.mkdir()
    (original / "vuln.py").write_text("password = 'a_secret_password'\n")
    subprocess.run(["git", "init", "-b", "release", str(original)], check=True, capture_output=True)
    subprocess.run(["git", "-C", str(original), "add", "."], check=True)
    subprocess.run(["git", "-C", str(original), "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com",
                    "commit", "-m", "Fixture"], check=True, capture_output=True)
    instances = []
    class FixtureCloner(repo_cloner.RepoCloner):
        def clone(self, url, branch="main", token=None):
            assert url == "https://github.com/owner/repo"
            assert branch == "release"
            checkout = tmp_path / "checkout"
            subprocess.run(["git", "clone", "--branch", branch, str(original), str(checkout)], check=True, capture_output=True)
            self.temp_dirs.append(str(checkout))
            instances.append(self)
            return str(checkout)
    monkeypatch.setattr(repo_cloner, "RepoCloner", FixtureCloner)
    real_scanner = orchestrator.ScannerOrchestrator
    def scanner():
        instance = real_scanner()
        instance.engines = [BanditEngine()]
        return instance
    monkeypatch.setattr(orchestrator, "ScannerOrchestrator", scanner)
    monkeypatch.setattr(ai_analysis_task.analyze_with_ai, "delay", ai_analysis_task.analyze_with_ai.run)
    monkeypatch.setattr(report_task.generate_report, "delay", report_task.generate_report.run)
    yield factory, tmp_path, instances
    engine.dispose()


def test_real_fixture_scan_ai_unavailable_and_pdf_complete(pipeline):
    factory, directory, instances = pipeline
    result = scan_task.scan_repository.run("scan", "https://github.com/owner/repo")
    assert result["vulnerabilities_found"] >= 1
    with factory() as db:
        scan = db.get(Scan, "scan")
        assert scan.status == ScanStatus.COMPLETED
        assert scan.stage == "completed"
        assert scan.branch == "release"
        assert len(scan.commit_hash) == 40
        assert scan.engine_results["bandit"]["status"] == "success"
        report = db.query(Report).one()
        assert report.status == "ready"
        assert report.vulnerabilities_count == db.query(Vulnerability).count()
        finding = db.query(Vulnerability).first()
        assert finding.rule_id == "B105"
        assert finding.file_path == "vuln.py"
        assert finding.severity.value == "low"
        assert finding.source_content.startswith("password")
        assert json.loads(finding.ai_patch_code)["status"] == "unavailable"
        assert (directory / "reports" / f"report_{report.id}.pdf").read_bytes().startswith(b"%PDF")
    assert not (directory / "checkout").exists()
    assert instances[0].temp_dirs == []


def test_failed_clone_never_scans_demo_files(pipeline, monkeypatch):
    factory, directory, _ = pipeline
    import repo_cloner
    monkeypatch.setattr(repo_cloner.RepoCloner, "clone", MagicMock(side_effect=RuntimeError("clone denied")))
    with pytest.raises(RuntimeError, match="clone denied"):
        scan_task.scan_repository.run("scan", "https://github.com/owner/repo")
    with factory() as db:
        assert db.get(Scan, "scan").status == ScanStatus.FAILED
        assert db.query(Report).count() == 0
        assert db.query(Vulnerability).count() == 0


def test_engine_error_preserved_and_checkout_cleaned(pipeline, monkeypatch):
    factory, directory, _ = pipeline
    import orchestrator
    scanner = MagicMock()
    scanner.scan.return_value = {"status": "failed", "failures": ["bandit: timeout"], "vulnerabilities": [],
                                 "engines_results": {"bandit": {"status": "failed", "error": "timeout"}}}
    monkeypatch.setattr(orchestrator, "ScannerOrchestrator", lambda: scanner)
    with pytest.raises(RuntimeError, match="timeout"):
        scan_task.scan_repository.run("scan", "https://github.com/owner/repo")
    with factory() as db:
        scan = db.get(Scan, "scan")
        assert scan.status == ScanStatus.FAILED
        assert scan.engine_results["bandit"]["error"] == "timeout"
        assert db.query(Report).count() == 0
    assert not (directory / "checkout").exists()


def test_pdf_failure_marks_scan_failed_and_no_ready_artifact(pipeline, monkeypatch):
    factory, directory, _ = pipeline
    from xhtml2pdf import pisa
    monkeypatch.setattr(pisa, "CreatePDF", lambda *args, **kwargs: SimpleNamespace(err=1))
    with pytest.raises(RuntimeError, match="PDF rendering failed"):
        scan_task.scan_repository.run("scan", "https://github.com/owner/repo")
    with factory() as db:
        assert db.get(Scan, "scan").status == ScanStatus.FAILED
        assert db.query(Report).one().status == "failed"
    assert list((directory / "reports").glob("*")) == []


def test_pdf_template_escapes_untrusted_markup():
    finding = SimpleNamespace(severity="high", rule_id="<script>", file_path="x.py",
                              line_number=1, message='<img src="http://127.0.0.1/secrets">',
                              ai_patch_code=json.dumps({"analysis": "<script>alert(1)</script>"}))
    html = report_task.render_report(SimpleNamespace(branch="main", commit_hash="abc"),
                                    SimpleNamespace(name="<b>unsafe</b>"), [finding])
    assert '<img src=' not in html
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


def test_outside_source_and_secret_files_never_captured(tmp_path):
    root = tmp_path / "repo"
    root.mkdir()
    outside = tmp_path / "secret"
    outside.write_text("private")
    (root / "link.py").symlink_to(outside)
    with pytest.raises(ValueError):
        scan_task._source_path(root, str(outside))
    with pytest.raises(ValueError):
        scan_task._source_path(root, "link.py")
    env = root / ".env"
    env.write_text("TOKEN=secret")
    assert scan_task._read_source(env) == (None, None)


def test_webhook_commit_cannot_scan_a_moved_branch(pipeline):
    factory, directory, _ = pipeline
    with factory() as db:
        db.get(Scan, "scan").requested_commit = "b" * 40
        db.commit()
    with pytest.raises(ValueError, match="branch changed"):
        scan_task.scan_repository.run("scan", "https://github.com/owner/repo")
    with factory() as db:
        assert db.get(Scan, "scan").status == ScanStatus.FAILED
        assert db.query(Report).count() == 0
    assert not (directory / "checkout").exists()


def test_report_completion_persists_notification_before_dispatch(pipeline, monkeypatch):
    from app.models.notification import NotificationPreference, NotificationOutbox
    from tasks.notification_task import send_notification
    factory, _, _ = pipeline
    with factory() as db:
        db.add(NotificationPreference(user_id="owner", email_enabled=True))
        db.commit()
    dispatch = MagicMock(side_effect=RuntimeError("broker interrupted"))
    monkeypatch.setattr(send_notification, "delay", dispatch)
    scan_task.scan_repository.run("scan", "https://github.com/owner/repo")
    with factory() as db:
        assert db.get(Scan, "scan").status == ScanStatus.COMPLETED
        assert db.query(Report).one().status == "ready"
        assert db.query(NotificationOutbox).one().status == "pending"
    dispatch.assert_called_once()
