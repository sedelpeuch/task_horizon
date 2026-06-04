"""Pydantic schemas for API requests/responses."""

import base64
from datetime import datetime

from pydantic import BaseModel, EmailStr, model_validator


class UserCreate(BaseModel):
    """User creation schema."""

    name: str
    email: EmailStr
    avatar_url: str | None = None


class UserUpdate(BaseModel):
    """User update schema."""

    name: str | None = None
    email: EmailStr | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    """User response schema."""

    id: str
    name: str
    email: str
    avatar_url: str | None = None
    avatar_mime_type: str | None = None
    avatar_data: bytes | str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def encode_avatar(self):
        """Convert bytes avatar_data to base64 string."""
        if isinstance(self.avatar_data, bytes):
            mime_type = self.avatar_mime_type or "image/jpeg"
            self.avatar_data = (
                f"data:{mime_type};base64,{base64.b64encode(self.avatar_data).decode()}"
            )
        return self


class ColumnResponse(BaseModel):
    """Column response schema."""

    id: str
    name: str
    position: int
    color: str | None = "#3b82f6"

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    """Task creation schema."""

    title: str
    description: str | None = None
    column_id: str
    assignee_id: str | None = None
    due_date: datetime | None = None
    priority: str | None = None
    labels: list[str] = []


class TaskUpdate(BaseModel):
    """Task update schema."""

    title: str | None = None
    description: str | None = None
    column_id: str | None = None
    assignee_id: str | None = None
    position: int | None = None
    due_date: datetime | None = None
    priority: str | None = None
    labels: list[str] | None = None


class TaskResponse(BaseModel):
    """Task response schema."""

    id: str
    title: str
    description: str | None
    column_id: str
    assignee_id: str | None
    position: int
    due_date: datetime | None = None
    priority: str | None = None
    labels: list[str] = []
    created_at: datetime
    updated_at: datetime
    assignee: UserResponse | None = None

    model_config = {"from_attributes": True}


class LabelCreate(BaseModel):
    """Label creation schema."""

    name: str
    color: str = "#8b5cf6"


class LabelUpdate(BaseModel):
    """Label update schema."""

    name: str | None = None
    color: str | None = None


class LabelResponse(BaseModel):
    """Label response schema."""

    id: str
    name: str
    color: str

    model_config = {"from_attributes": True}


class TaskMoveSchema(BaseModel):
    """Schema for moving tasks between columns."""

    column_id: str
    position: int
