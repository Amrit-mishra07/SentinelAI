"""Resolve encrypted PAT/OAuth credentials and refresh expiring OAuth grants."""

from datetime import datetime, timedelta

import requests
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.user import User
from app.security.secrets import encrypt_secret, get_secret


def save_oauth_tokens(user: User, data: dict) -> None:
    if not isinstance(data.get("access_token"), str) or not data["access_token"]:
        raise ValueError("GitHub did not return an access token")
    user.github_token = encrypt_secret(data["access_token"])
    user.github_refresh_token = encrypt_secret(data.get("refresh_token"))
    now = datetime.utcnow()
    user.github_token_expires_at = now + timedelta(seconds=int(data["expires_in"])) if data.get("expires_in") else None
    user.github_refresh_expires_at = now + timedelta(seconds=int(data["refresh_token_expires_in"])) if data.get("refresh_token_expires_in") else None


def get_github_token(user: User | None, db: Session) -> str:
    """Return a token without exposing it in errors; refresh only expired OAuth grants."""
    if user is None:
        return ""
    if user.github_token_expires_at and user.github_token_expires_at <= datetime.utcnow() + timedelta(seconds=30):
        if (not user.github_refresh_token or not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET
                or (user.github_refresh_expires_at and user.github_refresh_expires_at <= datetime.utcnow())):
            raise ValueError("GitHub authorization expired; reconnect GitHub in Settings")
        try:
            response = requests.post("https://github.com/login/oauth/access_token", headers={"Accept": "application/json"},
                data={"client_id": settings.GITHUB_CLIENT_ID, "client_secret": settings.GITHUB_CLIENT_SECRET,
                      "grant_type": "refresh_token", "refresh_token": get_secret(user.github_refresh_token)}, timeout=15)
            response.raise_for_status()
            save_oauth_tokens(user, response.json())
            db.flush()
        except (requests.RequestException, ValueError, TypeError, KeyError) as exc:
            db.rollback()
            raise ValueError("GitHub authorization could not be refreshed; reconnect GitHub in Settings") from exc
    return get_secret(user.github_token)
