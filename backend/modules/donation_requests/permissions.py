"""Domain permission checks for the Donation Request module — Sprint 4.1."""

import logging

from backend.modules.donation_requests.exceptions import InsufficientRoleException
from backend.shared.constants.enums import UserRole

logger = logging.getLogger(__name__)


def require_ngo_role(user_id: int, role: str) -> None:
    """Assert that the authenticated caller holds the NGO role.

    Only NGO accounts may list or act on donation requests. All other roles
    receive HTTP 403.

    Args:
        user_id: JWT ``sub`` claim (for audit logging).
        role: JWT ``role`` claim string.

    Raises:
        InsufficientRoleException: If ``role`` is not ``NGO``.
    """
    if role != UserRole.NGO.value:
        logger.warning(
            "Donation request access denied: user_id=%s role='%s' — NGO required.",
            user_id,
            role,
        )
        raise InsufficientRoleException()
