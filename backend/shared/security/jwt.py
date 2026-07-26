"""Shared JWT utilities for FoodBridge.

Centralizes JWT token construction, claim building, and configuration
resolution. The authentication module consumes these helpers; no other
module should import from flask_jwt_extended directly.

Design Principles:
    - Access token and refresh token generation are intentionally separate
      helpers so their payloads can evolve independently.
    - Token claims are minimal by default (sub = user_id, role).
    - Additional standard claims (iss, aud, jti) are supported via the
      ``additional_claims`` mechanism without changing public interfaces.
    - Token lifetime is always read from the live Flask application
      configuration — never hardcoded.
"""

import logging
from datetime import timedelta
from typing import Any, Dict, Optional

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token

logger = logging.getLogger(__name__)


def build_access_token_claims(role: str) -> Dict[str, Any]:
    """Construct the additional claims embedded in an access token.

    The ``sub`` claim is set separately via the ``identity`` parameter
    in Flask-JWT-Extended (always ``str(user_id)``).

    Standard claims reserved for future extension:
        - ``iss`` (issuer): can be added without changing this interface.
        - ``aud`` (audience): can be added without changing this interface.
        - ``jti`` (JWT ID): managed automatically by Flask-JWT-Extended when
          ``JWT_DECODE_LEEWAY`` / blacklist is configured.

    Args:
        role: The UserRole enum value string (e.g. "DONOR", "NGO").

    Returns:
        Dictionary of additional claims to embed in the access token.
    """
    return {
        "role": role,
        # Future extension points — uncomment and populate when needed:
        # "iss": current_app.config.get("JWT_ISSUER", "foodbridge"),
        # "aud": current_app.config.get("JWT_AUDIENCE", "foodbridge-api"),
    }


def build_refresh_token_claims() -> Dict[str, Any]:
    """Construct the additional claims embedded in a refresh token.

    Refresh tokens carry minimal claims by design — their sole purpose
    is to obtain a new access token. Role and status are re-fetched
    from the database at refresh time (Sprint 1.3+).

    Returns:
        Empty dict by default; extended here when refresh token claims
        are required (e.g. token family tracking for rotation).
    """
    return {}


def create_user_access_token(user_id: int, role: str) -> str:
    """Create a signed JWT access token for an authenticated user.

    Token lifetime is read from ``JWT_ACCESS_TOKEN_EXPIRES`` in the
    Flask application configuration. It is never hardcoded here.

    Payload (sub claim = str(user_id)):
        - sub  : str(user_id)
        - role : UserRole value string
        - iat  : issued-at (added automatically by Flask-JWT-Extended)
        - exp  : expiry (computed from JWT_ACCESS_TOKEN_EXPIRES)
        - type : "access" (added automatically by Flask-JWT-Extended)

    Args:
        user_id: The user's primary key from the database.
        role: The UserRole enum value string.

    Returns:
        Signed JWT access token string.
    """
    additional_claims = build_access_token_claims(role)
    return create_access_token(
        identity=str(user_id),
        additional_claims=additional_claims,
    )


def create_user_refresh_token(user_id: int) -> str:
    """Create a signed JWT refresh token for an authenticated user.

    Refresh tokens contain only the subject (user_id) by design.
    Their lifetime is read from ``JWT_REFRESH_TOKEN_EXPIRES`` in the
    Flask application configuration.

    Args:
        user_id: The user's primary key from the database.

    Returns:
        Signed JWT refresh token string.
    """
    additional_claims = build_refresh_token_claims()
    return create_refresh_token(
        identity=str(user_id),
        additional_claims=additional_claims,
    )


def get_access_token_expires_seconds() -> int:
    """Read the configured access token lifetime in seconds.

    Reads ``JWT_ACCESS_TOKEN_EXPIRES`` from the active Flask application
    configuration. Supports ``timedelta`` objects and raw integer seconds.

    Returns:
        Token lifetime expressed as an integer number of seconds.
    """
    expires = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=1))
    if isinstance(expires, timedelta):
        return int(expires.total_seconds())
    if isinstance(expires, (int, float)):
        return int(expires)
    logger.warning(
        "JWT_ACCESS_TOKEN_EXPIRES has unexpected type %s; defaulting to 3600 seconds.",
        type(expires).__name__,
    )
    return 3600
