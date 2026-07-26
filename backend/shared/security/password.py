"""Password hashing and verification security utilities for FoodBridge.

Uses bcrypt exclusively. No fallback mechanisms are supported.
The werkzeug fallback was removed in the Sprint 1.1 refactoring.

Constant-time verification is provided natively by bcrypt.checkpw().
For protection against email-enumeration timing attacks during login,
callers should invoke verify_password() with DUMMY_HASH when no user
record is found (see AuthenticationService._authenticate_credentials).
"""

import logging

import bcrypt

logger = logging.getLogger(__name__)

# A pre-computed bcrypt hash of a fixed string.
# Used as a constant-time stand-in when no user record is found during login,
# preventing timing-based email enumeration attacks. Do NOT store or compare
# real passwords against this value.
DUMMY_HASH: str = "$2b$12$WXNIi.0LW7e1tHQjSekV7OdH8fNOpYEFmV3OKrRc5S4bVh7m6wSoW"


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with a randomly generated salt.

    Never stores or logs the plaintext password.

    Args:
        password: Plaintext password string to hash.

    Returns:
        bcrypt-hashed password as a UTF-8 decoded string, suitable for
        storage in the ``password_hash`` database column.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash.

    Safe to call with invalid or malformed hashes — returns False rather
    than raising an exception, preventing information leakage.

    Timing-attack note:
        bcrypt.checkpw() is inherently constant-time for equal-length inputs.
        For cases where no user exists, callers should pass DUMMY_HASH to
        maintain a consistent execution time.

    Args:
        plain_password: The plaintext password submitted by the user.
        hashed_password: The bcrypt hash stored in the database.

    Returns:
        True if the password matches the hash, False otherwise.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        logger.warning("Password verification encountered an unexpected error.")
        return False
