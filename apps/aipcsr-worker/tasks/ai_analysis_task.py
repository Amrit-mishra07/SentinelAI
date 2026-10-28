"""Analyze persisted findings against their exact scanned source snapshots."""

import json
import os
import sys

from celery import shared_task

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
for relative in ("apps/aipcsr-api", "core/db-core", "core/ai-core"):
    sys.path.insert(0, os.path.join(base_dir, relative))


@shared_task(bind=True)
def analyze_with_ai(self, report_id: str, scan_id: str) -> dict:
    """Persist explicit AI provenance, then hand off report generation."""
    from session import SessionLocal
    from app.config.settings import settings
    from app.models.vulnerability import Vulnerability
    from app.models.scan import Scan, ScanStatus
    from app.models.report import Report
    from app.models.repository import Repository
    from app.models.user import User
    from app.security.secrets import get_secret
    from providers.openai_provider import OpenAIProvider

    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        report = db.query(Report).filter(Report.id == report_id, Report.scan_id == scan_id).first()
        if not scan or not report:
            raise ValueError("Scan or report not found")
        if report.status == "ready":
            return {"report_id": report_id, "scan_id": scan_id, "status": "already_completed"}
        repository = db.query(Repository).filter(Repository.id == scan.repository_id).first()
        user = db.query(User).filter(User.id == repository.owner_id).first() if repository else None
        credential_error = None
        try:
            api_key = get_secret(user.openai_api_key) if user and user.openai_api_key else settings.OPENAI_API_KEY
        except ValueError:
            api_key = ""
            credential_error = "Saved OpenAI credential could not be decrypted; save the integration again"
        provider = OpenAIProvider(api_key=api_key)
        scan.stage = "analyzing"
        db.commit()
        self.update_state(state="PROGRESS", meta={"status": "analyzing"})
        vulnerabilities = db.query(Vulnerability).filter(Vulnerability.report_id == report_id).all()
        rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        vulnerabilities.sort(key=lambda item: rank.get(getattr(item.severity, "value", item.severity), 3))
        limit = settings.MAX_AI_FINDINGS_PER_SCAN
        for index, vuln in enumerate(vulnerabilities):
            data = {
                "file": vuln.file_path,
                "line": vuln.line_number,
                "issue": vuln.message,
                "rule_id": vuln.rule_id,
                "severity": vuln.severity.value if hasattr(vuln.severity, "value") else vuln.severity,
                "source_content": vuln.source_content,
                "source_context": vuln.source_context,
                "commit_hash": scan.commit_hash,
            }
            analyzer = provider if index < limit else OpenAIProvider(api_key="")
            analysis = analyzer.analyze_vulnerability(data)
            if index >= limit and provider.api_key:
                analysis["error"] = "AI analysis skipped because this scan reached its configured finding budget"
            if credential_error:
                analysis["error"] = credential_error
            vuln.ai_patch_code = json.dumps(analysis)
        scan.stage = "reporting"
        db.commit()
        from tasks.report_task import generate_report
        generate_report.delay(report_id)
        return {
            "report_id": report_id,
            "scan_id": scan_id,
            "status": "awaiting_report",
            "analysis_count": len(vulnerabilities),
        }
    except Exception:
        db.rollback()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = ScanStatus.FAILED
            scan.stage = "failed"
            scan.error_message = "AI analysis or report dispatch failed; retry the scan"
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            report.error_message = "AI analysis or report dispatch failed"
        db.commit()
        raise
    finally:
        db.close()
