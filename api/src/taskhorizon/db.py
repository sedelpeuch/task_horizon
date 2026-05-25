"""Database configuration and session management."""

from os import getenv

from sqlalchemy import create_engine
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
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Seed default columns if they don't exist
    db = SessionLocal()
    try:
        if db.query(Column).count() == 0:
            columns = [
                Column(name="Todo", position=0),
                Column(name="In Progress", position=1),
                Column(name="Done", position=2),
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
