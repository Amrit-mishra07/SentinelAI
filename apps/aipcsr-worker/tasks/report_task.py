from celery import shared_task
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

@shared_task(bind=True)
def generate_report(self, scan_id: str, scan_results: dict):
    """Generate final report from scan results"""
    try:
        self.update_state(state='PROGRESS', meta={'status': 'generating_report'})
        
        report = {
            "scan_id": scan_id,
            "vulnerabilities_count": len(scan_results.get("vulnerabilities", [])),
            "severity": "medium"
        }
        
        return report
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise
