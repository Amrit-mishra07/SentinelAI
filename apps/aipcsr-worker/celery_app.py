import sys
import os
from celery import Celery

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'aipcsr-api'))

from app.config.settings import settings

celery_app = Celery(
    "aipcsr-worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=2,
    worker_prefetch_multiplier=1,
)

celery_app.conf.imports = (
    "tasks.scan_task",
    "tasks.ai_analysis_task",
    "tasks.report_task",
    "tasks.patch_task",
    "tasks.notification_task",
    "tasks.integration_task",
)

celery_app.conf.beat_schedule = {
    "recover-webhook-dispatch": {
        "task": "tasks.integration_task.dispatch_received_webhooks",
        "schedule": 60.0,
    },
    "recover-notification-outbox": {
        "task": "tasks.notification_task.dispatch_pending_notifications",
        "schedule": 60.0,
    },
}
