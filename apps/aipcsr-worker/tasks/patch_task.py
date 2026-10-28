"""Validate snapshot-bound patches and open real GitHub draft pull requests."""

import base64
from datetime import timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import quote, urlparse

import requests
from celery import shared_task

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
for relative in ("apps/aipcsr-api", "core/db-core", "core/ai-core", "core/scanner-core"):
    sys.path.insert(0, os.path.join(base_dir, relative))


def _repository_name(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.removesuffix(".git").rstrip("/")
    if (parsed.scheme != "https" or parsed.netloc != "github.com"
            or parsed.query or parsed.fragment
            or not re.fullmatch(r"/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", path)):
        raise ValueError("Only HTTPS GitHub repository URLs are supported")
    return path[1:]


def _github(session: requests.Session, method: str, url: str, **kwargs) -> dict | list:
    response = session.request(method, url, timeout=(5, 30), **kwargs)
    if response.status_code >= 400:
        raise ValueError(f"GitHub {method} request failed (HTTP {response.status_code})")
    return response.json()


def _rescan_patch(content: str, path: str, rule_id: str) -> dict:
    """Re-run configured scanners on an isolated file, never repository commands."""
    from orchestrator import ScannerOrchestrator
    with tempfile.TemporaryDirectory(prefix="sentinel_patch_validation_") as directory:
        target = Path(directory, path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        result = ScannerOrchestrator().scan(directory)
    engines = result.get("engines_results", {})
    bandit = next((value for name, value in engines.items()
                   if "bandit" in name.lower() or value.get("engine") == "bandit"), None)
    if (result.get("status") != "success" or not bandit
            or bandit.get("status") != "success"):
        raise ValueError("Patch validation scanners did not all complete successfully")
    target_rule = rule_id.split(":", 1)[-1]
    if any(str(finding.get("rule_id", "")).split(":", 1)[-1] == target_rule
           for finding in result.get("vulnerabilities", [])):
        raise ValueError("The original security rule still reports a finding after the patch")
    return {"status": "passed", "checks": ["exact_diff_context", "python_ast", "security_rescan"]}


def _git_file_mode(session: requests.Session, api: str, root_tree: str, path: str) -> str:
    """Read tree entries to preserve file mode and reject symlink targets."""
    tree_sha = root_tree
    parts = path.split("/")
    for index, part in enumerate(parts):
        tree = _github(session, "GET", f"{api}/git/trees/{tree_sha}")
        entry = next((item for item in tree.get("tree", []) if item["path"] == part), None)
        if not entry:
            raise ValueError("Scanned file no longer exists in the source tree")
        if index == len(parts) - 1:
            if entry["type"] != "blob" or entry.get("mode") not in {"100644", "100755"}:
                raise ValueError("Only regular source files can be patched")
            return entry["mode"]
        if entry["type"] != "tree":
            raise ValueError("Patch path contains a non-directory entry")
        tree_sha = entry["sha"]
    raise ValueError("Invalid source tree path")


def _draft_pr(session: requests.Session, api: str, name: str, scan, vuln, content: str) -> str:
    """Create deterministic Git objects so retries cannot overwrite a different patch."""
    path = vuln.file_path
    branch = scan.branch
    if not branch or not re.fullmatch(r"[0-9a-fA-F]{40}", scan.commit_hash or ""):
        raise ValueError("The scan has no complete branch and commit snapshot; run a new scan")
    base_ref_url = f"{api}/git/ref/heads/{quote(branch, safe='')}"
    base_ref = _github(session, "GET", base_ref_url)
    if base_ref["object"]["sha"] != scan.commit_hash:
        raise ValueError("Repository branch changed since this scan; run a new scan before patching")
    file_data = _github(
        session, "GET", f"{api}/contents/{quote(path, safe='/')}",
        params={"ref": scan.commit_hash},
    )
    if file_data.get("type") != "file" or file_data.get("encoding") != "base64":
        raise ValueError("The scanned source is not an editable regular GitHub file")
    remote_source = base64.b64decode(file_data["content"], validate=False).decode("utf-8")
    if remote_source != vuln.source_content:
        raise ValueError("GitHub source does not match the captured scan snapshot")
    commit = _github(session, "GET", f"{api}/git/commits/{scan.commit_hash}")
    tree_sha = commit["tree"]["sha"]
    mode = _git_file_mode(session, api, tree_sha, path)
    blob = _github(session, "POST", f"{api}/git/blobs", json={"content": content, "encoding": "utf-8"})
    tree = _github(session, "POST", f"{api}/git/trees", json={
        "base_tree": tree_sha,
        "tree": [{"path": path, "mode": mode, "type": "blob", "sha": blob["sha"]}],
    })
    created_at = scan.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    author = {"name": "SentinelAI", "email": "noreply@sentinelai.local", "date": created_at.isoformat()}
    patched_commit = _github(session, "POST", f"{api}/git/commits", json={
        "message": f"Security patch: {vuln.rule_id}",
        "tree": tree["sha"], "parents": [scan.commit_hash],
        "author": author, "committer": author,
    })
    branch_name = f"sentinelai/patch-{vuln.id}"
    ref_response = session.request(
        "POST", f"{api}/git/refs", timeout=(5, 30),
        json={"ref": f"refs/heads/{branch_name}", "sha": patched_commit["sha"]},
    )
    if ref_response.status_code == 422:
        existing_ref = _github(session, "GET", f"{api}/git/ref/heads/{quote(branch_name, safe='')}")
        if existing_ref["object"]["sha"] != patched_commit["sha"]:
            raise ValueError("An existing patch branch contains different changes; review it manually")
    elif ref_response.status_code != 201:
        raise ValueError(f"GitHub could not create the patch branch (HTTP {ref_response.status_code})")
    # Recheck before opening a PR because validation and Git object creation take time.
    latest = _github(session, "GET", base_ref_url)
    if latest["object"]["sha"] != scan.commit_hash:
        raise ValueError("Repository branch changed during validation; run a new scan")
    existing = _github(session, "GET", f"{api}/pulls", params={
        "state": "open", "head": f"{name.split('/')[0]}:{branch_name}", "base": branch,
    })
    if existing:
        pr = existing[0]
    else:
        pr = _github(session, "POST", f"{api}/pulls", json={
            "title": f"Security patch: {vuln.rule_id}",
            "body": (
                f"Security finding: {vuln.rule_id}\n\n"
                f"Source commit: {scan.commit_hash}\n\n"
                "Validated with exact diff matching, Python syntax parsing and a security re-scan. "
                "Repository tests have not been executed. Review and run your project's checks before merging."
            ),
            "head": branch_name, "base": branch, "draft": True,
        })
    url = pr.get("html_url", "")
    if not re.fullmatch(rf"https://github\.com/{re.escape(name)}/pull/\d+", url):
        raise ValueError("GitHub did not return a valid pull request URL")
    return url


@shared_task(bind=True)
def apply_patch(self, vuln_id: str) -> dict:
    """Create a reviewable draft PR only for a valid, re-scanned snapshot patch."""
    from session import SessionLocal
    from app.models.vulnerability import Vulnerability, PatchStatus
    from app.models.report import Report
    from app.models.scan import Scan, ScanStatus
    from app.models.repository import Repository
    from app.models.user import User
    from app.services.github_credentials import get_github_token
    from patch_generator import apply_unified_diff, source_hash, validate_source

    db = SessionLocal()
    vuln = None
    analysis = None
    try:
        # Serializes duplicate delivery on PostgreSQL for the entire external operation.
        vuln = db.query(Vulnerability).filter(Vulnerability.id == vuln_id).with_for_update().first()
        if not vuln:
            raise ValueError("Vulnerability not found")
        if vuln.patch_status == PatchStatus.PR_OPENED:
            previous = json.loads(vuln.ai_patch_code or "{}")
            if previous.get("pr_url") and previous.get("validation", {}).get("status") == "passed":
                return {"vuln_id": vuln_id, "status": "pr_opened", "pr_url": previous["pr_url"]}
            raise ValueError("Stored patch has no verified PR; run a new scan")
        if vuln.patch_status == PatchStatus.APPLIED:
            raise ValueError("Legacy patch success cannot be verified; run a new scan")
        report = db.query(Report).filter(Report.id == vuln.report_id).first()
        scan = db.query(Scan).filter(Scan.id == report.scan_id).first() if report else None
        repo = db.query(Repository).filter(Repository.id == scan.repository_id).first() if scan else None
        user = db.query(User).filter(User.id == repo.owner_id).first() if repo else None
        token = get_github_token(user, db) if user and user.github_token else ""
        if not token or token == "dummy_token":
            raise ValueError("A valid GitHub integration token is required to open a draft PR")
        if not scan or scan.status != ScanStatus.COMPLETED or not scan.commit_hash:
            raise ValueError("A completed source scan with a pinned commit is required")
        analysis = json.loads(vuln.ai_patch_code or "{}")
        if (not isinstance(analysis, dict) or analysis.get("status") != "available"
                or not analysis.get("fix") or not vuln.source_content
                or analysis.get("source_sha") != scan.commit_hash
                or analysis.get("source_hash") != source_hash(vuln.source_content)):
            raise ValueError("No validated AI patch tied to this source snapshot; run a new scan")
        updated = apply_unified_diff(vuln.source_content, analysis["fix"], vuln.file_path)
        validate_source(updated, vuln.file_path)
        self.update_state(state="PROGRESS", meta={"status": "validating_patch"})
        vuln.patch_status = PatchStatus.VALIDATING
        analysis["validation"] = _rescan_patch(updated, vuln.file_path, vuln.rule_id)
        name = _repository_name(repo.url)
        with requests.Session() as client:
            client.headers.update({
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            })
            pr_url = _draft_pr(client, f"https://api.github.com/repos/{name}", name, scan, vuln, updated)
        analysis["pr_url"] = pr_url
        vuln.ai_patch_code = json.dumps(analysis)
        vuln.patch_status = PatchStatus.PR_OPENED
        vuln.patch_error = None
        db.commit()
        return {"vuln_id": vuln_id, "status": "pr_opened", "pr_url": pr_url}
    except Exception as exc:
        db.rollback()
        if vuln:
            error = str(exc) if isinstance(exc, ValueError) else "Patch validation or GitHub operation failed; no success was recorded"
            vuln.patch_status = PatchStatus.FAILED
            vuln.patch_error = error
            if isinstance(analysis, dict):
                analysis["validation"] = {"status": "failed", "checks": [], "error": error}
                vuln.ai_patch_code = json.dumps(analysis)
            db.commit()
        raise
    finally:
        db.close()
