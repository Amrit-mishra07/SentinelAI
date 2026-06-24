from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user

router = APIRouter()

@router.get("/{scan_id}")
async def get_report(scan_id: str, user_id: str = Depends(get_current_user)):
    from datetime import datetime
    return {
        "id": "report1",
        "scan_id": scan_id,
        "vulnerabilities_count": 0,
        "severity": "high",
        "created_at": datetime.utcnow().isoformat(),
        "vulnerabilities": []
    }

@router.post("/{scan_id}/download")
async def download_report(scan_id: str, user_id: str = Depends(get_current_user)):
    return {"message": "Report download started"}
