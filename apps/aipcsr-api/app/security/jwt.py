"""
JWT Token Generation & Validation Module
=========================================
Handles access and refresh token lifecycle for the AIpSCR API.

Functions:
    create_access_token  – Issue a short-lived access JWT.
    create_refresh_token – Issue a long-lived refresh JWT.
    verify_token         – Validate a token and return the subject (user_id).
    decode_token         – Low-level decode; raises JWTError on failure.

Schemas:
    TokenPayload – Pydantic model representing validated JWT claims.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from pydantic import BaseModel

from app.config.settings import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Token payload schema
# ---------------------------------------------------------------------------

class TokenPayload(BaseModel):
    """Validated JWT claims."""
    sub: str
    exp: datetime
    token_type: str = "access"


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

REFRESH_TOKEN_EXPIRE_DAYS: int = 7


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a short-lived access token.

    Args:
        data: Claims to encode (must include ``"sub"``).
        expires_delta: Custom lifetime; defaults to
            ``settings.ACCESS_TOKEN_EXPIRE_MINUTES``.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "token_type": "access"})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a long-lived refresh token (default 7 days).

    Args:
        data: Claims to encode (must include ``"sub"``).
        expires_delta: Custom lifetime; defaults to 7 days.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "token_type": "refresh"})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


# ---------------------------------------------------------------------------
# Token validation
# ---------------------------------------------------------------------------

def decode_token(token: str) -> dict:
    """Decode and verify a JWT, returning the raw claims dict.

    Raises:
        jose.JWTError: If the token is invalid, expired, or tampered with.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
    )


def verify_token(token: str) -> Optional[str]:
    """Validate a token and extract the user id (``sub`` claim).

    This is the primary helper consumed by ``dependencies/auth.py``.

    Args:
        token: Encoded JWT string.

    Returns:
        The ``sub`` (user id) string, or ``None`` if the token is
        invalid / expired / missing a subject claim.
    """
    try:
        payload = decode_token(token)
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            logger.warning("Token decoded but missing 'sub' claim")
            return None
        return user_id
    except JWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        return None
