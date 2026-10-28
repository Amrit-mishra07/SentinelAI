"""Opt-in, durable, failure-aware email delivery without real outbound messages."""
from datetime import datetime
from pathlib import Path
import sys
from unittest.mock import MagicMock
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[3]
for path in ("apps/aipcsr-worker", "apps/aipcsr-api", "core/db-core"):
    sys.path.insert(0, str(ROOT / path))
from app.models.base import Base
from app.models.user import User
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.report import Report, SeverityLevel
from app.models.notification import NotificationPreference, NotificationOutbox
from tasks import notification_task as task


@pytest.fixture
def outbox(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        db.add_all([User(id="u", email="owner@example.com", hashed_password="x"),
                    Repository(id="r", name="owner/repo", url="https://github.com/owner/repo", owner_id="u"),
                    Scan(id="s", repository_id="r", branch="main", commit_hash="a"*40, status=ScanStatus.COMPLETED),
                    Report(id="p", scan_id="s", status="ready", severity=SeverityLevel.HIGH, vulnerabilities_count=2),
                    NotificationPreference(user_id="u", email_enabled=True)])
        db.commit()
    import session
    from app.config.settings import settings
    monkeypatch.setattr(session, "SessionLocal", factory)
    monkeypatch.setattr(settings, "SMTP_HOST", "mail.example.com")
    monkeypatch.setattr(settings, "SMTP_FROM", "scan@example.com")
    monkeypatch.setattr(settings, "SMTP_USERNAME", "")
    monkeypatch.setattr(settings, "SMTP_USE_TLS", True)
    fake = MagicMock()
    fake.__enter__.return_value = fake
    fake.send_message.return_value = {}
    monkeypatch.setattr(task.smtplib, "SMTP", lambda *args, **kwargs: fake)
    yield factory, fake
    engine.dispose()


def create_event(factory):
    with factory() as db:
        row = task.enqueue_scan_notification(db, db.get(Scan, "s"), db.get(Repository, "r"), db.get(Report, "p"))
        db.commit()
        return row.id if row else None


def test_outbox_is_idempotent_and_smtp_success_is_verified(outbox):
    factory, smtp = outbox
    first = create_event(factory)
    assert create_event(factory) == first
    assert task.send_notification.run(first)["status"] == "sent"
    assert task.send_notification.run(first)["status"] == "not_pending"
    smtp.starttls.assert_called_once()
    smtp.send_message.assert_called_once()
    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "owner@example.com"
    assert message["Message-ID"].endswith("@sentinelai.local>")
    with factory() as db:
        row = db.get(NotificationOutbox, first)
        assert row.sent_at
        assert row.attempts == 1


def test_optout_suppresses_queued_delivery(outbox):
    factory, smtp = outbox
    identity = create_event(factory)
    with factory() as db:
        db.get(NotificationPreference, "u").email_enabled = False
        db.commit()
    assert task.send_notification.run(identity)["status"] == "suppressed"
    smtp.send_message.assert_not_called()


def test_high_severity_only_preference_filters_low_findings(outbox):
    factory, smtp = outbox
    with factory() as db:
        db.get(NotificationPreference, "u").high_severity_only = True
        db.get(Report, "p").severity = SeverityLevel.LOW
        db.commit()
    assert create_event(factory) is None


def test_provider_missing_does_not_claim_delivery(outbox, monkeypatch):
    factory, smtp = outbox
    from app.config.settings import settings
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    identity = create_event(factory)
    assert task.send_notification.run(identity)["status"] == "provider_unavailable"
    smtp.send_message.assert_not_called()
    with factory() as db:
        assert db.get(NotificationOutbox, identity).status == "pending"


def test_pre_acceptance_error_can_retry_but_uncertain_send_cannot(outbox):
    factory, smtp = outbox
    identity = create_event(factory)
    smtp.starttls.side_effect = OSError("handshake failed")
    assert task.send_notification.run(identity)["status"] == "failed"
    with factory() as db:
        row = db.get(NotificationOutbox, identity)
        assert row.next_attempt_at > datetime.utcnow()
        row.next_attempt_at = datetime.utcnow()
        db.commit()
    smtp.starttls.side_effect = None
    smtp.send_message.side_effect = OSError("connection lost after DATA")
    assert task.send_notification.run(identity)["status"] == "unknown"
    smtp.send_message.reset_mock()
    assert task.send_notification.run(identity)["status"] == "not_pending"
    smtp.send_message.assert_not_called()


@pytest.mark.parametrize("broker_available", [True, False])
def test_signed_webhook_outbox_recovers_dispatch(outbox, monkeypatch, broker_available):
    from app.models.integration import GitHubIntegration, WebhookDelivery
    from tasks import integration_task, scan_task
    factory, _ = outbox
    with factory() as db:
        db.get(Scan, "s").status = ScanStatus.PENDING
        db.add(GitHubIntegration(id="i", repository_id="r", external_repository_id="123",
                                 webhook_secret="secret", active=True))
        db.add(WebhookDelivery(delivery_id="d", integration_id="i", payload_digest="a" * 64,
                               scan_id="s", status="received"))
        db.commit()
    dispatch = MagicMock(side_effect=None if broker_available else RuntimeError("broker unavailable"))
    monkeypatch.setattr(scan_task.scan_repository, "delay", dispatch)
    result = integration_task.dispatch_received_webhooks.run()
    assert result["queued"] == int(broker_available)
    with factory() as db:
        delivery = db.get(WebhookDelivery, "d")
        assert delivery.status == ("queued" if broker_available else "received")
    dispatch.assert_called_once_with("s", "https://github.com/owner/repo")
