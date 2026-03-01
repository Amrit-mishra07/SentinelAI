"""initial_schema

Revision ID: 0581089702af
Revises: 
Create Date: 2026-03-01 11:30:25.021164

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0581089702af'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all initial tables."""

    # --- users ---
    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('hashed_password', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # --- repositories ---
    op.create_table(
        'repositories',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('owner_id', sa.String(), nullable=True),
        sa.Column('default_branch', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_repositories_id'), 'repositories', ['id'], unique=False)
    op.create_index(op.f('ix_repositories_name'), 'repositories', ['name'], unique=False)
    op.create_index(op.f('ix_repositories_owner_id'), 'repositories', ['owner_id'], unique=False)

    # --- scans ---
    scanstatus = sa.Enum('PENDING', 'SCANNING', 'COMPLETED', 'FAILED', name='scanstatus')
    scanstatus.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'scans',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('repository_id', sa.String(), nullable=True),
        sa.Column('branch', sa.String(), nullable=True),
        sa.Column('commit_hash', sa.String(), nullable=True),
        sa.Column('status', scanstatus, nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_scans_id'), 'scans', ['id'], unique=False)
    op.create_index(op.f('ix_scans_repository_id'), 'scans', ['repository_id'], unique=False)

    # --- reports ---
    severitylevel = sa.Enum('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', name='severitylevel')
    severitylevel.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'reports',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('scan_id', sa.String(), nullable=True),
        sa.Column('vulnerabilities_count', sa.Integer(), nullable=True, default=0),
        sa.Column('severity', severitylevel, nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_reports_id'), 'reports', ['id'], unique=False)
    op.create_index(op.f('ix_reports_scan_id'), 'reports', ['scan_id'], unique=False)

    # --- vulnerabilities ---
    op.create_table(
        'vulnerabilities',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('report_id', sa.String(), nullable=True),
        sa.Column('rule_id', sa.String(), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(), nullable=True),
        sa.Column('line_number', sa.Integer(), nullable=True),
        sa.Column('severity', severitylevel, nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_vulnerabilities_id'), 'vulnerabilities', ['id'], unique=False)
    op.create_index(op.f('ix_vulnerabilities_report_id'), 'vulnerabilities', ['report_id'], unique=False)
    op.create_index(op.f('ix_vulnerabilities_rule_id'), 'vulnerabilities', ['rule_id'], unique=False)


def downgrade() -> None:
    """Drop all initial tables."""
    op.drop_table('vulnerabilities')
    op.drop_table('reports')
    op.drop_table('scans')
    op.drop_table('repositories')
    op.drop_table('users')

    sa.Enum(name='scanstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='severitylevel').drop(op.get_bind(), checkfirst=True)
