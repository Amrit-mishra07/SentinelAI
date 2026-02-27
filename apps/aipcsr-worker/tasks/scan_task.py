from celery import shared_task
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

@shared_task(bind=True)
def scan_repository(self, scan_id: str, repository: str):
    """Execute repository scan using scanner engines"""
    try:
        self.update_state(state='PROGRESS', meta={'status': 'scanning'})
        
        # Call scanner orchestrator
        from core.scanner_core.orchestrator import ScannerOrchestrator
        orchestrator = ScannerOrchestrator()
        results = orchestrator.scan(repository)
        
        return {
            "scan_id": scan_id,
            "status": "completed",
            "results": results
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise
