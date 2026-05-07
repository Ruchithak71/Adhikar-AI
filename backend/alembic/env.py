"""
Alembic migration environment.
target_metadata is wired to Base.metadata so --autogenerate works correctly.
"""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Load .env before importing models so DATABASE_URL is set
import os
from dotenv import load_dotenv
load_dotenv()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Wire up our SQLAlchemy models so autogenerate can diff them
from db.database import Base
import db.models_sql  # noqa: F401 — registers all ORM models

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url") or os.getenv("DATABASE_URL")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Override sqlalchemy.url from environment so alembic.ini doesn't need hardcoded creds
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = os.getenv(
        "DATABASE_URL",
        configuration.get("sqlalchemy.url", ""),
    )
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
