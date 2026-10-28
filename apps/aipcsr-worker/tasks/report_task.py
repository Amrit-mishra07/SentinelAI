"""Atomic PDF generation; the scan completes only after the artifact is ready."""
import ast
from datetime import datetime
from html import escape
import json
import os
from pathlib import Path
import sys
import tempfile

base_dir = Path(__file__).resolve().parents[3]
for relative in ("apps/aipcsr-api", "core/db-core"):
    sys.path.insert(0, str(base_dir / relative))
from celery import shared_task


def _analysis(value: str | None) -> dict:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except (ValueError, TypeError):
        try:
            parsed = ast.literal_eval(value)
        except (ValueError, SyntaxError):
            return {}
    return parsed if isinstance(parsed, dict) else {}


def render_report(scan, repo, findings: list) -> str:
    """Escape every repository/AI value; no external resources are accepted."""
    def text(value):
        return escape(str(value if value is not None else "—"))
    parts = ['<html><head><style>body{font-family:Helvetica;font-size:11px}pre{white-space:pre-wrap;font-size:9px}h2{margin-top:20px}</style></head><body>',
             '<h1>SentinelAI security assessment</h1>',
             f'<p>Repository: {text(repo.name)}<br/>Branch: {text(scan.branch)}<br/>Commit: {text(scan.commit_hash)}</p>',
             f'<p>Total findings: {len(findings)}. This assessment covers the configured scanner rules only.</p>']
    if not findings:
        parts.append('<p>No findings were detected by the successfully completed configured scanners.</p>')
    for finding in findings:
        severity = getattr(finding.severity, "value", finding.severity)
        analysis = _analysis(finding.ai_patch_code)
        parts.extend([f'<h2>{text(severity)} · {text(finding.rule_id)}</h2>',
                      f'<p>{text(finding.file_path)}:{text(finding.line_number)}</p>',
                      f'<p>{text(finding.message)}</p>',
                      f'<p>AI status: {text(analysis.get("status", "unavailable"))}</p>',
                      f'<p>{text(analysis.get("analysis", ""))}</p>',
                      f'<pre>{text(analysis.get("fix", ""))}</pre>'])
    parts.append('</body></html>')
    return "".join(parts)


@shared_task(bind=True)
def generate_report(self, report_id: str):
    from session import SessionLocal
    from app.config.settings import settings
    from app.models.report import Report
    from app.models.scan import Scan, ScanStatus
    from app.models.repository import Repository
    from app.models.vulnerability import Vulnerability
    from xhtml2pdf import pisa
    db = SessionLocal()
    temporary = None
    try:
        report = db.query(Report).filter(Report.id == report_id).with_for_update().first()
        if not report:
            raise ValueError("Report not found")
        scan = db.query(Scan).filter(Scan.id == report.scan_id).first()
        if not scan:
            raise ValueError("Scan not found")
        repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()
        if not repo:
            raise ValueError("Repository not found")
        existing_path = Path(settings.REPORTS_DIR).resolve() / f"report_{report_id}.pdf"
        if report.status == "ready" and existing_path.is_file():
            return {"report_id": report_id, "status": "generated", "pdf_path": str(existing_path)}
        scan.stage = "reporting"
        report.status = "pending"
        report.error_message = None
        self.update_state(state="PROGRESS", meta={"status": "reporting"})
        findings = db.query(Vulnerability).filter(Vulnerability.report_id == report_id).all()
        directory = Path(settings.REPORTS_DIR).resolve()
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"report_{report_id}.pdf"
        with tempfile.NamedTemporaryFile(mode="wb", suffix=".pdf", dir=directory, delete=False) as handle:
            temporary = handle.name
            outcome = pisa.CreatePDF(render_report(scan, repo, findings), dest=handle,
                                     link_callback=lambda uri, relative: (_ for _ in ()).throw(ValueError("External resources are disabled")))
            if outcome.err:
                raise RuntimeError("PDF rendering failed")
        if Path(temporary).stat().st_size == 0:
            raise RuntimeError("PDF rendering produced an empty artifact")
        os.replace(temporary, path)
        temporary = None
        report.status = "ready"
        scan.status = ScanStatus.COMPLETED
        scan.stage = "completed"
        scan.completed_at = datetime.utcnow()
        scan.error_message = None
        from tasks.notification_task import enqueue_scan_notification
        notification = enqueue_scan_notification(db, scan, repo, report)
        db.commit()
        if notification:
            # The persisted outbox is recovered by beat if this dispatch fails.
            try:
                from tasks.notification_task import send_notification
                send_notification.delay(notification.id)
            except Exception:
                pass
        return {"report_id": report_id, "status": "generated", "pdf_path": str(path)}
    except Exception as error:
        db.rollback()
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            report.error_message = str(error)[:1000]
            scan = db.query(Scan).filter(Scan.id == report.scan_id).first()
            if scan:
                scan.status = ScanStatus.FAILED
                scan.stage = "failed"
                scan.error_message = "Report generation failed"
                scan.completed_at = datetime.utcnow()
            db.commit()
        raise
    finally:
        if temporary:
            Path(temporary).unlink(missing_ok=True)
        db.close()
