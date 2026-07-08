from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.schemas.scan import ScanCreate, ScanResponse
from app.models.scan import Scan, ScanStatus
from app.models.repository import Repository
from app.config.celery_client import celery_client
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/create", response_model=ScanResponse)
async def create_scan(scan_data: ScanCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
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
        "status": scan.status.value,
        "created_at": scan.created_at
    }

@router.get("/list", response_model=list[ScanResponse])
async def list_scans(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    scans = db.query(Scan).join(Repository, Scan.repository_id == Repository.id).filter(Repository.owner_id == user_id).order_by(Scan.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "repository": s.repository_id,
            "status": s.status.value,
            "created_at": s.created_at
        }
        for s in scans
    ]

@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(Scan).join(Repository, Scan.repository_id == Repository.id).filter(Scan.id == scan_id, Repository.owner_id == user_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return {
        "id": scan.id,
        "repository": scan.repository_id,
        "status": scan.status.value,
        "created_at": scan.created_at
    }
