import os
import io
import uuid
import hashlib
import html
from typing import Optional, Any
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.report import Report
from app.models.base import utc_now
from app.config import settings

def safe_text(val: Any) -> str:
    return html.escape(str(val)) if val is not None else ""

class ReportGeneratorService:
    @staticmethod
    def generate_report(db: Session, scan_id: uuid.UUID) -> Report:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise ValueError("Scan not found.")

        findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()

        # Generate PDF into memory or storage
        pdf_bytes = ReportGeneratorService._build_pdf(scan, findings)
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Save to storage directory
        os.makedirs(settings.STORAGE_DIR, exist_ok=True)
        filename = f"reconx_report_{scan.id}.pdf"
        file_path = os.path.join(settings.STORAGE_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        report = Report(
            scan_id=scan.id,
            status="completed",
            format="pdf",
            storage_path=file_path,
            content_hash=content_hash,
            generated_at=utc_now()
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def _build_pdf(scan: Scan, findings: list) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0891b2"),  # Cyan
            spaceAfter=6
        )

        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=15
        )

        heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=14,
            spaceAfter=8
        )

        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155")
        )

        bold_label = ParagraphStyle(
            "BoldLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1e293b")
        )

        story = []

        # 1. Title Banner
        story.append(Paragraph("ReconX Web Security Assessment Report", title_style))
        story.append(Paragraph(f"Autonomous AI-Assisted Security Assessment • Assessment ID: {scan.id}", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=15))

        # 2. Executive Scope & Metadata Table
        metadata_data = [
            [Paragraph("Target URL:", bold_label), Paragraph(scan.target_url, body_style),
             Paragraph("Resolved IP:", bold_label), Paragraph(scan.resolved_ip or "N/A", body_style)],
            [Paragraph("Scan Preset:", bold_label), Paragraph(scan.preset.capitalize(), body_style),
             Paragraph("Budget:", bold_label), Paragraph(f"{scan.budget_seconds_snapshot}s", body_style)],
            [Paragraph("Assessment Status:", bold_label), Paragraph(scan.status.capitalize(), body_style),
             Paragraph("Date Generated:", bold_label), Paragraph(scan.created_at.strftime("%Y-%m-%d %H:%M UTC"), body_style)]
        ]
        t = Table(metadata_data, colWidths=[90, 175, 90, 175])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 15))

        # 3. Executive Summary
        story.append(Paragraph("1. Executive Summary", heading_style))
        crit_count = sum(1 for f in findings if f.severity in ("critical", "high"))
        med_count = sum(1 for f in findings if f.severity == "medium")
        low_count = sum(1 for f in findings if f.severity in ("low", "informational"))

        summary_text = (
            f"An authorized web security assessment was conducted against <b>{scan.target_url}</b> using the "
            f"<b>{scan.preset.capitalize()}</b> preset profile. A total of <b>{len(findings)}</b> security observations "
            f"were identified and confirmed through collected evidence. Breakdown: {crit_count} High/Critical, "
            f"{med_count} Medium, and {low_count} Low/Informational findings. "
            f"No destructive or disruptive attacks were conducted during this evaluation."
        )
        story.append(Paragraph(summary_text, body_style))
        story.append(Spacer(1, 10))

        # 4. Summary Table of Findings
        story.append(Paragraph("2. Summary of Findings", heading_style))
        if findings:
            findings_table_data = [
                [Paragraph("Severity", bold_label),
                 Paragraph("Category", bold_label),
                 Paragraph("Title", bold_label),
                 Paragraph("Confidence", bold_label)]
            ]
            for f in findings:
                sev_color = "#dc2626" if f.severity in ("critical", "high") else ("#d97706" if f.severity == "medium" else "#2563eb")
                sev_p = Paragraph(f"<font color='{sev_color}'><b>{f.severity.upper()}</b></font>", body_style)
                findings_table_data.append([
                    sev_p,
                    Paragraph(f.category.capitalize(), body_style),
                    Paragraph(f.title, body_style),
                    Paragraph(f.confidence.capitalize(), body_style)
                ])
            ft = Table(findings_table_data, colWidths=[70, 75, 305, 80])
            ft.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(ft)
        else:
            story.append(Paragraph("No vulnerabilities or misconfigurations detected during this check budget.", body_style))
        story.append(Spacer(1, 15))

        # 5. Detailed Findings & Remediation
        story.append(Paragraph("3. Detailed Findings & Remediation Guidance", heading_style))
        for i, f in enumerate(findings, 1):
            story.append(Paragraph(f"<b>{i}. {safe_text(f.title)}</b> ({safe_text(f.severity).upper()})", bold_label))
            story.append(Paragraph(f"<b>Affected Asset:</b> {safe_text(f.affected_asset)}", body_style))
            story.append(Paragraph(f"<b>Observation:</b> {safe_text(f.description)}", body_style))
            story.append(Paragraph(f"<b>Security Impact:</b> {safe_text(f.impact)}", body_style))
            story.append(Paragraph(f"<b>Remediation:</b> {safe_text(f.remediation)}", body_style))
            if f.references:
                refs_text = ", ".join([f"<font color='#0891b2'>{safe_text(r)}</font>" for r in f.references])
                story.append(Paragraph(f"<b>References:</b> {refs_text}", body_style))
            story.append(Spacer(1, 10))

        # 6. Disclaimer
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=15, spaceAfter=10))
        disclaimer = (
            "<b>Disclaimer:</b> This report represents a time-bounded, non-destructive automated assessment "
            "conducted under authorized scope rules. The absence of findings does not guarantee complete absence "
            "of vulnerabilities. All assessment activities adhered strictly to defensive, non-exploitative security policies."
        )
        story.append(Paragraph(disclaimer, ParagraphStyle("Disc", parent=body_style, fontSize=7, leading=10, textColor=colors.HexColor("#94a3b8"))))

        doc.build(story)
        return buffer.getvalue()
