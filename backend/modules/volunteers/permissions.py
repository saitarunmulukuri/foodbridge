"""Permission validators for the Volunteer module."""

import logging
from backend.modules.volunteers.exceptions import InsufficientRoleException
from backend.shared.constants.enums import UserRole

logger = logging.getLogger(__name__)


def require_volunteer_role(user_id: int, role: str) -> None:
    """Assert that the authenticated user has the VOLUNTEER role.

    Args:
        user_id: The authenticated user's ID.
        role: The role claim string from JWT.

    Raises:
        InsufficientRoleException: If role is not VOLUNTEER.
    """
    role_str = str(role).upper()
    if role_str != UserRole.VOLUNTEER.value and role_str != UserRole.ADMIN.value:
        logger.warning(
            "Access denied: user_id=%s role='%s' attempted to access volunteer endpoint.",
            user_id,
            role,
        )
        raise InsufficientRoleException(
            message="Only authenticated volunteers can access this endpoint.",
            required_role="VOLUNTEER",
        )
