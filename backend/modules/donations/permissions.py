"""Domain permission checks for the Donations module.

Encapsulates role-based access control logic for donation operations.
These functions are called from the Service layer (not from routes)
to ensure authorization is enforced consistently regardless of the
caller context.
"""

import logging

from backend.modules.donations.exceptions import InsufficientRoleException
from backend.shared.constants.enums import UserRole

logger = logging.getLogger(__name__)


def require_donor_role(user_id: int, role: str) -> None:
    """Assert that the caller has the DONOR role.

    Only DONOR accounts may create donations. NGO, VOLUNTEER, and ADMIN
    accounts are explicitly rejected with HTTP 403.

    Args:
        user_id: Integer user ID from the JWT ``sub`` claim (for logging).
        role: Role string from the JWT ``role`` claim.

    Raises:
        InsufficientRoleException: If ``role`` is not ``DONOR``.
    """
    if role != UserRole.DONOR.value:
        logger.warning(
            "Donation creation denied: user_id=%s has role=%s, required DONOR.",
            user_id,
            role,
        )
        raise InsufficientRoleException(required_role="DONOR")
