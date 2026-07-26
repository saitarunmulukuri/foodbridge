"""Security utility functions for FoodBridge.

Centralizes all password hashing, verification, and email normalization logic.
These helpers are shared across all modules and must not contain domain-specific
business logic.
"""

import logging
import re

import bcrypt

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt.

    Uses a randomly generated salt per hash. Never stores or logs plaintext passwords.

    Args:
        password: Plaintext password string.

    Returns:
        bcrypt-hashed password string (UTF-8 decoded).
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash.

    This helper is intended for use during authentication (login) flows.
    It is safe to call with invalid or malformed hashes — it will return
    False rather than raise an exception.

    Args:
        plain_password: The plaintext password supplied by the user.
        hashed_password: The stored bcrypt hash from the database.

    Returns:
        True if the password matches the hash, False otherwise.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        logger.warning("Password verification check encountered an unexpected error.")
        return False


def normalize_email(email: str) -> str:
    """Normalize an email address for consistent storage and lookup.

    Normalization steps:
        1. Strip leading and trailing whitespace.
        2. Convert to lowercase.
        3. Validate the resulting email is non-empty.

    Args:
        email: Raw email string from the client.

    Returns:
        Normalized email string.

    Raises:
        ValueError: If the normalized email is empty or invalid.
    """
    if not email or not isinstance(email, str):
        raise ValueError("Email must be a non-empty string.")

    normalized = email.strip().lower()

    if not normalized:
        raise ValueError("Email cannot be empty after normalization.")

    # Basic structural sanity check (full validation is handled by Marshmallow)
    if "@" not in normalized or "." not in normalized.split("@")[-1]:
        raise ValueError(f"Normalized email '{normalized}' does not appear to be valid.")

    return normalized
