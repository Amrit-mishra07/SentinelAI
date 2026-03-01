import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── project imports ──────────────────────────────────────────────
# prepend_sys_path in alembic.ini adds:
#   "."           → core/db-core  (so we can import base, session)
#   "../.."       → project root
#   "../../apps/aipcsr-api" → so we can import app.*
from app.config.settings import settings
from app.models.base import Base            # single shared Base

# Import every model so Base.metadata knows about all tables
from app.models import User, Scan, Report, Repository, Vulnerability  # noqa: F401

# ── Alembic boilerplate ─────────────────────────────────────────
config = context.config

# Override sqlalchemy.url with the real DATABASE_URL from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
