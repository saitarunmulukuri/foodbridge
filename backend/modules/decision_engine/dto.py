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
    Consumed by: ScoringEngine

    Extends CandidateNGO data with:
        distance_km: Computed Haversine distance from donation pickup to NGO in km.
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
    ngo_name: str = ""


@dataclass
class CandidateEvaluation:
    """Audit DTO representing evaluation outcome for an NGO candidate (eligible or rejected)."""

    ngo_id: int
    ngo_name: str = ""
    eligible: bool = True
    rejection_reason: Optional[str] = None
    distance_km: Optional[float] = None
    distance_score: Optional[float] = None
    capacity_score: Optional[float] = None
    freshness_score: Optional[float] = None
    demand_score: Optional[float] = None
    compatibility_score: Optional[float] = None
    availability_score: Optional[float] = None
    total_score: Optional[float] = None
    decision_reason: Optional[str] = None


@dataclass
class ScoredNGO:
    """Internal DTO representing an eligible NGO with a computed recommendation score.

    Produced by: ScoringEngine
    Consumed by: RankingEngine

    Scoring Dimensions (0.0 to 1.0):
        distance_score: Proximity score (higher = closer).
        capacity_score: Available daily capacity score.
        freshness_score: Expiry urgency fit score.
        demand_score: Historical reliability & demand score.
        compatibility_score: Food type match quality score.
        availability_score: Operational response & availability score.
        total_score: Transparent weighted sum on [0.0, 1.0].
    """

    ngo_id: int
    distance_km: float
    remaining_capacity: int
    reliability_score: Optional[float]
    average_response_time_minutes: Optional[float]
    distance_score: float = 0.0
    capacity_score: float = 0.0
    compatibility_score: float = 0.0
    reliability_score_weighted: float = 0.0
    response_score: float = 0.0
    total_score: float = 0.0
    ngo_name: str = ""
    freshness_score: float = 0.0
    demand_score: float = 0.0
    availability_score: float = 0.0
    decision_reason: str = ""


@dataclass
class Recommendation:
    """Final output DTO of the Decision Engine recommendation pipeline.

    Produced by: RankingEngine
    Consumed by: Decision Engine Service (for persistence / notification)
    """

    donation_id: int
    ngo_id: int
    rank: int
    total_score: float
    distance_km: float
    distance_score: float
    capacity_score: float
    compatibility_score: float
    reliability_score_weighted: float = 0.0
    response_score: float = 0.0
    algorithm_version: str = "1.0"
    ngo_name: str = ""
    freshness_score: float = 0.0
    demand_score: float = 0.0
    availability_score: float = 0.0
    decision_reason: str = ""


@dataclass
class DecisionEngineResult:
    """Value object encapsulating the complete pipeline output.

    Attributes:
        donation_id: The donation that was evaluated.
        recommendations: List[Recommendation]
        selected_ngo_id: Top recommended NGO ID.
        selected_ngo_name: Top recommended NGO name.
        score: Top recommended total score.
        decision_reason: Generated explainable reason for the selection.
        candidates: List of all evaluated candidate DTOs (eligible & disqualified).
        total_candidates: NGOs retrieved from DB before any filtering.
        total_eligible: NGOs remaining after eligibility filtering.
        total_scored: NGOs that received a recommendation score.
        algorithm_version: Version of the scoring algorithm used.
    """

    donation_id: int
    recommendations: List[Recommendation] = field(default_factory=list)
    selected_ngo_id: Optional[int] = None
    selected_ngo_name: Optional[str] = None
    score: Optional[float] = None
    decision_reason: Optional[str] = None
    candidates: List[CandidateEvaluation] = field(default_factory=list)
    total_candidates: int = 0
    total_eligible: int = 0
    total_scored: int = 0
    algorithm_version: str = "1.0"


