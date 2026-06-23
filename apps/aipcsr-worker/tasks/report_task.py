import sys
import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(base_dir, 'apps', 'aipcsr-api'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'db-core'))

from celery import shared_task

@shared_task(bind=True)
def generate_report(self, report_id: str):
    from session import SessionLocal
    from app.models.report import Report
    from app.models.scan import Scan, ScanStatus
    
    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'status': 'generating_report'})
        
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            scan = db.query(Scan).filter(Scan.id == report.scan_id).first()
            if scan:
                scan.status = ScanStatus.COMPLETED
                db.commit()
                
        return {"report_id": report_id, "status": "generated"}
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise e
    finally:
        db.close()
