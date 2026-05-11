from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.action_item import ActionItem
from app.models.audit import Audit
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total_audits = db.query(Audit).count()
    audits_by_status = {
        "draft": db.query(Audit).filter(Audit.status == "draft").count(),
        "in_progress": db.query(Audit).filter(Audit.status == "in_progress").count(),
        "completed": db.query(Audit).filter(Audit.status == "completed").count(),
        "archived": db.query(Audit).filter(Audit.status == "archived").count(),
    }
    total_actions = db.query(ActionItem).count()
    actions_by_status = {
        "open": db.query(ActionItem).filter(ActionItem.status == "open").count(),
        "in_progress": db.query(ActionItem).filter(ActionItem.status == "in_progress").count(),
        "done": db.query(ActionItem).filter(ActionItem.status == "done").count(),
    }
    critical_actions = db.query(ActionItem).filter(
        ActionItem.priority == "critical", ActionItem.status.in_(["open", "in_progress"])
    ).count()

    recent_audits = (
        db.query(Audit).order_by(Audit.created_at.desc()).limit(5).all()
    )

    return {
        "total_audits": total_audits,
        "audits_by_status": audits_by_status,
        "total_actions": total_actions,
        "actions_by_status": actions_by_status,
        "critical_actions": critical_actions,
        "recent_audits": [
            {
                "id": str(a.id),
                "title": a.title,
                "status": a.status,
                "category": a.category,
                "created_at": a.created_at.isoformat(),
            }
            for a in recent_audits
        ],
    }
