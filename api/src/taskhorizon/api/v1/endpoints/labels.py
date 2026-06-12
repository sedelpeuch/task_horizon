"""Label endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from taskhorizon.db import get_db
from taskhorizon.models import Label
from taskhorizon.schemas import LabelCreate, LabelResponse, LabelUpdate

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelResponse])
def list_labels(db: Session = Depends(get_db)):
    """List all labels."""
    return db.query(Label).order_by(Label.name).all()


@router.post("", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
def create_label(label_data: LabelCreate, db: Session = Depends(get_db)):
    """Create a new label."""
    existing = db.query(Label).filter(Label.name == label_data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Label already exists")
    label = Label(name=label_data.name.strip().lower(), color=label_data.color)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.put("/{label_id}", response_model=LabelResponse)
def update_label(label_id: str, label_data: LabelUpdate, db: Session = Depends(get_db)):
    """Update a label."""
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    if label_data.name is not None:
        label.name = label_data.name.strip().lower()
    if label_data.color is not None:
        label.color = label_data.color
    db.commit()
    db.refresh(label)
    return label


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(label_id: str, db: Session = Depends(get_db)):
    """Delete a label."""
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    db.delete(label)
    db.commit()
