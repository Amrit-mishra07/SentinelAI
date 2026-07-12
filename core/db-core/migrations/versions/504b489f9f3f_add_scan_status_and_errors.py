"""add last_scan_at and error_message columns

Revision ID: 504b489f9f3f
Revises: 490b379f9f3f
Create Date: 2026-07-12 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '504b489f9f3f'
down_revision: Union[str, None] = '490b379f9f3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to repositories table
    op.add_column('repositories', sa.Column('last_scan_at', sa.DateTime(), nullable=True))
    op.add_column('repositories', sa.Column('last_scan_severity', sa.String(), nullable=True))
    
    # Add columns to scans table
    op.add_column('scans', sa.Column('error_message', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove columns from repositories table
    op.drop_column('repositories', 'last_scan_at')
    op.drop_column('repositories', 'last_scan_severity')
    
    # Remove columns from scans table
    op.drop_column('scans', 'error_message')
