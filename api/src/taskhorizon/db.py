"""Database configuration and session management."""

from os import getenv

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from taskhorizon.models import Base, Column

# Database URL from environment or default
DATABASE_URL = getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost/taskhorizon",
)

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=getenv("SQL_ECHO", "false").lower() == "true",
    pool_size=10,
    max_overflow=20,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables and seed default data."""
    Base.metadata.create_all(bind=engine)

    # Add color column if it doesn't exist (migration for existing tables)
    with engine.connect() as conn:
        conn.execute(
            text("ALTER TABLE columns ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#3b82f6'")
        )
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(10)"))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS labels JSON DEFAULT '[]'"))
        conn.commit()

    db = SessionLocal()
    try:
        if db.query(Column).count() == 0:
            columns = [
                Column(name="Todo", position=0, color="#3b82f6"),
                Column(name="In Progress", position=1, color="#f59e0b"),
                Column(name="Done", position=2, color="#10b981"),
            ]
            db.add_all(columns)
            db.commit()
    finally:
        db.close()


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
