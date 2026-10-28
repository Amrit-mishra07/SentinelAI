"""Repository-to-findings pipeline. Failed scans never substitute demonstration data."""
import os
from pathlib import Path
import sys
import uuid
from datetime import datetime

base_dir = Path(__file__).resolve().parents[3]
for relative in ("apps/aipcsr-api", "core/db-core", "core/scanner-core"):
    sys.path.insert(0, str(base_dir / relative))

from celery import shared_task


def _source_path(root: Path, raw: str) -> Path:
    if raw.startswith("/scan/"):
        raw = raw[len("/scan/"):]
    candidate = Path(raw)
    if not candidate.is_absolute():
        candidate = root / candidate
    if candidate.is_symlink():
        raise ValueError("Scanner returned a symlink")
    resolved = candidate.resolve()
    resolved.relative_to(root.resolve())
    return resolved


def _read_source(path: Path) -> tuple[str | None, str | None]:
    if path.name.startswith(".env") or path.suffix in {".pem", ".key", ".p12", ".pfx"}:
        return None, None
    if not path.is_file() or path.stat().st_size > 128 * 1024:
        return None, None
    try:
        content = path.read_bytes().decode("utf-8")
        if "\x00" in content:
            return None, None
        return content, content
    except (OSError, UnicodeError):
        return None, None


@shared_task(bind=True)
def scan_repository(self, scan_id: str, repository_url: str):
    from session import SessionLocal
    from app.models.scan import Scan, ScanStatus
    from app.models.report import Report, SeverityLevel
    from app.models.repository import Repository
    from app.models.vulnerability import Vulnerability
    from app.models.user import User
    from app.services.github_credentials import get_github_token
    from orchestrator import ScannerOrchestrator
    from repo_cloner import RepoCloner
    from tasks.ai_analysis_task import analyze_with_ai

    db = SessionLocal()
    cloner = RepoCloner()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise ValueError("Scan not found")
        claimed = db.query(Scan).filter(Scan.id == scan_id, Scan.status == ScanStatus.PENDING).update(
            {Scan.status: ScanStatus.SCANNING, Scan.stage: "cloning", Scan.started_at: datetime.utcnow()},
            synchronize_session=False)
        db.commit()
        if not claimed:
            return {"scan_id": scan_id, "status": "already_started"}
        db.refresh(scan)
        repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()
        if not repo or repo.url != repository_url:
            raise ValueError("Scan repository does not match the saved repository")
        user = db.query(User).filter(User.id == repo.owner_id).first()
        token = get_github_token(user, db) if user and user.github_token else None
        self.update_state(state="PROGRESS", meta={"status": "cloning"})
        directory = cloner.clone(repo.url, scan.branch, token)
        scan.commit_hash = cloner.commit_hash(directory)
        if getattr(scan, "requested_commit", None) and scan.commit_hash != scan.requested_commit:
            raise ValueError("Repository branch changed after the GitHub event; scan the current commit again")
        scan.stage = "scanning"
        db.commit()
        self.update_state(state="PROGRESS", meta={"status": "scanning"})
        results = ScannerOrchestrator().scan(directory)
        scan.engine_results = {
            name: {k: v for k, v in outcome.items() if k != "vulnerabilities"}
            for name, outcome in results["engines_results"].items()
        }
        db.commit()
        if results.get("status") != "success":
            raise RuntimeError("; ".join(results.get("failures", ["Scanner execution failed"]))[:2000])

        root = Path(directory).resolve()
        findings = []
        seen = set()
        for finding in results["vulnerabilities"]:
            path = _source_path(root, finding["file"])
            relative = path.relative_to(root).as_posix()
            severity = finding.get("severity", "low").lower()
            if severity not in {"critical", "high", "medium", "low"}:
                severity = "low"
            rule_id = finding.get("rule_id") or finding.get("engine", "unknown")
            key = (relative, finding.get("line"), rule_id, finding.get("engine"))
            if key in seen:
                continue
            seen.add(key)
            findings.append((finding, path, relative, severity, rule_id))
        rank = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        highest = max((f[3] for f in findings), key=lambda value: rank[value], default=None)
        report = Report(id=str(uuid.uuid4()), scan_id=scan_id, vulnerabilities_count=len(findings),
                        severity=SeverityLevel(highest) if highest else None, status="pending")
        db.add(report)
        for finding, path, relative, severity, rule_id in findings:
            content, context = _read_source(path)
            db.add(Vulnerability(id=str(uuid.uuid4()), report_id=report.id, rule_id=rule_id,
                                 message=finding.get("issue", "Security finding"), file_path=relative,
                                 line_number=finding.get("line"), severity=SeverityLevel(severity),
                                 source_content=content, source_context=context))
        repo.last_scan_at = datetime.utcnow()
        repo.last_scan_severity = highest
        scan.stage = "analyzing"
        db.commit()
        analyze_with_ai.delay(report.id, scan_id)
        return {"scan_id": scan_id, "status": "scanning_complete_awaiting_ai",
                "report_id": report.id, "vulnerabilities_found": len(findings)}
    except Exception as error:
        db.rollback()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = ScanStatus.FAILED
            scan.stage = "failed"
            scan.completed_at = datetime.utcnow()
            scan.error_message = str(error)[:2000]
            report = db.query(Report).filter(Report.scan_id == scan_id).first()
            if report and report.status != "ready":
                report.status = "failed"
                report.error_message = "Scan pipeline failed before report completion"
            db.commit()
        raise
    finally:
        cloner.cleanup_all()
        db.close()
