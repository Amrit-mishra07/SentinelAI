"""Findings, downloadable artifacts and validated draft pull request requests."""

import ast
import json
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.celery_client import celery_client
from app.config.settings import settings
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.report import Report, SeverityLevel
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.user import User
from app.models.vulnerability import Vulnerability, PatchStatus
from app.services.github_credentials import get_github_token

router = APIRouter()


def patch_data(value: str | None) -> dict:
    """Read structured output, retaining compatibility with historical dict strings."""
    if not value:
        return {}
    for parse in (json.loads, ast.literal_eval):
        try:
            result = parse(value)
            if isinstance(result, dict):
                return result
        except (ValueError, SyntaxError, TypeError):
            pass
    return {}


def parse_ai_patch(ai_patch_code: str, fallback_message: str):
    data = patch_data(ai_patch_code)
    return data.get("analysis"), data.get("fix"), valid_pr_url(data.get("pr_url"))


def valid_pr_url(value: object) -> str | None:
    if isinstance(value, str) and re.fullmatch(
        r"https://github\.com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+/pull/[1-9][0-9]*", value
    ):
        return value
    return None


def vulnerability_response(vuln: Vulnerability, scan: Scan | None = None,
                           repository: Repository | None = None) -> dict:
    data = patch_data(vuln.ai_patch_code)
    return {
        "id": vuln.id, "report_id": vuln.report_id, "scan_id": scan.id if scan else None,
        "repository_name": repository.name if repository else None,
        "rule_id": vuln.rule_id, "message": vuln.message, "file_path": vuln.file_path,
        "line_number": vuln.line_number, "severity": getattr(vuln.severity, "value", vuln.severity),
        "ai_analysis": data.get("analysis"), "ai_patch": data.get("fix"),
        "ai_status": data.get("status"), "ai_provider": data.get("provider"),
        "ai_model": data.get("model"), "source_sha": data.get("source_sha"),
        "validation": data.get("validation"), "ai_error": data.get("error"),
        "pr_url": valid_pr_url(data.get("pr_url")),
        "patch_status": getattr(vuln.patch_status, "value", vuln.patch_status),
        "patch_error": vuln.patch_error, "created_at": vuln.created_at,
    }


def report_path(report_id: str) -> Path:
    # IDs originate in our database, and never become user-controlled paths.
    return Path(settings.REPORTS_DIR) / f"report_{report_id}.pdf"


def owned_scan(db: Session, scan_id: str, user_id: str) -> Scan:
    scan = db.query(Scan).join(Repository, Scan.repository_id == Repository.id).filter(
        Scan.id == scan_id, Repository.owner_id == user_id
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


def owned_vulnerability(db: Session, vuln_id: str, user_id: str) -> Vulnerability:
    vuln = db.query(Vulnerability).join(Report, Vulnerability.report_id == Report.id).join(
        Scan, Report.scan_id == Scan.id
    ).join(Repository, Scan.repository_id == Repository.id).filter(
        Vulnerability.id == vuln_id, Repository.owner_id == user_id
    ).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    return vuln


@router.get("/vulnerabilities/list")
async def list_vulnerabilities(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Vulnerability, Scan, Repository).join(
        Report, Vulnerability.report_id == Report.id
    ).join(Scan, Report.scan_id == Scan.id).join(
        Repository, Scan.repository_id == Repository.id
    ).filter(Repository.owner_id == user_id).order_by(Vulnerability.created_at.desc()).all()
    return [vulnerability_response(vuln, scan, repository) for vuln, scan, repository in rows]


@router.get("/list/all")
async def list_all_reports(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Report, Repository.name).join(Scan, Report.scan_id == Scan.id).join(
        Repository, Scan.repository_id == Repository.id
    ).filter(Repository.owner_id == user_id).order_by(Report.created_at.desc()).all()
    return [{
        "id": report.id, "scan_id": report.scan_id, "repository_name": name,
        "vulnerabilities_count": report.vulnerabilities_count,
        "severity": report.severity.value if report.severity else None,
        "status": report.status, "error_message": report.error_message,
        "pdf_ready": report.status == "ready" and report_path(report.id).is_file(),
        "created_at": report.created_at,
    } for report, name in rows]


@router.get("/{scan_id}")
async def get_report(scan_id: str, skip: int = Query(0, ge=0),
                     limit: int = Query(50, ge=1, le=1000),
                     user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = owned_scan(db, scan_id, user_id)
    report = db.query(Report).filter(Report.scan_id == scan_id).first()
    if not report:
        return None
    counts = {level.value: 0 for level in SeverityLevel}
    for severity, count in db.query(Vulnerability.severity, func.count(Vulnerability.id)).filter(
        Vulnerability.report_id == report.id
    ).group_by(Vulnerability.severity).all():
        counts[getattr(severity, "value", severity)] = count
    query = db.query(Vulnerability).filter(Vulnerability.report_id == report.id)
    repository = db.get(Repository, scan.repository_id)
    vulnerabilities = query.order_by(Vulnerability.file_path, Vulnerability.line_number, Vulnerability.id).offset(skip).limit(limit).all()
    return {
        "id": report.id, "scan_id": scan.id, "branch": scan.branch,
        "commit_hash": scan.commit_hash, "vulnerabilities_count": report.vulnerabilities_count,
        "severity": report.severity.value if report.severity else None,
        "severity_counts": counts, "created_at": report.created_at,
        "status": report.status, "error_message": report.error_message,
        "pdf_ready": report.status == "ready" and report_path(report.id).is_file(),
        "vulnerabilities": [vulnerability_response(vuln, scan, repository) for vuln in vulnerabilities],
        "pagination": {"total": sum(counts.values()), "skip": skip, "limit": limit},
    }


@router.get("/{scan_id}/download")
async def download_report(scan_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_scan(db, scan_id, user_id)
    report = db.query(Report).filter(Report.scan_id == scan_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not generated yet")
    if report.status != "ready":
        raise HTTPException(status_code=409, detail=report.error_message or "PDF report is still being generated")
    path = report_path(report.id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="PDF artifact is unavailable")
    return FileResponse(path, media_type="application/pdf", filename=f"SentinelAI_Report_{scan_id}.pdf")


@router.post("/vulnerability/{id}/patch")
async def apply_patch(id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    vuln = owned_vulnerability(db, id, user_id)
    report = db.get(Report, vuln.report_id)
    scan = db.get(Scan, report.scan_id)
    user = db.get(User, user_id)
    try:
        token = get_github_token(user, db)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    if not token or token == "dummy_token":
        raise HTTPException(status_code=400, detail="Connect a GitHub token in Settings before opening a draft PR")
    data = patch_data(vuln.ai_patch_code)
    if not data.get("fix") or data.get("status") in {"unavailable", "failed"}:
        raise HTTPException(status_code=400, detail="A usable AI patch is not available for this finding")
    if (scan.status != ScanStatus.COMPLETED or not scan.commit_hash
            or not vuln.source_content or data.get("source_sha") != scan.commit_hash):
        raise HTTPException(status_code=409, detail="A completed scan with a matching source snapshot is required")
    if Path(vuln.file_path).suffix != ".py":
        raise HTTPException(status_code=400, detail="Validated patch PRs currently support Python source files")
    # Claim the operation atomically; simultaneous requests cannot queue it twice.
    claimed = db.query(Vulnerability).filter(
        Vulnerability.id == vuln.id,
        Vulnerability.patch_status.in_([PatchStatus.PENDING, PatchStatus.FAILED])
    ).update({Vulnerability.patch_status: PatchStatus.VALIDATING, Vulnerability.patch_error: None},
             synchronize_session=False)
    db.commit()
    if not claimed:
        raise HTTPException(status_code=409, detail="This patch is already processing, opened, or dismissed")
    try:
        celery_client.send_task("tasks.patch_task.apply_patch", kwargs={"vuln_id": vuln.id})
    except Exception:
        db.query(Vulnerability).filter(Vulnerability.id == vuln.id).update({
            Vulnerability.patch_status: PatchStatus.FAILED,
            Vulnerability.patch_error: "Patch queue is unavailable. Please retry later.",
        }, synchronize_session=False)
        db.commit()
        raise HTTPException(status_code=503, detail="Patch queue is unavailable. Please retry later.")
    return {"message": "Validating patch before opening a draft PR", "patch_status": "validating"}


@router.post("/vulnerability/{id}/dismiss")
async def dismiss_patch(id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    vuln = owned_vulnerability(db, id, user_id)
    changed = db.query(Vulnerability).filter(
        Vulnerability.id == vuln.id,
        Vulnerability.patch_status.in_([PatchStatus.PENDING, PatchStatus.FAILED])
    ).update({Vulnerability.patch_status: PatchStatus.REJECTED}, synchronize_session=False)
    if not changed:
        raise HTTPException(status_code=409, detail="An active or opened patch cannot be dismissed")
    db.commit()
    return {"message": "Vulnerability dismissed", "patch_status": "rejected"}
