from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.action_item import ActionItem
from app.models.user import User
from app.schemas.action_item import ActionItemCreate, ActionItemRead, ActionItemUpdate

router = APIRouter(prefix="/actions", tags=["actions"])


@router.get("/", response_model=list[ActionItemRead])
def list_actions(
    status: str | None = None,
    priority: str | None = None,
    audit_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(ActionItem)
    if status:
        q = q.filter(ActionItem.status == status)
    if priority:
        q = q.filter(ActionItem.priority == priority)
    if audit_id:
        q = q.filter(ActionItem.audit_id == audit_id)
    return q.order_by(ActionItem.created_at.desc()).all()


@router.post("/", response_model=ActionItemRead, status_code=201)
def create_action(
    payload: ActionItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    action = ActionItem(**payload.model_dump())
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@router.get("/{action_id}", response_model=ActionItemRead)
def get_action(action_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    action = db.query(ActionItem).filter(ActionItem.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action item not found")
    return action


@router.patch("/{action_id}", response_model=ActionItemRead)
def update_action(
    action_id: UUID,
    payload: ActionItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    action = db.query(ActionItem).filter(ActionItem.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action item not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(action, field, value)
    db.commit()
    db.refresh(action)
    return action


@router.delete("/{action_id}", status_code=204)
def delete_action(action_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    action = db.query(ActionItem).filter(ActionItem.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action item not found")
    db.delete(action)
    db.commit()
