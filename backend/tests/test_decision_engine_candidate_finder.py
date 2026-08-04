"""Unit tests for the Decision Engine Candidate NGO Finder (Sprint 3.1.1).

Tests CandidateNGO DTO construction, ORM-to-DTO translation, reliability score
computation, and CandidateNGOFinder orchestration using mocks.
"""

import unittest
from decimal import Decimal
from unittest.mock import MagicMock, patch

# Import all ORM models first to fully configure SQLAlchemy mapper registry
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODailyCapacity, NGORequest, NGORequestHistory
from backend.modules.volunteers.models import Volunteer, VolunteerAssignment, AssignmentHistory
from backend.modules.donations.models import (
    Donation, DonationItem, DecisionEngineRun, RecommendationCycle, DonationStatusHistory,
)
from backend.modules.notifications.models import Notification

from backend.modules.decision_engine.candidate_finder import (
    CandidateNGO,
    CandidateNGOFinder,
)
from backend.shared.constants.enums import (
    CapacityStatus,
    DayOfWeek,
    FoodType,
    RequestStatus,
    VerificationStatus,
)


def _make_ngo(
    ngo_id: int = 1,
    lat: Decimal = Decimal("17.3850"),
    lon: Decimal = Decimal("78.4867"),
    radius: int = 15,
    remaining: int = 50,
    cap_status: CapacityStatus = CapacityStatus.ACTIVE,
    ngo_requests: list = None,
) -> NGO:
    """Build a minimal NGO ORM mock for testing DTO translation."""
    ngo = MagicMock(spec=NGO)
    ngo.ngo_id = ngo_id
    ngo.latitude = lat
    ngo.longitude = lon
    ngo.service_radius_km = radius
    ngo.verification_status = VerificationStatus.VERIFIED
    ngo.is_active = True

    cap = MagicMock(spec=NGODailyCapacity)
    cap.remaining_capacity = remaining
    cap.status = cap_status
    ngo.daily_capacities = [cap]
    ngo.date_capacities = []

    ngo.ngo_requests = ngo_requests or []
    return ngo


def _make_ngo_request(status: RequestStatus) -> MagicMock:
    """Build a minimal NGORequest mock with the given status."""
    req = MagicMock(spec=NGORequest)
    req.status = status
    return req


class TestCandidateNGODTO(unittest.TestCase):
    """Test suite for CandidateNGO DTO construction."""

    def test_candidate_ngo_fields(self):
        """CandidateNGO DTO should store all required fields."""
        dto = CandidateNGO(
            ngo_id=1,
            latitude=17.385,
            longitude=78.487,
            service_radius_km=15,
            remaining_capacity=50,
            supported_food_types=list(FoodType),
            reliability_score=0.85,
            average_response_time_minutes=None,
        )
        self.assertEqual(dto.ngo_id, 1)
        self.assertAlmostEqual(dto.latitude, 17.385)
        self.assertAlmostEqual(dto.longitude, 78.487)
        self.assertEqual(dto.service_radius_km, 15)
        self.assertEqual(dto.remaining_capacity, 50)
        self.assertIsInstance(dto.supported_food_types, list)
        self.assertAlmostEqual(dto.reliability_score, 0.85)
        self.assertIsNone(dto.average_response_time_minutes)

    def test_average_response_time_is_extension_point(self):
        """average_response_time_minutes should always be None until schema extended."""
        dto = CandidateNGO(
            ngo_id=2,
            latitude=0.0,
            longitude=0.0,
            service_radius_km=10,
            remaining_capacity=10,
            supported_food_types=[],
            reliability_score=None,
            average_response_time_minutes=None,
        )
        self.assertIsNone(dto.average_response_time_minutes)


class TestCandidateNGOFinderDTOTranslation(unittest.TestCase):
    """Test suite for ORM → CandidateNGO DTO translation."""

    def setUp(self):
        self.finder = CandidateNGOFinder(repository=MagicMock())

    def test_to_candidate_dto_basic_fields(self):
        """_to_candidate_dto should correctly translate all NGO fields."""
        ngo = _make_ngo(ngo_id=5, lat=Decimal("17.3850"), lon=Decimal("78.4867"), radius=20, remaining=30)
        dto = self.finder._to_candidate_dto(ngo)

        self.assertEqual(dto.ngo_id, 5)
        self.assertAlmostEqual(dto.latitude, 17.385, places=3)
        self.assertAlmostEqual(dto.longitude, 78.4867, places=3)
        self.assertEqual(dto.service_radius_km, 20)
        self.assertEqual(dto.remaining_capacity, 30)
        self.assertIsNone(dto.average_response_time_minutes)

    def test_remaining_capacity_extracted_from_todays_record(self):
        """remaining_capacity should come from the first (today's) daily_capacities record."""
        ngo = _make_ngo(remaining=99)
        dto = self.finder._to_candidate_dto(ngo)
        self.assertEqual(dto.remaining_capacity, 99)

    def test_remaining_capacity_zero_when_no_capacity_record(self):
        """remaining_capacity should be 0 if no daily_capacities record is loaded."""
        ngo = _make_ngo(remaining=0)
        ngo.daily_capacities = []
        dto = self.finder._to_candidate_dto(ngo)
        self.assertEqual(dto.remaining_capacity, 0)

    def test_supported_food_types_is_all_food_types(self):
        """supported_food_types should include all FoodType values (pass-through)."""
        ngo = _make_ngo()
        dto = self.finder._to_candidate_dto(ngo)
        self.assertEqual(set(dto.supported_food_types), set(FoodType))


class TestReliabilityScoreComputation(unittest.TestCase):
    """Test suite for _compute_reliability_score static method."""

    def test_no_requests_returns_none(self):
        """New NGO with no request history should return None reliability score."""
        ngo = _make_ngo(ngo_requests=[])
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        self.assertIsNone(score)

    def test_all_accepted_returns_one(self):
        """NGO that accepted every request should have reliability_score = 1.0."""
        reqs = [_make_ngo_request(RequestStatus.ACCEPTED)] * 5
        ngo = _make_ngo(ngo_requests=reqs)
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        self.assertAlmostEqual(score, 1.0)

    def test_all_rejected_returns_zero(self):
        """NGO that rejected every request should have reliability_score = 0.0."""
        reqs = [_make_ngo_request(RequestStatus.REJECTED)] * 5
        ngo = _make_ngo(ngo_requests=reqs)
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        self.assertAlmostEqual(score, 0.0)

    def test_mixed_requests_computes_correctly(self):
        """3 accepted out of 4 total terminal requests → reliability = 0.75."""
        reqs = [
            _make_ngo_request(RequestStatus.ACCEPTED),
            _make_ngo_request(RequestStatus.ACCEPTED),
            _make_ngo_request(RequestStatus.ACCEPTED),
            _make_ngo_request(RequestStatus.REJECTED),
        ]
        ngo = _make_ngo(ngo_requests=reqs)
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        self.assertAlmostEqual(score, 0.75)

    def test_timed_out_requests_count_as_non_acceptance(self):
        """TIMED_OUT requests should be counted as failed responses."""
        reqs = [
            _make_ngo_request(RequestStatus.ACCEPTED),
            _make_ngo_request(RequestStatus.TIMED_OUT),
        ]
        ngo = _make_ngo(ngo_requests=reqs)
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        self.assertAlmostEqual(score, 0.5)

    def test_auto_cancelled_requests_count_as_non_acceptance(self):
        """AUTO_CANCELLED requests should be counted as failed responses."""
        reqs = [
            _make_ngo_request(RequestStatus.ACCEPTED),
            _make_ngo_request(RequestStatus.AUTO_CANCELLED),
        ]
        ngo = _make_ngo(ngo_requests=reqs)
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        self.assertAlmostEqual(score, 0.5)

    def test_pending_requests_are_excluded_from_calculation(self):
        """PENDING requests should not affect the reliability score calculation."""
        reqs = [
            _make_ngo_request(RequestStatus.ACCEPTED),
            _make_ngo_request(RequestStatus.ACCEPTED),
            _make_ngo_request(RequestStatus.PENDING),  # not yet terminal
        ]
        ngo = _make_ngo(ngo_requests=reqs)
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        # Only 2 terminal requests, both accepted → 1.0
        self.assertAlmostEqual(score, 1.0)

    def test_only_pending_requests_returns_none(self):
        """NGO with only PENDING (non-terminal) requests should return None."""
        reqs = [_make_ngo_request(RequestStatus.PENDING)] * 3
        ngo = _make_ngo(ngo_requests=reqs)
        score = CandidateNGOFinder._compute_reliability_score(ngo)
        self.assertIsNone(score)


class TestCandidateNGOFinderOrchestration(unittest.TestCase):
    """Test suite for CandidateNGOFinder orchestration methods."""

    def test_find_candidates_returns_dto_list(self):
        """find_candidates should return a list of CandidateNGO DTO instances."""
        mock_repo = MagicMock()
        ngo1 = _make_ngo(ngo_id=1)
        ngo2 = _make_ngo(ngo_id=2, lat=Decimal("17.400"), lon=Decimal("78.500"))
        mock_repo.load_candidate_ngos.return_value = [ngo1, ngo2]

        finder = CandidateNGOFinder(repository=mock_repo)
        candidates = finder.find_candidates()

        self.assertEqual(len(candidates), 2)
        self.assertIsInstance(candidates[0], CandidateNGO)
        self.assertIsInstance(candidates[1], CandidateNGO)
        self.assertEqual(candidates[0].ngo_id, 1)
        self.assertEqual(candidates[1].ngo_id, 2)

    def test_find_candidates_returns_empty_when_no_ngos(self):
        """find_candidates should return empty list when no NGOs qualify."""
        mock_repo = MagicMock()
        mock_repo.load_candidate_ngos.return_value = []

        finder = CandidateNGOFinder(repository=mock_repo)
        candidates = finder.find_candidates()
        self.assertEqual(candidates, [])

    def test_no_orm_models_in_return_value(self):
        """find_candidates must NOT return ORM model instances."""
        mock_repo = MagicMock()
        mock_repo.load_candidate_ngos.return_value = [_make_ngo(ngo_id=9)]

        finder = CandidateNGOFinder(repository=mock_repo)
        candidates = finder.find_candidates()

        for candidate in candidates:
            self.assertIsInstance(candidate, CandidateNGO)
            self.assertNotIsInstance(candidate, NGO)


if __name__ == "__main__":
    unittest.main()
