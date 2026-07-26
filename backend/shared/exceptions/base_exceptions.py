"""Base application exception hierarchy for FoodBridge."""

from typing import Any, Dict, Optional


class APIException(Exception):
    """Base exception class for all custom API exceptions."""

    status_code: int = 500
    error_code: str = "INTERNAL_SERVER_ERROR"

    def __init__(
        self,
        message: str = "An unexpected error occurred.",
        status_code: Optional[int] = None,
        error_code: Optional[str] = None,
        details: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if error_code is not None:
            self.error_code = error_code
        self.details = details

    def to_dict(self) -> Dict[str, Any]:
        """Format exception payload into standard API dictionary format."""
        return {
            "success": False,
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
            },
        }


class BadRequestException(APIException):
    """Exception raised for invalid or malformed client requests."""

    status_code = 400
    error_code = "BAD_REQUEST"


class UnauthorizedException(APIException):
    """Exception raised when authentication fails or is missing."""

    status_code = 401
    error_code = "UNAUTHORIZED"


class ForbiddenException(APIException):
    """Exception raised when authenticated user lacks permissions."""

    status_code = 403
    error_code = "FORBIDDEN"


class ResourceNotFoundException(APIException):
    """Exception raised when a requested resource does not exist."""

    status_code = 404
    error_code = "RESOURCE_NOT_FOUND"


class ConflictException(APIException):
    """Exception raised when a request conflicts with current system state."""

    status_code = 409
    error_code = "CONFLICT"


class ValidationException(APIException):
    """Exception raised for schema or payload validation failures."""

    status_code = 422
    error_code = "VALIDATION_ERROR"


class InternalServerErrorException(APIException):
    """Exception raised for unexpected backend infrastructure errors."""

    status_code = 500
    error_code = "INTERNAL_SERVER_ERROR"
