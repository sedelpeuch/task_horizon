"""Task endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from taskhorizon.auth import get_current_user
from taskhorizon.db import get_db
from taskhorizon.models import Task, User
from taskhorizon.schemas import TaskCreate, TaskMoveSchema, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    """List all tasks."""
    tasks = db.query(Task).order_by(Task.column_id, Task.position).all()
    return tasks


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Create a new task."""
    max_position = (
        db.query(Task)
        .filter(Task.column_id == task.column_id)
        .order_by(Task.position.desc())
        .first()
    )
    position = (max_position.position + 1) if max_position else 0

    db_task = Task(
        title=task.title,
        description=task.description,
        column_id=task.column_id,
        assignee_id=task.assignee_id,
        position=position,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db)):
    """Get a task by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a task. Admin can update any task; non-admin only their own."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not current_user.is_admin and task.assignee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    fields = task_update.model_fields_set
    if "title" in fields and task_update.title is not None:
        task.title = task_update.title
    if "description" in fields:
        task.description = task_update.description
    if "assignee_id" in fields:
        task.assignee_id = task_update.assignee_id
    if "due_date" in fields:
        task.due_date = task_update.due_date
    if "priority" in fields:
        task.priority = task_update.priority
    if "labels" in fields and task_update.labels is not None:
        task.labels = task_update.labels

    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/move", response_model=TaskResponse)
def move_task(
    task_id: str,
    move: TaskMoveSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a task. Admin can move any task; non-admin only their own."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not current_user.is_admin and task.assignee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    old_column_id = task.column_id
    old_position = task.position

    if old_column_id == move.column_id:
        if move.position > old_position:
            tasks_to_shift = db.query(Task).filter(
                Task.column_id == move.column_id,
                Task.position > old_position,
                Task.position <= move.position,
            )
            for t in tasks_to_shift:
                t.position -= 1
        elif move.position < old_position:
            tasks_to_shift = db.query(Task).filter(
                Task.column_id == move.column_id,
                Task.position >= move.position,
                Task.position < old_position,
            )
            for t in tasks_to_shift:
                t.position += 1
    else:
        tasks_in_old = db.query(Task).filter(
            Task.column_id == old_column_id,
            Task.position > old_position,
        )
        for t in tasks_in_old:
            t.position -= 1

        tasks_in_new = db.query(Task).filter(
            Task.column_id == move.column_id,
            Task.position >= move.position,
        )
        for t in tasks_in_new:
            t.position += 1

        task.column_id = move.column_id

    task.position = move.position
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a task. Admin can delete any task; non-admin only their own."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not current_user.is_admin and task.assignee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    column_id = task.column_id
    position = task.position

    tasks_to_shift = db.query(Task).filter(
        Task.column_id == column_id,
        Task.position > position,
    )
    for t in tasks_to_shift:
        t.position -= 1

    db.delete(task)
    db.commit()
