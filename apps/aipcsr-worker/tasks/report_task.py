import sys
import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(base_dir, 'apps', 'aipcsr-api'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'db-core'))

from celery import shared_task

@shared_task(bind=True)
def generate_report(self, report_id: str):
    from session import SessionLocal
    from app.models.report import Report
    from app.models.scan import Scan, ScanStatus
    from app.models.vulnerability import Vulnerability
    from app.models.repository import Repository
    from xhtml2pdf import pisa
    
    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'status': 'generating_report'})
        
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return {"error": "Report not found"}
            
        scan = db.query(Scan).filter(Scan.id == report.scan_id).first()
        if not scan:
            return {"error": "Scan not found"}
            
        repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()
        repo_name = repo.name if repo else "Local Repository"
            
        vulns = db.query(Vulnerability).filter(Vulnerability.report_id == report_id).all()
        
        # Calculate severities count
        critical_count = sum(1 for v in vulns if str(v.severity).split(".")[-1].lower() == "critical")
        high_count = sum(1 for v in vulns if str(v.severity).split(".")[-1].lower() == "high")
        medium_count = sum(1 for v in vulns if str(v.severity).split(".")[-1].lower() == "medium")
        low_count = sum(1 for v in vulns if str(v.severity).split(".")[-1].lower() == "low")
        
        # Build HTML content for the PDF report
        html_template = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Helvetica, Arial, sans-serif; color: #333333; line-height: 1.4; }}
                h1 {{ color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }}
                h2 {{ color: #1e293b; margin-top: 20px; }}
                .meta-table {{ width: 100%; margin-bottom: 20px; border-collapse: collapse; }}
                .meta-table td {{ padding: 8px; border: 1px solid #e2e8f0; }}
                .meta-label {{ font-weight: bold; background-color: #f8fafc; width: 30%; }}
                .severity-box {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
                .critical {{ background-color: #fef2f2; color: #dc2626; }}
                .high {{ background-color: #fff7ed; color: #ea580c; }}
                .medium {{ background-color: #fefce8; color: #ca8a04; }}
                .low {{ background-color: #f0fdf4; color: #16a34a; }}
                .vuln-item {{ border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 15px; page-break-inside: avoid; }}
                .vuln-header {{ font-weight: bold; font-size: 15px; margin-bottom: 8px; }}
                .vuln-meta {{ font-size: 13px; color: #64748b; margin-bottom: 8px; }}
                .vuln-desc {{ font-size: 14px; margin-bottom: 10px; }}
                .code-block {{ background-color: #f8fafc; border: 1px solid #e2e8f0; font-family: monospace; font-size: 12px; padding: 8px; white-space: pre-wrap; }}
            </style>
        </head>
        <body>
            <h1>SentinelAI Security Assessment Report</h1>
            
            <h2>Executive Summary</h2>
            <table class="meta-table">
                <tr>
                    <td class="meta-label">Repository</td>
                    <td>{repo_name}</td>
                </tr>
                <tr>
                    <td class="meta-label">Branch</td>
                    <td>{scan.branch or "main"}</td>
                </tr>
                <tr>
                    <td class="meta-label">Commit Hash</td>
                    <td>{scan.commit_hash or "—"}</td>
                </tr>
                <tr>
                    <td class="meta-label">Total Findings</td>
                    <td>{len(vulns)}</td>
                </tr>
                <tr>
                    <td class="meta-label">Severity Breakdown</td>
                    <td>
                        <span class="severity-box critical">Critical: {critical_count}</span>
                        <span class="severity-box high">High: {high_count}</span>
                        <span class="severity-box medium">Medium: {medium_count}</span>
                        <span class="severity-box low">Low: {low_count}</span>
                    </td>
                </tr>
            </table>
            
            <h2>Vulnerability Findings Details</h2>
        """
        
        if not vulns:
            html_template += "<p>No security vulnerabilities were detected during this assessment scan.</p>"
        else:
            for idx, vuln in enumerate(vulns):
                severity_val = str(vuln.severity).split(".")[-1].lower()
                html_template += f"""
                <div class="vuln-item">
                    <div class="vuln-header">
                        #{idx+1} [{severity_val.upper()}] - {vuln.rule_id}
                    </div>
                    <div class="vuln-meta">
                        File: {vuln.file_path} | Line: {vuln.line_number}
                    </div>
                    <div class="vuln-desc">
                        {vuln.message}
                    </div>
                """
                if vuln.ai_patch_code:
                    try:
                        import ast
                        patch_dict = ast.literal_eval(vuln.ai_patch_code)
                        analysis_text = patch_dict.get("analysis", "")
                        fix_text = patch_dict.get("fix", "")
                    except:
                        analysis_text = ""
                        fix_text = vuln.ai_patch_code
                        
                    if analysis_text:
                        html_template += f"""
                        <div style="font-weight: bold; font-size: 13px; margin-top: 8px;">AI Analysis:</div>
                        <div style="font-size: 13px; color: #334155; margin-bottom: 8px;">{analysis_text}</div>
                        """
                    if fix_text:
                        html_template += f"""
                        <div style="font-weight: bold; font-size: 13px;">Suggested Fix (Diff):</div>
                        <pre class="code-block">{fix_text}</pre>
                        """
                html_template += "</div>"
                
        html_template += """
        </body>
        </html>
        """
        
        # Save path in shared folder `/aipcsr-api/reports/` (mapped to api folder `/app/reports/`)
        reports_dir = "/aipcsr-api/reports"
        os.makedirs(reports_dir, exist_ok=True)
        pdf_path = os.path.join(reports_dir, f"report_{report_id}.pdf")
        
        with open(pdf_path, "wb") as f_pdf:
            pisa_status = pisa.CreatePDF(html_template, dest=f_pdf)
            
        if pisa_status.err:
            print(f"Error compiling PDF for report {report_id}")
            
        scan.status = ScanStatus.COMPLETED
        db.commit()
        
        return {"report_id": report_id, "status": "generated", "pdf_path": pdf_path}
    except Exception as e:
        print(f"Report generation task failed: {str(e)}")
        raise e
    finally:
        db.close()
