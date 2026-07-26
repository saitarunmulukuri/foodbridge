"""Shared exceptions package."""

from backend.shared.exceptions.base_exceptions import (
    APIException,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    ResourceNotFoundException,
    ConflictException,
    ValidationException,
    InternalServerErrorException,
)
from backend.shared.exceptions.handlers import register_error_handlers

__all__ = [
    "APIException",
    "BadRequestException",
    "UnauthorizedException",
    "ForbiddenException",
    "ResourceNotFoundException",
    "ConflictException",
    "ValidationException",
    "InternalServerErrorException",
    "register_error_handlers",
]
