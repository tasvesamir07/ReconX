import os
import io
import uuid
import hashlib
import html
from typing import Any, List, Optional
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.evidence import Evidence
from app.models.report import Report
from app.models.base import utc_now
from app.config import settings

SEV_COLORS = {"critical": "#dc2626", "high": "#ea580c", "medium": "#d97706", "low": "#0284c7", "informational": "#64748b"}
CLASS_TITLES = [
    ("vulnerability", "Vulnerabilities", "Exploitable flaws: confirmed on the target, or matched to a vulnerability database by exact version."),
    ("hardening", "Hardening Gaps", "Missing or weak defences. Not directly exploitable, but they increase the impact of other issues."),
    ("inventory", "Attack Surface Inventory", "Facts about the exposed surface, for context and follow-up testing."),
]
SOURCE_LABELS = {"check": "ReconX check", "nvd": "NVD version match", "osv": "OSV version match", "nuclei": "Nuclei active verification",
                 "nvd+nuclei": "NVD match + Nuclei verified", "osv+nuclei": "OSV match + Nuclei verified"}


def safe_text(val: Any) -> str:
    return html.escape(str(val)) if val is not None else ""


class ReportGeneratorService:
    @staticmethod
    def generate_report(db: Session, scan_id: uuid.UUID) -> Report:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise ValueError("Scan not found.")
        from app.services.findings_engine import sort_key
        findings = sorted(db.query(Finding).filter(Finding.scan_id == scan_id).all(), key=sort_key)
        manifest_row = (db.query(Evidence)
                        .filter(Evidence.scan_id == scan_id, Evidence.evidence_type == "engine.manifest").first())
        manifest = manifest_row.normalized_data if manifest_row else None

        pdf_bytes = ReportGeneratorService._build_pdf(scan, findings, manifest)
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()
        os.makedirs(settings.STORAGE_DIR, exist_ok=True)
        file_path = os.path.join(settings.STORAGE_DIR, f"reconx_report_{scan.id}.pdf")
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        report = Report(scan_id=scan.id, status="completed", format="pdf", storage_path=file_path,
                        content_hash=content_hash, generated_at=utc_now())
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def _build_pdf(scan: Scan, findings: List[Finding], manifest: Optional[dict] = None) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40,
                                title=f"ReconX report {scan.target_url}")
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("T", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=20, leading=24,
                                     textColor=colors.HexColor("#0f172a"), spaceAfter=4)
        subtitle_style = ParagraphStyle("S", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=13,
                                        textColor=colors.HexColor("#64748b"), spaceAfter=12)
        h1 = ParagraphStyle("H1", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, leading=17,
                            textColor=colors.HexColor("#0f172a"), spaceBefore=14, spaceAfter=6)
        h2 = ParagraphStyle("H2", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=14,
                            textColor=colors.HexColor("#0f172a"), spaceBefore=8, spaceAfter=2)
        body = ParagraphStyle("B", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=12,
                              textColor=colors.HexColor("#334155"))
        small = ParagraphStyle("Sm", parent=body, fontSize=7.5, leading=10, textColor=colors.HexColor("#64748b"))
        bold = ParagraphStyle("Bo", parent=body, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e293b"))
        grid = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 4),
        ])

        story: list = [
            Paragraph("ReconX Web Security Assessment Report", title_style),
            Paragraph(f"Assessment ID {scan.id} &bull; generated {utc_now().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style),
            HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=10),
        ]
        meta = [
            [Paragraph("Target", bold), Paragraph(safe_text(scan.target_url), body), Paragraph("Resolved IP", bold), Paragraph(safe_text(scan.resolved_ip or "N/A"), body)],
            [Paragraph("Preset", bold), Paragraph(safe_text(scan.preset.capitalize()), body), Paragraph("Time budget", bold), Paragraph(f"{scan.budget_seconds_snapshot}s", body)],
            [Paragraph("Started", bold), Paragraph(scan.started_at.strftime("%Y-%m-%d %H:%M UTC") if scan.started_at else "N/A", body),
             Paragraph("Status", bold), Paragraph(safe_text(scan.status.capitalize()), body)],
        ]
        t = Table(meta, colWidths=[70, 195, 70, 195])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                               ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                               ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                               ("PADDING", (0, 0), (-1, -1), 4)]))
        story += [t, Spacer(1, 6)]

        # 1. Executive summary
        story.append(Paragraph("1. Executive Summary", h1))
        summary = scan.executive_summary
        if summary and summary.get("paragraphs"):
            for p in summary["paragraphs"]:
                story.append(Paragraph(safe_text(p.get("text", "")), body))
                story.append(Spacer(1, 4))
            label = "Written by AI and validated against the findings below" if summary.get("source") == "ai" else "Generated from the findings below"
            story.append(Paragraph(f"<i>{label}. References such as [F1] point to findings in section 3.</i>", small))
        counts = {}
        for f in findings:
            counts.setdefault(f.finding_class or "vulnerability", {}).setdefault(f.severity, 0)
            counts[f.finding_class or "vulnerability"][f.severity] += 1
        rows = [[Paragraph(x, bold) for x in ("Class", "Critical", "High", "Medium", "Low", "Info")]]
        for cls, title, _ in CLASS_TITLES:
            c = counts.get(cls, {})
            rows.append([Paragraph(title, body)] + [Paragraph(str(c.get(s, 0)), body) for s in ("critical", "high", "medium", "low", "informational")])
        ct = Table(rows, colWidths=[150, 76, 76, 76, 76, 76])
        ct.setStyle(grid)
        story += [Spacer(1, 6), ct]

        # 2. Coverage
        story.append(Paragraph("2. Methodology &amp; Coverage", h1))
        story.append(Paragraph(
            "Checks run from a fixed plan for the selected preset (Normal &sub; Moderate &sub; Ultimate). Detected software versions are "
            "matched against the NVD CVE database and OSV.dev; a CVE is reported only when the database lists the exact detected version "
            "as affected (confidence <b>likely</b>). Issues observed directly or verified by an active non-destructive check are "
            "<b>confirmed</b>. CISA KEV and FIRST EPSS add exploitation context. No AI model decides what is tested or what is reported.",
            body))
        if manifest and manifest.get("outcomes"):
            rows = [[Paragraph(x, bold) for x in ("Check", "Result", "Note")]]
            for o in manifest["outcomes"]:
                state = {"ok": "Completed", "skipped": "Skipped", "error": "Failed"}.get(o.get("status"), o.get("status"))
                rows.append([Paragraph(safe_text(o.get("title")), body), Paragraph(state, body),
                             Paragraph(safe_text(o.get("reason") or f"{o.get('duration', 0)}s"), small)])
            cov = Table(rows, colWidths=[230, 70, 230])
            cov.setStyle(grid)
            story += [Spacer(1, 6), cov]

        # 3. Findings
        story.append(Paragraph("3. Findings", h1))
        if not findings:
            story.append(Paragraph("No findings were produced by the checks that ran.", body))
        refs = {v: k for k, v in ((summary or {}).get("refs") or {}).items()}
        index = 0
        for cls, title, intro in CLASS_TITLES:
            group = [f for f in findings if (f.finding_class or "vulnerability") == cls]
            if not group:
                continue
            story.append(Paragraph(f"{title} ({len(group)})", h2))
            story.append(Paragraph(intro, small))
            story.append(Spacer(1, 4))
            for f in group:
                index += 1
                ref = refs.get(str(f.id))
                color = SEV_COLORS.get(f.severity, "#64748b")
                head = (f"<font color='{color}'><b>{safe_text(f.severity.upper())}</b></font> &nbsp;<b>{index}. {safe_text(f.title)}</b>"
                        + (f" &nbsp;<font color='#64748b'>[{ref}]</font>" if ref else ""))
                block = [Paragraph(head, body)]
                facts = [f"Confidence: <b>{safe_text(f.confidence)}</b>", f"Source: {safe_text(SOURCE_LABELS.get(f.source or 'check', f.source))}"]
                if f.component:
                    facts.append(f"Component: {safe_text(f.component)}")
                if f.cvss_score is not None:
                    facts.append(f"CVSS {f.cvss_score}" + (f" ({safe_text(f.cvss_vector)})" if f.cvss_vector else ""))
                if f.epss_score is not None:
                    facts.append(f"EPSS {f.epss_score * 100:.1f}%")
                if f.is_kev:
                    facts.append("<font color='#dc2626'><b>CISA KEV: known exploited</b></font>")
                block.append(Paragraph(" &bull; ".join(facts), small))
                block.append(Paragraph(f"<b>Observation:</b> {safe_text(f.description)}", body))
                block.append(Paragraph(f"<b>Impact:</b> {safe_text(f.impact)}", body))
                block.append(Paragraph(f"<b>Remediation:</b> {safe_text(f.remediation)}", body))
                if f.references:
                    block.append(Paragraph("<b>References:</b> " + ", ".join(safe_text(r) for r in f.references[:5]), small))
                block.append(Spacer(1, 7))
                story.append(KeepTogether(block))

        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=12, spaceAfter=8))
        story.append(Paragraph(
            "<b>Disclaimer:</b> Time-bounded, non-destructive automated assessment performed under an approved authorization. "
            "Version-based matches (confidence 'likely') can be false positives where vendors backport fixes without changing version "
            "numbers. The absence of a finding does not prove the absence of a vulnerability; see Coverage for checks that did not run.",
            ParagraphStyle("Disc", parent=small, fontSize=7, leading=9, textColor=colors.HexColor("#94a3b8"))))
        doc.build(story)
        return buffer.getvalue()
