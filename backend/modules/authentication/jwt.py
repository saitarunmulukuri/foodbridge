"""JWT token generation utilities for the Authentication domain module.

This module is a thin, domain-aware wrapper over the shared JWT utilities
in ``backend/shared/security/jwt.py``. It provides the single public
entry point ``generate_tokens(user)`` consumed by AuthenticationService.

No Flask-JWT-Extended imports live here — all JWT mechanics are
encapsulated in the shared security layer.
"""

from typing import Any, Dict

from backend.modules.authentication.models import User
from backend.shared.security import (
    create_user_access_token,
    create_user_refresh_token,
    get_access_token_expires_seconds,
)


def generate_tokens(user: User) -> Dict[str, Any]:
    """Generate a JWT access token and refresh token for an authenticated user.

    Token Claims (Access Token):
        sub  — str(user_id)   [JWT standard subject claim]
        role — UserRole value string
        iat  — issued-at      [set automatically by Flask-JWT-Extended]
        exp  — expiry         [derived from JWT_ACCESS_TOKEN_EXPIRES config]
        type — "access"       [set automatically by Flask-JWT-Extended]

    Token Claims (Refresh Token):
        sub  — str(user_id)   [JWT standard subject claim]
        type — "refresh"      [set automatically by Flask-JWT-Extended]

    Token lifetimes are read dynamically from the Flask application
    configuration (JWT_ACCESS_TOKEN_EXPIRES, JWT_REFRESH_TOKEN_EXPIRES).
    They are never hardcoded.

    Args:
        user: Authenticated and ACTIVE User model instance.

    Returns:
        Dictionary with keys:
            access_token  (str)  — signed JWT access token
            refresh_token (str)  — signed JWT refresh token
            token_type    (str)  — "Bearer"
            expires_in    (int)  — access token lifetime in seconds
    """
    access_token = create_user_access_token(
        user_id=user.user_id,
        role=user.role.value,
    )
    refresh_token = create_user_refresh_token(user_id=user.user_id)
    expires_in = get_access_token_expires_seconds()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": expires_in,
    }
