"""NGO eligibility filter pipeline components for the Decision Engine.

Sprint 3.1.1 Update:
    The filter pipeline now operates on ``CandidateNGO`` DTOs rather than raw
    ORM model instances. This enforces clean architectural separation between the
    persistence layer and the algorithm layer.

Filter functions take ``CandidateNGO`` DTOs and apply pure business rules.
Zero database access. Zero side effects.
"""

import logging
import math
from typing import Dict, List

from backend.modules.decision_engine.candidate_finder import CandidateNGO
from backend.modules.decision_engine.config import DecisionEngineConfig
from backend.modules.donations.models import Donation

logger = logging.getLogger(__name__)

_EARTH_RADIUS_KM: float = 6371.0


# -----------------------------------------------------------------------
# Distance Utility
# -----------------------------------------------------------------------


def haversine_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Compute the great-circle surface distance between two coordinates in kilometres.

    Args:
        lat1: Latitude of point 1 in decimal degrees.
        lon1: Longitude of point 1 in decimal degrees.
        lat2: Latitude of point 2 in decimal degrees.
        lon2: Longitude of point 2 in decimal degrees.

    Returns:
        Surface distance in kilometres.
    """
    lat1_r = math.radians(float(lat1))
    lat2_r = math.radians(float(lat2))
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_KM * c


# -----------------------------------------------------------------------
# Eligibility Filter Functions (operate on CandidateNGO DTOs)
# -----------------------------------------------------------------------


def accepting_today_filter(ngo: CandidateNGO) -> bool:
    """Rule 1: NGO must have remaining capacity today (> 0).

    In Sprint 3.1.1, the repository pre-filters NGOs to those with an ACTIVE
    capacity record for today. This filter provides a secondary Python-level guard
    verifying remaining_capacity > 0 as a baseline acceptance check.

    Args:
        ngo: CandidateNGO DTO.

    Returns:
        True if remaining_capacity > 0, False otherwise.
    """
    return ngo.remaining_capacity > 0


def capacity_filter(ngo: CandidateNGO, min_remaining: int = 1) -> bool:
    """Rule 2: NGO must have sufficient remaining daily capacity.

    Args:
        ngo: CandidateNGO DTO.
        min_remaining: Minimum acceptable remaining meal capacity.

    Returns:
        True if remaining_capacity >= min_remaining, False otherwise.
    """
    return ngo.remaining_capacity >= min_remaining


def distance_filter(
    ngo: CandidateNGO,
    donation_lat: float,
    donation_lon: float,
    max_radius_km: float,
) -> bool:
    """Rule 3: Donation pickup location must be within the NGO's effective radius.

    Effective radius is the MINIMUM of:
        - The NGO's self-declared ``service_radius_km``.
        - The module configuration's ``max_radius_km``.

    Args:
        ngo: CandidateNGO DTO.
        donation_lat: Donation pickup latitude.
        donation_lon: Donation pickup longitude.
        max_radius_km: Module-level maximum radius limit in kilometres.

    Returns:
        True if within radius, False otherwise.
    """
    effective_radius_km = min(float(ngo.service_radius_km), max_radius_km)
    actual_distance_km = haversine_distance_km(
        lat1=ngo.latitude,
        lon1=ngo.longitude,
        lat2=donation_lat,
        lon2=donation_lon,
    )
    return actual_distance_km <= effective_radius_km


def food_type_filter(ngo: CandidateNGO, donation: Donation = None) -> bool:
    """Rule 4: NGO must support the donation's food type.

    Extension Point:
        ``CandidateNGO.supported_food_types`` currently contains all FoodType values
        (pass-through). When per-NGO food type preferences are implemented, this
        filter should intersect ``ngo.supported_food_types`` against the food types
        present in ``donation.items``.

    Args:
        ngo: CandidateNGO DTO.
        donation: Donation entity context.

    Returns:
        True (pass-through until schema extended).
    """
    return True


# -----------------------------------------------------------------------
# Eligibility Filter Pipeline Orchestrator
# -----------------------------------------------------------------------


class EligibilityFilterPipeline:
    """Pipeline executing all eligibility rules against CandidateNGO DTOs."""

    def filter_candidates(
        self,
        candidates: List[CandidateNGO],
        donation: Donation,
        config: DecisionEngineConfig,
    ) -> List[CandidateNGO]:
        """Apply all eligibility filters to the candidate NGO DTOs.

        Filters are evaluated in increasing order of computational cost:
            1. accepting_today_filter  (integer compare)
            2. capacity_filter         (integer compare)
            3. food_type_filter        (pass-through)
            4. distance_filter         (Haversine computation — most expensive)

        Args:
            candidates: List of CandidateNGO DTOs.
            donation: Validated Donation model instance.
            config: DecisionEngineConfig instance.

        Returns:
            List of CandidateNGO DTOs that pass ALL eligibility rules.
        """
        donation_lat = float(donation.pickup_latitude)
        donation_lon = float(donation.pickup_longitude)
        max_radius = config.MAX_RADIUS_KM
        min_capacity = config.MIN_REMAINING_CAPACITY

        eligible: List[CandidateNGO] = []
        disqualified_counts: Dict[str, int] = {
            "not_accepting_today": 0,
            "insufficient_capacity": 0,
            "food_type_mismatch": 0,
            "outside_distance_radius": 0,
        }

        for ngo in candidates:
            if not accepting_today_filter(ngo):
                disqualified_counts["not_accepting_today"] += 1
                continue
            if not capacity_filter(ngo, min_remaining=min_capacity):
                disqualified_counts["insufficient_capacity"] += 1
                continue
            if not food_type_filter(ngo, donation):
                disqualified_counts["food_type_mismatch"] += 1
                continue
            if not distance_filter(ngo, donation_lat, donation_lon, max_radius):
                disqualified_counts["outside_distance_radius"] += 1
                continue
            eligible.append(ngo)

        logger.info(
            "Eligibility pipeline complete for donation_id=%s: total=%d, eligible=%d, disqualified=%s",
            donation.donation_id,
            len(candidates),
            len(eligible),
            disqualified_counts,
        )

        return eligible
