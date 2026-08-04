"""Unit tests for Volunteer Logistics (Sprint 4.0)."""

import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock

from backend.modules.volunteers.assignment_engine import VolunteerAssignmentEngine
from backend.modules.volunteers.candidate_finder import CandidateVolunteerFinder, haversine_distance_km
from backend.modules.volunteers.dto import CandidateVolunteer
from backend.modules.volunteers.exceptions import (
    AssignmentAlreadyResolvedException,
    AssignmentExpiredException,
    AssignmentForbiddenException,
    AssignmentNotFoundException,
    VolunteerNotFoundException,
)
from backend.modules.volunteers.models import Volunteer, VolunteerAssignment
from backend.modules.volunteers.services import VolunteerService
from backend.shared.constants.enums import (
    AssignmentStatus,
    DonationStatus,
    OperationalStatus,
    VehicleType,
    VerificationStatus,
)


class TestVolunteerHaversineDistance(unittest.TestCase):
    """Test suite for Haversine distance calculations in volunteer finder."""

    def test_haversine_same_point_returns_zero(self):
        dist = haversine_distance_km(17.385, 78.486, 17.385, 78.486)
        self.assertAlmostEqual(dist, 0.0, places=3)

    def test_haversine_known_distance(self):
        dist = haversine_distance_km(17.385, 78.486, 17.439, 78.498)
        self.assertGreater(dist, 5.0)
        self.assertLess(dist, 7.0)


class TestVolunteerAssignmentEngine(unittest.TestCase):
    """Test suite for VolunteerAssignmentEngine scoring & ranking."""

    def setUp(self):
        self.engine = VolunteerAssignmentEngine()

    def test_empty_candidates_returns_empty(self):
        result = self.engine.score_and_rank([])
        self.assertEqual(result, [])

    def test_scoring_and_ranking_closest_scores_highest(self):
        c1 = CandidateVolunteer(volunteer_id=1, latitude=17.386, longitude=78.487, vehicle_type=VehicleType.CAR, distance_km=1.0)
        c2 = CandidateVolunteer(volunteer_id=2, latitude=17.450, longitude=78.500, vehicle_type=VehicleType.CAR, distance_km=10.0)

        scored = self.engine.score_and_rank([c1, c2], max_radius_km=15.0)

        self.assertEqual(len(scored), 2)
        self.assertEqual(scored[0].volunteer_id, 1)
        self.assertGreater(scored[0].total_score, scored[1].total_score)


class TestVolunteerService(unittest.TestCase):
    """Test suite for VolunteerService operations."""

    def setUp(self):
        self.mock_repo = MagicMock()
        self.mock_session = MagicMock()
        self.service = VolunteerService(repository=self.mock_repo, session=self.mock_session)

    def _make_volunteer(self, volunteer_id: int = 1, user_id: int = 10) -> Volunteer:
        vol = MagicMock(spec=Volunteer)
        vol.volunteer_id = volunteer_id
        vol.user_id = user_id
        vol.operational_status = OperationalStatus.AVAILABLE
        return vol

    def _make_assignment(
        self, assignment_id: int = 100, volunteer_id: int = 1, status: AssignmentStatus = AssignmentStatus.PENDING
    ) -> VolunteerAssignment:
        assign = MagicMock(spec=VolunteerAssignment)
        assign.assignment_id = assignment_id
        assign.volunteer_id = volunteer_id
        assign.ngo_request_id = 50
        assign.assignment_rank = 1
        assign.assignment_score = Decimal("85.50")
        assign.status = status
        assign.response_deadline = datetime.now(timezone.utc) + timedelta(minutes=15)
        assign.created_at = datetime.now(timezone.utc)
        assign.ngo_request = MagicMock()
        assign.ngo_request.recommendation_cycle = MagicMock()
        assign.ngo_request.recommendation_cycle.donation = MagicMock()
        return assign

    def test_list_my_assignments_success(self):
        vol = self._make_volunteer(1, 10)
        assign = self._make_assignment(100, 1)
        self.mock_repo.find_volunteer_by_user_id.return_value = vol
        self.mock_repo.find_assignments_for_volunteer.return_value = [assign]

        res = self.service.list_my_assignments(user_id=10, role="VOLUNTEER")

        self.assertEqual(res["total"], 1)
        self.assertEqual(res["assignments"][0]["assignment_id"], 100)

    def test_accept_assignment_success(self):
        vol = self._make_volunteer(1, 10)
        assign = self._make_assignment(100, 1, AssignmentStatus.PENDING)
        self.mock_repo.find_volunteer_by_user_id.return_value = vol
        self.mock_repo.find_assignment_by_id.return_value = assign
        self.mock_repo.find_pending_assignments_for_request.return_value = []

        res = self.service.accept_assignment(user_id=10, role="VOLUNTEER", assignment_id=100)

        self.assertEqual(res["assignment_id"], 100)
        self.assertEqual(vol.operational_status, OperationalStatus.BUSY)

    def test_accept_already_resolved_raises(self):
        vol = self._make_volunteer(1, 10)
        assign = self._make_assignment(100, 1, AssignmentStatus.ACCEPTED)
        self.mock_repo.find_volunteer_by_user_id.return_value = vol
        self.mock_repo.find_assignment_by_id.return_value = assign

        with self.assertRaises(AssignmentAlreadyResolvedException):
            self.service.accept_assignment(user_id=10, role="VOLUNTEER", assignment_id=100)


if __name__ == "__main__":
    unittest.main()
