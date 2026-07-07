import sys
import os
import uuid
from datetime import datetime

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(base_dir, 'apps', 'aipcsr-api'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'db-core'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'scanner-core'))

from celery import shared_task

@shared_task(bind=True)
def scan_repository(self, scan_id: str, repository_url: str):
    """Execute repository scan using scanner engines and save to DB"""
    from session import SessionLocal
    from app.models.scan import Scan, ScanStatus
    from app.models.report import Report
    from app.models.vulnerability import Vulnerability
    from orchestrator import ScannerOrchestrator
    from tasks.ai_analysis_task import analyze_with_ai
    
    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'status': 'scanning'})
        
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = ScanStatus.SCANNING
            scan.started_at = datetime.utcnow()
            db.commit()
            
        orchestrator = ScannerOrchestrator()
        results = orchestrator.scan(repository_url)
        
        report_id = str(uuid.uuid4())
        report = Report(id=report_id, scan_id=scan_id, vulnerabilities_count=len(results.get("vulnerabilities", [])))
        db.add(report)
        
        vulnerabilities = results.get("vulnerabilities", [])
        for v in vulnerabilities:
            severity_str = v.get("severity", "low").upper()
            vuln = Vulnerability(
                id=str(uuid.uuid4()),
                report_id=report_id,
                rule_id=v.get("engine", "unknown")[:50],
                message=v.get("issue"),
                file_path=v.get("file"),
                line_number=v.get("line"),
                severity=severity_str
            )
            db.add(vuln)
            
        db.commit()
        
        # Trigger AI Analysis asynchronously
        analyze_with_ai.delay(report_id, scan_id)
        
        return {
            "scan_id": scan_id,
            "status": "scanning_complete_awaiting_ai",
            "vulnerabilities_found": len(vulnerabilities),
            "report_id": report_id
        }
    except Exception as e:
        db.rollback()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = ScanStatus.FAILED
            db.commit()
            
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise e
    finally:
        db.close()
