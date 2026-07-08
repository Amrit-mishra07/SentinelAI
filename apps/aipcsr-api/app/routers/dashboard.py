from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.scan import Scan
from app.models.repository import Repository
from app.models.report import Report
from app.models.vulnerability import Vulnerability

router = APIRouter()

@router.get("/metrics")
async def get_dashboard_metrics(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Total Scans Today
    today = datetime.utcnow().date()
    scans_today = db.query(func.count(Scan.id)).join(Repository, Scan.repository_id == Repository.id).filter(
        Repository.owner_id == user_id,
        func.date(Scan.created_at) == today
    ).scalar() or 0

    # 2. Total Vulnerabilities (for user's completed scans)
    total_vulns = db.query(func.count(Vulnerability.id)).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(
        Repository.owner_id == user_id
    ).scalar() or 0

    # 3. Critical Count
    critical_count = db.query(func.count(Vulnerability.id)).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(
        Repository.owner_id == user_id,
        Vulnerability.severity == 'critical'
    ).scalar() or 0

    # 4. Severity Distribution
    severity_distribution = {
        "critical": critical_count,
        "high": db.query(func.count(Vulnerability.id)).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(Repository.owner_id == user_id, Vulnerability.severity == 'high').scalar() or 0,
        "medium": db.query(func.count(Vulnerability.id)).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(Repository.owner_id == user_id, Vulnerability.severity == 'medium').scalar() or 0,
        "low": db.query(func.count(Vulnerability.id)).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(Repository.owner_id == user_id, Vulnerability.severity == 'low').scalar() or 0,
    }

    # 5. Patched Percentage
    total_patches = db.query(func.count(Vulnerability.id)).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(
        Repository.owner_id == user_id,
        Vulnerability.patch_status == 'applied'
    ).scalar() or 0
    patched_percentage = int((total_patches / total_vulns * 100)) if total_vulns > 0 else 0

    # 6. Timeline (last 30 days)
    timeline = []
    for i in range(29, -1, -1):
        date = (datetime.utcnow() - timedelta(days=i)).date()
        date_str = date.isoformat()
        
        day_scans = db.query(func.count(Scan.id)).join(Repository, Scan.repository_id == Repository.id).filter(
            Repository.owner_id == user_id,
            func.date(Scan.created_at) == date
        ).scalar() or 0
        
        day_vulns = db.query(func.count(Vulnerability.id)).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(
            Repository.owner_id == user_id,
            func.date(Vulnerability.created_at) == date
        ).scalar() or 0
        
        timeline.append({
            "date": date_str,
            "scans": day_scans,
            "vulnerabilities": day_vulns
        })

    return {
        "metrics": {
            "total_vulnerabilities": total_vulns,
            "critical_count": critical_count,
            "scans_today": scans_today,
            "patched_percentage": patched_percentage
        },
        "severity_distribution": severity_distribution,
        "timeline": timeline
    }
