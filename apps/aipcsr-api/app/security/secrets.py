"""Encrypt integration credentials at rest; allow legacy reads during migration."""

from cryptography.fernet import Fernet, InvalidToken

from app.config.settings import settings

PREFIX = "enc:v1:"


def _cipher() -> Fernet:
    if not settings.SECRETS_ENCRYPTION_KEY:
        raise ValueError("Integration credential encryption is not configured")
    try:
        return Fernet(settings.SECRETS_ENCRYPTION_KEY.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise ValueError("Integration credential encryption key is invalid") from exc


def encrypt_secret(value: str | None) -> str | None:
    """Encrypt a new credential; an empty value revokes the stored credential."""
    if not value or not value.strip():
        return None
    return PREFIX + _cipher().encrypt(value.strip().encode()).decode("ascii")


def get_secret(value: str | None) -> str:
    """Decode stored credentials. Legacy plaintext is accepted until re-saved."""
    if not value:
        return ""
    if not value.startswith(PREFIX):
        return value
    try:
        return _cipher().decrypt(value[len(PREFIX):].encode("ascii")).decode()
    except (InvalidToken, UnicodeError) as exc:
        raise ValueError("Stored integration credential cannot be decrypted") from exc
