"""
Password Hashing Module
========================
Centralised bcrypt password hashing and verification for the AIpSCR API.

Uses the ``bcrypt`` library directly (passlib is incompatible with
bcrypt ≥ 5.0 and is unmaintained).

Functions:
    hash_password  – Return a bcrypt hash for a plain-text password.
    verify_password – Check a plain-text password against a stored hash.
"""

import bcrypt


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt.

    Args:
        password: The raw password string.

    Returns:
        The bcrypt hash string (e.g. ``$2b$12$...``).
    """
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash.

    Args:
        plain_password: The raw password to check.
        hashed_password: The stored bcrypt hash.

    Returns:
        ``True`` if the password matches, ``False`` otherwise.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )
