"""Verified GitHub connections, one-time OAuth state and webhook deduplication."""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, String, Text, UniqueConstraint
from app.models.base import Base


class GitHubIntegration(Base):
    __tablename__ = "github_integrations"
    id = Column(String, primary_key=True)
    repository_id = Column(String, unique=True, nullable=False, index=True)
    external_repository_id = Column(String, nullable=False)
    webhook_secret = Column(Text, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    __table_args__ = (UniqueConstraint("integration_id", "payload_digest", name="uq_webhook_payload"),)
    delivery_id = Column(String(128), primary_key=True)
    integration_id = Column(String, nullable=False, index=True)
    payload_digest = Column(String(64), nullable=False)
    status = Column(String, default="received", nullable=False)
    scan_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class GitHubOAuthState(Base):
    __tablename__ = "github_oauth_states"
    id = Column(String(64), primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    code_verifier = Column(Text, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
