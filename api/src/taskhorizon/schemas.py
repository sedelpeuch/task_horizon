"""Pydantic schemas for API requests/responses."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """User creation schema."""

    name: str
    email: EmailStr


class UserUpdate(BaseModel):
    """User update schema."""

    name: str | None = None
    email: EmailStr | None = None


class UserResponse(BaseModel):
    """User response schema."""

    id: str
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ColumnResponse(BaseModel):
    """Column response schema."""

    id: str
    name: str
    position: int

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    """Task creation schema."""

    title: str
    description: str | None = None
    column_id: str
    assignee_id: str | None = None


class TaskUpdate(BaseModel):
    """Task update schema."""

    title: str | None = None
    description: str | None = None
    column_id: str | None = None
    assignee_id: str | None = None
    position: int | None = None


class TaskResponse(BaseModel):
    """Task response schema."""

    id: str
    title: str
    description: str | None
    column_id: str
    assignee_id: str | None
    position: int
    created_at: datetime
    updated_at: datetime
    assignee: UserResponse | None = None

    model_config = {"from_attributes": True}


class TaskMoveSchema(BaseModel):
    """Schema for moving tasks between columns."""

    column_id: str
    position: int
