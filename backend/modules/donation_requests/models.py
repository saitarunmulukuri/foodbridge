"""ORM model shim for the Donation Request module — Sprint 4.1.

This module does NOT define new database tables.

The Donation Request workflow is backed by two existing ORM models:
    - NGORequest       (backend.modules.ngos.models)
    - RecommendationCycle (backend.modules.donations.models)

This file re-exports them for use within the donation_requests module,
providing a stable internal import boundary.
"""

from backend.modules.ngos.models import NGORequest, NGORequestHistory
from backend.modules.donations.models import (
    Donation,
    RecommendationCycle,
)

__all__ = [
    "NGORequest",
    "NGORequestHistory",
    "Donation",
    "RecommendationCycle",
]
