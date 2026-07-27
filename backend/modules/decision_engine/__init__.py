"""Decision Engine module package — Sprint 3.1A: Foundation.

Public Interface:
    DTOs:
        CandidateNGO     — pre-qualified candidate from DB retrieval
        EligibleNGO      — candidate that passed all eligibility filters
        ScoredNGO        — eligible NGO with computed recommendation scores
        Recommendation   — final ranked recommendation with full score breakdown

    Configuration:
        DecisionEngineConfig — immutable config with all thresholds and weights
        default_config       — module-level singleton using env var defaults

    Exceptions:
        DecisionEngineError          — base exception (not raised directly)
        DonationNotFoundException    — donation_id not found in DB
        InvalidDonationStatusException — donation in invalid lifecycle state
        DonationExpiredException     — donation past expiry time
        EmptyDonationException       — donation has no food items
        InvalidDonorException        — donor profile/account invalid
        NoEligibleNGOsException      — no NGOs passed eligibility pipeline

    Service:
        DecisionEngineService   — top-level orchestration service
        DecisionEngineResult    — pipeline output value object

    Repository:
        DecisionEngineRepository — read-only SQLAlchemy 2.x data access
"""

from backend.modules.decision_engine.config import DecisionEngineConfig, default_config
from backend.modules.decision_engine.dto import (
    CandidateNGO,
    EligibleNGO,
    Recommendation,
    ScoredNGO,
)
from backend.modules.decision_engine.exceptions import (
    DecisionEngineError,
    DonationExpiredException,
    DonationNotFoundException,
    EmptyDonationException,
    InvalidDonationStatusException,
    InvalidDonorException,
    NoEligibleNGOsException,
)
from backend.modules.decision_engine.repositories import DecisionEngineRepository
from backend.modules.decision_engine.services import DecisionEngineResult, DecisionEngineService

__all__ = [
    # DTOs
    "CandidateNGO",
    "EligibleNGO",
    "ScoredNGO",
    "Recommendation",
    # Configuration
    "DecisionEngineConfig",
    "default_config",
    # Exceptions
    "DecisionEngineError",
    "DonationNotFoundException",
    "InvalidDonationStatusException",
    "DonationExpiredException",
    "EmptyDonationException",
    "InvalidDonorException",
    "NoEligibleNGOsException",
    # Service
    "DecisionEngineService",
    "DecisionEngineResult",
    # Repository
    "DecisionEngineRepository",
]
