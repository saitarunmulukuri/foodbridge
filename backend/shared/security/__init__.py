"""Shared security utilities package for FoodBridge.

Exports:
    Password:
        hash_password       — bcrypt hashing
        verify_password     — bcrypt verification
        DUMMY_HASH          — constant-time sentinel for login flow

    Email:
        normalize_email     — strip, lowercase, structural validate

    JWT:
        create_user_access_token    — generate signed access token
        create_user_refresh_token   — generate signed refresh token
        get_access_token_expires_seconds — read lifetime from config
"""

from backend.shared.security.email import normalize_email
from backend.shared.security.jwt import (
    create_user_access_token,
    create_user_refresh_token,
    get_access_token_expires_seconds,
)
from backend.shared.security.password import DUMMY_HASH, hash_password, verify_password

__all__ = [
    # Password
    "hash_password",
    "verify_password",
    "DUMMY_HASH",
    # Email
    "normalize_email",
    # JWT
    "create_user_access_token",
    "create_user_refresh_token",
    "get_access_token_expires_seconds",
]
