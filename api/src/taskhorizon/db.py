"""Database configuration and session management."""

from os import getenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from taskhorizon.models import Column, User

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
    """Seed default data. Schema migrations are handled by Alembic."""
    from taskhorizon.auth import hash_password

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

        admin_email = getenv("ADMIN_EMAIL")
        admin_password = getenv("ADMIN_PASSWORD")
        if admin_email and admin_password:
            from taskhorizon.auth import verify_password

            existing = db.query(User).filter(User.is_admin == True).first()  # noqa: E712
            if not existing:
                admin = User(
                    name="Admin",
                    email=admin_email,
                    password_hash=hash_password(admin_password),
                    is_admin=True,
                )
                db.add(admin)
                db.commit()
            elif not verify_password(admin_password, existing.password_hash):
                existing.password_hash = hash_password(admin_password)
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
