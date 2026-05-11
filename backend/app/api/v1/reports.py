from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.pdf_generator import generate_audit_report
from app.database import get_db
from app.models.audit import Audit
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/audits/{audit_id}/pdf")
def download_audit_pdf(
    audit_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    pdf_bytes = generate_audit_report(audit)
    filename = f"audit-{audit.title.lower().replace(' ', '-')}-{audit_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
