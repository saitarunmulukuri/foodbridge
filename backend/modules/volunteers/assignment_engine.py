"""Volunteer Assignment Engine component.

Calculates assignment recommendation scores for candidate volunteers based on
proximity and vehicle type capacity suitability.
"""

import logging
from typing import List

from backend.modules.volunteers.dto import CandidateVolunteer, ScoredVolunteer
from backend.shared.constants.enums import VehicleType

logger = logging.getLogger(__name__)

# Vehicle capacity suitability scores
_VEHICLE_SUITABILITY_WEIGHTS = {
    VehicleType.VAN: 1.0,
    VehicleType.CAR: 0.85,
    VehicleType.SCOOTER: 0.70,
    VehicleType.BIKE: 0.70,
    VehicleType.BICYCLE: 0.50,
    VehicleType.WALKING: 0.30,
}


class VolunteerAssignmentEngine:
    """Component responsible for scoring and ranking candidate volunteers."""

    def score_and_rank(
        self,
        candidates: List[CandidateVolunteer],
        max_radius_km: float = 15.0,
    ) -> List[ScoredVolunteer]:
        """Score candidate volunteers and return ranked ScoredVolunteer DTOs.

        Args:
            candidates: List of CandidateVolunteer DTOs.
            max_radius_km: Maximum radius used for proximity normalization.

        Returns:
            List of ScoredVolunteer DTOs sorted by total_score descending.
        """
        if not candidates:
            return []

        scored_list: List[ScoredVolunteer] = []

        for candidate in candidates:
            # Proximity score: 1.0 (closest) to 0.0 (at max_radius_km)
            if max_radius_km > 0:
                proximity_score = max(0.0, 1.0 - (candidate.distance_km / max_radius_km))
            else:
                proximity_score = 1.0
            proximity_score = round(min(1.0, proximity_score), 4)

            # Vehicle suitability score
            suitability_score = _VEHICLE_SUITABILITY_WEIGHTS.get(
                candidate.vehicle_type, 0.5
            )

            # Total score on 0-100 scale (80% proximity, 20% suitability)
            total_score = round(
                (proximity_score * 80.0) + (suitability_score * 20.0), 2
            )

            scored_list.append(
                ScoredVolunteer(
                    volunteer_id=candidate.volunteer_id,
                    distance_km=candidate.distance_km,
                    vehicle_type=candidate.vehicle_type,
                    proximity_score=proximity_score,
                    suitability_score=suitability_score,
                    total_score=total_score,
                )
            )

        # Sort primarily by total_score desc, secondarily by distance_km asc
        scored_list.sort(key=lambda s: (-s.total_score, s.distance_km))

        logger.info(
            "VolunteerAssignmentEngine scored %d candidate volunteers.",
            len(scored_list),
        )
        return scored_list
