"""Scoring Engine component for the Decision Engine.

Sprint 3.2 Responsibility:
    Calculate multi-criteria recommendation scores for eligible NGOs across 5 dimensions:
        1. Proximity (distance_score)
        2. Daily Meal Capacity (capacity_score)
        3. Dietary Compatibility (compatibility_score)
        4. Historical Reliability (reliability_score_weighted)
        5. Historical Response Speed (response_score)

All dimension scores are normalized to [0.0, 1.0] before weight application.
The final total_score is a weighted sum guaranteed to be in [0.0, 1.0].
"""

import logging
from typing import List, Optional

from backend.modules.decision_engine.config import DecisionEngineConfig
from backend.modules.decision_engine.dto import EligibleNGO, ScoredNGO

logger = logging.getLogger(__name__)

# Default reliability score assigned to newly onboarded NGOs with no request history
DEFAULT_RELIABILITY_SCORE: float = 0.5


class ScoringEngine:
    """Component responsible for computing normalized multi-criteria recommendation scores."""

    def score(
        self,
        eligible_ngos: List[EligibleNGO],
        config: DecisionEngineConfig,
    ) -> List[ScoredNGO]:
        """Compute multi-criteria scores for a list of EligibleNGO DTOs.

        Args:
            eligible_ngos: List of EligibleNGO DTOs that passed eligibility filtering.
            config: DecisionEngineConfig providing weights and limits.

        Returns:
            List of ScoredNGO DTO instances.
        """
        if not eligible_ngos:
            return []

        # Find maximum remaining capacity among eligible NGOs for relative normalization
        max_remaining_capacity = max(ngo.remaining_capacity for ngo in eligible_ngos)
        max_radius = config.MAX_RADIUS_KM

        scored_list: List[ScoredNGO] = []

        for ngo in eligible_ngos:
            # 1. Distance score: 1.0 (closest) down to 0.0 (at max_radius_km)
            if max_radius > 0:
                dist_score = max(0.0, 1.0 - (ngo.distance_km / max_radius))
            else:
                dist_score = 1.0
            dist_score = round(min(1.0, dist_score), 4)

            # 2. Capacity score: relative to maximum capacity in current candidate set
            if max_remaining_capacity > 0:
                cap_score = ngo.remaining_capacity / max_remaining_capacity
            else:
                cap_score = 1.0
            cap_score = round(min(1.0, max(0.0, cap_score)), 4)

            # 3. Compatibility score: pass-through for now (1.0)
            compat_score = 1.0

            # 4. Reliability score: historical acceptance rate (default 0.5 for new NGOs)
            rel_score = (
                ngo.reliability_score
                if ngo.reliability_score is not None
                else DEFAULT_RELIABILITY_SCORE
            )
            rel_score = min(1.0, max(0.0, rel_score))
            rel_score_weighted = round(rel_score * config.RELIABILITY_WEIGHT, 4)

            # 5. Response score: speed of response (default 0.5 if no history)
            if (
                ngo.average_response_time_minutes is not None
                and config.MAX_RESPONSE_TIME_MINUTES > 0
            ):
                resp_score = 1.0 - min(
                    1.0,
                    ngo.average_response_time_minutes / config.MAX_RESPONSE_TIME_MINUTES,
                )
            else:
                resp_score = 0.5
            resp_score = round(min(1.0, max(0.0, resp_score)), 4)

            # Weighted sum calculation
            total_score = (
                (dist_score * config.DISTANCE_WEIGHT)
                + (cap_score * config.CAPACITY_WEIGHT)
                + (compat_score * config.COMPATIBILITY_WEIGHT)
                + rel_score_weighted
                + (resp_score * config.RESPONSE_WEIGHT)
            )
            total_score = round(min(1.0, max(0.0, total_score)), 4)

            scored = ScoredNGO(
                ngo_id=ngo.ngo_id,
                distance_km=round(ngo.distance_km, 3),
                remaining_capacity=ngo.remaining_capacity,
                reliability_score=ngo.reliability_score,
                average_response_time_minutes=ngo.average_response_time_minutes,
                distance_score=dist_score,
                capacity_score=cap_score,
                compatibility_score=compat_score,
                reliability_score_weighted=rel_score_weighted,
                response_score=resp_score,
                total_score=total_score,
            )
            scored_list.append(scored)

        logger.info("ScoringEngine scored %d eligible NGOs.", len(scored_list))
        return scored_list
