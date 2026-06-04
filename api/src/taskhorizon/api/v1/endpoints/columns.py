"""Column endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from taskhorizon.db import get_db
from taskhorizon.models import Column, Task
from taskhorizon.schemas import ColumnResponse

router = APIRouter(prefix="/columns", tags=["columns"])


class ColumnCreate(BaseModel):
    """Column creation schema."""

    name: str
    color: str | None = "#3b82f6"


@router.get("/", response_model=list[ColumnResponse])
def list_columns(db: Session = Depends(get_db)):
    """List all columns."""
    columns = db.query(Column).order_by(Column.position).all()
    return columns


@router.post("/", response_model=ColumnResponse, status_code=status.HTTP_201_CREATED)
def create_column(column_data: ColumnCreate, db: Session = Depends(get_db)):
    """Create a new column."""
    # Get max position
    max_pos = db.query(Column).order_by(Column.position.desc()).first()
    position = (max_pos.position + 1) if max_pos else 0

    db_column = Column(name=column_data.name, position=position, color=column_data.color)
    db.add(db_column)
    db.commit()
    db.refresh(db_column)
    return db_column


class ColumnUpdate(BaseModel):
    """Column update schema."""

    name: str | None = None
    color: str | None = None
    position: int | None = None


@router.put("/{column_id}", response_model=ColumnResponse)
def update_column(column_id: str, column_data: ColumnUpdate, db: Session = Depends(get_db)):
    """Update a column's name, color or position."""
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")
    if column_data.name is not None:
        column.name = column_data.name
    if column_data.color is not None:
        column.color = column_data.color
    if column_data.position is not None:
        column.position = column_data.position
    db.commit()
    db.refresh(column)
    return column


@router.delete("/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(column_id: str, db: Session = Depends(get_db)):
    """Delete a column and all its tasks."""
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found",
        )

    # Delete all tasks in this column
    db.query(Task).filter(Task.column_id == column_id).delete()

    # Shift remaining columns
    columns_to_shift = db.query(Column).filter(Column.position > column.position)
    for col in columns_to_shift:
        col.position -= 1

    db.delete(column)
    db.commit()
