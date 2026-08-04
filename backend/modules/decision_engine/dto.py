"""Decision Engine Internal Data Transfer Objects (DTOs).

These dataclasses are the exclusive data contracts between the pipeline stages
of the Decision Engine. They must never inherit from or directly reference
SQLAlchemy ORM models.

Architecture Boundary:
    ORM Model Layer  →  (Repositories)  →  DTO Layer  →  Algorithm Pipeline

Pipeline Stage Mapping:
    Donation + NGO ORM models  →  CandidateNGO   (candidate selection)
                CandidateNGO  →  EligibleNGO     (after eligibility filtering)
                 EligibleNGO  →  ScoredNGO       (after multi-criteria scoring)
    ScoredNGO[] (ranked)      →  Recommendation  (final output)
"""

from dataclasses import dataclass, field
from typing import List, Optional

from backend.modules.decision_engine.candidate_finder import CandidateNGO


@dataclass
class EligibleNGO:
    """Internal DTO representing a candidate NGO that has passed all eligibility rules.

    Produced by: EligibilityFilterPipeline
    Consumed by: ScoringEngine (Sprint 3.2)

    Extends CandidateNGO data with:
        distance_km: Computed Haversine distance from donation pickup to NGO in km.

    This allows the ScoringEngine to use the pre-computed distance directly
    without recalculating it in the scoring phase.
    """

    ngo_id: int
    latitude: float
    longitude: float
    service_radius_km: int
    remaining_capacity: int
    supported_food_types: List[str]
    reliability_score: Optional[float]
    average_response_time_minutes: Optional[float]
    distance_km: float


@dataclass
class ScoredNGO:
    """Internal DTO representing an eligible NGO with a computed recommendation score.

    Produced by: ScoringEngine (Sprint 3.2)
    Consumed by: RankingEngine (Sprint 3.3)

    Scoring Dimensions:
        distance_score: Normalised score reflecting proximity (higher = closer).
        capacity_score: Normalised score reflecting available daily capacity.
        compatibility_score: Normalised score reflecting food type match quality.
        reliability_score_weighted: Reliability score adjusted by its weight.
        response_score: Normalised score reflecting historical response speed.
        total_score: Weighted sum of all dimension scores. Range [0.0, 1.0].

    All dimension scores are in [0.0, 1.0] before weighting.
    total_score is the single authoritative ranking key.
    """

    ngo_id: int
    distance_km: float
    remaining_capacity: int
    reliability_score: Optional[float]
    average_response_time_minutes: Optional[float]

    # Scoring dimension components (populated by ScoringEngine)
    distance_score: float = 0.0
    capacity_score: float = 0.0
    compatibility_score: float = 0.0
    reliability_score_weighted: float = 0.0
    response_score: float = 0.0
    total_score: float = 0.0


@dataclass
class Recommendation:
    """Final output DTO of the Decision Engine recommendation pipeline.

    Produced by: RankingEngine (Sprint 3.3)
    Consumed by: Decision Engine Service (for persistence / notification)

    Represents a single NGO recommendation for a specific donation, with full
    scoring transparency for audit and explainability purposes.

    Fields:
        donation_id: The donation this recommendation is for.
        ngo_id: The recommended NGO's primary key.
        rank: Position in the ranked recommendation list (1 = top pick).
        total_score: Final weighted recommendation score in [0.0, 1.0].
        distance_km: Distance from donation pickup point to NGO.
        distance_score: Normalised distance component score.
        capacity_score: Normalised capacity component score.
        compatibility_score: Normalised food type compatibility score.
        reliability_score_weighted: Weighted historical reliability component.
        response_score: Weighted historical response speed component.
        algorithm_version: Version tag of the scoring algorithm used.
            Enables reproducibility and A/B comparison between algorithm versions.
    """

    donation_id: int
    ngo_id: int
    rank: int
    total_score: float
    distance_km: float
    distance_score: float
    capacity_score: float
    compatibility_score: float
    reliability_score_weighted: float
    response_score: float
    algorithm_version: str = "1.0"


@dataclass(frozen=True)
class DecisionEngineResult:
    """Value object encapsulating the complete pipeline output.

    Attributes:
        donation_id: The donation that was evaluated.
        recommendations: List[Recommendation]
        total_candidates: NGOs retrieved from DB before any filtering.
        total_eligible: NGOs remaining after eligibility filtering.
        total_scored: NGOs that received a recommendation score.
        algorithm_version: Version of the scoring algorithm used.
    """

    donation_id: int
    recommendations: List[Recommendation]
    total_candidates: int
    total_eligible: int
    total_scored: int
    algorithm_version: str = "1.0"

