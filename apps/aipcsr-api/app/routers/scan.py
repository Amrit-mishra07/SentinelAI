"""Authenticated scan lifecycle and snapshot metadata."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.celery_client import celery_client
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.limiter import limiter
from app.models.report import Report
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.vulnerability import Vulnerability
from app.schemas.scan import ScanCreate, ScanResponse

router = APIRouter()
SEVERITIES = ("critical", "high", "medium", "low")


def _value(value: object) -> str | None:
    return getattr(value, "value", value)


def scan_response(scan: Scan, name: str, findings: list[tuple[object, int]]) -> dict:
    """Expose a single contract for list, create and detail responses."""
    counts = {_value(severity): count for severity, count in findings}
    severity = next((level for level in SEVERITIES if counts.get(level)), None)
    return {
        "id": scan.id, "repository": scan.repository_id, "repository_id": scan.repository_id,
        "repository_name": name, "branch": scan.branch, "commit_hash": scan.commit_hash,
        "status": _value(scan.status), "stage": scan.stage, "engine_results": scan.engine_results,
        "severity": severity, "vulnerabilities_count": sum(counts.values()),
        "created_at": scan.created_at, "started_at": scan.started_at,
        "completed_at": scan.completed_at, "updated_at": scan.updated_at,
        "error_message": scan.error_message,
    }


def finding_counts(db: Session, scan_ids: list[str]) -> dict[str, list[tuple[object, int]]]:
    """Count findings for all requested scans in one database query."""
    if not scan_ids:
        return {}
    rows = db.query(Report.scan_id, Vulnerability.severity, func.count(Vulnerability.id)).join(
        Vulnerability, Vulnerability.report_id == Report.id
    ).filter(Report.scan_id.in_(scan_ids)).group_by(Report.scan_id, Vulnerability.severity).all()
    result: dict[str, list[tuple[object, int]]] = {}
    for scan_id, severity, count in rows:
        result.setdefault(scan_id, []).append((severity, count))
    return result


@router.post("/create", response_model=ScanResponse)
@limiter.limit("5/minute")
async def create_scan(request: Request, scan_data: ScanCreate,
                      user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(
        Repository.id == scan_data.repository, Repository.owner_id == user_id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    scan = Scan(id=str(uuid.uuid4()), repository_id=repo.id,
                branch=scan_data.branch or repo.default_branch,
                status=ScanStatus.PENDING, stage="pending")
    db.add(scan)
    db.commit()
    db.refresh(scan)
    try:
        celery_client.send_task("tasks.scan_task.scan_repository", kwargs={
            "scan_id": scan.id, "repository_url": repo.url,
        })
    except Exception:
        scan.status = ScanStatus.FAILED
        scan.stage = "failed"
        scan.error_message = "Scan queue is unavailable. Please retry later."
        scan.completed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=503, detail=scan.error_message)
    return scan_response(scan, repo.name, [])


@router.get("/list", response_model=list[ScanResponse])
async def list_scans(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Scan, Repository.name).join(Repository, Scan.repository_id == Repository.id).filter(
        Repository.owner_id == user_id
    ).order_by(Scan.created_at.desc()).all()
    counts = finding_counts(db, [scan.id for scan, _ in rows])
    return [scan_response(scan, name, counts.get(scan.id, [])) for scan, name in rows]


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Scan, Repository.name).join(Repository, Scan.repository_id == Repository.id).filter(
        Scan.id == scan_id, Repository.owner_id == user_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan, name = row
    return scan_response(scan, name, finding_counts(db, [scan.id]).get(scan.id, []))
