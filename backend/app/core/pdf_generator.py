import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.audit import Audit

STATUS_LABELS = {
    "ok": "OK",
    "nok": "NOK",
    "na": "N/A",
    "open": "Offen",
}

STATUS_COLORS = {
    "ok": colors.HexColor("#16a34a"),
    "nok": colors.HexColor("#dc2626"),
    "na": colors.HexColor("#6b7280"),
    "open": colors.HexColor("#d97706"),
}

PRIORITY_LABELS = {
    "low": "Niedrig",
    "medium": "Mittel",
    "high": "Hoch",
    "critical": "Kritisch",
}

PRIORITY_COLORS = {
    "low": colors.HexColor("#16a34a"),
    "medium": colors.HexColor("#d97706"),
    "high": colors.HexColor("#ea580c"),
    "critical": colors.HexColor("#dc2626"),
}


def generate_audit_report(audit: Audit) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    brand_color = colors.HexColor("#1d4ed8")

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        textColor=brand_color,
        fontSize=22,
        spaceAfter=4,
    )
    heading2 = ParagraphStyle(
        "Heading2",
        parent=styles["Heading2"],
        textColor=brand_color,
        fontSize=14,
        spaceBefore=12,
        spaceAfter=4,
    )
    normal = styles["Normal"]
    small = ParagraphStyle("Small", parent=normal, fontSize=9, textColor=colors.HexColor("#6b7280"))

    story = []

    # Header
    story.append(Paragraph("AuditFlow", title_style))
    story.append(Paragraph(f"Audit-Report: {audit.title}", heading2))
    story.append(HRFlowable(width="100%", thickness=2, color=brand_color))
    story.append(Spacer(1, 6 * mm))

    # Meta info table
    meta = [
        ["Standort:", audit.location or "—", "Status:", audit.status.upper()],
        ["Kategorie:", audit.category.capitalize(), "Erstellt am:", audit.created_at.strftime("%d.%m.%Y")],
        ["Erstellt von:", audit.created_by.full_name, "Zugewiesen an:", audit.assigned_to.full_name if audit.assigned_to else "—"],
    ]
    if audit.completed_date:
        meta.append(["Abgeschlossen:", audit.completed_date.strftime("%d.%m.%Y"), "", ""])

    meta_table = Table(meta, colWidths=[40 * mm, 60 * mm, 40 * mm, 60 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#374151")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8 * mm))

    # AI Summary
    if audit.ai_summary:
        story.append(Paragraph("KI-Zusammenfassung", heading2))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 3 * mm))
        for line in audit.ai_summary.split("\n"):
            if line.strip():
                story.append(Paragraph(line, normal))
                story.append(Spacer(1, 2 * mm))
        story.append(Spacer(1, 4 * mm))

    # Checklist
    if audit.checklist_items:
        story.append(Paragraph("Checkliste", heading2))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 3 * mm))

        # Stats row
        total = len(audit.checklist_items)
        ok_count = sum(1 for i in audit.checklist_items if i.status == "ok")
        nok_count = sum(1 for i in audit.checklist_items if i.status == "nok")
        na_count = sum(1 for i in audit.checklist_items if i.status == "na")
        open_count = sum(1 for i in audit.checklist_items if i.status == "open")

        stats_data = [
            [f"Gesamt: {total}", f"OK: {ok_count}", f"NOK: {nok_count}", f"N/A: {na_count}", f"Offen: {open_count}"]
        ]
        stats_table = Table(stats_data, colWidths=[38 * mm] * 5)
        stats_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f3f4f6")),
            ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#dcfce7")),
            ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#fee2e2")),
            ("BACKGROUND", (3, 0), (3, 0), colors.HexColor("#f3f4f6")),
            ("BACKGROUND", (4, 0), (4, 0), colors.HexColor("#fef3c7")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROUNDEDCORNERS", [3]),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 4 * mm))

        checklist_data = [["#", "Prüfpunkt", "Status", "Kommentar"]]
        for idx, item in enumerate(audit.checklist_items, 1):
            checklist_data.append([
                str(idx),
                item.text,
                STATUS_LABELS.get(item.status, item.status),
                item.comment or "—",
            ])

        cl_table = Table(checklist_data, colWidths=[10 * mm, 80 * mm, 20 * mm, 60 * mm])
        cl_style = [
            ("BACKGROUND", (0, 0), (-1, 0), brand_color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
        for idx, item in enumerate(audit.checklist_items, 1):
            color = STATUS_COLORS.get(item.status)
            if color:
                cl_style.append(("TEXTCOLOR", (2, idx), (2, idx), color))
                cl_style.append(("FONTNAME", (2, idx), (2, idx), "Helvetica-Bold"))

        cl_table.setStyle(TableStyle(cl_style))
        story.append(cl_table)
        story.append(Spacer(1, 8 * mm))

    # Action Items
    if audit.action_items:
        story.append(Paragraph("Maßnahmen", heading2))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 3 * mm))

        action_data = [["Titel", "Priorität", "Status", "Zugewiesen an", "Fällig"]]
        for action in audit.action_items:
            action_data.append([
                action.title,
                PRIORITY_LABELS.get(action.priority, action.priority),
                action.status.replace("_", " ").capitalize(),
                action.assigned_to.full_name if action.assigned_to else "—",
                action.due_date.strftime("%d.%m.%Y") if action.due_date else "—",
            ])

        act_table = Table(action_data, colWidths=[60 * mm, 22 * mm, 22 * mm, 40 * mm, 26 * mm])
        act_style = [
            ("BACKGROUND", (0, 0), (-1, 0), brand_color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
        ]
        for idx, action in enumerate(audit.action_items, 1):
            pcolor = PRIORITY_COLORS.get(action.priority)
            if pcolor:
                act_style.append(("TEXTCOLOR", (1, idx), (1, idx), pcolor))
                act_style.append(("FONTNAME", (1, idx), (1, idx), "Helvetica-Bold"))

        act_table.setStyle(TableStyle(act_style))
        story.append(act_table)
        story.append(Spacer(1, 8 * mm))

    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        f"Erstellt mit AuditFlow · {datetime.now().strftime('%d.%m.%Y %H:%M')} Uhr",
        small,
    ))

    doc.build(story)
    return buffer.getvalue()
