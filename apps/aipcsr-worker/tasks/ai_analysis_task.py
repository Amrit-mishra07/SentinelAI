import sys
import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(base_dir, 'apps', 'aipcsr-api'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'db-core'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'ai-core'))

from celery import shared_task

@shared_task(bind=True)
def analyze_with_ai(self, report_id: str, scan_id: str):
    """Analyze vulnerabilities using AI and generate patches"""
    from session import SessionLocal
    from app.models.vulnerability import Vulnerability
    from app.models.scan import Scan, ScanStatus
    from providers.openai_provider import OpenAIProvider
    
    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'status': 'analyzing'})
        provider = OpenAIProvider()
        
        vulnerabilities = db.query(Vulnerability).filter(Vulnerability.report_id == report_id).all()
        
        analysis_results = []
        for vuln in vulnerabilities:
            vuln_data = {
                "file": vuln.file_path,
                "line": vuln.line_number,
                "issue": vuln.message,
                "severity": vuln.severity.value if hasattr(vuln.severity, 'value') else vuln.severity
            }
            analysis = provider.analyze_vulnerability(vuln_data)
            
            # Save AI patch to DB
            vuln.ai_patch_code = str(analysis)
            
            analysis_results.append({
                "vulnerability_id": vuln.id,
                "analysis": analysis
            })
            
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            from datetime import datetime
            scan.status = ScanStatus.COMPLETED
            scan.completed_at = datetime.utcnow()
            
        db.commit()
            
        return {
            "report_id": report_id,
            "scan_id": scan_id,
            "analysis_count": len(analysis_results)
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
