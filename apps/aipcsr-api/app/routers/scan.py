from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user
from app.schemas.scan import ScanCreate, ScanResponse
import uuid

router = APIRouter()

# Mock scans database
scans_db = {}

from datetime import datetime

@router.post("/create")
async def create_scan(scan: ScanCreate, user_id: str = Depends(get_current_user)):
    scan_id = str(uuid.uuid4())
    scans_db[scan_id] = {
        "id": scan_id,
        "user_id": user_id,
        "repository": scan.repository,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    return ScanResponse(**scans_db[scan_id])

@router.get("/list")
async def list_scans(user_id: str = Depends(get_current_user)):
    user_scans = [scan for scan in scans_db.values() if scan["user_id"] == user_id]
    return user_scans

@router.get("/{scan_id}")
async def get_scan(scan_id: str, user_id: str = Depends(get_current_user)):
    scan = scans_db.get(scan_id)
    if not scan or scan["user_id"] != user_id:
        return {"error": "Scan not found"}
    return ScanResponse(**scan)
