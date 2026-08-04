"""Unit tests for Decision Engine execution persistence and request dispatching (Sprint 3.3)."""

import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock

from backend.modules.decision_engine.dto import Recommendation
from backend.modules.decision_engine.execution import DecisionEngineExecutionManager
from backend.modules.decision_engine.services import DecisionEngineResult
from backend.shared.constants.enums import ExecutionStatus, TriggerReason


class TestDecisionEngineExecutionManager(unittest.TestCase):
    """Test suite for DecisionEngineExecutionManager database persistence and dispatch."""

    def setUp(self):
        self.mock_session = MagicMock()
        self.manager = DecisionEngineExecutionManager(session=self.mock_session)

    def _make_result(self, donation_id: int = 100) -> DecisionEngineResult:
        rec1 = Recommendation(
            donation_id=donation_id,
            ngo_id=10,
            rank=1,
            total_score=0.92,
            distance_km=2.5,
            distance_score=0.83,
            capacity_score=1.0,
            compatibility_score=1.0,
            reliability_score_weighted=0.135,
            response_score=0.75,
            algorithm_version="1.0",
        )
        rec2 = Recommendation(
            donation_id=donation_id,
            ngo_id=20,
            rank=2,
            total_score=0.75,
            distance_km=6.0,
            distance_score=0.60,
            capacity_score=0.5,
            compatibility_score=1.0,
            reliability_score_weighted=0.135,
            response_score=0.75,
            algorithm_version="1.0",
        )
        return DecisionEngineResult(
            donation_id=donation_id,
            recommendations=[rec1, rec2],
            total_candidates=5,
            total_eligible=2,
            total_scored=2,
            algorithm_version="1.0",
        )

    def test_persist_and_dispatch_adds_entities_to_session(self):
        result = self._make_result(100)
        start = datetime.now(timezone.utc)
        end = datetime.now(timezone.utc)

        # Mock query return for NGO and Donation lookup
        mock_ngo = MagicMock()
        mock_ngo.user_id = 500
        mock_donation = MagicMock()
        mock_donation.donation_id = 100

        self.mock_session.query().filter().first.side_effect = [mock_ngo, mock_donation]

        cycle = self.manager.persist_and_dispatch(
            result=result,
            started_at=start,
            completed_at=end,
            trigger_reason=TriggerReason.NEW_DONATION,
        )

        self.assertEqual(cycle.donation_id, 100)
        self.assertTrue(self.mock_session.add.called)
        self.assertTrue(self.mock_session.commit.called)

    def test_persist_failure_adds_failure_log(self):
        start = datetime.now(timezone.utc)
        end = datetime.now(timezone.utc)

        run = self.manager.persist_failure(
            donation_id=200,
            started_at=start,
            completed_at=end,
            execution_status=ExecutionStatus.NO_CANDIDATES,
            failure_reason="No eligible NGOs",
        )

        self.assertEqual(run.donation_id, 200)
        self.assertEqual(run.execution_status, ExecutionStatus.NO_CANDIDATES)
        self.assertTrue(self.mock_session.commit.called)


if __name__ == "__main__":
    unittest.main()
