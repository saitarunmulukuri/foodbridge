"""Domain permission checks for the NGO Profile Management module.

All permission checks are enforced at the service layer, never at the route
layer alone, to ensure consistent authorization regardless of caller context.
"""

import logging

from backend.modules.ngos.exceptions import InsufficientRoleException
from backend.shared.constants.enums import UserRole

logger = logging.getLogger(__name__)


def require_ngo_role(user_id: int, role: str) -> None:
    """Assert that the authenticated caller holds the NGO role.

    Only NGO accounts may read or update NGO profiles. DONOR, VOLUNTEER,
    and ADMIN accounts are explicitly rejected with HTTP 403.

    Args:
        user_id: JWT ``sub`` claim value (used for audit logging only).
        role: JWT ``role`` claim value to check.

    Raises:
        InsufficientRoleException: If ``role`` is not ``NGO``.
    """
    if role != UserRole.NGO.value:
        logger.warning(
            "NGO profile access denied: user_id=%s has role='%s', required NGO.",
            user_id,
            role,
        )
        raise InsufficientRoleException()
