"""Persist scan stages, report readiness, source snapshots and patch states.

Revision ID: 704b489f9f3f
Revises: 604b489f9f3f
"""
from alembic import op
import sqlalchemy as sa

revision = "704b489f9f3f"
down_revision = "604b489f9f3f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scans", sa.Column("stage", sa.String(), nullable=False, server_default="pending"))
    op.add_column("scans", sa.Column("engine_results", sa.JSON(), nullable=True))
    op.add_column("reports", sa.Column("status", sa.String(), nullable=False, server_default="pending"))
    op.add_column("reports", sa.Column("error_message", sa.Text(), nullable=True))
    op.add_column("vulnerabilities", sa.Column("source_content", sa.Text(), nullable=True))
    op.add_column("vulnerabilities", sa.Column("source_context", sa.Text(), nullable=True))
    if op.get_bind().dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            for label in ("VALIDATING", "PR_OPENED", "FAILED"):
                op.execute(sa.text(f"ALTER TYPE patchstatus ADD VALUE IF NOT EXISTS '{label}'"))


def downgrade() -> None:
    # PostgreSQL enum labels remain for existing patch records.
    op.drop_column("vulnerabilities", "source_context")
    op.drop_column("vulnerabilities", "source_content")
    op.drop_column("reports", "error_message")
    op.drop_column("reports", "status")
    op.drop_column("scans", "engine_results")
    op.drop_column("scans", "stage")
