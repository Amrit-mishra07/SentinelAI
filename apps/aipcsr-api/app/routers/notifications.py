"""Persist notification opt-in and expose delivery state without leaking mail content."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.celery_client import celery_client
from app.config.settings import settings
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.notification import NotificationPreference, NotificationOutbox

router = APIRouter()


class NotificationSettings(BaseModel):
    email_enabled: bool
    high_severity_only: bool = False


class RetryNotification(BaseModel):
    confirm_duplicate_risk: bool = False


def delivery_available() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def preference_response(item: NotificationPreference | None) -> dict:
    return {"email_enabled": bool(item and item.email_enabled),
            "high_severity_only": bool(item and item.high_severity_only),
            "delivery_available": delivery_available()}


@router.get("/preferences")
def get_preferences(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return preference_response(db.get(NotificationPreference, user_id))


@router.put("/preferences")
def update_preferences(data: NotificationSettings, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(NotificationPreference, user_id)
    if item is None:
        item = NotificationPreference(user_id=user_id)
        db.add(item)
    item.email_enabled = data.email_enabled
    item.high_severity_only = data.high_severity_only
    db.commit()
    return preference_response(item)


@router.get("/outbox")
def list_outbox(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
                user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(NotificationOutbox).filter(NotificationOutbox.user_id == user_id).order_by(
        NotificationOutbox.created_at.desc()
    ).offset(skip).limit(limit).all()
    return [{"id": item.id, "scan_id": item.scan_id, "event_type": item.event_type,
             "status": item.status, "attempts": item.attempts, "error_message": item.error_message,
             "created_at": item.created_at, "sent_at": item.sent_at,
             "next_attempt_at": item.next_attempt_at} for item in items]


@router.post("/outbox/{notification_id}/retry")
def retry_notification(notification_id: str, data: RetryNotification,
                       user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(NotificationOutbox).filter(
        NotificationOutbox.id == notification_id, NotificationOutbox.user_id == user_id
    ).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not delivery_available():
        raise HTTPException(status_code=503, detail="Email delivery is not configured on this server")
    if item.status == "unknown" and not data.confirm_duplicate_risk:
        raise HTTPException(status_code=409, detail="Delivery may already have succeeded; confirm_duplicate_risk is required to resend")
    allowed = ["failed", "unknown"] if data.confirm_duplicate_risk else ["failed"]
    changed = db.query(NotificationOutbox).filter(NotificationOutbox.id == item.id,
        NotificationOutbox.status.in_(allowed)).update({
            NotificationOutbox.status: "pending", NotificationOutbox.attempts: 0,
            NotificationOutbox.error_message: None, NotificationOutbox.next_attempt_at: datetime.utcnow(),
        }, synchronize_session=False)
    db.commit()
    if not changed:
        raise HTTPException(status_code=409, detail="This notification is already queued, sending, or sent")
    try:
        celery_client.send_task("tasks.notification_task.send_notification", kwargs={"notification_id": item.id})
    except Exception:
        # The persisted pending outbox is recoverable by the periodic dispatcher.
        return {"status": "pending", "message": "Saved for delivery; background dispatcher will retry"}
    return {"status": "pending"}
