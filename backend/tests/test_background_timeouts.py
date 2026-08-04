"""Comprehensive unit tests for Sprint 5.0 — Background Timeout & Fallback Engine.

Test strategy:
    SQLAlchemy mapper configuration fails without a full app context because
    all model relationships try to resolve their string targets at once.
    Solution: patch the ORM model constructors used inside the timeout managers
    using unittest.mock.patch so that only pure-Python business logic runs.
    This is the canonical approach for service-layer unit testing without a DB.

Coverage matrix:
    Scheduler Abstraction (SchedulerBase / LocalScheduler) — 5 tests
    NGOTimeoutManager — 8 tests
    VolunteerTimeoutManager — 8 tests
    Metrics isolation — 2 tests
    Total: 23 tests
"""

import threading
import time
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

from backend.modules.decision_engine.timeout_manager import (
    NGOTimeoutManager,
    get_metrics as ngo_get_metrics,
    reset_metrics as ngo_reset_metrics,
)
from backend.modules.volunteers.timeout_manager import (
    VolunteerTimeoutManager,
    get_metrics as vol_get_metrics,
    reset_metrics as vol_reset_metrics,
)
from backend.shared.scheduling.scheduler import SchedulerBase
from backend.shared.scheduling.local_scheduler import LocalScheduler
from backend.shared.constants.enums import (
    AssignmentStatus,
    DonationStatus,
    RequestStatus,
)


# ---------------------------------------------------------------------------
# Helper factories — pure MagicMock, no real ORM models
# ---------------------------------------------------------------------------

def _past(minutes: int = 35) -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=minutes)


def _make_run_snapshot(ranks: list) -> MagicMock:
    run = MagicMock()
    run.ranking_snapshot = {
        "recommendations": [
            {"rank": r, "ngo_id": r * 10, "total_score": float(90 - r * 5),
             "distance_km": float(r * 2), "distance_score": 0.9,
             "capacity_score": 0.8, "compatibility_score": 0.7,
             "reliability_score_weighted": 0.5, "response_score": 0.6}
            for r in ranks
        ]
    }
    return run


def _make_cycle(n_ranks: int = 2) -> MagicMock:
    cycle = MagicMock()
    cycle.recommendation_cycle_id = 100
    cycle.decision_engine_run = _make_run_snapshot(list(range(1, n_ranks + 1)))
    donation = MagicMock()
    donation.donation_id = 200
    donation.status = DonationStatus.PENDING_NGO
    donation.pickup_latitude = Decimal("17.385")
    donation.pickup_longitude = Decimal("78.486")
    cycle.donation = donation
    return cycle


def _make_ngo_req(rank: int = 1, status=RequestStatus.PENDING, n_ranks: int = 2) -> MagicMock:
    req = MagicMock()
    req.ngo_request_id = rank
    req.ngo_id = rank * 10
    req.recommendation_rank = rank
    req.recommendation_score = Decimal("85.50")
    req.status = status
    req.response_deadline = _past()
    req.responded_at = None
    req.rejection_reason = None
    req.recommendation_cycle = _make_cycle(n_ranks=n_ranks)
    return req


def _make_assignment(rank: int = 1, volunteer_id: int = 5,
                     status=AssignmentStatus.PENDING) -> MagicMock:
    a = MagicMock()
    a.assignment_id = 50 + rank
    a.volunteer_id = volunteer_id
    a.ngo_request_id = 1
    a.assignment_rank = rank
    a.assignment_score = Decimal("88.0")
    a.status = status
    a.response_deadline = _past()
    a.responded_at = None
    ngo_req = MagicMock()
    ngo_req.ngo_request_id = 1
    ngo_req.recommendation_cycle = _make_cycle()
    ngo_req.ngo = MagicMock()
    ngo_req.ngo.user_id = 99
    a.ngo_request = ngo_req
    return a


# ---------------------------------------------------------------------------
# Scheduler Tests
# ---------------------------------------------------------------------------

class TestSchedulerBase(unittest.TestCase):

    def _concrete(self):
        class C(SchedulerBase):
            def start(self): self._running = True
            def stop(self): self._running = False
        return C()

    def test_add_job_registers(self):
        s = self._concrete()
        s.add_job("j", lambda: None, 60)
        self.assertIn("j", s.jobs)

    def test_duplicate_job_raises(self):
        s = self._concrete()
        s.add_job("j", lambda: None, 30)
        with self.assertRaises(ValueError):
            s.add_job("j", lambda: None, 30)

    def test_zero_interval_raises(self):
        s = self._concrete()
        with self.assertRaises(ValueError):
            s.add_job("x", lambda: None, 0)

    def test_remove_is_idempotent(self):
        s = self._concrete()
        s.add_job("j", lambda: None, 10)
        s.remove_job("j")
        s.remove_job("j")
        self.assertNotIn("j", s.jobs)


class TestLocalScheduler(unittest.TestCase):

    def test_start_stop_lifecycle(self):
        s = LocalScheduler()
        s.add_job("t", lambda: None, 30)
        s.start()
        self.assertTrue(s.is_running)
        s.stop()
        self.assertFalse(s.is_running)

    def test_start_idempotent(self):
        s = LocalScheduler()
        s.add_job("t", lambda: None, 30)
        s.start(); s.start()
        self.assertTrue(s.is_running)
        s.stop()

    def test_stop_idempotent(self):
        s = LocalScheduler()
        s.stop(); s.stop()  # must not raise

    def test_job_executes(self):
        count = {"n": 0}
        lock = threading.Lock()
        def job():
            with lock: count["n"] += 1
        s = LocalScheduler()
        s.add_job("tick", job, interval_seconds=1)
        s.start()
        time.sleep(2.5)
        s.stop()
        self.assertGreaterEqual(count["n"], 1)

    def test_crashing_job_does_not_kill_scheduler(self):
        count = {"n": 0}
        def bad():
            count["n"] += 1
            raise RuntimeError("boom")
        s = LocalScheduler()
        s.add_job("bad", bad, interval_seconds=1)
        s.start()
        time.sleep(2.5)
        s.stop()
        self.assertGreaterEqual(count["n"], 1)


# ---------------------------------------------------------------------------
# NGO Timeout Manager Tests
# Patch all real ORM model constructors used inside the manager so SQLAlchemy
# mapper configuration is never triggered.
# ---------------------------------------------------------------------------

_NGO_PATCHES = [
    "backend.modules.decision_engine.timeout_manager.NGORequest",
    "backend.modules.decision_engine.timeout_manager.NGORequestHistory",
    "backend.modules.decision_engine.timeout_manager.Notification",
    "backend.modules.decision_engine.timeout_manager.DonationStatusHistory",
]


class TestNGONoExpired(unittest.TestCase):
    def setUp(self):
        ngo_reset_metrics()
        self.session = MagicMock()
        self.mgr = NGOTimeoutManager(session=self.session, response_timeout_minutes=30)
        self.mgr._find_expired_requests = MagicMock(return_value=[])

    def test_no_expired_returns_zero(self):
        self.assertEqual(self.mgr.process_expired_requests(), 0)
        self.session.commit.assert_not_called()


class TestNGOTimeout(unittest.TestCase):
    def setUp(self):
        ngo_reset_metrics()
        self.session = MagicMock()
        self.mgr = NGOTimeoutManager(session=self.session, response_timeout_minutes=30)

    def _run(self, req, next_entry=None):
        self.mgr._find_expired_requests = MagicMock(return_value=[req])
        self.session.refresh.side_effect = lambda obj: None
        self.mgr._find_next_ngo_from_snapshot = MagicMock(return_value=next_entry)
        ngo = MagicMock(); ngo.user_id = 99
        self.session.get.return_value = ngo

    @patch("backend.modules.decision_engine.timeout_manager.NGORequest")
    @patch("backend.modules.decision_engine.timeout_manager.NGORequestHistory")
    @patch("backend.modules.decision_engine.timeout_manager.Notification")
    def test_request_marked_timed_out(self, mock_notif, mock_hist, mock_ngo_req):
        req = _make_ngo_req(rank=1)
        self._run(req, next_entry={"rank": 2, "ngo_id": 20, "total_score": 72.0})

        result = self.mgr.process_expired_requests()

        self.assertEqual(result, 1)
        self.assertEqual(req.status, RequestStatus.TIMED_OUT)
        self.assertIsNotNone(req.responded_at)
        self.session.commit.assert_called_once()

    @patch("backend.modules.decision_engine.timeout_manager.NGORequest")
    @patch("backend.modules.decision_engine.timeout_manager.NGORequestHistory")
    @patch("backend.modules.decision_engine.timeout_manager.Notification")
    def test_fallback_objects_created(self, mock_notif, mock_hist, mock_ngo_req):
        req = _make_ngo_req(rank=1)
        self._run(req, next_entry={"rank": 2, "ngo_id": 20, "total_score": 72.0})

        self.mgr.process_expired_requests()

        # NGORequestHistory, NGORequest, Notification constructors must have been called
        mock_hist.assert_called_once()
        mock_ngo_req.assert_called_once()
        mock_notif.assert_called_once()
        # All must have been added to session
        self.assertEqual(self.session.add.call_count, 3)

    @patch("backend.modules.decision_engine.timeout_manager.NGORequest")
    @patch("backend.modules.decision_engine.timeout_manager.NGORequestHistory")
    @patch("backend.modules.decision_engine.timeout_manager.Notification")
    def test_metrics_incremented(self, *_):
        req = _make_ngo_req(rank=1)
        self._run(req, next_entry={"rank": 2, "ngo_id": 20, "total_score": 72.0})

        self.mgr.process_expired_requests()

        m = ngo_get_metrics()
        self.assertEqual(m.get("ngo_timeouts_total"), 1)
        self.assertEqual(m.get("ngo_fallback_dispatched"), 1)


class TestNGOExhausted(unittest.TestCase):
    def setUp(self):
        ngo_reset_metrics()
        self.session = MagicMock()
        self.mgr = NGOTimeoutManager(session=self.session, response_timeout_minutes=30)

    @patch("backend.modules.decision_engine.timeout_manager.DonationStatusHistory")
    @patch("backend.modules.decision_engine.timeout_manager.NGORequestHistory")
    def test_donation_expires(self, mock_hist, mock_dsh):
        req = _make_ngo_req(rank=1, n_ranks=1)
        donation = req.recommendation_cycle.donation

        self.mgr._find_expired_requests = MagicMock(return_value=[req])
        self.session.refresh.side_effect = lambda obj: None
        self.mgr._find_next_ngo_from_snapshot = MagicMock(return_value=None)

        self.mgr.process_expired_requests()

        self.assertEqual(donation.status, DonationStatus.EXPIRED)
        mock_dsh.assert_called_once()
        self.assertEqual(ngo_get_metrics().get("ngo_donations_expired"), 1)


class TestNGOIdempotency(unittest.TestCase):
    def setUp(self):
        ngo_reset_metrics()
        self.session = MagicMock()
        self.mgr = NGOTimeoutManager(session=self.session, response_timeout_minutes=30)

    def test_resolved_request_skipped(self):
        req = _make_ngo_req(status=RequestStatus.ACCEPTED)
        self.mgr._find_expired_requests = MagicMock(return_value=[req])
        def _refresh(obj): obj.status = RequestStatus.ACCEPTED
        self.session.refresh.side_effect = _refresh

        result = self.mgr.process_expired_requests()

        self.assertEqual(result, 0)
        self.session.commit.assert_not_called()
        self.assertEqual(ngo_get_metrics().get("ngo_idempotency_skips"), 1)


class TestNGORollback(unittest.TestCase):
    def setUp(self):
        ngo_reset_metrics()
        self.session = MagicMock()
        self.mgr = NGOTimeoutManager(session=self.session, response_timeout_minutes=30)

    def test_exception_triggers_rollback(self):
        req = _make_ngo_req(rank=1)
        self.mgr._find_expired_requests = MagicMock(return_value=[req])
        self.session.refresh.side_effect = RuntimeError("DB gone")

        result = self.mgr.process_expired_requests()

        self.assertEqual(result, 0)
        self.session.rollback.assert_called_once()
        self.assertEqual(ngo_get_metrics().get("ngo_sweep_errors"), 1)


class TestNGOAcceptedBeforeTimeout(unittest.TestCase):
    def setUp(self):
        ngo_reset_metrics()
        self.session = MagicMock()
        self.mgr = NGOTimeoutManager(session=self.session, response_timeout_minutes=30)

    def test_empty_query_zero_processed(self):
        self.mgr._find_expired_requests = MagicMock(return_value=[])
        self.assertEqual(self.mgr.process_expired_requests(), 0)
        self.session.commit.assert_not_called()


# ---------------------------------------------------------------------------
# Volunteer Timeout Manager Tests
# ---------------------------------------------------------------------------


class TestVolNoExpired(unittest.TestCase):
    def setUp(self):
        vol_reset_metrics()
        self.session = MagicMock()
        self.mgr = VolunteerTimeoutManager(session=self.session, response_timeout_minutes=15)
        self.mgr._find_expired_assignments = MagicMock(return_value=[])

    def test_no_expired_returns_zero(self):
        self.assertEqual(self.mgr.process_expired_assignments(), 0)
        self.session.commit.assert_not_called()


class TestVolPreRanked(unittest.TestCase):
    def setUp(self):
        vol_reset_metrics()
        self.session = MagicMock()
        self.mgr = VolunteerTimeoutManager(
            session=self.session, response_timeout_minutes=15, fallback_radius_km=15.0
        )

    @patch("backend.modules.volunteers.timeout_manager.VolunteerAssignment")
    @patch("backend.modules.volunteers.timeout_manager.AssignmentHistory")
    @patch("backend.modules.volunteers.timeout_manager.Notification")
    def test_timed_out_and_preranked_fallback(self, mock_notif, mock_hist, mock_va):
        expired = _make_assignment(rank=1, volunteer_id=5)
        self.mgr._find_expired_assignments = MagicMock(return_value=[expired])
        self.session.refresh.side_effect = lambda obj: None
        self.mgr._find_next_preranked_candidate = MagicMock(return_value=(6, 75.0, 2))
        vol = MagicMock(); vol.user_id = 88
        self.session.get.return_value = vol
        self.session.flush.return_value = None

        result = self.mgr.process_expired_assignments()

        self.assertEqual(result, 1)
        self.assertEqual(expired.status, AssignmentStatus.TIMED_OUT)
        self.session.commit.assert_called_once()
        m = vol_get_metrics()
        self.assertEqual(m.get("volunteer_timeouts_total"), 1)
        self.assertEqual(m.get("volunteer_fallback_dispatched"), 1)


class TestVolRequery(unittest.TestCase):
    def setUp(self):
        vol_reset_metrics()
        self.session = MagicMock()
        self.mgr = VolunteerTimeoutManager(
            session=self.session, response_timeout_minutes=15, fallback_radius_km=15.0
        )

    @patch("backend.modules.volunteers.timeout_manager.VolunteerAssignment")
    @patch("backend.modules.volunteers.timeout_manager.AssignmentHistory")
    @patch("backend.modules.volunteers.timeout_manager.Notification")
    def test_requery_fires_when_preranked_exhausted(self, mock_notif, mock_hist, mock_va):
        from backend.modules.volunteers.dto import CandidateVolunteer, ScoredVolunteer
        from backend.shared.constants.enums import VehicleType

        expired = _make_assignment(rank=1, volunteer_id=5)
        self.mgr._find_expired_assignments = MagicMock(return_value=[expired])
        self.session.refresh.side_effect = lambda obj: None
        self.mgr._find_next_preranked_candidate = MagicMock(return_value=None)
        self.mgr._already_dispatched_volunteer_ids = MagicMock(return_value=[5])

        new_cand = CandidateVolunteer(volunteer_id=7, latitude=17.386,
                                      longitude=78.487, vehicle_type=VehicleType.CAR, distance_km=2.5)
        self.mgr._candidate_finder = MagicMock()
        self.mgr._candidate_finder.find_candidates.return_value = [new_cand]
        scored = ScoredVolunteer(volunteer_id=7, distance_km=2.5,
                                 vehicle_type=VehicleType.CAR, total_score=90.0)
        self.mgr._assignment_engine = MagicMock()
        self.mgr._assignment_engine.score_and_rank.return_value = [scored]

        vol = MagicMock(); vol.user_id = 77
        self.session.get.return_value = vol
        self.session.flush.return_value = None

        result = self.mgr.process_expired_assignments()

        self.assertEqual(result, 1)
        m = vol_get_metrics()
        self.assertEqual(m.get("volunteer_requery_used"), 1)
        self.assertEqual(m.get("volunteer_fallback_dispatched"), 1)


class TestVolNoVolunteers(unittest.TestCase):
    def setUp(self):
        vol_reset_metrics()
        self.session = MagicMock()
        self.mgr = VolunteerTimeoutManager(
            session=self.session, response_timeout_minutes=15, fallback_radius_km=15.0
        )

    @patch("backend.modules.volunteers.timeout_manager.AssignmentHistory")
    @patch("backend.modules.volunteers.timeout_manager.Notification")
    def test_system_notification_added(self, mock_notif, mock_hist):
        expired = _make_assignment(rank=1, volunteer_id=5)
        self.mgr._find_expired_assignments = MagicMock(return_value=[expired])
        self.session.refresh.side_effect = lambda obj: None
        self.mgr._find_next_preranked_candidate = MagicMock(return_value=None)
        self.mgr._already_dispatched_volunteer_ids = MagicMock(return_value=[5])
        self.mgr._candidate_finder = MagicMock()
        self.mgr._candidate_finder.find_candidates.return_value = []

        result = self.mgr.process_expired_assignments()

        self.assertEqual(result, 1)
        self.assertEqual(vol_get_metrics().get("volunteer_no_candidates"), 1)
        mock_notif.assert_called_once()


class TestVolIdempotency(unittest.TestCase):
    def setUp(self):
        vol_reset_metrics()
        self.session = MagicMock()
        self.mgr = VolunteerTimeoutManager(session=self.session, response_timeout_minutes=15)

    def test_accepted_assignment_skipped(self):
        a = _make_assignment(status=AssignmentStatus.ACCEPTED)
        self.mgr._find_expired_assignments = MagicMock(return_value=[a])
        def _refresh(obj): obj.status = AssignmentStatus.ACCEPTED
        self.session.refresh.side_effect = _refresh

        result = self.mgr.process_expired_assignments()
        self.assertEqual(result, 0)
        self.session.commit.assert_not_called()
        self.assertEqual(vol_get_metrics().get("volunteer_idempotency_skips"), 1)


class TestVolRollback(unittest.TestCase):
    def setUp(self):
        vol_reset_metrics()
        self.session = MagicMock()
        self.mgr = VolunteerTimeoutManager(session=self.session, response_timeout_minutes=15)

    def test_exception_triggers_rollback(self):
        a = _make_assignment(rank=1)
        self.mgr._find_expired_assignments = MagicMock(return_value=[a])
        self.session.refresh.side_effect = RuntimeError("DB gone")

        result = self.mgr.process_expired_assignments()
        self.assertEqual(result, 0)
        self.session.rollback.assert_called_once()
        self.assertEqual(vol_get_metrics().get("volunteer_sweep_errors"), 1)


class TestVolAcceptedBeforeTimeout(unittest.TestCase):
    def setUp(self):
        vol_reset_metrics()
        self.session = MagicMock()
        self.mgr = VolunteerTimeoutManager(session=self.session, response_timeout_minutes=15)

    def test_empty_query_zero_processed(self):
        self.mgr._find_expired_assignments = MagicMock(return_value=[])
        self.assertEqual(self.mgr.process_expired_assignments(), 0)
        self.session.commit.assert_not_called()


# ---------------------------------------------------------------------------
# Metrics isolation
# ---------------------------------------------------------------------------

class TestMetricsIsolation(unittest.TestCase):

    def test_modules_are_independent(self):
        ngo_reset_metrics()
        vol_reset_metrics()
        import backend.modules.decision_engine.timeout_manager as m
        m._metrics["ngo_timeouts_total"] += 5
        self.assertEqual(ngo_get_metrics().get("ngo_timeouts_total"), 5)
        self.assertNotIn("ngo_timeouts_total", vol_get_metrics())

    def test_reset_clears_all(self):
        ngo_reset_metrics()
        import backend.modules.decision_engine.timeout_manager as m
        m._metrics["ngo_timeouts_total"] += 3
        ngo_reset_metrics()
        self.assertEqual(ngo_get_metrics(), {})


if __name__ == "__main__":
    unittest.main()
