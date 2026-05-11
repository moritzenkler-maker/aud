from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.audit import Audit
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/audits/{audit_id}/summarize")
async def summarize_audit(
    audit_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI not configured")

    import anthropic

    items_text = "\n".join(
        f"- {item.text}: {item.status}" + (f" (Kommentar: {item.comment})" if item.comment else "")
        for item in audit.checklist_items
    )
    nok_items = [i for i in audit.checklist_items if i.status == "nok"]
    nok_text = "\n".join(f"- {i.text}: {i.comment or 'Kein Kommentar'}" for i in nok_items)

    prompt = f"""Du bist ein Audit-Experte. Analysiere folgendes Audit und erstelle eine professionelle Zusammenfassung auf Deutsch.

Audit: {audit.title}
Kategorie: {audit.category}
Standort: {audit.location or 'nicht angegeben'}
Status: {audit.status}

Checklisten-Punkte:
{items_text or 'Keine Punkte vorhanden'}

Nicht-konforme Punkte (NOK):
{nok_text or 'Keine nicht-konformen Punkte'}

Erstelle:
1. Eine kurze Executive Summary (2-3 Sätze)
2. Die wichtigsten Feststellungen
3. Empfehlungen für Maßnahmen
4. Risikoeinschätzung (niedrig/mittel/hoch/kritisch)

Halte die Antwort prägnant und professionell."""

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    summary = message.content[0].text

    audit.ai_summary = summary
    db.commit()

    return {"summary": summary}
