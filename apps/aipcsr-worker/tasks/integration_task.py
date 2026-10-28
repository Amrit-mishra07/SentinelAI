"""Recover signed webhook scan dispatch after a process or broker interruption."""
from pathlib import Path
import sys
from celery import shared_task

root = Path(__file__).resolve().parents[3]
for relative in ("apps/aipcsr-api", "core/db-core"):
    sys.path.insert(0, str(root / relative))


@shared_task
def dispatch_received_webhooks() -> dict:
    from session import SessionLocal
    from app.models.integration import WebhookDelivery, GitHubIntegration
    from app.models.scan import Scan, ScanStatus
    from app.models.repository import Repository
    from tasks.scan_task import scan_repository
    db = SessionLocal()
    queued = 0
    try:
        records = db.query(WebhookDelivery).filter(
            WebhookDelivery.status == "received", WebhookDelivery.scan_id.isnot(None)
        ).with_for_update(skip_locked=True).limit(100).all()
        for record in records:
            integration = db.get(GitHubIntegration, record.integration_id)
            scan = db.get(Scan, record.scan_id)
            repository = db.get(Repository, scan.repository_id) if scan else None
            if not integration or not integration.active or not scan or not repository:
                record.status = "ignored"
                continue
            if scan.status != ScanStatus.PENDING:
                record.status = "queued"
                continue
            try:
                scan_repository.delay(scan.id, repository.url)
            except Exception:
                record.error_message = "Scan dispatch unavailable; the periodic dispatcher will retry"
                continue
            record.status = "queued"
            record.error_message = None
            queued += 1
        db.commit()
        return {"queued": queued}
    finally:
        db.close()
