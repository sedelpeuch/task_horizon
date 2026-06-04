"""Database models for TaskHorizon."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""


class User(Base):
    """User model."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    avatar_mime_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="image/jpeg"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="assignee",
        foreign_keys="Task.assignee_id",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, name={self.name}, email={self.email})>"


class Column(Base):
    """Kanban column model."""

    __tablename__ = "columns"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    position: Mapped[int] = mapped_column(nullable=False, index=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True, default="#3b82f6")

    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="column")

    def __repr__(self) -> str:
        return f"<Column(id={self.id}, name={self.name}, position={self.position})>"


class Task(Base):
    """Task model."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    column_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("columns.id"),
        nullable=False,
        index=True,
    )
    assignee_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    position: Mapped[int] = mapped_column(nullable=False, default=0)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    column: Mapped[Column] = relationship("Column", back_populates="tasks")
    assignee: Mapped[User | None] = relationship(
        "User",
        back_populates="tasks",
        foreign_keys=[assignee_id],
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, title={self.title}, column_id={self.column_id})>"
