"""Candidate NGO Finder component for the Decision Engine.

Sprint 3.1.1 Responsibility:
    Load a Donation and retrieve candidate NGOs satisfying database-level constraints.
    Translate ORM model instances into CandidateNGO DTOs to decouple the algorithm
    layer from the persistence layer.

This component does NOT perform:
    - Eligibility filtering
    - Distance calculation
    - Capacity threshold validation
    - Scoring
    - Ranking

Architecture Note:
    The ``CandidateNGO`` dataclass acts as an internal DTO. The algorithm pipeline
    (filters, scorer, ranker) works exclusively with CandidateNGO instances — never
    with raw SQLAlchemy ORM models. This boundary ensures:
        - Clean separation between persistence and domain logic layers.
        - Easier unit testing (no Flask application context or DB required).
        - Future extensibility without touching ORM models.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from backend.modules.decision_engine.repositories import DecisionEngineRepository
from backend.modules.donations.models import Donation
from backend.modules.ngos.models import NGO, NGODailyCapacity
from backend.shared.constants.enums import FoodType, RequestStatus

logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------
# CandidateNGO DTO
# -----------------------------------------------------------------------


@dataclass
class CandidateNGO:
    """Internal Data Transfer Object representing a pre-qualified candidate NGO.

    This DTO is the exclusive interface between the database layer and the
    Decision Engine algorithm pipeline (eligibility filters, scorer, ranker).

    Attributes:
        ngo_id: Integer primary key of the NGO entity.
        latitude: NGO location latitude in decimal degrees (WGS-84).
        longitude: NGO location longitude in decimal degrees (WGS-84).
        service_radius_km: NGO's self-declared maximum service radius in kilometres.
        remaining_capacity: Remaining daily meal intake capacity for today.
        supported_food_types: List of FoodType enum values the NGO accepts.
            Currently a pass-through (all types) — extension point for Sprint 3.2.
        reliability_score: Float in [0.0, 1.0] representing the NGO's historical
            acceptance rate. Derived from NGO request history.
            0.0 = never accepted, 1.0 = always accepted.
            None if no historical requests exist (new NGO).
        average_response_time_minutes: Average time (in minutes) between an NGO
            request being issued and the NGO responding.
            Currently None — extension point when response timing data is available.
    """

    ngo_id: int
    latitude: float
    longitude: float
    service_radius_km: int
    remaining_capacity: int
    supported_food_types: List[FoodType]
    reliability_score: Optional[float]
    average_response_time_minutes: Optional[float]


# -----------------------------------------------------------------------
# Candidate NGO Finder
# -----------------------------------------------------------------------


class CandidateNGOFinder:
    """Component responsible for loading a Donation and retrieving candidate NGOs.

    Responsibilities:
        1. Load a Donation by ID (with items and donor profile).
        2. Load candidate NGOs from the repository (DB-level constraints applied).
        3. Translate each NGO ORM instance into a CandidateNGO DTO.

    Does NOT perform:
        - Eligibility filtering
        - Distance calculations
        - Capacity threshold validation
        - Scoring
        - Ranking
    """

    def __init__(self, repository: Optional[DecisionEngineRepository] = None) -> None:
        self.repository = repository or DecisionEngineRepository()

    def load_donation(self, donation_id: int) -> Optional[Donation]:
        """Load and return a Donation by its primary key.

        Loads the Donation with its items and donor profile eager-loaded.

        Args:
            donation_id: The donation primary key to retrieve.

        Returns:
            Donation model instance if found, otherwise None.
        """
        donation = self.repository.load_donation(donation_id)
        if donation is not None:
            logger.debug(
                "CandidateNGOFinder loaded donation_id=%s title='%s'.",
                donation.donation_id,
                donation.donation_title,
            )
        else:
            logger.debug(
                "CandidateNGOFinder: donation_id=%s not found.",
                donation_id,
            )
        return donation

    def find_candidates(self, donation: Optional[Donation] = None) -> List[CandidateNGO]:
        """Load candidate NGOs from the repository and return them as CandidateNGO DTOs.

        Database-level constraints enforced by the repository:
            - NGO is_active = True
            - NGO verification_status = VERIFIED
            - NGO has an ACTIVE daily capacity record for today

        Each qualifying NGO is translated into a ``CandidateNGO`` DTO to decouple
        the algorithm layer from the ORM model layer.

        Args:
            donation: Optional Donation context. Reserved for future use when
                      candidate pre-filtering by donation properties is added.

        Returns:
            List of CandidateNGO DTO instances.
        """
        ngo_models = self.repository.load_candidate_ngos()

        candidates = [self._to_candidate_dto(ngo) for ngo in ngo_models]

        logger.info(
            "CandidateNGOFinder produced %d candidate NGOs.",
            len(candidates),
        )
        return candidates

    # ------------------------------------------------------------------
    # Private: ORM → DTO Translation
    # ------------------------------------------------------------------

    def _to_candidate_dto(self, ngo: NGO) -> CandidateNGO:
        """Translate an NGO ORM model instance into a CandidateNGO DTO.

        Mapping:
            ngo_id                   ← NGO.ngo_id
            latitude                 ← NGO.latitude (Decimal → float)
            longitude                ← NGO.longitude (Decimal → float)
            service_radius_km        ← NGO.service_radius_km
            remaining_capacity       ← today's NGODailyCapacity.remaining_capacity
            supported_food_types     ← all FoodType values (extension point)
            reliability_score        ← computed from NGO.ngo_requests history
            average_response_time_minutes ← None (schema extension point)

        Args:
            ngo: Loaded NGO ORM model instance with daily_capacities and
                 ngo_requests eager-loaded.

        Returns:
            CandidateNGO DTO instance.
        """
        return CandidateNGO(
            ngo_id=ngo.ngo_id,
            latitude=float(ngo.latitude),
            longitude=float(ngo.longitude),
            service_radius_km=int(ngo.service_radius_km),
            remaining_capacity=self._extract_remaining_capacity(ngo),
            supported_food_types=self._extract_supported_food_types(ngo),
            reliability_score=self._compute_reliability_score(ngo),
            average_response_time_minutes=None,  # Extension point — see docstring
        )

    @staticmethod
    def _extract_remaining_capacity(ngo: NGO) -> int:
        """Extract the remaining daily meal capacity from today's pre-joined capacity record.

        The repository filters daily_capacities to today's ACTIVE record only.
        If no record exists (which should not happen given the DB-level filter),
        returns 0 as a safe sentinel.

        Args:
            ngo: NGO model instance with today's daily_capacities loaded.

        Returns:
            Remaining capacity as an integer.
        """
        if ngo.daily_capacities:
            return int(ngo.daily_capacities[0].remaining_capacity)
        return 0

    @staticmethod
    def _extract_supported_food_types(ngo: NGO) -> List[FoodType]:
        """Resolve the food types the NGO is capable of accepting.

        Extension Point:
            The current database schema does not store per-NGO food type preferences.
            All FoodType values are returned unconditionally.

            When a per-NGO dietary preference model is introduced (e.g.,
            ``ngo_food_type_preferences`` table), this method should:
                1. Access ``ngo.food_type_preferences`` (new relationship).
                2. Return only the NGO's registered supported types.

        Args:
            ngo: NGO model instance.

        Returns:
            List of all FoodType enum values (pass-through until schema extended).
        """
        return list(FoodType)

    @staticmethod
    def _compute_reliability_score(ngo: NGO) -> Optional[float]:
        """Compute the NGO's historical request acceptance reliability score.

        Definition:
            reliability_score = accepted_requests / total_responded_requests

        Interpretation:
            - 1.0 = NGO has accepted every request presented to it.
            - 0.0 = NGO has rejected every request.
            - None = NGO has no historical request data (newly onboarded).

        Algorithm:
            1. Count all NGO requests in terminal states (ACCEPTED, REJECTED,
               TIMED_OUT, AUTO_CANCELLED).
            2. Count only ACCEPTED terminal requests.
            3. Divide accepted / total. Return None if total is 0.

        Note:
            PENDING requests are excluded — they are not yet terminal.
            TIMED_OUT and AUTO_CANCELLED are counted as non-acceptances to
            penalise unresponsive NGOs.

        Args:
            ngo: NGO model instance with ``ngo_requests`` relationship loaded.

        Returns:
            Float in [0.0, 1.0], or None if no history exists.
        """
        if not ngo.ngo_requests:
            return None

        terminal_statuses = {
            RequestStatus.ACCEPTED,
            RequestStatus.REJECTED,
            RequestStatus.TIMED_OUT,
            RequestStatus.AUTO_CANCELLED,
        }

        terminal_requests = [
            req for req in ngo.ngo_requests
            if req.status in terminal_statuses
        ]

        total = len(terminal_requests)
        if total == 0:
            return None

        accepted = sum(
            1 for req in terminal_requests
            if req.status == RequestStatus.ACCEPTED
        )

        return round(accepted / total, 4)
