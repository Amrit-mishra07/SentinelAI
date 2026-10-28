"""Verified webhooks, OAuth state and notification outbox.

Revision ID: 804b489f9f3f
Revises: 704b489f9f3f
"""
from alembic import op
import sqlalchemy as sa

revision = "804b489f9f3f"
down_revision = "704b489f9f3f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scans", sa.Column("requested_commit", sa.String(), nullable=True))
    op.add_column("users", sa.Column("github_refresh_token", sa.Text()))
    op.add_column("users", sa.Column("github_token_expires_at", sa.DateTime()))
    op.add_column("users", sa.Column("github_refresh_expires_at", sa.DateTime()))
    op.create_table("github_integrations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("repository_id", sa.String(), nullable=False, unique=True),
        sa.Column("external_repository_id", sa.String(), nullable=False),
        sa.Column("webhook_secret", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("verified_at", sa.DateTime(), nullable=False))
    op.create_index("ix_github_integrations_repository_id", "github_integrations", ["repository_id"])
    op.create_table("webhook_deliveries",
        sa.Column("delivery_id", sa.String(128), primary_key=True),
        sa.Column("integration_id", sa.String(), nullable=False),
        sa.Column("payload_digest", sa.String(64), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("scan_id", sa.String()), sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("integration_id", "payload_digest", name="uq_webhook_payload"))
    op.create_index("ix_webhook_deliveries_integration_id", "webhook_deliveries", ["integration_id"])
    op.create_table("github_oauth_states",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("code_verifier", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_github_oauth_states_user_id", "github_oauth_states", ["user_id"])
    op.create_table("notification_preferences",
        sa.Column("user_id", sa.String(), primary_key=True),
        sa.Column("email_enabled", sa.Boolean(), nullable=False),
        sa.Column("high_severity_only", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False))
    op.create_table("notification_outbox",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("scan_id", sa.String()),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("recipient", sa.String(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text()), sa.Column("next_attempt_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("sent_at", sa.DateTime()),
        sa.UniqueConstraint("user_id", "scan_id", "event_type", name="uq_notification_event"))
    op.create_index("ix_notification_outbox_user_id", "notification_outbox", ["user_id"])
    op.create_index("ix_notification_outbox_scan_id", "notification_outbox", ["scan_id"])


def downgrade() -> None:
    for table in ("notification_outbox", "notification_preferences", "github_oauth_states",
                  "webhook_deliveries", "github_integrations"):
        op.drop_table(table)
    op.drop_column("scans", "requested_commit")
    op.drop_column("users", "github_refresh_expires_at")
    op.drop_column("users", "github_token_expires_at")
    op.drop_column("users", "github_refresh_token")
