from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.audit import Audit, AuditTemplate, ChecklistItem, TemplateItem
from app.models.user import User
from app.schemas.audit import (
    AuditCreate,
    AuditListItem,
    AuditRead,
    AuditTemplateCreate,
    AuditTemplateRead,
    AuditUpdate,
    ChecklistItemRead,
    ChecklistItemUpdate,
)

router = APIRouter(prefix="/audits", tags=["audits"])


# ── Templates ──────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=list[AuditTemplateRead])
def list_templates(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(AuditTemplate).all()


@router.post("/templates", response_model=AuditTemplateRead, status_code=201)
def create_template(
    payload: AuditTemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    tmpl = AuditTemplate(name=payload.name, category=payload.category, description=payload.description)
    db.add(tmpl)
    db.flush()
    for i, item in enumerate(payload.items):
        db.add(TemplateItem(template_id=tmpl.id, text=item["text"], category=item.get("category"), order=i))
    db.commit()
    db.refresh(tmpl)
    return tmpl


# ── Audits ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AuditListItem])
def list_audits(
    status: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Audit)
    if status:
        q = q.filter(Audit.status == status)
    if category:
        q = q.filter(Audit.category == category)
    audits = q.order_by(Audit.created_at.desc()).all()
    result = []
    for audit in audits:
        item = AuditListItem.model_validate(audit)
        item.checklist_items_count = len(audit.checklist_items)
        item.open_actions_count = sum(1 for a in audit.action_items if a.status in ("open", "in_progress"))
        result.append(item)
    return result


@router.post("/", response_model=AuditRead, status_code=201)
def create_audit(
    payload: AuditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audit = Audit(
        title=payload.title,
        description=payload.description,
        location=payload.location,
        category=payload.category,
        template_id=payload.template_id,
        created_by_id=current_user.id,
        assigned_to_id=payload.assigned_to_id,
        scheduled_date=payload.scheduled_date,
    )
    db.add(audit)
    db.flush()

    # If template provided and no manual items, copy template items
    if payload.template_id and not payload.checklist_items:
        tmpl = db.query(AuditTemplate).filter(AuditTemplate.id == payload.template_id).first()
        if tmpl:
            for i, ti in enumerate(tmpl.items):
                db.add(ChecklistItem(audit_id=audit.id, text=ti.text, category=ti.category, order=i))
    else:
        for i, ci in enumerate(payload.checklist_items):
            db.add(ChecklistItem(audit_id=audit.id, text=ci.text, category=ci.category, order=i))

    db.commit()
    db.refresh(audit)
    return audit


@router.get("/{audit_id}", response_model=AuditRead)
def get_audit(audit_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit


@router.patch("/{audit_id}", response_model=AuditRead)
def update_audit(
    audit_id: UUID,
    payload: AuditUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(audit, field, value)
    db.commit()
    db.refresh(audit)
    return audit


@router.delete("/{audit_id}", status_code=204)
def delete_audit(audit_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    db.delete(audit)
    db.commit()


# ── Checklist items ────────────────────────────────────────────────────────────

@router.patch("/{audit_id}/items/{item_id}", response_model=ChecklistItemRead)
def update_checklist_item(
    audit_id: UUID,
    item_id: UUID,
    payload: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(ChecklistItem).filter(
        ChecklistItem.id == item_id, ChecklistItem.audit_id == audit_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item
