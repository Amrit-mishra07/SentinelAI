"""Durable notification outbox with bounded SMTP retries and honest delivery states."""
from datetime import datetime, timedelta
from email.message import EmailMessage
import hashlib
import os
from pathlib import Path
import smtplib
import ssl
import sys
import uuid

base_dir = Path(__file__).resolve().parents[3]
for relative in ("apps/aipcsr-api", "core/db-core"):
    sys.path.insert(0, str(base_dir / relative))
from celery import shared_task


def enqueue_scan_notification(db, scan, repository, report):
    """Create the notification in the same transaction as report completion."""
    from app.config.settings import settings
    from app.models.user import User
    from app.models.notification import NotificationPreference, NotificationOutbox
    preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == repository.owner_id).first()
    if not preference or not preference.email_enabled:
        return None
    severity = getattr(report.severity, "value", report.severity)
    if preference.high_severity_only and severity not in {"high", "critical"}:
        return None
    user = db.query(User).filter(User.id == repository.owner_id).first()
    if not user:
        return None
    existing = db.query(NotificationOutbox).filter(
        NotificationOutbox.user_id == user.id, NotificationOutbox.scan_id == scan.id,
        NotificationOutbox.event_type == "scan_completed").first()
    if existing:
        return existing
    name = repository.name.replace("\r", "").replace("\n", "")[:150]
    record = NotificationOutbox(
        id=str(uuid.uuid4()), user_id=user.id, scan_id=scan.id, event_type="scan_completed",
        recipient=user.email, subject=f"SentinelAI scan completed: {name}",
        body=(f"Repository: {name}\nBranch: {scan.branch}\nCommit: {scan.commit_hash}\n"
              f"Findings: {report.vulnerabilities_count}\nHighest severity: {severity or 'none'}\n\n"
              f"View report: {settings.PUBLIC_BASE_URL.rstrip('/')}/reports/{scan.id}\n\n"
              "Manage notification preferences in SentinelAI Settings."),
        status="pending", attempts=0, next_attempt_at=datetime.utcnow(),
    )
    db.add(record)
    return record


@shared_task
def notify_scan(scan_id: str) -> dict:
    """Dispatch a committed scan's outbox entry without inventing delivery success."""
    from session import SessionLocal
    from app.models.scan import Scan, ScanStatus
    from app.models.repository import Repository
    from app.models.report import Report
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        report = db.query(Report).filter(Report.scan_id == scan_id, Report.status == "ready").first()
        repository = db.query(Repository).filter(Repository.id == scan.repository_id).first() if scan else None
        if not scan or scan.status != ScanStatus.COMPLETED or not report or not repository:
            return {"status": "not_ready"}
        record = enqueue_scan_notification(db, scan, repository, report)
        db.commit()
        if not record:
            return {"status": "suppressed"}
        send_notification.delay(record.id)
        return {"status": "queued", "notification_id": record.id}
    finally:
        db.close()


@shared_task
def send_notification(notification_id: str) -> dict:
    """At most one active sender; ambiguous SMTP acceptance requires manual review."""
    from session import SessionLocal
    from app.config.settings import settings
    from app.models.notification import NotificationOutbox
    from app.models.notification import NotificationPreference
    from app.models.user import User
    db = SessionLocal()
    try:
        if not settings.SMTP_HOST or not settings.SMTP_FROM:
            return {"status": "provider_unavailable"}
        now = datetime.utcnow()
        claimed = db.query(NotificationOutbox).filter(
            NotificationOutbox.id == notification_id,
            NotificationOutbox.status.in_(["pending", "failed"]),
            NotificationOutbox.attempts < 5,
            NotificationOutbox.next_attempt_at <= now,
        ).update({NotificationOutbox.status: "sending",
                  NotificationOutbox.attempts: NotificationOutbox.attempts + 1,
                  NotificationOutbox.next_attempt_at: now + timedelta(minutes=10)}, synchronize_session=False)
        db.commit()
        if not claimed:
            return {"status": "not_pending"}
        record = db.get(NotificationOutbox, notification_id)
        preference = db.get(NotificationPreference, record.user_id)
        user = db.get(User, record.user_id)
        if not preference or not preference.email_enabled or not user:
            record.status = "suppressed"
            record.next_attempt_at = None
            db.commit()
            return {"status": "suppressed"}
        record.recipient = user.email
        message = EmailMessage()
        message["Subject"] = record.subject
        message["From"] = settings.SMTP_FROM
        message["To"] = record.recipient
        identity = hashlib.sha256(record.id.encode()).hexdigest()
        message["Message-ID"] = f"<{identity}@sentinelai.local>"
        message.set_content(record.body)
        sending = False
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as client:
                client.ehlo()
                if settings.SMTP_USE_TLS:
                    client.starttls(context=ssl.create_default_context())
                    client.ehlo()
                if settings.SMTP_USERNAME:
                    client.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                sending = True
                refused = client.send_message(message)
                if refused:
                    sending = False
                    raise RuntimeError("SMTP rejected the recipient")
            record.status = "sent"
            record.sent_at = datetime.utcnow()
            record.error_message = None
            record.next_attempt_at = None
        except Exception:
            if sending:
                record.status = "unknown"
                record.error_message = "SMTP delivery confirmation was lost. Check the provider before retrying to avoid duplicate email."
                record.next_attempt_at = None
            else:
                record.status = "failed"
                record.error_message = "SMTP delivery failed before acceptance. Check provider settings."
                record.next_attempt_at = datetime.utcnow() + timedelta(seconds=min(3600, 60 * 2**record.attempts))
        db.commit()
        return {"status": record.status, "notification_id": record.id}
    finally:
        db.close()


@shared_task
def dispatch_pending_notifications() -> dict:
    """Recover committed outbox records after broker outages; never retry uncertain sends."""
    from session import SessionLocal
    from app.config.settings import settings
    from app.models.notification import NotificationOutbox
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        return {"status": "provider_unavailable", "queued": 0}
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        db.query(NotificationOutbox).filter(
            NotificationOutbox.status == "sending", NotificationOutbox.next_attempt_at <= now
        ).update({NotificationOutbox.status: "unknown",
                  NotificationOutbox.error_message: "Sender stopped before confirmation. Check the provider before retrying.",
                  NotificationOutbox.next_attempt_at: None}, synchronize_session=False)
        db.commit()
        records = db.query(NotificationOutbox).filter(
            NotificationOutbox.status.in_(["pending", "failed"]), NotificationOutbox.attempts < 5,
            NotificationOutbox.next_attempt_at <= now).limit(100).all()
        for record in records:
            send_notification.delay(record.id)
        return {"status": "queued", "queued": len(records)}
    finally:
        db.close()
