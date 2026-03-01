"""
Unit tests for app.security.passwords
=======================================
Covers hashing, verification, and edge cases.
"""

from app.security.passwords import hash_password, verify_password


class TestHashPassword:
    """hash_password produces valid bcrypt hashes."""

    def test_returns_bcrypt_hash(self):
        hashed = hash_password("my-secret")
        assert hashed.startswith("$2b$")

    def test_different_calls_produce_different_hashes(self):
        h1 = hash_password("same-password")
        h2 = hash_password("same-password")
        assert h1 != h2  # salted, so never the same


class TestVerifyPassword:
    """verify_password checks plain text against hash."""

    def test_correct_password(self):
        hashed = hash_password("correct-password")
        assert verify_password("correct-password", hashed) is True

    def test_wrong_password(self):
        hashed = hash_password("correct-password")
        assert verify_password("wrong-password", hashed) is False

    def test_empty_password(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True

    def test_unicode_password(self):
        pwd = "пароль"
        hashed = hash_password(pwd)
        assert verify_password(pwd, hashed) is True
