"""
Unit tests for app.security.jwt
================================
Covers access / refresh token round-trips, expiry, tampering,
missing claims, decode_token error path, and TokenPayload validation.
"""

import time
from datetime import timedelta

import pytest
from jose import JWTError

from app.security.jwt import (
    TokenPayload,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token,
)


# ── Access Token ──────────────────────────────────────────────────────────

class TestAccessToken:
    """create_access_token + verify_token round-trip."""

    def test_create_and_verify(self):
        token = create_access_token(data={"sub": "user-123"})
        assert verify_token(token) == "user-123"

    def test_custom_expiry(self):
        token = create_access_token(
            data={"sub": "user-456"},
            expires_delta=timedelta(hours=2),
        )
        assert verify_token(token) == "user-456"

    def test_expired_token_returns_none(self):
        token = create_access_token(
            data={"sub": "user-789"},
            expires_delta=timedelta(seconds=-1),
        )
        assert verify_token(token) is None

    def test_token_type_is_access(self):
        token = create_access_token(data={"sub": "user-100"})
        payload = decode_token(token)
        assert payload["token_type"] == "access"


# ── Refresh Token ─────────────────────────────────────────────────────────

class TestRefreshToken:
    """create_refresh_token + verify_token round-trip."""

    def test_create_and_verify(self):
        token = create_refresh_token(data={"sub": "user-r1"})
        assert verify_token(token) == "user-r1"

    def test_token_type_is_refresh(self):
        token = create_refresh_token(data={"sub": "user-r2"})
        payload = decode_token(token)
        assert payload["token_type"] == "refresh"

    def test_expired_refresh_returns_none(self):
        token = create_refresh_token(
            data={"sub": "user-r3"},
            expires_delta=timedelta(seconds=-1),
        )
        assert verify_token(token) is None


# ── Edge Cases ────────────────────────────────────────────────────────────

class TestEdgeCases:
    """Invalid / tampered / incomplete tokens."""

    def test_tampered_token_returns_none(self):
        token = create_access_token(data={"sub": "user-x"})
        tampered = token[:-4] + "XXXX"
        assert verify_token(tampered) is None

    def test_completely_invalid_token_returns_none(self):
        assert verify_token("not-a-jwt") is None

    def test_missing_sub_claim_returns_none(self):
        token = create_access_token(data={"role": "admin"})  # no "sub"
        assert verify_token(token) is None

    def test_decode_token_raises_on_bad_input(self):
        with pytest.raises(JWTError):
            decode_token("this.is.garbage")


# ── TokenPayload Schema ──────────────────────────────────────────────────

class TestTokenPayload:
    """Pydantic schema validation."""

    def test_default_token_type(self):
        tp = TokenPayload(sub="u1", exp=0)
        assert tp.token_type == "access"

    def test_custom_token_type(self):
        tp = TokenPayload(sub="u1", exp=0, token_type="refresh")
        assert tp.token_type == "refresh"
