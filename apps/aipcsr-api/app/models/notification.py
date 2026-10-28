"""Opt-in notification preferences and durable mail delivery state."""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UniqueConstraint
from app.models.base import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    user_id = Column(String, primary_key=True)
    email_enabled = Column(Boolean, default=False, nullable=False)
    high_severity_only = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class NotificationOutbox(Base):
    __tablename__ = "notification_outbox"
    __table_args__ = (UniqueConstraint("user_id", "scan_id", "event_type", name="uq_notification_event"),)
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    scan_id = Column(String, nullable=True, index=True)
    event_type = Column(String, nullable=False)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String, default="pending", nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    next_attempt_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at = Column(DateTime, nullable=True)
