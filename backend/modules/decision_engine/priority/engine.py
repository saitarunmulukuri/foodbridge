"""Ranking Engine component for the Decision Engine.

Sprint 3.2 Responsibility:
    Sort ScoredNGO DTOs by total_score descending and produce final Recommendation DTOs
    complete with ranking indices and algorithm metadata.
"""

import logging
from typing import List, Optional

from backend.modules.decision_engine.dto import Recommendation, ScoredNGO

logger = logging.getLogger(__name__)


class RankingEngine:
    """Component responsible for ranking scored NGOs and constructing Recommendation DTOs."""

    def rank(
        self,
        scored_ngos: List[ScoredNGO],
        donation_id: int,
        top_n: Optional[int] = None,
        algorithm_version: str = "1.0",
    ) -> List[Recommendation]:
        """Rank scored NGOs by total_score descending and convert into Recommendation DTOs.

        Args:
            scored_ngos: List of ScoredNGO DTOs.
            donation_id: The primary key of the evaluated donation.
            top_n: Optional maximum number of recommendations to return.
            algorithm_version: Version tag of the scoring algorithm.

        Returns:
            List of Recommendation DTOs sorted by rank (rank 1 = best match).
        """
        if not scored_ngos:
            return []

        # Sort primarily by total_score descending, secondarily by distance_km ascending
        sorted_ngos = sorted(
            scored_ngos,
            key=lambda s: (-s.total_score, s.distance_km),
        )

        if top_n is not None and top_n > 0:
            sorted_ngos = sorted_ngos[:top_n]

        recommendations: List[Recommendation] = []
        for index, ngo in enumerate(sorted_ngos, start=1):
            rec = Recommendation(
                donation_id=donation_id,
                ngo_id=ngo.ngo_id,
                rank=index,
                total_score=ngo.total_score,
                distance_km=ngo.distance_km,
                distance_score=ngo.distance_score,
                capacity_score=ngo.capacity_score,
                compatibility_score=ngo.compatibility_score,
                reliability_score_weighted=ngo.reliability_score_weighted,
                response_score=ngo.response_score,
                algorithm_version=algorithm_version,
            )
            recommendations.append(rec)

        logger.info(
            "RankingEngine generated %d recommendations for donation_id=%s.",
            len(recommendations),
            donation_id,
        )
        return recommendations
