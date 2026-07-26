"""Unit test suite for Sprint 1.1 User Registration."""

import pytest
from backend.modules.authentication.validators import validate_password_policy
from marshmallow import ValidationError


def test_password_policy_valid():
    """Valid password should pass validation without error."""
    validate_password_policy("StrongP@ss123")


def test_password_policy_too_short():
    """Short password should fail validation."""
    with pytest.raises(ValidationError, match="at least 8 characters"):
        validate_password_policy("P@ss1")


def test_password_policy_no_uppercase():
    """Password without uppercase letter should fail validation."""
    with pytest.raises(ValidationError, match="uppercase"):
        validate_password_policy("strongp@ss123")


def test_password_policy_no_lowercase():
    """Password without lowercase letter should fail validation."""
    with pytest.raises(ValidationError, match="lowercase"):
        validate_password_policy("STRONGP@SS123")


def test_password_policy_no_digit():
    """Password without digit should fail validation."""
    with pytest.raises(ValidationError, match="digit"):
        validate_password_policy("StrongP@ssword")


def test_password_policy_no_special_char():
    """Password without special character should fail validation."""
    with pytest.raises(ValidationError, match="special character"):
        validate_password_policy("StrongPass123")
