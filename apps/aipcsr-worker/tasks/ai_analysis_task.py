from celery import shared_task
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

@shared_task(bind=True)
def analyze_with_ai(self, scan_id: str, vulnerabilities: list):
    """Analyze vulnerabilities using AI and generate patches"""
    try:
        self.update_state(state='PROGRESS', meta={'status': 'analyzing'})
        
        # Call AI core
        from core.ai_core.providers.openai_provider import OpenAIProvider
        provider = OpenAIProvider()
        
        analysis_results = []
        for vuln in vulnerabilities:
            analysis = provider.analyze_vulnerability(vuln)
            analysis_results.append(analysis)
        
        return {
            "scan_id": scan_id,
            "analysis": analysis_results
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise
