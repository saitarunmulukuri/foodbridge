"""Decision Engine configuration module.

Single source of truth for all configurable parameters, threshold limits, and
algorithm weights. Values are read from environment variables with sensible
defaults, making all thresholds deployable-environment-overridable without
code changes.

Environment Variable Naming Convention:
    All variables are prefixed with ``DECISION_ENGINE_``.

Weight Constraint:
    The five scoring weights must sum to 1.00 for the scoring algorithm to
    produce normalised output in the [0.0, 1.0] range:

        DISTANCE_WEIGHT + CAPACITY_WEIGHT + COMPATIBILITY_WEIGHT +
        RELIABILITY_WEIGHT + RESPONSE_WEIGHT == 1.00

    Defaults are set to enforce this invariant. Custom deployments must
    ensure the constraint is satisfied manually.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class DecisionEngineConfig:
    """Immutable configuration container for the Decision Engine.

    Eligibility Thresholds:
        MAX_RADIUS_KM: Maximum allowed distance (km) between donation pickup
            location and candidate NGO. NGOs beyond this radius are excluded.
        MIN_REMAINING_CAPACITY: Minimum required remaining daily meal capacity
            an NGO must have to be considered eligible.

    Scoring Algorithm Weights (must sum to 1.00):
        DISTANCE_WEIGHT: Weight applied to proximity score.
            Closer NGOs score higher. Reflects operational transport cost.
        CAPACITY_WEIGHT: Weight applied to daily capacity availability score.
            NGOs with more remaining capacity score higher.
        COMPATIBILITY_WEIGHT: Weight applied to food type match quality score.
            NGOs better matching the donation's food type(s) score higher.
        RELIABILITY_WEIGHT: Weight applied to historical acceptance rate score.
            NGOs with stronger acceptance track records score higher.
        RESPONSE_WEIGHT: Weight applied to historical response speed score.
            NGOs that respond faster to requests score higher.

    Response Time Parameters:
        MAX_RESPONSE_TIME_MINUTES: The maximum expected NGO response time used as
            the upper normalisation bound for response speed scoring. Responses
            beyond this threshold are treated as the worst possible response time.
    """

    # ------------------------------------------------------------------
    # Eligibility Thresholds
    # ------------------------------------------------------------------
    MAX_RADIUS_KM: float = float(
        os.getenv("DECISION_ENGINE_MAX_RADIUS_KM", "15.0")
    )
    MIN_REMAINING_CAPACITY: int = int(
        os.getenv("DECISION_ENGINE_MIN_REMAINING_CAPACITY", "1")
    )

    # ------------------------------------------------------------------
    # Scoring Algorithm Weights  (sum must equal 1.00)
    # ------------------------------------------------------------------
    DISTANCE_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_DISTANCE_WEIGHT", "0.25")
    )
    CAPACITY_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_CAPACITY_WEIGHT", "0.20")
    )
    FRESHNESS_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_FRESHNESS_WEIGHT", "0.20")
    )
    DEMAND_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_DEMAND_WEIGHT", "0.20")
    )
    COMPATIBILITY_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_COMPATIBILITY_WEIGHT", "0.10")
    )
    AVAILABILITY_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_AVAILABILITY_WEIGHT", "0.05")
    )

    # Backward-compatibility aliases
    RELIABILITY_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_DEMAND_WEIGHT", "0.20")
    )
    RESPONSE_WEIGHT: float = float(
        os.getenv("DECISION_ENGINE_AVAILABILITY_WEIGHT", "0.05")
    )

    def __post_init__(self) -> None:
        """Sync backward-compatibility aliases if set."""
        if self.RELIABILITY_WEIGHT != 0.20 and self.DEMAND_WEIGHT == 0.20:
            object.__setattr__(self, "DEMAND_WEIGHT", self.RELIABILITY_WEIGHT)
        else:
            object.__setattr__(self, "RELIABILITY_WEIGHT", self.DEMAND_WEIGHT)

        if self.RESPONSE_WEIGHT != 0.05 and self.AVAILABILITY_WEIGHT == 0.05:
            object.__setattr__(self, "AVAILABILITY_WEIGHT", self.RESPONSE_WEIGHT)
        else:
            object.__setattr__(self, "RESPONSE_WEIGHT", self.AVAILABILITY_WEIGHT)


    # ------------------------------------------------------------------
    # Response Time Parameters
    # ------------------------------------------------------------------
    MAX_RESPONSE_TIME_MINUTES: float = float(
        os.getenv("DECISION_ENGINE_MAX_RESPONSE_TIME_MINUTES", "120.0")
    )


    def validate_weights(self) -> None:
        """Assert that all scoring weights sum to 1.00 (±0.001 tolerance).

        Raises:
            ValueError: If the weights do not sum correctly.
        """
        total = (
            self.DISTANCE_WEIGHT
            + self.CAPACITY_WEIGHT
            + self.FRESHNESS_WEIGHT
            + self.DEMAND_WEIGHT
            + self.COMPATIBILITY_WEIGHT
            + self.AVAILABILITY_WEIGHT
        )
        if abs(total - 1.0) > 0.001:
            raise ValueError(
                f"DecisionEngineConfig scoring weights must sum to 1.00, "
                f"but got {total:.4f}. Check your DECISION_ENGINE_*_WEIGHT "
                f"environment variables."
            )


# Module-level default configuration singleton
default_config = DecisionEngineConfig()

