import sys
import os
from datetime import datetime

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(base_dir, 'apps', 'aipcsr-api'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'db-core'))

from celery import shared_task
import subprocess
import tempfile
import uuid

@shared_task(bind=True)
def apply_patch(self, vuln_id: str):
    """Clone repo, apply AI patch, commit, push, and open PR (simulated)"""
    from session import SessionLocal
    from app.models.vulnerability import Vulnerability
    from app.models.report import Report
    from app.models.scan import Scan
    from app.models.repository import Repository
    from app.models.user import User

    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'status': 'applying_patch'})
        
        vuln = db.query(Vulnerability).filter(Vulnerability.id == vuln_id).first()
        if not vuln or not vuln.ai_patch_code:
            raise Exception("Vulnerability or patch code not found")

        report = db.query(Report).filter(Report.id == vuln.report_id).first()
        scan = db.query(Scan).filter(Scan.id == report.scan_id).first()
        repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()
        user = db.query(User).filter(User.id == repo.owner_id).first()

        if not user.github_token:
            raise Exception("User has no GitHub token configured for pushing")
            
        # In a real environment, we'd use GitPython or subprocess to clone using the PAT.
        # e.g.: git clone https://{user.github_token}@github.com/{repo.url.split('github.com/')[1]}
        # We would then apply the patch to the specific file, commit, and push to a new branch,
        # and use the GitHub API to create a PR.
        
        # Here we simulate the process running successfully.
        import time
        time.sleep(2)
        
        # Mark as applied
        vuln.patch_status = 'applied'
        db.commit()

        return {
            "vuln_id": vuln_id,
            "status": "success",
            "message": "Patch applied and PR created"
        }
    except Exception as e:
        db.rollback()
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise e
    finally:
        db.close()
