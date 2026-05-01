"""
Simple PDF report generator using ReportLab.
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable


RISK_COLORS = {
    "low": colors.HexColor("#22c55e"),
    "moderate": colors.HexColor("#f59e0b"),
    "high": colors.HexColor("#ef4444"),
    "severe": colors.HexColor("#dc2626"),
}


def generate_pdf(report: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("Title2", parent=styles["Title"], fontSize=20, textColor=colors.HexColor("#6366f1"), spaceAfter=5*mm))
    styles.add(ParagraphStyle("Section", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#6366f1"), spaceBefore=6*mm, spaceAfter=3*mm))
    styles.add(ParagraphStyle("Small", parent=styles["Normal"], fontSize=9, textColor=colors.gray))

    elements = []

    # Header
    elements.append(Paragraph("Multi-Organ Diabetes Risk Assessment", styles["Title2"]))
    elements.append(Paragraph(f"Session: {report.get('session_id', 'N/A')} | Generated: {datetime.utcnow().strftime('%B %d, %Y %H:%M UTC')}", styles["Small"]))
    elements.append(Spacer(1, 5*mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.gray))

    # Overall
    risk = report.get("overallRisk", "moderate")
    score = report.get("overallScore", 0)
    rc = RISK_COLORS.get(risk, colors.gray)
    elements.append(Paragraph("Overall Risk", styles["Section"]))
    t = Table([["Risk Level", risk.upper()], ["Score", f"{score} / 100"]], colWidths=[120, 200])
    t.setStyle(TableStyle([
        ("TEXTCOLOR", (1, 0), (1, 0), rc),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
    ]))
    elements.append(t)

    # Organs
    for organ in report.get("organs", []):
        oc = RISK_COLORS.get(organ.get("risk", "moderate"), colors.gray)
        elements.append(Paragraph(f"{organ['name']} — <font color='{oc.hexval()}'>{organ.get('risk', '').upper()}</font> (Score: {organ.get('score', 0)})", styles["Section"]))
        for f in organ.get("findings", []):
            elements.append(Paragraph(f"• {f}", styles["Normal"]))
        avs = organ.get("abnormalValues", [])
        if avs:
            rows = [["Marker", "Value", "Normal"]]
            for av in avs:
                rows.append([av["name"], av["value"], av["normal"]])
            t = Table(rows, colWidths=[120, 100, 140])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            elements.append(Spacer(1, 2*mm))
            elements.append(t)
        if organ.get("explanation"):
            elements.append(Spacer(1, 2*mm))
            elements.append(Paragraph(f"<i>{organ['explanation']}</i>", styles["Small"]))
        elements.append(Spacer(1, 3*mm))

    # Recommendations
    recs = report.get("recommendations", {})
    if recs.get("referrals"):
        elements.append(Paragraph("Specialist Referrals", styles["Section"]))
        for r in recs["referrals"]:
            elements.append(Paragraph(f"• <b>{r['specialist']}</b> — {r['urgency']} ({r['reason']})", styles["Normal"]))
    if recs.get("lifestyle"):
        elements.append(Paragraph("Lifestyle Recommendations", styles["Section"]))
        for l in recs["lifestyle"]:
            elements.append(Paragraph(f"• {l}", styles["Normal"]))

    # Disclaimer
    elements.append(Spacer(1, 10*mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.gray))
    elements.append(Paragraph(
        "<b>Disclaimer:</b> This report is AI-generated for informational purposes only. "
        "It does not constitute medical advice. Consult a qualified healthcare professional.",
        styles["Small"],
    ))

    doc.build(elements)
    return buf.getvalue()
