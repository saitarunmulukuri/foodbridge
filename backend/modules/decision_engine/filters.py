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
from backend.modules.decision_engine.dto import CandidateEvaluation, EligibleNGO, ScoredNGO
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

    Args:
        ngo: CandidateNGO DTO.
        donation: Donation entity context.

    Returns:
        True if compatible, False otherwise.
    """
    return True


# -----------------------------------------------------------------------
# Eligibility Filter Pipeline Orchestrator
# -----------------------------------------------------------------------


class EligibilityFilterPipeline:
    """Pipeline executing all eligibility rules against CandidateNGO DTOs."""

    def __init__(self) -> None:
        self.evaluations: Dict[int, CandidateEvaluation] = {}

    def filter_candidates(
        self,
        candidates: List[CandidateNGO],
        donation: Donation,
        config: DecisionEngineConfig,
    ) -> List[EligibleNGO]:
        """Apply all eligibility filters to candidate NGO DTOs and return EligibleNGO DTOs.

        Filters are evaluated in increasing order of computational cost:
            1. accepting_today_filter  (integer compare)
            2. capacity_filter         (integer compare vs donation quantity)
            3. food_type_filter        (compatibility check)
            4. distance_filter         (Haversine computation)

        Args:
            candidates: List of CandidateNGO DTOs.
            donation: Validated Donation model instance.
            config: DecisionEngineConfig instance.

        Returns:
            List of EligibleNGO DTOs that pass ALL eligibility rules, with pre-computed distance_km.
        """
        donation_lat = float(donation.pickup_latitude)
        donation_lon = float(donation.pickup_longitude)
        max_radius = config.MAX_RADIUS_KM
        
        # Enforce minimum remaining capacity based on donation total quantity if provided
        required_quantity = int(float(getattr(donation, "total_quantity", 1) or 1))
        min_capacity = max(config.MIN_REMAINING_CAPACITY, required_quantity)

        eligible: List[EligibleNGO] = []
        self.evaluations = {}
        disqualified_counts: Dict[str, int] = {
            "not_accepting_today": 0,
            "insufficient_capacity": 0,
            "food_type_mismatch": 0,
            "outside_distance_radius": 0,
        }

        for ngo in candidates:
            ngo_name = getattr(ngo, "ngo_name", "") or f"NGO #{ngo.ngo_id}"

            if not accepting_today_filter(ngo):
                disqualified_counts["not_accepting_today"] += 1
                self.evaluations[ngo.ngo_id] = CandidateEvaluation(
                    ngo_id=ngo.ngo_id,
                    ngo_name=ngo_name,
                    eligible=False,
                    rejection_reason="NGO is not accepting donations today (zero remaining capacity).",
                )
                continue

            if not capacity_filter(ngo, min_remaining=min_capacity):
                disqualified_counts["insufficient_capacity"] += 1
                self.evaluations[ngo.ngo_id] = CandidateEvaluation(
                    ngo_id=ngo.ngo_id,
                    ngo_name=ngo_name,
                    eligible=False,
                    capacity_score=0.0,
                    rejection_reason=f"Insufficient capacity: {ngo.remaining_capacity} meals available ({required_quantity} meals needed).",
                )
                continue

            if not food_type_filter(ngo, donation):
                disqualified_counts["food_type_mismatch"] += 1
                self.evaluations[ngo.ngo_id] = CandidateEvaluation(
                    ngo_id=ngo.ngo_id,
                    ngo_name=ngo_name,
                    eligible=False,
                    rejection_reason="Incompatible dietary food category.",
                )
                continue

            dist_km = haversine_distance_km(
                lat1=ngo.latitude,
                lon1=ngo.longitude,
                lat2=donation_lat,
                lon2=donation_lon,
            )
            effective_radius_km = min(float(ngo.service_radius_km), max_radius)
            if dist_km > effective_radius_km:
                disqualified_counts["outside_distance_radius"] += 1
                self.evaluations[ngo.ngo_id] = CandidateEvaluation(
                    ngo_id=ngo.ngo_id,
                    ngo_name=ngo_name,
                    eligible=False,
                    distance_km=round(dist_km, 2),
                    rejection_reason=f"Outside operational radius ({dist_km:.1f} km > {effective_radius_km:.1f} km max).",
                )
                continue

            # Candidate is ELIGIBLE
            self.evaluations[ngo.ngo_id] = CandidateEvaluation(
                ngo_id=ngo.ngo_id,
                ngo_name=ngo_name,
                eligible=True,
                distance_km=round(dist_km, 2),
            )

            eligible.append(
                EligibleNGO(
                    ngo_id=ngo.ngo_id,
                    latitude=ngo.latitude,
                    longitude=ngo.longitude,
                    service_radius_km=ngo.service_radius_km,
                    remaining_capacity=ngo.remaining_capacity,
                    supported_food_types=ngo.supported_food_types,
                    reliability_score=ngo.reliability_score,
                    average_response_time_minutes=ngo.average_response_time_minutes,
                    distance_km=dist_km,
                    ngo_name=ngo_name,
                )
            )

        logger.info(
            "Eligibility pipeline complete for donation_id=%s: total=%d, eligible=%d, disqualified=%s",
            donation.donation_id,
            len(candidates),
            len(eligible),
            disqualified_counts,
        )

        return eligible

    def get_evaluations(
        self,
        candidates: List[CandidateNGO],
        scored_ngos: List[ScoredNGO],
    ) -> List[CandidateEvaluation]:
        """Produce full list of candidate evaluations merged with computed scores."""
        scored_map = {s.ngo_id: s for s in scored_ngos}
        result: List[CandidateEvaluation] = []

        for cand in candidates:
            eval_dto = self.evaluations.get(cand.ngo_id)
            if not eval_dto:
                eval_dto = CandidateEvaluation(
                    ngo_id=cand.ngo_id,
                    ngo_name=getattr(cand, "ngo_name", "") or f"NGO #{cand.ngo_id}",
                    eligible=False,
                    rejection_reason="Disqualified during pre-qualification.",
                )

            scored = scored_map.get(cand.ngo_id)
            if scored:
                eval_dto.distance_score = scored.distance_score
                eval_dto.capacity_score = scored.capacity_score
                eval_dto.freshness_score = scored.freshness_score
                eval_dto.demand_score = scored.demand_score
                eval_dto.compatibility_score = scored.compatibility_score
                eval_dto.availability_score = scored.availability_score
                eval_dto.total_score = scored.total_score
                eval_dto.decision_reason = scored.decision_reason

            result.append(eval_dto)

        # Sort: eligible first by total_score desc, then disqualified
        result.sort(key=lambda e: (0 if e.eligible else 1, -(e.total_score or 0.0)))
        return result

