"""Custom domain exceptions for the Volunteer module."""

from backend.shared.exceptions.base_exceptions import (
    BadRequestException,
    ForbiddenException,
    ResourceNotFoundException,
)


class VolunteerNotFoundException(ResourceNotFoundException):
    """Raised when a requested volunteer profile is not found in database."""

    def __init__(self, identifier: str or int) -> None:
        super().__init__(
            message=f"Volunteer profile for '{identifier}' was not found.",
            status_code=404,
            error_code="VOLUNTEER_NOT_FOUND",
        )


class AssignmentNotFoundException(ResourceNotFoundException):
    """Raised when a volunteer assignment is not found in database."""

    def __init__(self, assignment_id: int) -> None:
        super().__init__(
            message=f"Volunteer assignment with ID {assignment_id} was not found.",
            status_code=404,
            error_code="ASSIGNMENT_NOT_FOUND",
        )


class AssignmentForbiddenException(ForbiddenException):
    """Raised when a volunteer attempts to access or modify an assignment owned by another volunteer."""

    def __init__(self, assignment_id: int) -> None:
        super().__init__(
            message=f"You do not have permission to access or modify assignment {assignment_id}.",
            status_code=403,
            error_code="ASSIGNMENT_FORBIDDEN",
        )


class AssignmentAlreadyResolvedException(BadRequestException):
    """Raised when an assignment is already terminal and cannot be modified."""

    def __init__(self, assignment_id: int, current_status: str) -> None:
        super().__init__(
            message=f"Assignment {assignment_id} is in state '{current_status}' and cannot be modified.",
            status_code=400,
            error_code="ASSIGNMENT_ALREADY_RESOLVED",
        )


class AssignmentExpiredException(BadRequestException):
    """Raised when an assignment has passed its response deadline."""

    def __init__(self, assignment_id: int) -> None:
        super().__init__(
            message=f"Assignment {assignment_id} has expired.",
            status_code=400,
            error_code="ASSIGNMENT_EXPIRED",
        )


class InsufficientRoleException(ForbiddenException):
    """Raised when an authenticated user does not possess the required role."""

    def __init__(self, message: str = "Only authenticated volunteers can access this endpoint.", required_role: str = "VOLUNTEER") -> None:
        super().__init__(
            message=message,
            status_code=403,
            error_code="INSUFFICIENT_ROLE",
        )
