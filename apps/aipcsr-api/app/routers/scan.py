from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.schemas.scan import ScanCreate, ScanResponse
from app.models.scan import Scan, ScanStatus
from app.models.repository import Repository
from app.config.celery_client import celery_client
from app.limiter import limiter
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/create", response_model=ScanResponse)
@limiter.limit("5/minute")
async def create_scan(request: Request, scan_data: ScanCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validate repository exists and belongs to user
    repo = db.query(Repository).filter(Repository.id == scan_data.repository, Repository.owner_id == user_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    scan = Scan(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        status=ScanStatus.PENDING
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Dispatch celery task
    celery_client.send_task(
        "tasks.scan_task.scan_repository",
        kwargs={"scan_id": scan.id, "repository_url": repo.url}
    )

    return {
        "id": scan.id,
        "repository": scan.repository_id,
        "repository_name": repo.name,
        "branch": scan.branch,
        "status": scan.status.value,
        "created_at": scan.created_at,
        "error_message": scan.error_message
    }

def get_highest_severity(db: Session, scan_id: str) -> str | None:
    from app.models.report import Report
    from app.models.vulnerability import Vulnerability
    report = db.query(Report).filter(Report.scan_id == scan_id).first()
    if not report:
        return None
    vulns = db.query(Vulnerability.severity).filter(Vulnerability.report_id == report.id).all()
    if not vulns:
        return "clean"
    severities = [v[0].lower() for v in vulns]
    if "critical" in severities:
        return "critical"
    if "high" in severities:
        return "high"
    if "medium" in severities:
        return "medium"
    if "low" in severities:
        return "low"
    return "clean"

@router.get("/list", response_model=list[ScanResponse])
async def list_scans(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    results = db.query(Scan, Repository.name).join(Repository, Scan.repository_id == Repository.id).filter(Repository.owner_id == user_id).order_by(Scan.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "repository": s.repository_id,
            "repository_name": repo_name,
            "branch": s.branch,
            "severity": get_highest_severity(db, s.id),
            "status": s.status.value,
            "created_at": s.created_at,
            "error_message": s.error_message
        }
        for s, repo_name in results
    ]

@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    result = db.query(Scan, Repository.name).join(Repository, Scan.repository_id == Repository.id).filter(Scan.id == scan_id, Repository.owner_id == user_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan, repo_name = result
    
    return {
        "id": scan.id,
        "repository": scan.repository_id,
        "repository_name": repo_name,
        "branch": scan.branch,
        "severity": get_highest_severity(db, scan.id),
        "status": scan.status.value,
        "created_at": scan.created_at,
        "error_message": scan.error_message
    }
