"""Column endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from taskhorizon.db import get_db
from taskhorizon.models import Column
from taskhorizon.schemas import ColumnResponse

router = APIRouter(prefix="/columns", tags=["columns"])


@router.get("/", response_model=list[ColumnResponse])
def list_columns(db: Session = Depends(get_db)):
    """List all columns."""
    columns = db.query(Column).order_by(Column.position).all()
    return columns
