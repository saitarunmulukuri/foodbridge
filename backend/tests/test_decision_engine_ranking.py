"""Unit tests for the Decision Engine Ranking Engine (Sprint 3.2)."""

import unittest
from backend.modules.decision_engine.dto import Recommendation, ScoredNGO
from backend.modules.decision_engine.priority.engine import RankingEngine


class TestRankingEngine(unittest.TestCase):
    """Test suite for RankingEngine sorting and recommendation building."""

    def setUp(self):
        self.engine = RankingEngine()

    def _make_scored(
        self,
        ngo_id: int,
        total_score: float,
        distance_km: float = 5.0,
    ) -> ScoredNGO:
        return ScoredNGO(
            ngo_id=ngo_id,
            distance_km=distance_km,
            remaining_capacity=50,
            reliability_score=0.9,
            average_response_time_minutes=30.0,
            distance_score=0.8,
            capacity_score=0.7,
            compatibility_score=1.0,
            reliability_score_weighted=0.135,
            response_score=0.75,
            total_score=total_score,
        )

    def test_empty_list_returns_empty(self):
        recs = self.engine.rank([], donation_id=100)
        self.assertEqual(recs, [])

    def test_ranking_sorted_by_total_score_descending(self):
        s1 = self._make_scored(ngo_id=1, total_score=0.65)
        s2 = self._make_scored(ngo_id=2, total_score=0.92)
        s3 = self._make_scored(ngo_id=3, total_score=0.81)

        recs = self.engine.rank([s1, s2, s3], donation_id=100)

        self.assertEqual(len(recs), 3)
        self.assertEqual(recs[0].ngo_id, 2)
        self.assertEqual(recs[0].rank, 1)
        self.assertAlmostEqual(recs[0].total_score, 0.92)

        self.assertEqual(recs[1].ngo_id, 3)
        self.assertEqual(recs[1].rank, 2)
        self.assertAlmostEqual(recs[1].total_score, 0.81)

        self.assertEqual(recs[2].ngo_id, 1)
        self.assertEqual(recs[2].rank, 3)
        self.assertAlmostEqual(recs[2].total_score, 0.65)

    def test_top_n_limits_results(self):
        s1 = self._make_scored(ngo_id=1, total_score=0.60)
        s2 = self._make_scored(ngo_id=2, total_score=0.90)
        s3 = self._make_scored(ngo_id=3, total_score=0.80)

        recs = self.engine.rank([s1, s2, s3], donation_id=100, top_n=2)

        self.assertEqual(len(recs), 2)
        self.assertEqual(recs[0].ngo_id, 2)
        self.assertEqual(recs[1].ngo_id, 3)


if __name__ == "__main__":
    unittest.main()
