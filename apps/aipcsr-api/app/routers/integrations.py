"""Owner-verified GitHub connections and authenticated webhook delivery handling."""

import base64
import hashlib
import hmac
import json
import re
import secrets
import uuid
from datetime import datetime, timedelta
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config.celery_client import celery_client
from app.config.settings import settings
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.integration import GitHubIntegration, GitHubOAuthState, WebhookDelivery
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus
from app.models.user import User
from app.schemas.git import normalize_github_url, validate_branch
from app.security.secrets import encrypt_secret, get_secret
from app.services.github_credentials import get_github_token, save_oauth_tokens

router = APIRouter()
EVENTS = ["push", "pull_request"]
MAX_WEBHOOK_BYTES = 1024 * 1024


def webhook_url(integration_id: str) -> str:
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/api/integrations/github/webhook/{integration_id}"


def integration_response(item: GitHubIntegration) -> dict:
    return {"id": item.id, "repository_id": item.repository_id, "active": item.active,
            "webhook_url": webhook_url(item.id), "events": EVENTS,
            "created_at": item.created_at, "verified_at": item.verified_at}


def owned_repository(db: Session, repository_id: str, user_id: str) -> Repository:
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user_id).first()
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


@router.get("/github/repositories")
def list_integrations(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(GitHubIntegration).join(Repository, GitHubIntegration.repository_id == Repository.id).filter(
        Repository.owner_id == user_id
    ).all()
    return [integration_response(item) for item in items]


@router.post("/github/repositories/{repository_id}")
def register_integration(repository_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify repository administration before generating a per-repository secret."""
    repo = owned_repository(db, repository_id, user_id)
    try:
        url = normalize_github_url(repo.url)
        token = get_github_token(db.get(User, user_id), db)
        if not token or token == "dummy_token":
            raise HTTPException(status_code=400, detail="Connect GitHub in Settings first")
        response = requests.get(f"https://api.github.com/repos/{url.split('github.com/')[1]}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28"}, timeout=15, allow_redirects=False)
        if response.status_code != 200:
            raise HTTPException(status_code=403, detail="GitHub repository access could not be verified")
        details = response.json()
        if not details.get("id") or not details.get("permissions", {}).get("admin"):
            raise HTTPException(status_code=403, detail="Repository administrator permission is required to configure webhooks")
        if details.get("full_name", "").lower() != url.split("github.com/")[1].lower():
            raise HTTPException(status_code=403, detail="GitHub repository identity did not match")
        secret = secrets.token_urlsafe(32)
        encrypted = encrypt_secret(secret)
    except (requests.RequestException, ValueError, TypeError) as exc:
        raise HTTPException(status_code=503, detail="GitHub connection could not be verified; check server encryption and integration settings") from exc
    item = db.query(GitHubIntegration).filter(GitHubIntegration.repository_id == repo.id).first()
    if item and item.active:
        raise HTTPException(status_code=409, detail="Webhook is already configured; disconnect before rotating its secret")
    if item:
        item.active = True
        item.external_repository_id = str(details["id"])
        item.webhook_secret = encrypted
        item.verified_at = datetime.utcnow()
    else:
        item = GitHubIntegration(id=str(uuid.uuid4()), repository_id=repo.id,
                                 external_repository_id=str(details["id"]), webhook_secret=encrypted, active=True)
        db.add(item)
    db.commit()
    db.refresh(item)
    return {**integration_response(item), "webhook_secret": secret,
            "instructions": "Add this URL and secret in GitHub repository Settings > Webhooks; select application/json and push/pull_request events."}


@router.delete("/github/repositories/{repository_id}")
def disconnect_integration(repository_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_repository(db, repository_id, user_id)
    item = db.query(GitHubIntegration).filter(GitHubIntegration.repository_id == repository_id).first()
    if item:
        item.active = False
        db.commit()
    return {"active": False}


def event_snapshot(event: str, payload: dict, repository_id: str) -> tuple[str, str] | None:
    """Only accept branch pushes and pull requests whose head is the verified repo."""
    if event == "push":
        if payload.get("deleted") or not str(payload.get("ref", "")).startswith("refs/heads/"):
            return None
        branch, commit = payload["ref"][len("refs/heads/"):], payload.get("after", "")
    elif event == "pull_request":
        if payload.get("action") not in {"opened", "synchronize", "reopened"}:
            return None
        pull_request = payload.get("pull_request") or {}
        if not isinstance(pull_request, dict) or not isinstance(pull_request.get("head"), dict):
            raise HTTPException(status_code=422, detail="Pull request payload is invalid")
        head = pull_request["head"]
        if not isinstance(head.get("repo"), dict):
            return None
        if str((head.get("repo") or {}).get("id")) != repository_id:
            return None
        branch, commit = head.get("ref", ""), head.get("sha", "")
    else:
        return None
    if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-fA-F]{40}", commit) or commit == "0" * 40:
        raise HTTPException(status_code=422, detail="Webhook commit SHA is invalid")
    try:
        return validate_branch(branch), commit.lower()
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="Webhook branch is invalid") from exc


@router.post("/github/webhook/{integration_id}")
async def receive_webhook(integration_id: str, request: Request, db: Session = Depends(get_db)):
    integration = db.get(GitHubIntegration, integration_id)
    if integration is None or not integration.active:
        raise HTTPException(status_code=404, detail="Webhook integration not found")
    # Bound streamed input as well as Content-Length; do not buffer arbitrary payloads.
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_WEBHOOK_BYTES:
            raise HTTPException(status_code=413, detail="Webhook payload is too large")
        chunks.append(chunk)
    body = b"".join(chunks)
    signature = request.headers.get("X-Hub-Signature-256", "")
    try:
        secret = get_secret(integration.webhook_secret)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="Webhook credential cannot be decrypted") from exc
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not re.fullmatch(r"sha256=[0-9a-f]{64}", signature) or not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")
    delivery_id = request.headers.get("X-GitHub-Delivery", "")
    if not re.fullmatch(r"[A-Za-z0-9-]{1,128}", delivery_id):
        raise HTTPException(status_code=422, detail="Webhook delivery ID is missing or invalid")
    try:
        payload = json.loads(body)
        if not isinstance(payload, dict):
            raise ValueError()
    except (ValueError, UnicodeError) as exc:
        raise HTTPException(status_code=422, detail="Webhook payload must be JSON") from exc
    payload_repo = payload.get("repository") or {}
    repo = db.get(Repository, integration.repository_id)
    if (not isinstance(payload_repo, dict) or repo is None
            or str(payload_repo.get("id")) != integration.external_repository_id
            or str(payload_repo.get("full_name", "")).lower() != repo.url.split("github.com/")[-1].lower()):
        raise HTTPException(status_code=403, detail="Webhook repository identity did not match the verified integration")
    digest = hashlib.sha256(body).hexdigest()
    previous = db.query(WebhookDelivery).filter(or_(
        WebhookDelivery.delivery_id == delivery_id,
        (WebhookDelivery.integration_id == integration.id) & (WebhookDelivery.payload_digest == digest)
    )).first()
    if previous:
        return {"status": "duplicate", "delivery_status": previous.status, "scan_id": previous.scan_id}
    event = request.headers.get("X-GitHub-Event", "")
    snapshot = event_snapshot(event, payload, integration.external_repository_id)
    delivery = WebhookDelivery(delivery_id=delivery_id, integration_id=integration.id,
                               payload_digest=digest, status="received" if snapshot else "ignored")
    if snapshot:
        branch, commit = snapshot
        scan = Scan(id=str(uuid.uuid4()), repository_id=repo.id, branch=branch,
                    requested_commit=commit, status=ScanStatus.PENDING, stage="pending")
        db.add(scan)
        delivery.scan_id = scan.id
    db.add(delivery)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"status": "duplicate"}
    if not snapshot:
        return {"status": "ignored"}
    try:
        celery_client.send_task("tasks.scan_task.scan_repository",
                                kwargs={"scan_id": scan.id, "repository_url": repo.url})
        delivery.status = "queued"
        db.commit()
    except Exception:
        delivery.status = "failed"
        delivery.error_message = "Scan queue is unavailable"
        scan.status = ScanStatus.FAILED
        scan.stage = "failed"
        scan.error_message = "Webhook scan could not be queued; retry from the application"
        scan.completed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=503, detail="Webhook scan could not be queued")
    return {"status": "queued", "scan_id": scan.id}


def require_oauth() -> None:
    if not all((settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET,
                settings.GITHUB_OAUTH_REDIRECT_URL, settings.SECRETS_ENCRYPTION_KEY)):
        raise HTTPException(status_code=503, detail="GitHub OAuth is not configured on this server")


@router.get("/github/oauth/start")
def start_oauth(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    require_oauth()
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    encrypted_verifier = encrypt_secret(verifier)
    db.add(GitHubOAuthState(id=hashlib.sha256(state.encode()).hexdigest(), user_id=user_id,
                           code_verifier=encrypted_verifier,
                           expires_at=datetime.utcnow() + timedelta(minutes=10)))
    db.commit()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    query = urlencode({"client_id": settings.GITHUB_CLIENT_ID,
                       "redirect_uri": settings.GITHUB_OAUTH_REDIRECT_URL,
                       "scope": "repo", "state": state, "code_challenge": challenge,
                       "code_challenge_method": "S256"})
    return {"authorization_url": "https://github.com/login/oauth/authorize?" + query}


@router.get("/github/oauth/callback")
def oauth_callback(state: str, code: str | None = None, error: str | None = None,
                   db: Session = Depends(get_db)):
    require_oauth()
    state_id = hashlib.sha256(state.encode()).hexdigest()
    record = db.get(GitHubOAuthState, state_id)
    if record is None:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    claimed = db.query(GitHubOAuthState).filter(
        GitHubOAuthState.id == state_id, GitHubOAuthState.used_at.is_(None),
        GitHubOAuthState.expires_at > datetime.utcnow()
    ).update({GitHubOAuthState.used_at: datetime.utcnow()}, synchronize_session=False)
    db.commit()
    if not claimed:
        raise HTTPException(status_code=400, detail="OAuth state has expired or already been used")
    destination = settings.PUBLIC_BASE_URL.rstrip("/") + "/settings?github="
    if error or not code:
        return RedirectResponse(destination + "denied", status_code=303)
    try:
        token_response = requests.post("https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={"client_id": settings.GITHUB_CLIENT_ID, "client_secret": settings.GITHUB_CLIENT_SECRET,
                  "code": code, "redirect_uri": settings.GITHUB_OAUTH_REDIRECT_URL,
                  "code_verifier": get_secret(record.code_verifier)}, timeout=15)
        token_response.raise_for_status()
        data = token_response.json()
        user = db.get(User, record.user_id)
        if user is None or not user.is_active:
            raise ValueError("Account unavailable")
        save_oauth_tokens(user, data)
        db.commit()
    except (requests.RequestException, ValueError, TypeError, KeyError):
        db.rollback()
        return RedirectResponse(destination + "failed", status_code=303)
    return RedirectResponse(destination + "connected", status_code=303)
