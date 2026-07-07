from celery import Celery
from app.config.settings import settings

celery_client = Celery(
    "aipcsr-worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_client.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
