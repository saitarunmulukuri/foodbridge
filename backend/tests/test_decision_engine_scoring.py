"""Unit tests for the Decision Engine Scoring Engine (Sprint 3.2)."""

import unittest
from backend.modules.decision_engine.config import DecisionEngineConfig
from backend.modules.decision_engine.dto import EligibleNGO, ScoredNGO
from backend.modules.decision_engine.scoring.engine import ScoringEngine, DEFAULT_RELIABILITY_SCORE
from backend.shared.constants.enums import FoodType


class TestScoringEngine(unittest.TestCase):
    """Test suite for ScoringEngine normalized scoring calculations."""

    def setUp(self):
        self.engine = ScoringEngine()
        self.config = DecisionEngineConfig(
            MAX_RADIUS_KM=15.0,
            MIN_REMAINING_CAPACITY=1,
            DISTANCE_WEIGHT=0.35,
            CAPACITY_WEIGHT=0.25,
            COMPATIBILITY_WEIGHT=0.15,
            RELIABILITY_WEIGHT=0.15,
            RESPONSE_WEIGHT=0.10,
            MAX_RESPONSE_TIME_MINUTES=120.0,
        )

    def _make_eligible(
        self,
        ngo_id: int = 1,
        distance_km: float = 0.0,
        remaining_capacity: int = 50,
        reliability_score: float = 0.9,
        avg_response: float = 30.0,
    ) -> EligibleNGO:
        return EligibleNGO(
            ngo_id=ngo_id,
            latitude=17.385,
            longitude=78.486,
            service_radius_km=15,
            remaining_capacity=remaining_capacity,
            supported_food_types=[FoodType.VEGETARIAN],
            reliability_score=reliability_score,
            average_response_time_minutes=avg_response,
            distance_km=distance_km,
        )

    def test_empty_eligible_list_returns_empty(self):
        scored = self.engine.score([], self.config)
        self.assertEqual(scored, [])

    def test_distance_score_zero_distance_returns_one(self):
        ngo = self._make_eligible(distance_km=0.0)
        scored = self.engine.score([ngo], self.config)[0]
        self.assertAlmostEqual(scored.distance_score, 1.0)

    def test_distance_score_at_max_radius_returns_zero(self):
        ngo = self._make_eligible(distance_km=15.0)
        scored = self.engine.score([ngo], self.config)[0]
        self.assertAlmostEqual(scored.distance_score, 0.0)

    def test_capacity_score_relative_normalization(self):
        ngo1 = self._make_eligible(ngo_id=1, remaining_capacity=100)
        ngo2 = self._make_eligible(ngo_id=2, remaining_capacity=50)
        scored = self.engine.score([ngo1, ngo2], self.config)

        # ngo1 has max capacity (100) -> 1.0
        self.assertAlmostEqual(scored[0].capacity_score, 1.0)
        # ngo2 has half capacity (50/100) -> 0.5
        self.assertAlmostEqual(scored[1].capacity_score, 0.5)

    def test_reliability_default_score_for_new_ngo(self):
        ngo = self._make_eligible(reliability_score=None)
        scored = self.engine.score([ngo], self.config)[0]
        expected_weighted = round(DEFAULT_RELIABILITY_SCORE * self.config.RELIABILITY_WEIGHT, 4)
        self.assertAlmostEqual(scored.reliability_score_weighted, expected_weighted)

    def test_response_score_calculation(self):
        # 30 min response out of 120 max = 1.0 - (30/120) = 0.75
        ngo = self._make_eligible(avg_response=30.0)
        scored = self.engine.score([ngo], self.config)[0]
        self.assertAlmostEqual(scored.response_score, 0.75)

    def test_total_score_bounded_in_unit_interval(self):
        ngo = self._make_eligible(distance_km=2.0, remaining_capacity=80, reliability_score=0.8, avg_response=45.0)
        scored = self.engine.score([ngo], self.config)[0]
        self.assertGreaterEqual(scored.total_score, 0.0)
        self.assertLessEqual(scored.total_score, 1.0)


if __name__ == "__main__":
    unittest.main()
