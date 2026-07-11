from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.report import Report
from app.models.scan import Scan
from app.models.repository import Repository
from app.models.vulnerability import Vulnerability
import json
import ast

router = APIRouter()

def parse_ai_patch(ai_patch_code: str, fallback_message: str):
    if not ai_patch_code:
        return None, None
    try:
        data = json.loads(ai_patch_code)
        if isinstance(data, dict):
            return data.get("analysis"), data.get("fix")
    except Exception:
        pass
    try:
        data = ast.literal_eval(ai_patch_code)
        if isinstance(data, dict):
            return data.get("analysis"), data.get("fix")
    except Exception:
        pass
    return fallback_message, ai_patch_code

@router.get("/vulnerabilities/list")
async def list_vulnerabilities(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    vulns = db.query(Vulnerability).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(
        Repository.owner_id == user_id
    ).order_by(Vulnerability.created_at.desc()).all()
    
    resp = []
    for v in vulns:
        ai_analysis, ai_patch = parse_ai_patch(v.ai_patch_code, v.message)
        resp.append({
            "id": v.id,
            "rule_id": v.rule_id,
            "message": v.message,
            "file_path": v.file_path,
            "line_number": v.line_number,
            "severity": v.severity.value if hasattr(v.severity, 'value') else v.severity,
            "ai_analysis": ai_analysis,
            "ai_patch": ai_patch,
            "patch_status": v.patch_status.value if hasattr(v.patch_status, 'value') else v.patch_status,
            "created_at": v.created_at
        })
    return resp

@router.get("/{scan_id}")
async def get_report(scan_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(Scan).join(Repository, Scan.repository_id == Repository.id).filter(Scan.id == scan_id, Repository.owner_id == user_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    report = db.query(Report).filter(Report.scan_id == scan_id).first()
    if not report:
        return None
        
    vulnerabilities = db.query(Vulnerability).filter(Vulnerability.report_id == report.id).all()
    
    return {
        "id": report.id,
        "scan_id": scan.id,
        "vulnerabilities_count": report.vulnerabilities_count,
        "severity": report.severity.value if report.severity else None,
        "created_at": report.created_at,
        "vulnerabilities": [
            {
                "id": v.id,
                "rule_id": v.rule_id,
                "message": v.message,
                "file_path": v.file_path,
                "line_number": v.line_number,
                "severity": v.severity.value if hasattr(v.severity, 'value') else v.severity,
                "ai_analysis": parse_ai_patch(v.ai_patch_code, v.message)[0],
                "ai_patch": parse_ai_patch(v.ai_patch_code, v.message)[1],
                "patch_status": v.patch_status.value if hasattr(v.patch_status, 'value') else v.patch_status,
                "created_at": v.created_at
            }
            for v in vulnerabilities
        ]
    }

@router.post("/{scan_id}/download")
async def download_report(scan_id: str, user_id: str = Depends(get_current_user)):
    return {"message": "Report download started"}

@router.post("/vulnerability/{id}/patch")
async def apply_patch(id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    vuln = db.query(Vulnerability).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(
        Vulnerability.id == id, Repository.owner_id == user_id
    ).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    
    from app.config.celery_client import celery_client
    celery_client.send_task(
        "tasks.patch_task.apply_patch",
        kwargs={"vuln_id": vuln.id}
    )
    
    return {"message": "Patch application started. Opening PR...", "patch_status": "pending"}

@router.post("/vulnerability/{id}/dismiss")
async def dismiss_patch(id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    vuln = db.query(Vulnerability).join(Report, Vulnerability.report_id == Report.id).join(Scan, Report.scan_id == Scan.id).join(Repository, Scan.repository_id == Repository.id).filter(
        Vulnerability.id == id, Repository.owner_id == user_id
    ).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    
    vuln.patch_status = 'rejected'
    db.commit()
    return {"message": "Vulnerability dismissed", "patch_status": "rejected"}
