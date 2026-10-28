"""Signed repository events, one-time OAuth state and mail opt-in contracts."""

import hashlib
import hmac
import json
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlsplit

import pytest

from app.config.settings import settings
from app.models.integration import GitHubIntegration, GitHubOAuthState, WebhookDelivery
from app.models.notification import NotificationPreference, NotificationOutbox
from app.models.scan import Scan
from app.models.user import User
from app.security.secrets import encrypt_secret, get_secret
from app.services.github_credentials import get_github_token
from .test_workflow_contracts import workflow


def registered(db):
    item = GitHubIntegration(id="integration", repository_id="repo", external_repository_id="123",
                             webhook_secret=encrypt_secret("webhook-secret"), active=True)
    db.add(item)
    db.commit()
    return item


def signed(payload, delivery="delivery-1", event="push"):
    content = json.dumps(payload).encode()
    signature = "sha256=" + hmac.new(b"webhook-secret", content, hashlib.sha256).hexdigest()
    return content, {"X-Hub-Signature-256": signature, "X-GitHub-Delivery": delivery,
                     "X-GitHub-Event": event, "Content-Type": "application/json"}


def push_payload():
    return {"repository": {"id": 123, "full_name": "example/fixture"},
            "ref": "refs/heads/develop", "after": "a" * 40, "deleted": False}


def test_webhook_registration_requires_verified_admin(workflow):
    client, _ = workflow
    response = MagicMock(status_code=200)
    response.json.return_value = {"id": 123, "full_name": "example/fixture", "permissions": {"push": True}}
    with patch("app.routers.integrations.requests.get", return_value=response):
        assert client.post("/api/integrations/github/repositories/repo").status_code == 403


def test_registration_secret_returned_once_and_owner_bound(workflow):
    client, db = workflow
    response = MagicMock(status_code=200)
    response.json.return_value = {"id": 123, "full_name": "example/fixture", "permissions": {"admin": True}}
    with patch("app.routers.integrations.requests.get", return_value=response):
        created = client.post("/api/integrations/github/repositories/repo")
        assert created.status_code == 200
        assert client.post("/api/integrations/github/repositories/repo").status_code == 409
        assert client.post("/api/integrations/github/repositories/private").status_code == 404
    data = created.json()
    row = db.get(GitHubIntegration, data["id"])
    assert get_secret(row.webhook_secret) == data["webhook_secret"]
    assert "webhook_secret" not in client.get("/api/integrations/github/repositories").json()[0]


def test_invalid_webhook_signature_never_queues(workflow):
    client, db = workflow
    registered(db)
    content, headers = signed(push_payload())
    with patch("app.routers.integrations.celery_client.send_task") as dispatch:
        response = client.post("/api/integrations/github/webhook/integration", content=content + b" ", headers=headers)
    assert response.status_code == 403
    dispatch.assert_not_called()
    assert db.query(Scan).count() == 0


def test_push_tracks_exact_sha_and_deduplicates_delivery_and_payload(workflow):
    client, db = workflow
    registered(db)
    content, headers = signed(push_payload())
    with patch("app.routers.integrations.celery_client.send_task") as dispatch:
        created = client.post("/api/integrations/github/webhook/integration", content=content, headers=headers)
        duplicate = client.post("/api/integrations/github/webhook/integration", content=content, headers=headers)
        replay_headers = {**headers, "X-GitHub-Delivery": "forged-new-delivery"}
        replay = client.post("/api/integrations/github/webhook/integration", content=content, headers=replay_headers)
    assert created.json()["status"] == "queued"
    assert duplicate.json()["status"] == replay.json()["status"] == "duplicate"
    assert db.query(Scan).one().requested_commit == "a" * 40
    assert db.query(Scan).one().branch == "develop"
    assert db.query(WebhookDelivery).count() == 1
    dispatch.assert_called_once()


def test_signed_payload_cannot_claim_another_repository(workflow):
    client, db = workflow
    registered(db)
    payload = push_payload()
    payload["repository"]["id"] = 999
    content, headers = signed(payload)
    assert client.post("/api/integrations/github/webhook/integration", content=content, headers=headers).status_code == 403
    assert db.query(Scan).count() == 0


def test_fork_pr_is_explicitly_ignored(workflow):
    client, db = workflow
    registered(db)
    payload = {"repository": {"id": 123, "full_name": "example/fixture"}, "action": "opened",
               "pull_request": {"head": {"ref": "feature", "sha": "a" * 40, "repo": {"id": 999}}}}
    content, headers = signed(payload, event="pull_request")
    response = client.post("/api/integrations/github/webhook/integration", content=content, headers=headers)
    assert response.json()["status"] == "ignored"
    assert db.query(Scan).count() == 0


def test_webhook_queue_error_is_truthful(workflow):
    client, db = workflow
    registered(db)
    content, headers = signed(push_payload())
    with patch("app.routers.integrations.celery_client.send_task", side_effect=RuntimeError("offline")):
        assert client.post("/api/integrations/github/webhook/integration", content=content, headers=headers).status_code == 503
    assert db.query(WebhookDelivery).one().status == "failed"
    assert db.query(Scan).one().stage == "failed"


def configure_oauth(monkeypatch):
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "client-id")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr(settings, "GITHUB_OAUTH_REDIRECT_URL", "https://sentinel.example/api/integrations/github/oauth/callback")


def test_oauth_requires_configured_credentials(workflow, monkeypatch):
    client, _ = workflow
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "")
    assert client.get("/api/integrations/github/oauth/start").status_code == 503


def test_oauth_state_one_time_pkce_and_encrypted_token(workflow, monkeypatch):
    client, db = workflow
    configure_oauth(monkeypatch)
    started = client.get("/api/integrations/github/oauth/start").json()
    query = parse_qs(urlsplit(started["authorization_url"]).query)
    assert query["code_challenge_method"] == ["S256"]
    state = query["state"][0]
    row = db.get(GitHubOAuthState, hashlib.sha256(state.encode()).hexdigest())
    assert row.code_verifier.startswith("enc:v1:")
    response = MagicMock()
    response.json.return_value = {"access_token": "real-oauth-token", "expires_in": 3600,
                                  "refresh_token": "refresh-secret", "refresh_token_expires_in": 7200}
    with patch("app.routers.integrations.requests.post", return_value=response) as exchange:
        connected = client.get("/api/integrations/github/oauth/callback", params={"state": state, "code": "code"}, follow_redirects=False)
        repeated = client.get("/api/integrations/github/oauth/callback", params={"state": state, "code": "code"}, follow_redirects=False)
    assert connected.status_code == 303 and connected.headers["location"].endswith("github=connected")
    assert repeated.status_code == 400
    assert exchange.call_args.kwargs["data"]["code_verifier"] == get_secret(row.code_verifier)
    assert get_secret(db.get(User, "owner").github_token) == "real-oauth-token"
    assert "real-oauth-token" not in connected.headers["location"]


def test_expired_oauth_state_rejected(workflow, monkeypatch):
    client, db = workflow
    configure_oauth(monkeypatch)
    state = parse_qs(urlsplit(client.get("/api/integrations/github/oauth/start").json()["authorization_url"]).query)["state"][0]
    db.get(GitHubOAuthState, hashlib.sha256(state.encode()).hexdigest()).expires_at = datetime.utcnow() - timedelta(minutes=1)
    db.commit()
    assert client.get("/api/integrations/github/oauth/callback", params={"state": state, "code": "x"}).status_code == 400


def test_expiring_oauth_grant_refreshes_without_committing_callers_transaction(workflow, monkeypatch):
    _, db = workflow
    configure_oauth(monkeypatch)
    user = db.get(User, "owner")
    user.github_token_expires_at = datetime.utcnow() - timedelta(seconds=1)
    user.github_refresh_token = encrypt_secret("old-refresh")
    response = MagicMock()
    response.json.return_value = {"access_token": "new-token", "refresh_token": "new-refresh", "expires_in": 3600}
    with patch("app.services.github_credentials.requests.post", return_value=response), patch.object(db, "commit") as commit:
        assert get_github_token(user, db) == "new-token"
    commit.assert_not_called()


def test_notification_preferences_are_opt_in_and_persisted(workflow):
    client, db = workflow
    assert client.get("/api/notifications/preferences").json()["email_enabled"] is False
    response = client.put("/api/notifications/preferences", json={"email_enabled": True, "high_severity_only": True})
    assert response.status_code == 200
    assert db.get(NotificationPreference, "owner").high_severity_only is True
    assert client.get("/api/notifications/preferences").json()["email_enabled"] is True


def test_unknown_delivery_retry_requires_duplicate_risk_confirmation(workflow, monkeypatch):
    client, db = workflow
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example")
    monkeypatch.setattr(settings, "SMTP_FROM", "sentinel@example.com")
    db.add(NotificationOutbox(id="mail", user_id="owner", event_type="scan_completed", recipient="owner@example.com",
                              subject="Scan finished", body="Details", status="unknown"))
    db.commit()
    assert client.post("/api/notifications/outbox/mail/retry", json={}).status_code == 409
    with patch("app.routers.notifications.celery_client.send_task") as dispatch:
        response = client.post("/api/notifications/outbox/mail/retry", json={"confirm_duplicate_risk": True})
    assert response.json()["status"] == "pending"
    dispatch.assert_called_once()
