

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/adhikarai",
)

# Fail early with a clear message rather than a cryptic SQLAlchemy error
if not DATABASE_URL:
    print(
        "ERROR: DATABASE_URL is not set. "
        "Copy .env.example to .env and fill in your PostgreSQL credentials.",
        file=sys.stderr,
    )
    sys.exit(1)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,   # detect stale connections
    pool_recycle=300,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Called once at app startup."""
    from db import models_sql  # noqa: F401 — registers all ORM models with Base
    Base.metadata.create_all(bind=engine)
